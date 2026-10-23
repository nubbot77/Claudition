"""Pydantic models shared by Claude (via --json-schema), the backend and the frontend.

OrchestratorStep is the single shape Opus returns on every turn. It is a flat object:
`action` says what the UI should render, and only the matching payload field is filled.
"""

from __future__ import annotations

from enum import Enum
from typing import Any, Literal

from pydantic import BaseModel, Field


class RoundType(str, Enum):
    aptitude_mcq = "aptitude_mcq"
    coding = "coding"
    technical = "technical"
    system_design = "system_design"
    behavioral = "behavioral"
    hr = "hr"
    managerial = "managerial"
    group_discussion = "group_discussion"


class Action(str, Enum):
    show_blueprint = "show_blueprint"
    ask_question = "ask_question"
    present_coding_problem = "present_coding_problem"
    present_mcq_section = "present_mcq_section"
    gd_turns = "gd_turns"
    round_feedback = "round_feedback"
    final_report = "final_report"


Language = Literal["python", "javascript", "java", "cpp"]
Verdict = Literal["strong_hire", "hire", "lean_hire", "lean_no_hire", "no_hire"]


# ---------- research blueprint ----------


class Source(BaseModel):
    url: str
    title: str
    date: str | None = Field(None, description="Publication date like 2025-08 if known")


class BlueprintRound(BaseModel):
    id: str = Field(description="Short slug, e.g. r1-oa")
    order: int
    type: RoundType
    name: str
    duration_min: int
    focus: list[str]
    difficulty: Literal["easy", "medium", "hard"]
    confidence: Literal["low", "medium", "high"]
    question_budget: int = Field(
        4,
        description="Always set. Main questions (conversational rounds), problems (coding), "
        "questions per section (aptitude_mcq) or candidate contributions before concluding (group_discussion)",
    )
    sources: list[Source]
    notes: str


class QuestionRef(BaseModel):
    question: str
    round_type: RoundType
    source_url: str | None


class CompanyBlueprint(BaseModel):
    company: str
    role: str
    level: str
    summary: str
    rounds: list[BlueprintRound]
    focus_areas: list[str]
    question_bank: list[QuestionRef]
    conflicts: list[str] = Field(description="Where sources disagree, e.g. test length")


# ---------- round payloads ----------


class TestCase(BaseModel):
    input: str = Field(description="Exact stdin fed to the program")
    expected_output: str = Field(description="Exact expected stdout")


class StarterCode(BaseModel):
    language: Language
    code: str


class CodingProblem(BaseModel):
    title: str
    statement: str
    constraints: list[str]
    examples: list[TestCase]
    hidden_tests: list[TestCase]
    languages: list[Language]
    starter_code: list[StarterCode]
    time_limit_min: int


class McqQuestion(BaseModel):
    id: str
    question: str
    options: list[str]
    answer_index: int
    explanation: str


class McqSection(BaseModel):
    name: str
    time_limit_min: int
    questions: list[McqQuestion]


class GdUtterance(BaseModel):
    speaker: str
    persona: str = Field(description="One-line stance, e.g. 'data-driven sceptic'")
    text: str


class GdState(BaseModel):
    topic: str
    utterances: list[GdUtterance]
    concluded: bool


class RubricItem(BaseModel):
    criterion: str
    weight: float
    score: int = Field(description="0-10")
    comment: str


class RoundScore(BaseModel):
    round_id: str
    round_name: str
    score: int = Field(description="0-100, weighted from rubric")
    verdict: Verdict
    rubric: list[RubricItem]
    strengths: list[str]
    gaps: list[str]
    model_answer: str


class DayPlan(BaseModel):
    day: int
    focus: str
    tasks: list[str]


class FinalReport(BaseModel):
    overall_score: int
    verdict: Verdict
    summary: str
    round_scores: list[RoundScore]
    top_strengths: list[str]
    top_gaps: list[str]
    prep_plan_7d: list[DayPlan]


class OrchestratorStep(BaseModel):
    action: Action
    speech_text: str = Field(description="What the interviewer says aloud now; may be empty")
    interviewer_name: str | None
    round_id: str | None
    round_type: RoundType | None
    question_kind: Literal["main", "follow_up"] | None = Field(
        None, description="For ask_question / present_coding_problem: a new question or problem is main; a probe on the current one is follow_up"
    )
    blueprint: CompanyBlueprint | None
    coding_problem: CodingProblem | None
    mcq_section: McqSection | None
    gd: GdState | None
    round_score: RoundScore | None
    report: FinalReport | None


# ---------- API models ----------


class InterviewProfile(BaseModel):
    company: str
    role: str
    experience: str = Field(description="e.g. fresher, 1-2 years")
    job_description: str = ""
    resume_text: str = ""
    notes: str = ""


class EventType(str, Enum):
    start_interview = "start_interview"
    begin_rounds = "begin_rounds"
    candidate_answer = "candidate_answer"
    code_submitted = "code_submitted"
    mcq_section_done = "mcq_section_done"
    gd_user_spoke = "gd_user_spoke"
    continue_ = "continue"
    time_up = "time_up"
    end_interview = "end_interview"


class EventIn(BaseModel):
    type: EventType
    payload: dict[str, Any] = {}


class CodeRunIn(BaseModel):
    language: Language
    code: str
    tests: list[TestCase]


def public_step(step: OrchestratorStep) -> dict[str, Any]:
    """Step as sent to the browser: hidden tests and MCQ answers stay on the server."""
    data = step.model_dump(mode="json")
    if data.get("coding_problem"):
        data["coding_problem"]["hidden_test_count"] = len(data["coding_problem"].pop("hidden_tests"))
    if data.get("mcq_section"):
        for q in data["mcq_section"]["questions"]:
            q.pop("answer_index", None)
            q.pop("explanation", None)
    return data
