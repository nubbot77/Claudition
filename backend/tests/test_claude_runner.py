from __future__ import annotations

import json
from pathlib import Path
from typing import Any

import pytest

from app import claude_runner, schemas
from app.claude_runner import ClaudeAuthError, ClaudeError, ClaudeRateLimitError


# ---------- json_schema_for ----------


def _schema_title_keywords(node: Any, path: str = "$") -> list[str]:
    """Paths of `title` used as a schema keyword (keys inside a `properties` map are names, not keywords)."""
    found: list[str] = []
    if isinstance(node, dict):
        if "title" in node:
            found.append(path)
        for key, value in node.items():
            if key == "properties" and isinstance(value, dict):
                for name, sub in value.items():
                    found += _schema_title_keywords(sub, f"{path}.properties.{name}")
            else:
                found += _schema_title_keywords(value, f"{path}.{key}")
    elif isinstance(node, list):
        for i, item in enumerate(node):
            found += _schema_title_keywords(item, f"{path}[{i}]")
    return found


def _object_variant(prop: dict[str, Any]) -> dict[str, Any]:
    if "properties" in prop:
        return prop
    return next(v for v in prop["anyOf"] if v.get("type") == "object")


def test_json_schema_is_self_contained() -> None:
    text = claude_runner.json_schema_for(schemas.OrchestratorStep)
    assert "$ref" not in text and "$defs" not in text
    schema = json.loads(text)
    assert _schema_title_keywords(schema) == []

    coding = _object_variant(schema["properties"]["coding_problem"])
    assert "title" in coding["properties"]
    assert coding["properties"]["title"]["type"] == "string"
    assert "title" in coding["required"]
    hidden = coding["properties"]["hidden_tests"]["items"]
    assert set(hidden["properties"]) == {"input", "expected_output"}


# ---------- describe_stream_event ----------


def _tool_use(name: str, args: dict[str, Any], parent: str | None = None) -> dict[str, Any]:
    return {
        "type": "assistant",
        "parent_tool_use_id": parent,
        "message": {"content": [{"type": "tool_use", "name": name, "input": args}]},
    }


def test_describe_init() -> None:
    line = claude_runner.describe_stream_event({"type": "system", "subtype": "init", "model": "claude-opus-5-5"})
    assert line == "Session ready (claude-opus-5-5)"


def test_describe_web_search() -> None:
    line = claude_runner.describe_stream_event(_tool_use("WebSearch", {"query": "acme sde interview"}))
    assert line == "Searching: acme sde interview"


def test_describe_agent_delegation() -> None:
    event = _tool_use("Agent", {"subagent_type": "company-researcher", "description": "Find rounds"})
    line = claude_runner.describe_stream_event(event)
    assert line == "Delegating to company-researcher: Find rounds"


def test_describe_subagent_message_is_indented() -> None:
    line = claude_runner.describe_stream_event(_tool_use("WebFetch", {"url": "https://x.test"}, parent="toolu_1"))
    assert line is not None and line.startswith(" ↳ ")
    assert "https://x.test" in line


@pytest.mark.parametrize("event", [
    {"type": "user", "message": {"content": []}},
    {"type": "system", "subtype": "hook_response"},
    {"type": "assistant", "message": {"content": [{"type": "text", "text": "thinking aloud"}]}},
    {"type": "result", "subtype": "success"},
])
def test_describe_unrelated_events(event: dict[str, Any]) -> None:
    assert claude_runner.describe_stream_event(event) is None


# ---------- _classify_failure ----------


def test_classify_auth() -> None:
    assert isinstance(claude_runner._classify_failure("Invalid API key · Please run /login"), ClaudeAuthError)


def test_classify_rate_limit() -> None:
    assert isinstance(claude_runner._classify_failure("Claude AI usage limit reached|1760000000"), ClaudeRateLimitError)


def test_classify_other() -> None:
    err = claude_runner._classify_failure("socket hang up")
    assert type(err) is ClaudeError
    assert "socket hang up" in str(err)
    assert str(claude_runner._classify_failure("")) == "claude -p failed with no output"


# ---------- build_command ----------


def _flag(cmd: list[str], name: str) -> str:
    return cmd[cmd.index(name) + 1]


def _build(resume: bool, prompt_file: Path | None = None) -> list[str]:
    return claude_runner.build_command(
        schema='{"type":"object"}', session_id="sess-123", resume=resume, system_prompt_file=prompt_file,
        model=claude_runner.ORCHESTRATOR_MODEL, effort=claude_runner.ORCHESTRATOR_EFFORT,
        tools=claude_runner.ORCHESTRATOR_TOOLS,
    )


