"""Runs Claude Code headless (`claude -p`) on the user's own subscription login.

Rules that keep this on the subscription and not the API bill:
- never pass --bare (bare mode ignores the subscription login)
- strip ANTHROPIC_API_KEY / ANTHROPIC_AUTH_TOKEN from the child env (they outrank the login)
"""

from __future__ import annotations

import json
import logging
import os
import shutil
import subprocess
import sys
import threading
from collections import deque
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any, Callable, TypeVar

from pydantic import BaseModel, ValidationError

from .schemas import OrchestratorStep

log = logging.getLogger(__name__)

APP_DIR = Path(__file__).parent
DATA_DIR = APP_DIR.parent / "data"
WORKSPACE_DIR = DATA_DIR / "workspace"
AGENTS_FILE = APP_DIR / "agents.json"

ORCHESTRATOR_MODEL = "claude-opus-5-5"
ORCHESTRATOR_EFFORT = "medium"
ORCHESTRATOR_TOOLS = "Agent,WebSearch,WebFetch,Read"
RESEARCH_TOOLS = "Agent,WebSearch,WebFetch"
ROUND_TOOLS = ""  # rounds need no tools: only the StructuredOutput tool that --json-schema adds

# Compact the interview conversation once one request's context reaches this many tokens (the models
# have a 1M window). The summary keeps what later turns need; scoring never depends on it, because the
# judge reads each round's transcript and evidence from the database.
COMPACT_AT_TOKENS = int(os.environ.get("CLAUDITION_COMPACT_TOKENS", "400000"))
COMPACT_INSTRUCTIONS = (
    "This is a mock interview. Preserve exactly: the CompanyBlueprint (every round id, type, order, duration, "
    "difficulty, question_budget); which rounds are finished; the current round id, the interviewer's name, each question asked in the current round "
    "and a short summary of each answer; for a coding round the problem statement and the latest test results; "
    "for a group discussion the participants, their stances and the candidate's contributions. Drop research "
    "notes, source lists and word-for-word transcripts of finished rounds."
)

_STRIPPED_ENV = ("ANTHROPIC_API_KEY", "ANTHROPIC_AUTH_TOKEN", "CLAUDECODE")

ProgressFn = Callable[[str], None]


class ClaudeError(RuntimeError):
    pass


class ClaudeAuthError(ClaudeError):
    pass


class ClaudeRateLimitError(ClaudeError):
    pass


@dataclass
class RunResult:
    structured: dict[str, Any] | None
    session_id: str | None
    text: str
    cost_usd: float | None
    init: dict[str, Any] = field(default_factory=dict)
    usage: dict[str, Any] = field(default_factory=dict)

    def tokens(self) -> tuple[int, int]:
        """(input incl. cache reads and writes, output) for the whole call."""
        u = self.usage
        read = sum(u.get(k, 0) for k in ("input_tokens", "cache_read_input_tokens", "cache_creation_input_tokens"))
        return read, u.get("output_tokens", 0)


# ---------- JSON schema ----------


def _inline(node: Any, defs: dict[str, Any]) -> Any:
    if isinstance(node, dict):
        if "$ref" in node:
            target = defs[node["$ref"].split("/")[-1]]
            merged = {**_inline(target, defs), **{k: v for k, v in node.items() if k != "$ref"}}
            return _inline(merged, defs)
        out: dict[str, Any] = {}
        for key, value in node.items():
            if key in ("$defs", "title"):
                continue
            if key == "properties":
                # property names are data, not schema keywords: keep "title" etc. here
                out[key] = {name: _inline(sub, defs) for name, sub in value.items()}
            else:
                out[key] = _inline(value, defs)
        return out
    if isinstance(node, list):
        return [_inline(item, defs) for item in node]
    return node


def json_schema_for(model: type[BaseModel]) -> str:
    """Self-contained schema (no $ref) so Claude Code's validator and the model both see it whole."""
    schema = model.model_json_schema()
    return json.dumps(_inline(schema, schema.get("$defs", {})), separators=(",", ":"))


