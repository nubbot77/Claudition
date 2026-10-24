from __future__ import annotations

import json

import pytest

from app.interview import InterviewService
from app.schemas import (
    CodingProblem, EventIn, EventType, InterviewProfile, McqQuestion, McqSection, OrchestratorStep,
    RoundScore, StarterCode,
)
from app.schemas import TestCase as Case
from app.store import Store


def _step(**payload) -> OrchestratorStep:
    base = dict(
        action="ask_question", speech_text="", interviewer_name=None, round_id="r1", round_type="coding",
        blueprint=None, coding_problem=None, mcq_section=None, gd=None, round_score=None, report=None,
    )
    base.update(payload)
    return OrchestratorStep.model_validate(base)


@pytest.fixture
def service(tmp_path) -> InterviewService:
    return InterviewService(Store(tmp_path / "test.db"))


def _seed(service: InterviewService, step: OrchestratorStep) -> dict:
    service.store.create_interview("iv1", InterviewProfile(company="Acme", role="SDE", experience="fresher").model_dump())
    service.store.update_interview("iv1", step=step.model_dump(mode="json"), status="ready")
    return service.store.get_interview("iv1")


def _data(built: tuple) -> dict:
    prompt, _progress = built
    return json.loads(prompt.split("DATA:\n", 1)[1])


def test_mcq_graded_on_server(service):
    section = McqSection(name="Quant", time_limit_min=10, questions=[
        McqQuestion(id="q1", question="1+1", options=["1", "2"], answer_index=1, explanation=""),
        McqQuestion(id="q2", question="2+2", options=["4", "5"], answer_index=0, explanation=""),
    ])
    interview = _seed(service, _step(action="present_mcq_section", round_type="aptitude_mcq", mcq_section=section))
    prompt = service._build_prompt(interview, EventIn(type=EventType.mcq_section_done, payload={"answers": {"q1": 1, "q2": None}}))
    data = _data(prompt)
    assert data["score"] == "1/2"
    assert data["unanswered"] == 1
    assert "Quant: 1/2 correct" in service.store.transcript("iv1")[-1]["text"]


def test_code_graded_with_hidden_tests(service):
    problem = CodingProblem(
        title="Echo", statement="", constraints=[], languages=["python"], time_limit_min=20,
        starter_code=[StarterCode(language="python", code="")],
        examples=[Case(input="1\n", expected_output="1")],
        hidden_tests=[Case(input="2\n", expected_output="2"), Case(input="3\n", expected_output="4")],
    )
    interview = _seed(service, _step(action="present_coding_problem", coding_problem=problem))
    code = "print(input())"
    data = _data(service._build_prompt(interview, EventIn(type=EventType.code_submitted, payload={"language": "python", "code": code})))
    assert data["examples"] == "1/1 passed"
    assert data["hidden_tests"] == "1/2 passed"
    assert len(data["first_failed_hidden_tests"]) == 1


def test_answer_event_carries_round_budget(service):
    blueprint = {
        "company": "Acme", "role": "SDE", "level": "fresher", "summary": "", "focus_areas": [], "question_bank": [],
        "conflicts": [], "rounds": [{
            "id": "r1", "order": 1, "type": "hr", "name": "HR", "duration_min": 10, "focus": [], "difficulty": "easy",
            "confidence": "high", "question_budget": 2, "sources": [], "notes": "",
        }],
    }
    question = _step(action="ask_question", round_type="hr", question_kind="main")
    interview = _seed(service, question)
    service.store.update_interview("iv1", blueprint=blueprint)
    service.store.log_step("iv1", "r1", "ask_question", "main", False)
    interview = service.store.get_interview("iv1")
    prompt, progress = service._build_prompt(interview, EventIn(type=EventType.candidate_answer, payload={"text": "hi"}))
    budget = _data((prompt, progress))["round_budget"]
    assert (budget["used"], budget["budget"], budget["must_wrap_up"]) == (1, 2, False)
    assert service.state("iv1")["round_progress"]["used"] == 1


def test_state_hides_answers_and_hidden_tests(service):
    problem = CodingProblem(
        title="Echo", statement="", constraints=[], languages=["python"], time_limit_min=20,
        starter_code=[], examples=[], hidden_tests=[Case(input="1", expected_output="1")],
    )
    _seed(service, _step(action="present_coding_problem", coding_problem=problem))
    state = json.dumps(service.state("iv1"))
    assert "hidden_tests" not in state
    assert '"hidden_test_count": 1' in state


def test_saved_score_fills_the_feedback_screen(service):
    score = RoundScore(round_id="r1", round_name="Coding", score=72, verdict="hire", rubric=[], strengths=[], gaps=[], model_answer="")
    interview = _seed(service, _step())
    service._record_step("iv1", interview, _step(action="round_feedback", speech_text="Thanks.", round_id="r1"))
    assert service.store.get_interview("iv1")["step"]["round_score"] is None  # closing line first
    service._save_score("iv1", score)
    assert service.store.round_scores("iv1")[0]["score"] == 72
    assert service.store.get_interview("iv1")["step"]["round_score"]["score"] == 72
    assert service.store.get_interview("iv1")["status"] == "ready"


def _judged(items: list[tuple[str, float, int]], score: int, verdict: str) -> RoundScore:
    rubric = [{"criterion": c, "weight": w, "score": s, "comment": ""} for c, w, s in items]
    return RoundScore(round_id="r1", round_name="HR", score=score, verdict=verdict, rubric=rubric,
                      strengths=[], gaps=[], model_answer="")


def test_guardrail_recomputes_score_and_verdict_from_the_rubric():
    from app.interview import _checked_score
    from app.rubrics import rubric_for
    from app.schemas import RoundType

    hr = rubric_for(RoundType.hr)
    # the judge says 95 strong_hire, but its own criterion scores (7, 6, 8, 12->10) and our weights give 75 -> hire
    raw = [(c.upper(), 0.25, s) for (c, _), s in zip(hr, (7, 6, 8, 12))]
    checked = _checked_score(_judged(raw, 95, "strong_hire"), RoundType.hr)
    assert [i.criterion for i in checked.rubric] == [c for c, _ in hr]  # names and weights from the rubric
    assert [i.weight for i in checked.rubric] == [w for _, w in hr]
    assert checked.rubric[3].score == 10  # clamped to 0-10
    assert checked.score == round(sum(w * s for (_, w), s in zip(hr, (7, 6, 8, 10))) * 10)
    assert checked.verdict == "hire"


def test_guardrail_normalises_weights_when_criteria_do_not_match():
    from app.interview import _checked_score
    from app.schemas import RoundType

    checked = _checked_score(_judged([("Made up", 2.0, 10), ("Other", 2.0, 0)], 90, "strong_hire"), RoundType.hr)
    assert checked.score == 50 and checked.verdict == "lean_no_hire"


def test_blueprint_cached_for_next_interview(service):
    blueprint = {
        "company": "Acme", "role": "SDE", "level": "fresher", "summary": "", "rounds": [],
        "focus_areas": [], "question_bank": [], "conflicts": [],
    }
    interview = _seed(service, _step())
    service._record_step("iv1", interview, _step(action="show_blueprint", round_id=None, round_type=None, blueprint=blueprint))
    key = Store.blueprint_key("Acme", "SDE", "fresher")
    assert service.store.cached_blueprint(key)["company"] == "Acme"
