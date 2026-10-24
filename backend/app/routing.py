"""Which model answers which turn.

Opus judges (research, round scores, final report); Sonnet runs the conversation. Asking a question
needs speed, not deep reasoning, and Opus costs twice as much as Sonnet per token.
"""

from __future__ import annotations

import os
from dataclasses import dataclass

from .budget import RoundProgress
from .schemas import Action, EventType


@dataclass(frozen=True)
class Route:
    model: str
    effort: str
    role: str  # shown in the progress log


# Override with environment variables, e.g. CLAUDITION_JUDGE_MODEL=claude-sonnet-5-5 on a plan
# without Opus access, or to stretch usage limits.
JUDGE_MODEL = os.environ.get("CLAUDITION_JUDGE_MODEL", "claude-opus-5-5")
INTERVIEWER_MODEL = os.environ.get("CLAUDITION_INTERVIEWER_MODEL", "claude-sonnet-5-5")

JUDGE = Route(JUDGE_MODEL, "medium", "judge")
CONTENT = Route(INTERVIEWER_MODEL, "medium", "round setup")  # MCQs, coding problems + hidden tests
FAST = Route(INTERVIEWER_MODEL, "low", "interviewer")

JUDGE_ACTIONS = {Action.round_feedback, Action.final_report}


def route(event: EventType, progress: RoundProgress | None, starts_round: bool, all_rounds_done: bool) -> Route:
    if event in (EventType.start_interview, EventType.end_interview, EventType.time_up, EventType.mcq_section_done):
        return JUDGE
    if all_rounds_done or (progress is not None and progress.must_wrap_up):
        return JUDGE
    # once every main question/problem is used the next step may close the round: let the judge take it,
    # instead of paying for a fast draft that would be redone
    if progress is not None and progress.unit in ("question", "problem") and progress.used >= progress.budget:
        return JUDGE
    if starts_round:
        return CONTENT
    return FAST


def needs_judge(route_used: Route, action: Action) -> bool:
    """A fast-model step that scores a round or writes the report is redone by the judge."""
    return route_used is not JUDGE and action in JUDGE_ACTIONS