# ---------- process ----------


def claude_executable() -> str:
    exe = shutil.which("claude")
    if not exe:
        raise ClaudeError("`claude` not found on PATH. Install Claude Code first.")
    return exe


def child_env() -> dict[str, str]:
    env = dict(os.environ)
    for key in _STRIPPED_ENV:
        env.pop(key, None)
    return env


def auth_status() -> dict[str, Any]:
    try:
        out = subprocess.run(
            [claude_executable(), "auth", "status"],
            capture_output=True, text=True, encoding="utf-8", timeout=30, env=child_env(),
        )
        return json.loads(out.stdout or "{}")
    except (ClaudeError, json.JSONDecodeError, subprocess.TimeoutExpired) as exc:
        return {"loggedIn": False, "authMethod": "none", "error": str(exc)}


def describe_stream_event(event: dict[str, Any]) -> str | None:
    """One human-readable progress line for the UI, or None to skip."""
    etype = event.get("type")
    if etype == "system" and event.get("subtype") == "init":
        return f"Session ready ({event.get('model', 'model unknown')})"
    if etype == "system" and event.get("subtype") == "api_retry":
        return f"Claude API retry {event.get('attempt')}: {event.get('error')}"
    if etype != "assistant":
        return None
    sub = " ↳ " if event.get("parent_tool_use_id") else ""
    for block in event.get("message", {}).get("content", []):
        if block.get("type") != "tool_use":
            continue
        name, args = block.get("name"), block.get("input", {})
        if name in ("Agent", "Task"):
            return f"{sub}Delegating to {args.get('subagent_type', 'subagent')}: {args.get('description', '')}"
        if name == "WebSearch":
            return f"{sub}Searching: {args.get('query', '')}"
        if name == "WebFetch":
            return f"{sub}Reading: {args.get('url', '')}"
    return None


def _classify_failure(text: str) -> ClaudeError:
    low = text.lower()
    if "login" in low or "not logged in" in low or "authentication" in low:
        return ClaudeAuthError(f"Claude Code is not signed in. Run `claude auth login`. ({text[:200]})")
    if any(s in low for s in ("usage limit", "rate limit", "rate_limit", "limit reached", "limit will reset")):
        return ClaudeRateLimitError(f"Claude plan usage limit hit. Wait for reset. ({text[:200]})")
    return ClaudeError(text[:500] or "claude -p failed with no output")


def build_command(
    *, schema: str, session_id: str, resume: bool, system_prompt_file: Path | None,
    model: str, effort: str, tools: str, stream_input: bool = False, persist: bool = True,
) -> list[str]:
    cmd = [
        claude_executable(), "-p",
        "--model", model,
        "--effort", effort,
        "--output-format", "stream-json", "--verbose",
        "--json-schema", schema,
        "--tools", tools,
        "--permission-mode", "dontAsk",
        # skip user settings: no personal plugins, hooks or output styles leak into the interviewer
        "--setting-sources", "project",
        "--strict-mcp-config", "--mcp-config", '{"mcpServers":{}}',
    ]
    if tools:
        cmd += ["--allowedTools", tools]
    if "Agent" in tools:
        cmd += ["--agents", str(AGENTS_FILE)]
    if stream_input:
        cmd += ["--input-format", "stream-json"]
    if system_prompt_file is not None:
        # replace Claude Code's coding-agent prompt entirely: ~18K -> ~1.5K base tokens per call
        cmd += ["--system-prompt-file", str(system_prompt_file)]
    if not persist:
        cmd += ["--no-session-persistence"]  # one-off calls (judge, report): nothing to resume later
    else:
        cmd += ["--resume", session_id] if resume else ["--session-id", session_id]
    return cmd


