from __future__ import annotations

from datetime import datetime, timedelta, timezone

from app.budget import MAX_FOLLOW_UPS, compute_progress, violation
from app.schemas import OrchestratorStep

T0 = datetime(2026, 10, 22, 10, 0, tzinfo=timezone.utc)


def _round(rtype: str, budget: int = 2, duration: int = 20) -> dict:
    return {"id": "r1", "name": "Round", "type": rtype, "question_budget": budget, "duration_min": duration}


def _logged(action: str, kind: str | None = None, minute: int = 0, concluded: bool = False) -> dict:
    return {"action": action, "question_kind": kind, "gd_concluded": int(concluded), "at": (T0 + timedelta(minutes=minute)).isoformat()}


def _step(action: str, kind: str | None = None, round_id: str = "r1", gd: dict | None = None) -> OrchestratorStep:
    return OrchestratorStep.model_validate(dict(
        action=action, speech_text="", interviewer_name=None, round_id=round_id, round_type=None,
        question_kind=kind, blueprint=None, coding_problem=None, mcq_section=None, gd=gd, round_score=None, report=None,
    ))


def test_main_questions_counted_and_extra_main_rejected():
    steps = [_logged("ask_question", "main"), _logged("ask_question", "follow_up"), _logged("ask_question", "main")]
    p = compute_progress(_round("hr", budget=2), steps, 0, now=T0 + timedelta(minutes=5))
    assert (p.used, p.follow_ups, p.must_wrap_up) == (2, 0, False)
    assert violation(p, _step("ask_question", "main")) is not None
    assert violation(p, _step("ask_question", "follow_up")) is None


def test_follow_up_cap_then_wrap_up():
    steps = [_logged("ask_question", "main"), *[_logged("ask_question", "follow_up")] * MAX_FOLLOW_UPS]
    p = compute_progress(_round("technical", budget=1), steps, 0, now=T0)
    assert p.must_wrap_up
    assert violation(p, _step("ask_question", "follow_up")) is not None
    assert violation(p, _step("round_feedback")) is None


def test_overtime_forces_feedback():
    steps = [_logged("ask_question", "main", minute=0)]
    p = compute_progress(_round("behavioral", budget=5, duration=10), steps, 0, now=T0 + timedelta(minutes=12))
    assert p.must_wrap_up
    assert violation(p, _step("ask_question", "main")) is not None


def test_time_up_event_forces_feedback():
    p = compute_progress(_round("hr", budget=5), [_logged("ask_question", "main")], 0, now=T0, time_up=True)
    assert p.must_wrap_up


def test_coding_counts_problems_and_caps_follow_ups():
    steps = [_logged("present_coding_problem", "main"), _logged("ask_question", "follow_up")]
    p = compute_progress(_round("coding", budget=1), steps, 0, now=T0)
    assert (p.used, p.follow_ups) == (1, 1)
    assert violation(p, _step("present_coding_problem", "main")) is not None
    # a coding-round question is always a follow-up, whatever Opus labels it
    assert violation(p, _step("ask_question", "main")) is None


def test_gd_must_conclude_at_budget_then_feedback():
    steps = [_logged("gd_turns")]
    p = compute_progress(_round("group_discussion", budget=2), steps, candidate_turns=2, now=T0)
    assert p.must_conclude_gd and not p.must_wrap_up
    open_gd = {"topic": "t", "utterances": [], "concluded": False}
    assert violation(p, _step("gd_turns", gd=open_gd)) is not None
    assert violation(p, _step("gd_turns", gd={**open_gd, "concluded": True})) is None

    concluded = compute_progress(_round("group_discussion", budget=2), [*steps, _logged("gd_turns", concluded=True)], 3, now=T0)
    assert concluded.must_wrap_up
    assert violation(concluded, _step("gd_turns", gd=open_gd)) is not None


def test_mcq_section_size_must_match_budget():
    p = compute_progress(_round("aptitude_mcq", budget=2), [], 0, now=T0)
    assert p.unit == "mcq_section"
    q = {"id": "q", "question": "?", "options": ["a", "b"], "answer_index": 0, "explanation": ""}
    section = lambda n: {"name": "s", "time_limit_min": 5, "questions": [{**q, "id": f"q{i}"} for i in range(n)]}  # noqa: E731
    wrong = OrchestratorStep.model_validate({**_step("present_mcq_section").model_dump(), "mcq_section": section(5)})
    right = OrchestratorStep.model_validate({**_step("present_mcq_section").model_dump(), "mcq_section": section(2)})
    assert violation(p, wrong) is not None
    assert violation(p, right) is None


def test_other_round_steps_ignored_unless_wrap_up():
    p = compute_progress(_round("hr", budget=1), [_logged("ask_question", "main")], 0, now=T0)
    assert violation(p, _step("ask_question", "main", round_id="r2")) is None
    assert violation(None, _step("ask_question", "main")) is None
