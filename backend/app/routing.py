"""Which model answers which turn.

Opus researches the company (one-off call) and judges: each round's score and the final report come
from separate Opus calls that read only the evidence they need (see interview.py). The interview
conversation itself stays on Sonnet, so its prompt cache is never rebuilt for a different model.
"""

from __future__ import annotations

import os
from dataclasses import dataclass

from .schemas import EventType


@dataclass(frozen=True)
class Route:
    model: str
    effort: str
    role: str  # shown in the progress log


# Override with environment variables, e.g. CLAUDITION_JUDGE_MODEL=claude-sonnet-5-5 on a plan
# without Opus access, or to stretch usage limits.
JUDGE_MODEL = os.environ.get("CLAUDITION_JUDGE_MODEL", "claude-opus-5-5")
INTERVIEWER_MODEL = os.environ.get("CLAUDITION_INTERVIEWER_MODEL", "claude-sonnet-5-5")

RESEARCH = Route(JUDGE_MODEL, "medium", "research")
JUDGE = Route(JUDGE_MODEL, "medium", "judge")  # round scores and the final report, outside the session
CONTENT = Route(INTERVIEWER_MODEL, "medium", "round setup")  # MCQs, coding problems + hidden tests
FAST = Route(INTERVIEWER_MODEL, "low", "interviewer")


def route(event: EventType, starts_round: bool) -> Route:
    if event == EventType.start_interview:
        return RESEARCH
    if starts_round:
        return CONTENT
    return FAST