def _result_from(final: dict[str, Any], init: dict[str, Any]) -> RunResult:
    if final.get("is_error") or final.get("subtype") != "success":
        raise _classify_failure(str(final.get("result") or final.get("subtype")))
    return RunResult(
        structured=final.get("structured_output"),
        session_id=final.get("session_id"),
        text=str(final.get("result") or ""),
        cost_usd=final.get("total_cost_usd"),
        init=init,
        usage=final.get("usage") or {},
    )


def run_claude(
    prompt: str, *, schema: str, session_id: str, resume: bool,
    system_prompt_file: Path | None = None, model: str = ORCHESTRATOR_MODEL,
    effort: str = ORCHESTRATOR_EFFORT, tools: str = ORCHESTRATOR_TOOLS,
    timeout_s: float = 600, on_progress: ProgressFn | None = None, persist: bool = True,
) -> RunResult:
    """Blocking. Call through asyncio.to_thread from async code (works on any Windows event loop)."""
    WORKSPACE_DIR.mkdir(parents=True, exist_ok=True)
    cmd = build_command(
        schema=schema, session_id=session_id, resume=resume,
        system_prompt_file=system_prompt_file, model=model, effort=effort, tools=tools, persist=persist,
    )
    flags = subprocess.CREATE_NO_WINDOW if sys.platform == "win32" else 0
    proc = subprocess.Popen(
        cmd, cwd=WORKSPACE_DIR, env=child_env(), creationflags=flags,
        stdin=subprocess.PIPE, stdout=subprocess.PIPE, stderr=subprocess.PIPE,
        text=True, encoding="utf-8", errors="replace",
    )
    stderr_chunks: list[str] = []
    stderr_reader = threading.Thread(target=lambda: stderr_chunks.append(proc.stderr.read()), daemon=True)
    stderr_reader.start()
    timed_out = threading.Event()

    def _kill() -> None:
        timed_out.set()
        proc.kill()

    killer = threading.Timer(timeout_s, _kill)
    killer.start()

    final: dict[str, Any] | None = None
    init: dict[str, Any] = {}
    try:
        proc.stdin.write(prompt)
        proc.stdin.close()
        for line in proc.stdout:
            line = line.strip()
            if not line.startswith("{"):
                continue
            try:
                event = json.loads(line)
            except json.JSONDecodeError:
                continue
            if event.get("type") == "system" and event.get("subtype") == "init":
                init = event
            if event.get("type") == "result":
                final = event
            if on_progress and (msg := describe_stream_event(event)):
                on_progress(msg)
        proc.wait()
    finally:
        killer.cancel()
    stderr_reader.join(timeout=5)

    if final is None:
        if timed_out.is_set():
            raise ClaudeError(f"claude -p timed out after {timeout_s:.0f}s")
        raise _classify_failure("".join(stderr_chunks).strip())
    return _result_from(final, init)


# ---------- persistent session ----------


