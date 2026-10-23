"""Per-round question budgets.

The backend counts what Opus has asked in the current round, tells Opus the remaining budget in every
event, and re-asks once when a returned step breaks the budget. Opus still chooses the questions.
"""

from __future__ import annotations

from dataclasses import asdict, dataclass
from datetime import datetime, timezone
from typing import Any

from .schemas import Action, OrchestratorStep, RoundType

MAX_FOLLOW_UPS = 2
TIME_GRACE = 1.15  # a round may overrun its planned duration by 15% before it must close
CONVERSATIONAL = {RoundType.technical, RoundType.system_design, RoundType.behavioral, RoundType.hr, RoundType.managerial}


@dataclass
class RoundProgress:
    round_id: str
    round_name: str
    round_type: str
    unit: str  # what `used`/`budget` count: question | problem | contribution | mcq_section
    budget: int
    used: int
    follow_ups: int
    max_follow_ups: int
    elapsed_min: float
    duration_min: int
    must_wrap_up: bool
    must_conclude_gd: bool
    instruction: str

    def as_dict(self) -> dict[str, Any]:
        return asdict(self)


def _elapsed_min(steps: list[dict[str, Any]], now: datetime) -> float:
    if not steps:
        return 0.0
    started = datetime.fromisoformat(steps[0]["at"])
    return round((now - started).total_seconds() / 60, 1)


def compute_progress(
    rnd: dict[str, Any], steps: list[dict[str, Any]], candidate_turns: int,
    now: datetime | None = None, time_up: bool = False,
) -> RoundProgress:
    """`steps` are this round's logged orchestrator steps; `candidate_turns` counts the candidate's GD turns."""
    rtype = RoundType(rnd["type"])
    budget = max(1, int(rnd.get("question_budget") or 4))
    duration = int(rnd.get("duration_min") or 20)
    elapsed = _elapsed_min(steps, now or datetime.now(timezone.utc))
    over_time = time_up or (bool(steps) and elapsed > duration * TIME_GRACE)

    used = follow_ups = 0
    must_wrap_up = must_conclude_gd = False
    unit = "question"

    if rtype == RoundType.group_discussion:
        unit = "contribution"
        used = candidate_turns
        concluded = any(s["gd_concluded"] for s in steps)
        must_wrap_up = concluded  # after the moderator closes, the only valid next step is feedback
        must_conclude_gd = not concluded and (used >= budget or over_time)
        if must_wrap_up:
            instruction = "The GD is concluded. Return round_feedback for this round now."
        elif must_conclude_gd:
            instruction = "Contribution budget reached. Return gd_turns with concluded=true and ask the candidate to summarise."
        else:
            instruction = f"Conclude the GD after {budget - used} more candidate contribution(s)."
    elif rtype == RoundType.aptitude_mcq:
        # budget = questions per section; used = sections presented (the MCQ screen counts answers itself)
        unit = "mcq_section"
        used = sum(s["action"] == Action.present_mcq_section.value for s in steps)
        must_wrap_up = over_time
        instruction = (
            "Time is up. Return round_feedback for this round now." if must_wrap_up
            else f"Every MCQ section in this round has exactly {budget} questions."
        )
    else:
        coding = rtype == RoundType.coding
        unit = "problem" if coding else "question"
        for s in steps:
            is_main = (
                s["action"] == Action.present_coding_problem.value if coding
                else s["action"] == Action.ask_question.value and s["question_kind"] != "follow_up"
            )
            if is_main:
                used += 1
                follow_ups = 0
            elif s["action"] == Action.ask_question.value:
                follow_ups += 1
        noun = "problem" if coding else "main question"
        must_wrap_up = over_time or (used >= budget and follow_ups >= MAX_FOLLOW_UPS)
        if must_wrap_up:
            instruction = "Round limit reached. Return round_feedback for this round now."
        elif used >= budget:
            left = MAX_FOLLOW_UPS - follow_ups
            instruction = f"All {budget} {noun}s used. At most {left} more follow-up(s) on the current one, then round_feedback."
        else:
            instruction = (
                f"{noun.capitalize()} {used} of {budget} asked. At most {MAX_FOLLOW_UPS - follow_ups} follow-up(s) "
                f"on the current one. Mark question_kind on every question step."
            )

    return RoundProgress(
        round_id=rnd["id"], round_name=rnd["name"], round_type=rtype.value, unit=unit, budget=budget, used=used,
        follow_ups=follow_ups, max_follow_ups=MAX_FOLLOW_UPS, elapsed_min=elapsed, duration_min=duration,
        must_wrap_up=must_wrap_up, must_conclude_gd=must_conclude_gd, instruction=instruction,
    )


def violation(progress: RoundProgress | None, step: OrchestratorStep) -> str | None:
    """Why `step` breaks the round budget, or None if it is allowed."""
    if progress is None:
        return None
    if progress.must_wrap_up:
        if step.action not in (Action.round_feedback, Action.final_report):
            return f"round {progress.round_id} must end now with round_feedback"
        return None
    if step.round_id != progress.round_id:
        return None
    rtype = RoundType(progress.round_type)
    if step.action == Action.present_mcq_section and step.mcq_section:
        count = len(step.mcq_section.questions)
        if count != progress.budget:
            return f"the MCQ section has {count} questions but the round's budget is {progress.budget} per section"
        return None
    if rtype == RoundType.group_discussion:
        if progress.must_conclude_gd and step.action == Action.gd_turns and not (step.gd and step.gd.concluded):
            return "the GD contribution budget is used: conclude it (concluded=true) and ask for a summary"
        return None
    if rtype == RoundType.coding and step.action == Action.present_coding_problem and progress.used >= progress.budget:
        return f"all {progress.budget} coding problem(s) were already given"
    if step.action == Action.ask_question:
        is_follow_up = rtype == RoundType.coding or step.question_kind == "follow_up"
        if is_follow_up and progress.follow_ups >= MAX_FOLLOW_UPS:
            return f"the current question already had {MAX_FOLLOW_UPS} follow-ups"
        if not is_follow_up and rtype in CONVERSATIONAL and progress.used >= progress.budget:
            return f"all {progress.budget} main questions were already asked"
    return None
