"""End-to-end interview flow: the real InterviewService + Store + budget + grading, scripted fake orchestrator.

No Claude CLI is involved. `run_orchestrator` is replaced by a fake that pops pre-scripted steps and records every
prompt the service builds, so the tests can assert on what the interviewer would have been told at each turn.
`run_structured` (the separate judge and report calls) is replaced by FakeJudge, which returns fixed scores and
records what the judge would have read.
"""

from __future__ import annotations

import asyncio
import json
from collections import deque
from dataclasses import dataclass
from typing import Any

import pytest

from app import interview as interview_module
from app.claude_runner import ClaudeError, RunResult
from app.interview import Busy, InterviewService
from app.rubrics import rubric_for
from app.schemas import EventIn, EventType, InterviewProfile, OrchestratorStep, ReportDraft, RoundScore, RoundType
from app.store import Store

APT, GD, CODE, HR = "r1-apt", "r2-gd", "r3-code", "r4-hr"
SCORES = {APT: ("Aptitude", 50), GD: ("Group Discussion", 70), CODE: ("Coding", 60), HR: ("HR", 80)}
TYPES = {APT: "aptitude_mcq", GD: "group_discussion", CODE: "coding", HR: "hr"}
PROFILE = InterviewProfile(company="Acme Corp", role="Software Engineer", experience="fresher")
BLUEPRINT_KEY = Store.blueprint_key("Acme Corp", "Software Engineer", "fresher")

# Passes both examples but prints a negative number whenever a < b, so the hidden test "3 9" fails.
BUGGY_SOLUTION = "a, b = map(int, input().split())\nprint(a - b)\n"


# ---------- scripted steps ----------


def _step(action: str, round_id: str | None = None, round_type: str | None = None, speech: str = "", **fields: Any) -> OrchestratorStep:
    base = dict(
        action=action, speech_text=speech, interviewer_name="Asha", round_id=round_id, round_type=round_type,
        question_kind=None, blueprint=None, coding_problem=None, mcq_section=None, gd=None, round_score=None, report=None,
    )
    return OrchestratorStep.model_validate(base | fields)


def _round(order: int, round_id: str, round_type: str, name: str, budget: int, duration: int = 20) -> dict:
    return {
        "id": round_id, "order": order, "type": round_type, "name": name, "duration_min": duration, "focus": [],
        "difficulty": "easy", "confidence": "high", "question_budget": budget, "sources": [], "notes": "",
    }


def _blueprint(rounds: list[dict] | None = None) -> dict:
    rounds = rounds or [
        _round(1, APT, "aptitude_mcq", "Aptitude", 2),
        _round(2, GD, "group_discussion", "Group Discussion", 2),
        _round(3, CODE, "coding", "Coding", 1),
        _round(4, HR, "hr", "HR", 2),
    ]
    return {
        "company": "Acme Corp", "role": "Software Engineer", "level": "fresher", "summary": "", "rounds": rounds,
        "focus_areas": [], "question_bank": [], "conflicts": [],
    }


def _blueprint_step(rounds: list[dict] | None = None) -> OrchestratorStep:
    return _step("show_blueprint", speech="Here is the plan.", blueprint=_blueprint(rounds))


def _mcq_step() -> OrchestratorStep:
    questions = [
        {"id": "q1", "question": "12 x 12 = ?", "options": ["124", "144"], "answer_index": 1, "explanation": "12 * 12 = 144"},
        {"id": "q2", "question": "Next in 2, 4, 8?", "options": ["16", "12"], "answer_index": 0, "explanation": "doubling"},
    ]
    section = {"name": "Quant", "time_limit_min": 10, "questions": questions}
    return _step("present_mcq_section", APT, "aptitude_mcq", "Here is your aptitude section.", mcq_section=section)


def _gd(concluded: bool, line: str) -> OrchestratorStep:
    gd = {
        "topic": "Remote work", "concluded": concluded,
        "utterances": [{"speaker": "Ravi", "persona": "pragmatic sceptic", "text": line}],
    }
    speech = "Time to wrap up. Please summarise the discussion." if concluded else "Over to you."
    return _step("gd_turns", GD, "group_discussion", speech, gd=gd)