class PersistentSession:
    """One long-lived `claude -p --input-format stream-json` process per interview.

    Saves the CLI start-up on every turn. `/model` and `/effort` are sent as messages when the routed
    model changes; the conversation (and each model's prompt cache) survives the switch.
    """

    def __init__(self, session_id: str, system_prompt_file: Path, schema: str) -> None:
        self.session_id = session_id
        self.system_prompt_file = system_prompt_file
        self.schema = schema
        self.proc: subprocess.Popen[str] | None = None
        self.model: str | None = None
        self.effort: str | None = None
        self._lock = threading.Lock()
        self._stderr: deque[str] = deque(maxlen=40)
        self.context_tokens = 0  # size of the last request's context, from its usage
        self.compactions = 0

    def alive(self) -> bool:
        return self.proc is not None and self.proc.poll() is None

    def _start(self, model: str, effort: str) -> None:
        WORKSPACE_DIR.mkdir(parents=True, exist_ok=True)
        cmd = build_command(
            schema=self.schema, session_id=self.session_id, resume=True, system_prompt_file=self.system_prompt_file,
            model=model, effort=effort, tools=ROUND_TOOLS, stream_input=True,
        )
        flags = subprocess.CREATE_NO_WINDOW if sys.platform == "win32" else 0
        self.proc = subprocess.Popen(
            cmd, cwd=WORKSPACE_DIR, env=child_env(), creationflags=flags, bufsize=1,
            stdin=subprocess.PIPE, stdout=subprocess.PIPE, stderr=subprocess.PIPE,
            text=True, encoding="utf-8", errors="replace",
        )
        proc = self.proc
        threading.Thread(target=lambda: [self._stderr.append(line) for line in proc.stderr], daemon=True).start()
        self.model, self.effort = model, effort

    def _turn(self, text: str, timeout_s: float, on_progress: ProgressFn | None) -> dict[str, Any]:
        """Send one user message and read events until its result."""
        assert self.proc is not None and self.proc.stdin is not None and self.proc.stdout is not None
        proc = self.proc
        timed_out = threading.Event()

        def _kill() -> None:
            timed_out.set()
            proc.kill()

        killer = threading.Timer(timeout_s, _kill)
        killer.start()
        try:
            proc.stdin.write(json.dumps({"type": "user", "message": {"role": "user", "content": text}}) + "\n")
            proc.stdin.flush()
            for line in proc.stdout:
                if not line.startswith("{"):
                    continue
                try:
                    event = json.loads(line)
                except json.JSONDecodeError:
                    continue
                if event.get("type") == "result":
                    return event
                if event.get("type") == "assistant":
                    usage = event.get("message", {}).get("usage") or {}
                    size = sum(usage.get(k, 0) for k in ("input_tokens", "cache_read_input_tokens", "cache_creation_input_tokens"))
                    self.context_tokens = size or self.context_tokens
                elif event.get("type") == "system" and event.get("subtype") == "compact_boundary":
                    self.context_tokens = (event.get("compact_metadata") or {}).get("post_tokens", 0)
                if on_progress and (msg := describe_stream_event(event)):
                    on_progress(msg)
        except OSError:
            pass  # pipe closed: the process died; reported below
        finally:
            killer.cancel()
        self.close()
        if timed_out.is_set():
            raise ClaudeError(f"Interviewer turn timed out after {timeout_s:.0f}s")
        raise _classify_failure("".join(self._stderr).strip())

    def ask(
        self, prompt: str, *, model: str, effort: str, timeout_s: float, on_progress: ProgressFn | None = None,
    ) -> RunResult:
        with self._lock:
            if not self.alive():
                self._start(model, effort)
            if model != self.model:
                self._turn(f"/model {model}", 60, None)
                self.model = model
            if effort != self.effort:
                self._turn(f"/effort {effort}", 60, None)
                self.effort = effort
            if self.context_tokens >= COMPACT_AT_TOKENS:
                self.compact(on_progress)
            return _result_from(self._turn(prompt, timeout_s, on_progress), {})

    def compact(self, on_progress: ProgressFn | None = None) -> None:
        """Summarise the conversation in place (`/compact`). Caller holds the lock; the process stays up."""
        before = self.context_tokens
        if on_progress:
            on_progress(f"Compacting interview memory ({before // 1000}K tokens)")
        self._turn(f"/compact {COMPACT_INSTRUCTIONS}", 300, None)
        self.compactions += 1
        log.info("Session %s compacted: %d -> %d tokens", self.session_id, before, self.context_tokens)

    def close(self) -> None:
        proc, self.proc = self.proc, None
        if proc is None:
            return
        try:
            if proc.stdin:
                proc.stdin.close()
            proc.wait(timeout=5)
        except (OSError, subprocess.TimeoutExpired):
            proc.kill()


_SESSIONS: dict[str, PersistentSession] = {}
_SESSIONS_LOCK = threading.Lock()


def close_session(session_id: str) -> None:
    with _SESSIONS_LOCK:
        session = _SESSIONS.pop(session_id, None)
    if session:
        session.close()


