"""Which model answers which turn.

Opus judges (research, round scores, final report); Sonnet runs the conversation. Asking a question
needs speed, not deep reasoning, and Opus output is 10x the price of Sonnet's per token.
"""

from __future__ import annotations

from dataclasses import dataclass

from .budget import RoundProgress
from .schemas import Action, EventType


@dataclass(frozen=True)
class Route:
    model: str
    effort: str
    role: str  # shown in the progress log


JUDGE = Route("claude-opus-5-5", "medium", "judge")
CONTENT = Route("claude-sonnet-5-5", "medium", "round setup")  # MCQs, coding problems + hidden tests
FAST = Route("claude-sonnet-5-5", "low", "interviewer")

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
