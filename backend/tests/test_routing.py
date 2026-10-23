from __future__ import annotations

from app.budget import RoundProgress
from app.routing import CONTENT, FAST, JUDGE, needs_judge, route
from app.schemas import Action, EventType


def _progress(unit: str = "question", used: int = 1, budget: int = 3, wrap: bool = False) -> RoundProgress:
    return RoundProgress(
        round_id="r1", round_name="R", round_type="hr", unit=unit, budget=budget, used=used, follow_ups=0,
        max_follow_ups=2, elapsed_min=1, duration_min=10, must_wrap_up=wrap, must_conclude_gd=False, instruction="",
    )


def test_research_scoring_and_report_go_to_judge():
    assert route(EventType.start_interview, None, False, False) is JUDGE
    assert route(EventType.end_interview, None, False, False) is JUDGE
    assert route(EventType.time_up, _progress(), False, False) is JUDGE
    assert route(EventType.mcq_section_done, None, False, False) is JUDGE
    assert route(EventType.continue_, None, True, True) is JUDGE  # all rounds done -> final report


def test_round_start_uses_content_model_and_answers_use_fast_model():
    assert route(EventType.begin_rounds, None, True, False) is CONTENT
    assert route(EventType.candidate_answer, _progress(used=1), False, False) is FAST
    assert route(EventType.gd_user_spoke, _progress(unit="contribution", used=5, budget=2), False, False) is FAST


def test_judge_takes_over_once_the_round_can_end():
    assert route(EventType.candidate_answer, _progress(used=3, budget=3), False, False) is JUDGE
    assert route(EventType.code_submitted, _progress(unit="problem", used=1, budget=1), False, False) is JUDGE
    assert route(EventType.candidate_answer, _progress(wrap=True), False, False) is JUDGE


def test_fast_model_scores_are_redone_by_judge():
    assert needs_judge(FAST, Action.round_feedback)
    assert needs_judge(CONTENT, Action.final_report)
    assert not needs_judge(JUDGE, Action.round_feedback)
    assert not needs_judge(FAST, Action.ask_question)