def close_all_sessions() -> None:
    for session_id in list(_SESSIONS):
        close_session(session_id)


# ---------- orchestrator ----------

def _without_fields(schema_text: str, fields: tuple[str, ...]) -> str:
    schema = json.loads(schema_text)
    for name in fields:
        schema["properties"].pop(name, None)
    schema["required"] = [r for r in schema.get("required", []) if r not in fields]
    return json.dumps(schema, separators=(",", ":"))


# The interviewer never scores: round scores and the report come from separate judge calls, so its
# schema (sent with every request) leaves those payloads out.
JUDGED_FIELDS = ("round_score", "report")
_STEP_SCHEMA = _without_fields(json_schema_for(OrchestratorStep), JUDGED_FIELDS)

M = TypeVar("M", bound=BaseModel)


def run_structured(
    prompt: str, model_type: type[M], *, system_prompt_file: Path, model: str, effort: str,
    timeout_s: float = 300, schema: str | None = None,
) -> tuple[M, RunResult]:
    """A one-off call with no saved session (judge, report writer). Retries once on a missing or invalid result."""
    schema = schema or json_schema_for(model_type)
    last_error = ""
    for attempt in range(2):
        text = prompt if attempt == 0 else f"{prompt}\n\n{_RETRY_NUDGE}"
        result = run_claude(
            text, schema=schema, session_id="", resume=False, system_prompt_file=system_prompt_file,
            model=model, effort=effort, tools=ROUND_TOOLS, timeout_s=timeout_s, persist=False,
        )
        if result.structured is None:
            last_error = "no structured_output in result"
            continue
        try:
            return model_type.model_validate(result.structured), result
        except ValidationError as exc:
            last_error = str(exc)
    raise ClaudeError(f"{model_type.__name__} call returned no valid result twice: {last_error[:300]}")

_RETRY_NUDGE = (
    "SYSTEM CHECK: your previous turn ended without a valid OrchestratorStep in structured output. "
    "Re-send the step you intended, as structured output, now."
)


def run_orchestrator(
    prompt: str, *, session_id: str, first_turn: bool, system_prompt_file: Path,
    timeout_s: float = 600, on_progress: ProgressFn | None = None,
    model: str = ORCHESTRATOR_MODEL, effort: str = ORCHESTRATOR_EFFORT, research: bool = False,
) -> tuple[OrchestratorStep, RunResult]:
    """One interview turn. Research runs one-shot with web tools; every later turn goes through the
    interview's persistent process on the routed model. Retries once if the step is missing or invalid."""

    def ask(text: str, first: bool) -> RunResult:
        if research or first:
            return run_claude(
                text, schema=_STEP_SCHEMA, session_id=session_id, resume=not first,
                system_prompt_file=system_prompt_file, model=model, effort=effort,
                tools=RESEARCH_TOOLS if research else ROUND_TOOLS, timeout_s=timeout_s, on_progress=on_progress,
            )
        with _SESSIONS_LOCK:
            session = _SESSIONS.setdefault(session_id, PersistentSession(session_id, system_prompt_file, _STEP_SCHEMA))
        return session.ask(text, model=model, effort=effort, timeout_s=timeout_s, on_progress=on_progress)

    attempt_prompt, first = prompt, first_turn
    last_error = ""
    for _ in range(2):
        result = ask(attempt_prompt, first)
        if result.structured is not None:
            try:
                data = {**dict.fromkeys(JUDGED_FIELDS), **result.structured}
                return OrchestratorStep.model_validate(data), result
            except ValidationError as exc:
                last_error = str(exc)
        else:
            last_error = "no structured_output in result"
        attempt_prompt, first = _RETRY_NUDGE, False
        if on_progress:
            on_progress("Interviewer reply was malformed, asking again…")
    raise ClaudeError(f"Orchestrator returned no valid step twice: {last_error[:300]}")