@pytest.fixture
def fake_claude(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(claude_runner, "claude_executable", lambda: "claude")


@pytest.mark.usefixtures("fake_claude")
@pytest.mark.parametrize("resume", [True, False])
def test_build_command_common_flags(resume: bool) -> None:
    cmd = _build(resume)
    assert cmd[:2] == ["claude", "-p"]
    assert "--bare" not in cmd
    assert _flag(cmd, "--model") == "claude-opus-5-5"
    assert _flag(cmd, "--effort") == "medium"
    assert _flag(cmd, "--json-schema") == '{"type":"object"}'
    assert _flag(cmd, "--output-format") == "stream-json"


@pytest.mark.usefixtures("fake_claude")
def test_build_command_resume() -> None:
    cmd = _build(resume=True)
    assert _flag(cmd, "--resume") == "sess-123"
    assert "--session-id" not in cmd


@pytest.mark.usefixtures("fake_claude")
def test_build_command_new_session(tmp_path: Path) -> None:
    prompt = tmp_path / "system.md"
    cmd = _build(resume=False, prompt_file=prompt)
    assert _flag(cmd, "--session-id") == "sess-123"
    assert "--resume" not in cmd
    # the interviewer prompt replaces Claude Code's coding-agent prompt (lean base)
    assert _flag(cmd, "--system-prompt-file") == str(prompt)
    assert "--append-system-prompt-file" not in cmd


# ---------- child_env ----------


def test_child_env_strips_api_credentials(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("ANTHROPIC_API_KEY", "sk-test-not-real")
    monkeypatch.setenv("ANTHROPIC_AUTH_TOKEN", "tok-test-not-real")
    monkeypatch.setenv("INTERVIEW_TEST_KEEP", "1")
    env = claude_runner.child_env()
    assert "ANTHROPIC_API_KEY" not in env
    assert "ANTHROPIC_AUTH_TOKEN" not in env
    assert env["INTERVIEW_TEST_KEEP"] == "1"


# ---------- schemas.public_step ----------


def _step(**payload: Any) -> schemas.OrchestratorStep:
    base: dict[str, Any] = dict(
        action=schemas.Action.ask_question, speech_text="", interviewer_name=None, round_id=None,
        round_type=None, blueprint=None, coding_problem=None, mcq_section=None, gd=None,
        round_score=None, report=None,
    )
    return schemas.OrchestratorStep(**{**base, **payload})


def test_public_step_hides_hidden_tests() -> None:
    case = schemas.TestCase(input="1 2", expected_output="3")
    problem = schemas.CodingProblem(
        title="Add", statement="Add two ints.", constraints=[], examples=[case],
        hidden_tests=[case, schemas.TestCase(input="5 5", expected_output="10")],
        languages=["python"], starter_code=[schemas.StarterCode(language="python", code="")],
        time_limit_min=20,
    )
    step = _step(action=schemas.Action.present_coding_problem, coding_problem=problem)
    data = schemas.public_step(step)["coding_problem"]
    assert "hidden_tests" not in data
    assert data["hidden_test_count"] == 2
    assert data["examples"] == [{"input": "1 2", "expected_output": "3"}]
    assert len(step.coding_problem.hidden_tests) == 2  # the server copy keeps them


def test_public_step_hides_mcq_answers() -> None:
    section = schemas.McqSection(
        name="Quant", time_limit_min=10,
        questions=[schemas.McqQuestion(id="q1", question="2+2?", options=["3", "4"], answer_index=1, explanation="math")],
    )
    data = schemas.public_step(_step(action=schemas.Action.present_mcq_section, mcq_section=section))
    question = data["mcq_section"]["questions"][0]
    assert "answer_index" not in question and "explanation" not in question
    assert question["options"] == ["3", "4"] and question["id"] == "q1"


# ---------- PersistentSession compaction ----------


class _FakeProc:
    """Stands in for the claude process: each turn's stdout is scripted as a list of events."""

    def __init__(self, turns: list[list[dict[str, Any]]]) -> None:
        import io

        self.stdin = io.StringIO()
        self._lines = iter([json.dumps(e) + "\n" for turn in turns for e in turn])
        self.stdout = self._lines

    def poll(self) -> None:
        return None


def _usage(inp: int, read: int, write: int) -> dict[str, Any]:
    return {"type": "assistant", "message": {"content": [], "usage": {
        "input_tokens": inp, "cache_read_input_tokens": read, "cache_creation_input_tokens": write}}}


def _session(turns: list[list[dict[str, Any]]]) -> claude_runner.PersistentSession:
    session = claude_runner.PersistentSession("sess", Path("p.md"), "{}")
    session.proc = _FakeProc(turns)  # type: ignore[assignment]
    session.model, session.effort = "m", "e"
    return session


def test_turn_tracks_context_size_and_compaction() -> None:
    result = {"type": "result", "subtype": "success"}
    boundary = {"type": "system", "subtype": "compact_boundary", "compact_metadata": {"post_tokens": 1268}}
    session = _session([[_usage(2, 5000, 1000), result], [boundary, result]])
    session._turn("hello", 5, None)
    assert session.context_tokens == 6002
    session._turn("/compact keep scores", 5, None)
    assert session.context_tokens == 1268


@pytest.mark.parametrize(("context", "compacts"), [(399_999, False), (400_000, True)])
def test_ask_compacts_once_context_reaches_threshold(
    monkeypatch: pytest.MonkeyPatch, context: int, compacts: bool,
) -> None:
    monkeypatch.setattr(claude_runner, "COMPACT_AT_TOKENS", 400_000)
    monkeypatch.setattr(claude_runner, "_result_from", lambda event, _: event)
    session = _session([])
    sent: list[str] = []

    def fake_turn(text: str, timeout_s: float, on_progress: Any) -> dict[str, Any]:
        sent.append(text)
        if text.startswith("/compact"):
            session.context_tokens = 3000
        return {"type": "result"}

    monkeypatch.setattr(session, "_turn", fake_turn)
    session.context_tokens = context
    session.ask("EVENT: candidate_answer", model="m", effort="e", timeout_s=5)
    assert [t.startswith("/compact") for t in sent] == ([True, False] if compacts else [False])
    assert session.compactions == int(compacts)