def _code_step() -> OrchestratorStep:
    def case(stdin: str, expected: str) -> dict:
        return {"input": stdin, "expected_output": expected}

    problem = {
        "title": "Absolute difference", "statement": "Read a and b, print |a - b|.", "constraints": ["|a|, |b| <= 10^9"],
        "examples": [case("5 3\n", "2"), case("8 8\n", "0")],
        "hidden_tests": [case("10 4\n", "6"), case("3 9\n", "6"), case("100 1\n", "99")],
        "languages": ["python"], "starter_code": [{"language": "python", "code": "a, b = map(int, input().split())\n"}],
        "time_limit_min": 20,
    }
    return _step("present_coding_problem", CODE, "coding", "Here is your problem.", question_kind="main", coding_problem=problem)


def _question(round_id: str, round_type: str, kind: str, text: str) -> OrchestratorStep:
    return _step("ask_question", round_id, round_type, text, question_kind=kind)


def _score(round_id: str) -> dict:
    """A judge result that uses the round type's real rubric, every criterion at score/10 (consistent arithmetic)."""
    name, score = SCORES[round_id]
    rubric = rubric_for(RoundType(TYPES[round_id]))
    return {
        "round_id": round_id, "round_name": name, "score": score, "verdict": "hire", "strengths": ["Clear"],
        "gaps": ["Edge cases"], "model_answer": "...",
        "rubric": [{"criterion": c, "weight": w, "score": score // 10, "comment": "ok"} for c, w in rubric],
    }


def _feedback(round_id: str, round_type: str) -> OrchestratorStep:
    # the interviewer only closes the round; the separate judge (FakeJudge) adds the score
    return _step("round_feedback", round_id, round_type, "Thanks, that wraps this round.")


REPORT_DRAFT = {
    "overall_score": 64, "verdict": "lean_hire", "summary": "Solid basics, missed an edge case.",
    "top_strengths": ["Communication"], "top_gaps": ["Edge cases"],
    "prep_plan_7d": [{"day": 1, "focus": "Edge cases", "tasks": ["Practise five easy array problems"]}],
}


def _final_report() -> OrchestratorStep:
    return _step("final_report", speech="That is the end of the interview.")


# ---------- fake orchestrator and driver ----------


@dataclass
class Call:
    prompt: str
    first_turn: bool
    status: str  # interview status in the DB while the orchestrator was "running"


class FakeOrchestrator:
    """Stands in for run_orchestrator: pops scripted steps (or raises scripted errors) and records every prompt."""

    def __init__(self, service: InterviewService) -> None:
        self.service = service
        self.script: deque[OrchestratorStep | Exception] = deque()
        self.calls: list[Call] = []
        self.sessions: set[str] = set()

    def session_exists(self, session_id: str) -> bool:
        return session_id in self.sessions

    def __call__(self, prompt: str, *, session_id: str, first_turn: bool, **_ignored: Any) -> tuple[OrchestratorStep, RunResult]:
        status = self.service.store.get_interview(session_id)["status"]
        self.calls.append(Call(prompt, first_turn, status))
        assert self.script, f"orchestrator called with nothing scripted:\n{prompt}"
        step = self.script.popleft()
        if isinstance(step, Exception):
            raise step
        self.sessions.add(session_id)
        return step, RunResult(structured=step.model_dump(mode="json"), session_id=session_id, text="", cost_usd=0.01)


class FakeJudge:
    """Stands in for run_structured: fixed RoundScores from SCORES and a fixed report draft; records every prompt."""

    def __init__(self) -> None:
        self.judged: list[tuple[str, str]] = []  # (round_id, prompt)
        self.reports: list[dict[str, Any]] = []

    def __call__(self, prompt: str, model_type: type, **_ignored: Any) -> tuple[Any, RunResult]:
        data = json.loads(prompt.split("DATA:\n", 1)[1].split("\n\nROUND TRANSCRIPT:", 1)[0])
        if model_type is RoundScore:
            round_id = data["round"]["id"]
            self.judged.append((round_id, prompt))
            value = RoundScore.model_validate(_score(round_id))
        else:
            assert model_type is ReportDraft
            self.reports.append(data)
            value = ReportDraft.model_validate(REPORT_DRAFT)
        return value, RunResult(structured=value.model_dump(mode="json"), session_id=None, text="", cost_usd=0.02)


async def _settle(service: InterviewService) -> None:
    while service._tasks:
        await asyncio.gather(*service._tasks)
        await asyncio.sleep(0)


class Flow:
    """Drives one interview: script the steps for a turn, send the event, wait for the background task."""

    def __init__(self, service: InterviewService, fake: FakeOrchestrator) -> None:
        self.service, self.fake = service, fake
        self.iid = ""
        self.turn: list[Call] = []  # orchestrator calls of the latest turn (more than one when a budget nudge was sent)

    @property
    def prompt(self) -> str:
        return self.turn[0].prompt

    @property
    def data(self) -> dict[str, Any]:
        return json.loads(self.prompt.split("DATA:\n", 1)[1])

    async def start(self, *steps: OrchestratorStep, profile: InterviewProfile = PROFILE) -> dict[str, Any]:
        self.fake.script.extend(steps)
        before = len(self.fake.calls)
        self.iid = self.service.create(profile)
        return await self._finish(before)

    async def send(self, event_type: EventType, *steps: OrchestratorStep, **payload: Any) -> dict[str, Any]:
        self.fake.script.extend(steps)
        before = len(self.fake.calls)
        self.service.submit(self.iid, EventIn(type=event_type, payload=payload))
        return await self._finish(before)

    async def _finish(self, before: int) -> dict[str, Any]:
        thinking = self.service.state(self.iid)
        assert thinking["status"] == "thinking" and thinking["thinking_since"]
        with pytest.raises(Busy):  # the UI cannot send a second event while a turn runs
            self.service.submit(self.iid, EventIn(type=EventType.end_interview))
        await _settle(self.service)
        state = self.service.state(self.iid)
        assert state["status"] in ("ready", "finished"), state["error"]
        assert state["thinking_since"] is None
        assert not self.fake.script, "scripted steps left unused"
        self.turn = self.fake.calls[before:]
        return state


def _upcoming(data: dict[str, Any]) -> tuple[str, str, int]:
    assert "all_rounds_done" not in data
    nxt = data["next_round"]
    return nxt["id"], nxt["type"], nxt["question_budget"]


def _used(state: dict[str, Any]) -> tuple[int, int]:
    progress = state["round_progress"]
    return progress["used"], progress["budget"]


def _keys(node: Any) -> set[str]:
    if isinstance(node, dict):
        return set(node) | {key for value in node.values() for key in _keys(value)}
    if isinstance(node, list):
        return {key for value in node for key in _keys(value)}
    return set()


def _assert_nothing_secret(state: dict[str, Any]) -> None:
    assert not {"hidden_tests", "answer_index", "explanation"} & _keys(state)


def _said(state: dict[str, Any], fragment: str) -> bool:
    """Whether any transcript line (interviewer, panelist, candidate or system) contains `fragment`."""
    return any(fragment in entry["text"] for entry in state["transcript"])


@pytest.fixture
def service(tmp_path) -> InterviewService:
    return InterviewService(Store(tmp_path / "e2e.db"))


@pytest.fixture
def judge(monkeypatch) -> FakeJudge:
    judge = FakeJudge()
    monkeypatch.setattr(interview_module, "run_structured", judge)
    return judge


@pytest.fixture
def warmed(monkeypatch) -> list[str]:
    keys: list[str] = []
    monkeypatch.setattr(interview_module, "prewarm", lambda key, **_: keys.append(key))
    monkeypatch.setattr(interview_module, "discard_prewarmed", lambda prefix: None)
    return keys


@pytest.fixture
def fake(service, monkeypatch, judge, warmed) -> FakeOrchestrator:
    fake = FakeOrchestrator(service)
    monkeypatch.setattr(interview_module, "run_orchestrator", fake)
    monkeypatch.setattr(interview_module, "session_exists", fake.session_exists)
    return fake


# ---------- tests ----------


def test_full_interview_from_blueprint_to_final_report(service, fake, judge, warmed):
    asyncio.run(_full_interview(Flow(service, fake), judge))
    # a judge process is pre-started at each round start, a report process once the last round is judged
    assert [k.split(':')[1] for k in warmed] == ['judge', 'judge', 'judge', 'judge', 'report']


async def _full_interview(flow: Flow, judge: FakeJudge) -> None:
    service, fake = flow.service, flow.fake

    # research -> blueprint (cached for the next interview with the same company/role/level)
    state = await flow.start(_blueprint_step())
    assert flow.prompt.startswith("EVENT: start_interview")
    assert flow.data["profile"]["company"] == "Acme Corp"
    assert "aptitude_mcq" in flow.data["supported_round_types"]
    assert "cached_blueprint" not in flow.data
    assert state["status"] == "ready" and state["round_progress"] is None
    assert [r["id"] for r in state["blueprint"]["rounds"]] == [APT, GD, CODE, HR]
    assert len(service.store.cached_blueprint(BLUEPRINT_KEY)["rounds"]) == 4
    assert any("$0.010" in line for line in state["progress"])

    # round 1: aptitude MCQ, graded on the server (one right, one wrong)
    state = await flow.send(EventType.begin_rounds, _mcq_step())
    assert _upcoming(flow.data) == (APT, "aptitude_mcq", 2)
    assert state["round_progress"]["budget"] == 2 and "exactly 2 questions" in state["round_progress"]["instruction"]
    assert [q["id"] for q in state["step"]["mcq_section"]["questions"]] == ["q1", "q2"]
    _assert_nothing_secret(state)

    state = await flow.send(
        EventType.mcq_section_done, _feedback(APT, "aptitude_mcq"), answers={"q1": 1, "q2": 1}, seconds_taken=95,
    )
    assert flow.data["score"] == "1/2" and flow.data["unanswered"] == 0
    assert [(g["id"], g["right"]) for g in flow.data["per_question"]] == [("q1", True), ("q2", False)]
    assert flow.data["round_budget"]["round_id"] == APT
    assert _said(state, "Quant: 1/2 correct")
    assert [s["round_id"] for s in state["round_scores"]] == [APT]
    assert state["round_progress"] is None
    _assert_nothing_secret(state)

    # round 2: group discussion with a 2-contribution budget
    state = await flow.send(EventType.continue_, _gd(False, "Remote work boosts focus."))
    assert _upcoming(flow.data) == (GD, "group_discussion", 2)
    assert _used(state) == (0, 2)
    assert state["step"]["gd"]["concluded"] is False

    state = await flow.send(EventType.gd_user_spoke, _gd(False, "Offices help juniors learn."), text="Hybrid works best.")
    assert (flow.data["round_budget"]["used"], flow.data["round_budget"]["must_conclude_gd"]) == (1, False)
    assert _used(state) == (1, 2)

    # contribution 2 hits the budget: an open-ended GD turn is rejected once, the concluded one is accepted
    state = await flow.send(
        EventType.gd_user_spoke, _gd(False, "PREMATURE open turn"), _gd(True, "Fair points all round."),
        text="Trust and tooling matter more than location.",
    )
    assert flow.data["round_budget"]["must_conclude_gd"] is True
    assert len(flow.turn) == 2
    nudge = flow.turn[1]
    assert nudge.prompt.startswith("BUDGET CHECK:") and "conclude" in nudge.prompt and not nudge.first_turn
    assert any(line.startswith("Budget check:") for line in state["progress"])
    assert state["step"]["gd"]["concluded"] is True and _used(state) == (2, 2)
    assert not _said(state, "PREMATURE open turn")
    assert [s["action"] for s in service.store.round_steps(flow.iid, GD)] == ["gd_turns"] * 3  # rejected step not logged

    state = await flow.send(EventType.gd_user_spoke, _feedback(GD, "group_discussion"), text="Summary: hybrid, with trust.")
    assert flow.data["round_budget"]["must_wrap_up"] is True
    assert [s["round_id"] for s in state["round_scores"]] == [APT, GD]

    # round 3: coding, a solution that passes the examples but fails one hidden test
    state = await flow.send(EventType.continue_, _code_step())
    assert _upcoming(flow.data) == (CODE, "coding", 1)
    assert _used(state) == (1, 1)
    assert state["step"]["coding_problem"]["hidden_test_count"] == 3
    _assert_nothing_secret(state)

    followup = _question(CODE, "coding", "follow_up", "What happens when a is smaller than b?")
    state = await flow.send(
        EventType.code_submitted, followup, language="python", code=BUGGY_SOLUTION, explanation="Plain subtraction.",
    )
    assert flow.data["compile_error"] is None
    assert flow.data["examples"] == "2/2 passed"
    assert flow.data["hidden_tests"] == "2/3 passed"
    failed = flow.data["first_failed_hidden_tests"]
    assert [t["input"] for t in failed] == ["3 9\n"]
    assert (failed[0]["expected_output"], failed[0]["actual_output"].strip()) == ("6", "-6")
    assert _said(state, "Submitted python solution: examples 2/2, hidden tests 2/3")
    assert _used(state) == (1, 1) and state["round_progress"]["follow_ups"] == 1
    _assert_nothing_secret(state)

    state = await flow.send(EventType.candidate_answer, _feedback(CODE, "coding"), text="I should use abs().")
    assert flow.data["round_budget"]["follow_ups"] == 1 and not flow.data["round_budget"]["must_wrap_up"]
    assert [s["round_id"] for s in state["round_scores"]] == [APT, GD, CODE]

    # round 4: HR with 2 main questions; a third one is rejected once and replaced by the round feedback
    state = await flow.send(EventType.continue_, _question(HR, "hr", "main", "Tell me about yourself."))
    assert _upcoming(flow.data) == (HR, "hr", 2)
    assert _used(state) == (1, 2)

    state = await flow.send(EventType.candidate_answer, _question(HR, "hr", "main", "Why Acme?"), text="I like to build.")
    assert flow.data["round_budget"]["used"] == 1
    assert _used(state) == (2, 2)

    state = await flow.send(
        EventType.candidate_answer, _question(HR, "hr", "main", "THIRD main question"), _feedback(HR, "hr"),
        text="Because of the mentoring culture.",
    )
    assert (flow.data["round_budget"]["used"], flow.data["round_budget"]["budget"]) == (2, 2)
    assert len(flow.turn) == 2
    nudge = flow.turn[1]
    assert nudge.prompt.startswith("BUDGET CHECK:") and "all 2 main questions were already asked" in nudge.prompt
    assert not nudge.first_turn
    assert state["step"]["action"] == "round_feedback" and state["round_progress"] is None
    assert [s["action"] for s in service.store.round_steps(flow.iid, HR)] == ["ask_question", "ask_question", "round_feedback"]
    assert not _said(state, "THIRD main question")

    # all rounds done -> final report, interview finished
    state = await flow.send(EventType.continue_, _final_report())
    assert flow.data["all_rounds_done"] is True and flow.data["next_round"] is None
    assert state["status"] == "finished" and state["step"]["action"] == "final_report"
    assert state["round_progress"] is None
    assert [(s["round_id"], s["score"]) for s in state["round_scores"]] == [(rid, SCORES[rid][1]) for rid in SCORES]
    _assert_nothing_secret(state)

    # scoring happened outside the interview session, once per round, from the round's own evidence
    assert [rid for rid, _ in judge.judged] == [APT, GD, CODE, HR]
    prompts = dict(judge.judged)
    assert "12 x 12" in prompts[APT] and '"correct": 1' in prompts[APT]  # MCQ questions with the right answers
    assert "print(a - b)" in prompts[CODE] and "hidden tests 2/3" in prompts[CODE]  # the submitted code itself
    assert "Remote work" not in prompts[HR]  # another round's material stays out
    assert state["step"]["report"]["round_scores"] == state["round_scores"]  # report reuses saved scores
    assert [r["round_id"] for r in judge.reports[0]["judged_rounds"]] == [APT, GD, CODE, HR]
    assert not any("round_score" in c.prompt or "recorded_round_scores" in c.prompt for c in fake.calls)
    assert '"seconds_taken": 95' in prompts[APT]  # time management evidence for the aptitude rubric
    assert '"stances"' in prompts[GD]  # who argued what in the group discussion
    assert '"resume"' not in prompts[APT] and '"resume"' in prompts[HR]  # background only for background rounds
    assert judge.reports[0]["research"]["round_notes"]  # the report's claims about the real process have a source
    assert state["step"]["report"]["verdict"] == "lean_hire"  # recomputed from the overall score (64)

    # whole-run invariants
    assert len(fake.calls) == 16  # 14 turns + 2 budget nudges
    assert sum(c.prompt.startswith("BUDGET CHECK:") for c in fake.calls) == 2
    assert [c.first_turn for c in fake.calls] == [True] + [False] * 15  # only the very first call starts a session
    assert {c.status for c in fake.calls} == {"thinking"}


def test_budget_nudge_is_sent_only_once(service, fake):
    async def scenario() -> None:
        flow = Flow(service, fake)
        await flow.start(_blueprint_step([_round(1, HR, "hr", "HR", budget=1)]))
        await flow.send(EventType.begin_rounds, _question(HR, "hr", "main", "Tell me about yourself."))

        # Opus breaks the one-question budget twice in a row: one nudge, then the second step is accepted as is
        state = await flow.send(
            EventType.candidate_answer, _question(HR, "hr", "main", "Second?"), _question(HR, "hr", "main", "Third?"),
            text="I am a builder.",
        )
        assert [c.prompt.startswith("BUDGET CHECK:") for c in flow.turn] == [False, True]
        assert state["status"] == "ready" and state["step"]["speech_text"] == "Third?"
        assert "Budget still exceeded after one retry; accepting the step." in state["progress"]
        assert _used(state) == (2, 1)

    asyncio.run(scenario())


def test_failed_turn_surfaces_error_and_retry_resends_the_event(service, fake):
    async def scenario() -> None:
        fake.script.extend([ClaudeError("Claude plan usage limit hit."), RuntimeError("boom"), _blueprint_step()])
        iid = service.create(PROFILE)
        await _settle(service)
        state = service.state(iid)
        assert (state["status"], state["error"]) == ("error", "Claude plan usage limit hit.")
        assert state["step"] is None and state["thinking_since"] is None

        service.retry(iid)
        assert service.state(iid)["status"] == "thinking" and service.state(iid)["error"] is None
        await _settle(service)
        state = service.state(iid)
        assert (state["status"], state["error"]) == ("error", "RuntimeError: boom")

        service.retry(iid)
        await _settle(service)
        state = service.state(iid)
        assert (state["status"], state["error"]) == ("ready", None)
        assert state["step"]["action"] == "show_blueprint"
        assert len({c.prompt for c in fake.calls}) == 1  # every attempt got the very same start_interview prompt
        with pytest.raises(Busy):  # retry is only for interviews in the error state
            service.retry(iid)

    asyncio.run(scenario())


def test_second_interview_for_same_company_reuses_cached_blueprint(service, fake):
    async def scenario() -> None:
        first = Flow(service, fake)
        await first.start(_blueprint_step())
        assert "cached_blueprint" not in first.data

        again = InterviewProfile(company=" ACME corp ", role="software engineer", experience="Fresher")
        second = Flow(service, fake)
        state = await second.start(_blueprint_step(), profile=again)
        assert [r["id"] for r in second.data["cached_blueprint"]["rounds"]] == [APT, GD, CODE, HR]
        assert "Using cached research for this company and role" in state["progress"]
        assert second.iid != first.iid and second.turn[0].first_turn  # a new interview is a new session

    asyncio.run(scenario())
