"""Spike: one long-lived `claude -p` process with stream-json input.

Checks: replaced system prompt still yields structured_output, no tools besides StructuredOutput,
`/model` and `/effort` switch mid-process, memory across messages, per-turn latency and usage.
Run from backend/:  uv run --no-sync python scripts/spike_persistent.py
"""

from __future__ import annotations

import json
import subprocess
import sys
import time
import uuid
from pathlib import Path

from pydantic import BaseModel

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.claude_runner import WORKSPACE_DIR, child_env, claude_executable, json_schema_for  # noqa: E402


class Out(BaseModel):
    reply: str
    number: int


PROMPT = Path(WORKSPACE_DIR.parent / "spike_prompt.md")


def main() -> int:
    WORKSPACE_DIR.mkdir(parents=True, exist_ok=True)
    PROMPT.write_text("You are a terse test assistant. Always answer with the structured output tool.\n", encoding="utf-8")
    cmd = [
        claude_executable(), "-p", "--input-format", "stream-json", "--output-format", "stream-json", "--verbose",
        "--model", "claude-sonnet-5-5", "--effort", "low",
        "--json-schema", json_schema_for(Out), "--system-prompt-file", str(PROMPT),
        "--tools", "", "--permission-mode", "dontAsk", "--setting-sources", "project",
        "--strict-mcp-config", "--mcp-config", '{"mcpServers":{}}', "--session-id", str(uuid.uuid4()),
    ]
    proc = subprocess.Popen(cmd, cwd=WORKSPACE_DIR, env=child_env(), stdin=subprocess.PIPE, stdout=subprocess.PIPE,
                            stderr=subprocess.PIPE, text=True, encoding="utf-8", errors="replace", bufsize=1)

    def send(text: str) -> dict:
        t0 = time.perf_counter()
        proc.stdin.write(json.dumps({"type": "user", "message": {"role": "user", "content": text}}) + "\n")
        proc.stdin.flush()
        for line in proc.stdout:
            if not line.startswith("{"):
                continue
            ev = json.loads(line)
            if ev.get("type") == "system" and ev.get("subtype") == "init":
                print("  init model:", ev.get("model"), "tools:", ev.get("tools"))
            if ev.get("type") == "assistant":
                u = ev["message"].get("usage", {})
                print(f"  model={ev['message'].get('model')} in={u.get('input_tokens')} cw={u.get('cache_creation_input_tokens')} cr={u.get('cache_read_input_tokens')} out={u.get('output_tokens')}")
            if ev.get("type") == "result":
                print(f"  -> {time.perf_counter() - t0:.1f}s subtype={ev.get('subtype')} structured={ev.get('structured_output')} text={str(ev.get('result'))[:80]!r}")
                return ev
        raise RuntimeError("process ended: " + proc.stderr.read()[:500])

    print("turn 1 (sonnet low)"); send("Return number=41 and reply='hi'.")
    print("turn 2 (sonnet low)"); send("Return the previous number + 1.")
    print("/model opus"); send("/model claude-opus-5-5")
    print("/effort medium"); send("/effort medium")
    print("turn 3 (opus medium)"); send("Return the previous number + 1 and say which model you are in reply.")
    print("/model sonnet"); send("/model claude-sonnet-5-5")
    print("turn 4 (sonnet)"); send("Return the previous number + 1.")
    proc.stdin.close()
    proc.wait(timeout=30)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
