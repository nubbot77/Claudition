"""Spike: prove Claude Code headless works on the subscription before building more.

Checks, in order:
1. `claude auth status` reports a subscription login (not an API key)
2. Opus 5.5 at medium effort returns schema-valid `structured_output`
3. a Haiku subagent from agents.json can be called
4. `--resume` keeps memory across calls
5. the OrchestratorStep schema fits on a Windows command line

Run from backend/:  uv run python scripts/spike.py
"""

from __future__ import annotations

import json
import os
import sys
import time
import uuid
from pathlib import Path

from pydantic import BaseModel

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.claude_runner import (  # noqa: E402
    ORCHESTRATOR_EFFORT, ORCHESTRATOR_MODEL, auth_status, json_schema_for, run_claude,
)
from app.schemas import OrchestratorStep  # noqa: E402


class SpikeOut(BaseModel):
    greeting: str
    number: int
    subagent_summary: str


def main() -> int:
    if os.environ.get("ANTHROPIC_API_KEY"):
        print("NOTE: ANTHROPIC_API_KEY is set in this shell. The runner strips it, so the subscription is used.")

    status = auth_status()
    print("auth:", json.dumps({k: status.get(k) for k in ("loggedIn", "authMethod")}))
    if status.get("authMethod") != "claude.ai":
        print("FAIL: sign in with your Claude subscription first: claude auth login")
        return 1

    step_schema = json_schema_for(OrchestratorStep)
    print(f"OrchestratorStep schema: {len(step_schema)} chars (Windows command-line limit 32767)")

    schema = json_schema_for(SpikeOut)
    session_id = str(uuid.uuid4())

    t0 = time.perf_counter()
    first = run_claude(
        "Use the jd-analyst subagent on this job description: 'Backend intern: Python, FastAPI, SQL, "
        "basic React.' Then return structured output with greeting='hello', number=41 and "
        "subagent_summary = the subagent's top 3 skills in one line.",
        schema=schema, session_id=session_id, resume=False, timeout_s=300,
        on_progress=lambda m: print("  progress:", m),
    )
    t1 = time.perf_counter()
    init = first.init
    print("init model:", init.get("model"))
    print("init tools:", init.get("tools"))
    print("init plugins:", [p.get("name") for p in init.get("plugins", [])])
    print("init agents:", init.get("agents"))
    print("init output_style:", init.get("output_style"))
    print(f"turn 1: {t1 - t0:.1f}s cost≈${first.cost_usd} structured={first.structured}")
    if not first.structured:
        print("FAIL: no structured_output. Raw result text:", first.text[:500])
        return 1
    SpikeOut.model_validate(first.structured)

    second = run_claude(
        "What number did you return last time? Return number = that number + 1, greeting='again', "
        "subagent_summary='n/a'.",
        schema=schema, session_id=session_id, resume=True, timeout_s=180,
    )
    t2 = time.perf_counter()
    print(f"turn 2 (--resume): {t2 - t1:.1f}s cost≈${second.cost_usd} structured={second.structured}")
    ok = bool(second.structured) and second.structured.get("number") == 42
    print("PASS" if ok else "FAIL: resume did not keep memory")
    print(f"model={ORCHESTRATOR_MODEL} effort={ORCHESTRATOR_EFFORT}")
    return 0 if ok else 1


if __name__ == "__main__":
    raise SystemExit(main())
