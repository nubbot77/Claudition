from __future__ import annotations

from app.routing import CONTENT, FAST, RESEARCH, route
from app.schemas import EventType


def test_research_uses_the_research_model() -> None:
    assert route(EventType.start_interview, False) is RESEARCH


def test_round_start_uses_content_model_and_everything_else_the_fast_model() -> None:
    assert route(EventType.begin_rounds, True) is CONTENT
    assert route(EventType.continue_, True) is CONTENT
    for event in (EventType.candidate_answer, EventType.time_up, EventType.mcq_section_done, EventType.end_interview):
        assert route(event, False) is FAST


def test_interview_session_never_switches_away_from_the_interviewer_model() -> None:
    assert CONTENT.model == FAST.model
