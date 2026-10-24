"""Interview service: turns UI events into interviewer turns, has rounds judged, stores the results.

The interview conversation runs on one model in one session. Scoring is separate: when the interviewer
closes a round, a one-off judge call reads only that round's transcript and evidence; the final report
is written from the saved round scores.
"""

from __future__ import annotations

import asyncio
import json
import uuid
from datetime import date
from pathlib import Path
from typing import Any

from .budget import CONVERSATIONAL, RoundProgress, compute_progress, violation
from .claude_runner import (
    DATA_DIR, ClaudeError, close_session, discard_prewarmed, json_schema_for, prewarm, run_orchestrator,
    run_structured,
)
from .routing import JUDGE, Route, route
from .code_runner import available_languages, run_tests
from .diagram import describe as describe_diagram
from .rubrics import CALIBRATION, rubric_for, verdict_for
from .schemas import (
    Action, EventIn, EventType, FinalReport, InterviewProfile, OrchestratorStep, ReportDraft, RoundScore, RoundType,
    public_step,
)
from .store import Store, now

PROMPTS_DIR = Path(__file__).parent / "prompts"
PROMPT_TEMPLATE = PROMPTS_DIR / "orchestrator.md"
JUDGE_PROMPT_FILE = PROMPTS_DIR / "judge.md"
REPORT_PROMPT_FILE = PROMPTS_DIR / "report.md"
SYSTEM_PROMPT_FILE = DATA_DIR / "orchestrator_prompt.md"
CLAUDE_PROJECTS_DIR = Path.home() / ".claude" / "projects"

RESEARCH_TIMEOUT_S = 15 * 60
TURN_TIMEOUT_S = 6 * 60
JUDGE_TIMEOUT_S = 5 * 60
MAX_CODE_CHARS = 8000
# what the judge and report writer get from the candidate's own material (characters)
MAX_JD_CHARS = 3000
MAX_RESUME_CHARS = 4000
MAX_NOTES_CHARS = 1000
MAX_BANK_QUESTIONS = 8
MAX_PROGRESS_LINES = 40


class Busy(Exception):
    pass


class NotFound(Exception):
    pass


def render_system_prompt() -> Path:
    SYSTEM_PROMPT_FILE.parent.mkdir(parents=True, exist_ok=True)
    SYSTEM_PROMPT_FILE.write_text(PROMPT_TEMPLATE.read_text(encoding="utf-8"), encoding="utf-8")
    return SYSTEM_PROMPT_FILE


def session_exists(session_id: str) -> bool:
    return any(CLAUDE_PROJECTS_DIR.glob(f"*/{session_id}.jsonl"))


def _round_summary(rnd: dict[str, Any] | None) -> dict[str, Any] | None:
    if rnd is None:
        return None
    keys = ("id", "name", "type", "question_budget", "duration_min")
    return {k: rnd.get(k) for k in keys}


def _next_round(blueprint: dict[str, Any] | None, current_round_id: str | None) -> dict[str, Any] | None:
    rounds = sorted((blueprint or {}).get("rounds", []), key=lambda r: r["order"])
    if current_round_id is None:
        return rounds[0] if rounds else None
    orders = [r["order"] for r in rounds if r["id"] == current_round_id]
    later = [r for r in rounds if orders and r["order"] > orders[0]]
    return later[0] if later else None


def _event_prompt(event_type: str, round_id: str | None, data: dict[str, Any]) -> str:
    head = f"EVENT: {event_type}"
    if round_id:
        head += f"\nROUND: {round_id}"
    return f"{head}\nDATA:\n{json.dumps(data, ensure_ascii=False, indent=1)}"


class InterviewService:
    def __init__(self, store: Store) -> None:
        self.store = store
        self.progress: dict[str, list[str]] = {}
        self.thinking_since: dict[str, str] = {}
        self._tasks: set[asyncio.Task[None]] = set()
        # rounds being scored in the background: interview id -> round id -> task
        self.judging: dict[str, dict[str, asyncio.Task[None]]] = {}

    # ---------- public API ----------

    def create(self, profile: InterviewProfile) -> str:
        interview_id = str(uuid.uuid4())
        self.store.create_interview(interview_id, profile.model_dump())
        self._launch(interview_id, EventIn(type=EventType.start_interview))
        return interview_id

    def submit(self, interview_id: str, event: EventIn) -> None:
        interview = self._get(interview_id)
        if interview["status"] == "thinking":
            raise Busy()
        self._launch(interview_id, event)

    def retry(self, interview_id: str) -> None:
        interview = self._get(interview_id)
        if interview["status"] != "error" or not interview["last_event"]:
            raise Busy()
        self._launch(interview_id, EventIn.model_validate(interview["last_event"]))

    def state(self, interview_id: str) -> dict[str, Any]:
        interview = self._get(interview_id)
        step = interview["step"]
        progress = None
        if step and step.get("round_id") and step["action"] not in ("round_feedback", "show_blueprint", "final_report"):
            if found := self._round_progress(interview, step["round_id"]):
                progress = found.as_dict()
        return {
            "round_progress": progress,
            "id": interview_id,
            "profile": interview["profile"],
            "status": interview["status"],
            "progress": self.progress.get(interview_id, []),
            "thinking_since": self.thinking_since.get(interview_id),
            "error": interview["error"],
            "step": public_step(OrchestratorStep.model_validate(step)) if step else None,
            "transcript": self.store.transcript(interview_id),
            "round_scores": self.store.round_scores(interview_id),
            "scoring": sorted(self.judging.get(interview_id, {})),
            "blueprint": interview["blueprint"],
        }

    # ---------- turn execution ----------

    def _get(self, interview_id: str) -> dict[str, Any]:
        interview = self.store.get_interview(interview_id)
        if interview is None:
            raise NotFound()
        return interview

    def _launch(self, interview_id: str, event: EventIn) -> None:
        self.store.update_interview(
            interview_id, status="thinking", error=None, last_event=event.model_dump(mode="json")
        )
        self.progress[interview_id] = []
        self.thinking_since[interview_id] = now()
        task = asyncio.create_task(self._run_turn(interview_id, event))
        self._tasks.add(task)
        task.add_done_callback(self._tasks.discard)

    def _note(self, interview_id: str, line: str) -> None:
        lines = self.progress.setdefault(interview_id, [])
        lines.append(line)
        del lines[:-MAX_PROGRESS_LINES]

    async def _run_turn(self, interview_id: str, event: EventIn) -> None:
        interview = self._get(interview_id)
        research = event.type == EventType.start_interview
        timeout = RESEARCH_TIMEOUT_S if research else TURN_TIMEOUT_S

        def ask(prompt: str, first_turn: bool, how: Route):
            self._note(interview_id, f"{how.role.capitalize()}: {how.model.removeprefix('claude-')} ({how.effort} effort)")
            return run_orchestrator(
                prompt, session_id=interview_id, first_turn=first_turn, system_prompt_file=SYSTEM_PROMPT_FILE,
                timeout_s=timeout, on_progress=lambda line: self._note(interview_id, line),
                model=how.model, effort=how.effort, research=research,
            )

        try:
            prompt, progress = await asyncio.to_thread(self._build_prompt, interview, event)
            how = self._route(interview, event, progress)
            step, result = await asyncio.to_thread(ask, prompt, not session_exists(interview_id), how)
            if reason := violation(progress, step):
                assert progress is not None
                self._note(interview_id, f"Budget check: {reason}. Asking the interviewer again…")
                nudge = (
                    f"BUDGET CHECK: your last step was rejected because {reason}. "
                    f"{progress.instruction} Re-send a valid step now."
                )
                step, result = await asyncio.to_thread(ask, nudge, False, how)
                if violation(progress, step):
                    self._note(interview_id, "Budget still exceeded after one retry; accepting the step.")
            if result.cost_usd is not None:
                self._note(interview_id, f"Session cost estimate so far ${result.cost_usd:.3f} (counts toward your plan's usage)")
            if step.action == Action.final_report:
                await self._wait_for_judging(interview_id)
                step.report = await asyncio.to_thread(self._write_report, self._get(interview_id))
            self._record_step(interview_id, interview, step)
            if step.action == Action.round_feedback and step.round_id:
                # the candidate reads the closing line now; the score fills in when the judge is done
                self._start_judging(interview_id, step.round_id)
                if _next_round(interview["blueprint"], step.round_id) is None:
                    await asyncio.to_thread(self._prewarm, interview_id, "report")
            elif step.round_id and how.role == "round setup":
                await asyncio.to_thread(self._prewarm, interview_id, "judge")  # ready by the end of this round
            if step.action == Action.final_report:
                await asyncio.to_thread(close_session, interview_id)
                await asyncio.to_thread(discard_prewarmed, f"{interview_id}:")
        except ClaudeError as exc:
            self.store.update_interview(interview_id, status="error", error=str(exc))
        except Exception as exc:  # keep the UI recoverable via Retry
            self.store.update_interview(interview_id, status="error", error=f"{type(exc).__name__}: {exc}")
        finally:
            self.thinking_since.pop(interview_id, None)

    # ---------- background scoring ----------

    def _prewarm(self, interview_id: str, kind: str) -> None:
        model_type, prompt_file = (RoundScore, JUDGE_PROMPT_FILE) if kind == "judge" else (ReportDraft, REPORT_PROMPT_FILE)
        prewarm(
            f"{interview_id}:{kind}", schema=json_schema_for(model_type), system_prompt_file=prompt_file,
            model=JUDGE.model, effort=JUDGE.effort,
        )

    def _start_judging(self, interview_id: str, round_id: str) -> None:
        task = asyncio.create_task(self._judge_in_background(interview_id, round_id))
        self.judging.setdefault(interview_id, {})[round_id] = task
        self._tasks.add(task)
        task.add_done_callback(self._tasks.discard)

    async def _judge_in_background(self, interview_id: str, round_id: str) -> None:
        try:
            score = await asyncio.to_thread(self._judge_round, self._get(interview_id), round_id)
            self._save_score(interview_id, score)
        except Exception as exc:  # the final report re-judges any round left without a score
            self._note(interview_id, f"Scoring {round_id} failed ({exc}); it will be retried for the final report.")
        finally:
            self.judging.get(interview_id, {}).pop(round_id, None)

    async def _wait_for_judging(self, interview_id: str) -> None:
        pending = list(self.judging.get(interview_id, {}).values())
        if pending:
            self._note(interview_id, "Waiting for the judge to finish scoring…")
            await asyncio.gather(*pending, return_exceptions=True)

    def _save_score(self, interview_id: str, score: RoundScore) -> None:
        self.store.save_round_score(interview_id, score.round_id, score.model_dump(mode="json"))
        self.store.add_transcript(
            interview_id, "system", "Score", f"{score.round_name}: {score.score}/100 ({score.verdict})", score.round_id
        )
        # show it on the feedback screen if the candidate is still there
        current = self.store.get_interview(interview_id)
        step = (current or {}).get("step")
        if step and step["action"] == Action.round_feedback.value and step.get("round_id") == score.round_id:
            step["round_score"] = score.model_dump(mode="json")
            self.store.update_interview(interview_id, step=step)

    def _record_step(self, interview_id: str, interview: dict[str, Any], step: OrchestratorStep) -> None:
        self.store.log_step(
            interview_id, step.round_id, step.action.value, step.question_kind, bool(step.gd and step.gd.concluded)
        )
        speaker = step.interviewer_name or "Interviewer"
        self.store.add_transcript(interview_id, "interviewer", speaker, step.speech_text, step.round_id)
        if step.action == Action.gd_turns and step.gd:
            for line in step.gd.utterances:
                self.store.add_transcript(interview_id, "panelist", line.speaker, line.text, step.round_id)
            self._record_gd_panel(interview_id, step)

        fields: dict[str, Any] = {"step": step.model_dump(mode="json"), "started": 1}
        fields["status"] = "finished" if step.action == Action.final_report else "ready"
        if step.action == Action.show_blueprint and step.blueprint:
            blueprint = step.blueprint.model_dump(mode="json")
            fields["blueprint"] = blueprint
            profile = interview["profile"]
            key = Store.blueprint_key(profile["company"], profile["role"], profile["experience"])
            self.store.cache_blueprint(key, blueprint)
        self.store.update_interview(interview_id, **fields)

    def _record_gd_panel(self, interview_id: str, step: OrchestratorStep) -> None:
        """Topic and each AI participant's stance, so the judge can tell who argued what."""
        assert step.gd is not None
        known = {
            name for e in self.store.round_evidence(interview_id, step.round_id or "") if e["kind"] == "gd_panel"
            for name in e["stances"]
        }
        new = {u.speaker: u.persona for u in step.gd.utterances if u.speaker not in known}
        if new:
            self.store.add_evidence(interview_id, step.round_id, "gd_panel", {"topic": step.gd.topic, "stances": new})

    # ---------- event → prompt ----------

    def _route(self, interview: dict[str, Any], event: EventIn, progress: RoundProgress | None) -> Route:
        step = interview["step"]
        between = bool(step) and step["action"] in (Action.show_blueprint.value, Action.round_feedback.value)
        starts_round = between and event.type in (EventType.begin_rounds, EventType.continue_)
        current = None if event.type == EventType.begin_rounds else (step or {}).get("round_id")
        all_done = starts_round and _next_round(interview["blueprint"], current) is None
        return route(event.type, starts_round and not all_done)

    def _round_progress(self, interview: dict[str, Any], round_id: str, time_up: bool = False) -> RoundProgress | None:
        rounds = (interview.get("blueprint") or {}).get("rounds", [])
        rnd = next((r for r in rounds if r["id"] == round_id), None)
        if rnd is None:
            return None
        steps = self.store.round_steps(interview["id"], round_id)
        turns = sum(
            1 for e in self.store.transcript(interview["id"]) if e["role"] == "candidate" and e["round_id"] == round_id
        )
        return compute_progress(rnd, steps, turns, time_up=time_up)

    def _build_prompt(self, interview: dict[str, Any], event: EventIn) -> tuple[str, RoundProgress | None]:
        """Runs in a worker thread: may execute candidate code or grade MCQs before prompting Opus."""
        interview_id = interview["id"]
        step = OrchestratorStep.model_validate(interview["step"]) if interview["step"] else None
        round_id = step.round_id if step else None
        payload = dict(event.payload)
        board = describe_diagram(payload.pop("diagram", None)) if "diagram" in payload else ""
        if board:
            payload["whiteboard"] = board

        if event.type == EventType.start_interview:
            profile = interview["profile"]
            key = Store.blueprint_key(profile["company"], profile["role"], profile["experience"])
            data: dict[str, Any] = {
                "today": date.today().isoformat(),
                "profile": profile,
                "supported_round_types": [t.value for t in RoundType],
                "available_languages": available_languages(),
            }
            if cached := self.store.cached_blueprint(key):
                data["cached_blueprint"] = cached
                self._note(interview_id, "Using cached research for this company and role")
            return _event_prompt(event.type.value, None, data), None

        if board:
            self.store.add_evidence(interview_id, round_id, "whiteboard", {"description": board})

        if event.type == EventType.candidate_answer:
            text = str(payload.get("text", ""))
            if board:
                text = f"{text}\n\n[{board.splitlines()[0]}]".strip()
            self.store.add_transcript(interview_id, "candidate", "You", text, round_id)
            meta = {k: payload[k] for k in ("answer_mode", "seconds_taken") if k in payload}
            if meta:
                self.store.add_evidence(interview_id, round_id, "answer_timing", meta)

        elif event.type == EventType.gd_user_spoke:
            self.store.add_transcript(interview_id, "candidate", "You", str(payload.get("text", "")), round_id)

        elif event.type == EventType.code_submitted and step and step.coding_problem:
            payload = self._grade_code(interview_id, step, payload)

        elif event.type == EventType.mcq_section_done and step and step.mcq_section:
            payload = self._grade_mcq(interview_id, step, payload)

        progress = None
        between_rounds = step is not None and step.action in (Action.show_blueprint, Action.round_feedback)
        if event.type in (EventType.begin_rounds, EventType.continue_) and between_rounds:
            upcoming = _next_round(interview["blueprint"], None if event.type == EventType.begin_rounds else round_id)
            payload["next_round"] = _round_summary(upcoming)
            if upcoming is None:
                payload["all_rounds_done"] = True
        elif event.type != EventType.end_interview and round_id:
            progress = self._round_progress(interview, round_id, time_up=event.type == EventType.time_up)
            if progress:
                payload["round_budget"] = progress.as_dict()
        return _event_prompt(event.type.value, round_id, payload), progress

    # ---------- judging (one-off calls, outside the interview session) ----------

    def _judge_round(self, interview: dict[str, Any], round_id: str) -> RoundScore:
        interview_id = interview["id"]
        rounds = (interview.get("blueprint") or {}).get("rounds", [])
        rnd = next((r for r in rounds if r["id"] == round_id), {"id": round_id, "name": round_id, "type": "technical"})
        rtype = RoundType(rnd["type"])
        profile = interview["profile"]
        blueprint = interview.get("blueprint") or {}
        turns = [
            f"{'Candidate' if e['role'] == 'candidate' else e['speaker']}: {e['text']}"
            for e in self.store.transcript(interview_id)
            if e["round_id"] == round_id and e["role"] != "system"
        ]
        candidate: dict[str, Any] = {k: profile.get(k) for k in ("company", "role", "experience")}
        if notes := (profile.get("notes") or "").strip():
            candidate["notes"] = notes[:MAX_NOTES_CHARS]
        if rtype in CONVERSATIONAL:  # rounds about the candidate's background and fit
            candidate["job_description"] = (profile.get("job_description") or "")[:MAX_JD_CHARS]
            candidate["resume"] = (profile.get("resume_text") or "")[:MAX_RESUME_CHARS]
        bank = [
            q.get("question") for q in blueprint.get("question_bank", []) if q.get("round_type") == rtype.value
        ][:MAX_BANK_QUESTIONS]
        data = {
            "candidate": candidate,
            "round": {
                **{k: rnd.get(k) for k in ("id", "name", "type", "difficulty", "duration_min", "focus")},
                "research_notes": rnd.get("notes", ""),
                "reported_questions": bank,
            },
            "rubric": [{"criterion": c, "weight": w} for c, w in rubric_for(rtype)],
            "calibration": CALIBRATION.get(rtype),
            "evidence": self.store.round_evidence(interview_id, round_id),
        }
        prompt = (
            "Score this round.\nDATA:\n" + json.dumps(data, ensure_ascii=False, indent=1)
            + "\n\nROUND TRANSCRIPT:\n" + "\n".join(turns)
        )
        self._note(interview_id, f"Judge: {JUDGE.model.removeprefix('claude-')} ({JUDGE.effort} effort) scoring {rnd.get('name')}")
        score, result = run_structured(
            prompt, RoundScore, system_prompt_file=JUDGE_PROMPT_FILE, model=JUDGE.model, effort=JUDGE.effort,
            timeout_s=JUDGE_TIMEOUT_S, warm_key=f"{interview_id}:judge",
        )
        if result.cost_usd is not None:
            read, out = result.tokens()
            self._note(interview_id, f"Judge call: {read / 1000:.1f}K tokens in, {out / 1000:.1f}K out, cost estimate ${result.cost_usd:.3f}")
        checked = _checked_score(score, rtype)
        if checked.score != score.score or checked.verdict != score.verdict:
            self._note(interview_id, f"Guardrail: corrected the judge's arithmetic ({score.score} -> {checked.score})")
        return checked.model_copy(update={"round_id": round_id, "round_name": rnd.get("name", round_id)})

    def _write_report(self, interview: dict[str, Any]) -> FinalReport:
        interview_id = interview["id"]
        rounds = sorted((interview.get("blueprint") or {}).get("rounds", []), key=lambda r: r["order"])
        scored = {s["round_id"] for s in self.store.round_scores(interview_id)}
        # a round the candidate left part-way (end_interview) is judged on what it has
        answered = {e["round_id"] for e in self.store.transcript(interview_id) if e["role"] == "candidate"}
        for rnd in rounds:
            if rnd["id"] in answered and rnd["id"] not in scored:
                self._save_score(interview_id, self._judge_round(interview, rnd["id"]))
        scores = [RoundScore.model_validate(s) for s in self.store.round_scores(interview_id)]
        keep = ("round_id", "round_name", "score", "verdict", "strengths", "gaps")
        profile = interview["profile"]
        blueprint = interview.get("blueprint") or {}
        data = {
            "candidate": {
                **{k: profile.get(k) for k in ("company", "role", "experience")},
                "job_description": (profile.get("job_description") or "")[:MAX_JD_CHARS],
                "resume": (profile.get("resume_text") or "")[:MAX_RESUME_CHARS],
            },
            "research": {
                "summary": blueprint.get("summary", ""),
                "conflicts": blueprint.get("conflicts", []),
                "round_notes": [{"round": r.get("name"), "notes": r.get("notes", "")} for r in rounds],
            },
            "planned_rounds": [{k: r.get(k) for k in ("id", "name", "type")} for r in rounds],
            "judged_rounds": [{k: getattr(s, k) for k in keep} for s in scores],
        }
        self._note(interview_id, f"Judge: {JUDGE.model.removeprefix('claude-')} ({JUDGE.effort} effort) writing the report")
        draft, result = run_structured(
            "Write the final report.\nDATA:\n" + json.dumps(data, ensure_ascii=False, indent=1), ReportDraft,
            system_prompt_file=REPORT_PROMPT_FILE, model=JUDGE.model, effort=JUDGE.effort, timeout_s=JUDGE_TIMEOUT_S,
            warm_key=f"{interview_id}:report",
        )
        if result.cost_usd is not None:
            read, out = result.tokens()
            self._note(interview_id, f"Report call: {read / 1000:.1f}K tokens in, {out / 1000:.1f}K out, cost estimate ${result.cost_usd:.3f}")
        overall = max(0, min(100, draft.overall_score))
        return FinalReport(
            **draft.model_dump(exclude={"overall_score", "verdict"}),
            overall_score=overall, verdict=verdict_for(overall), round_scores=scores,
        )

    def _grade_code(self, interview_id: str, step: OrchestratorStep, payload: dict[str, Any]) -> dict[str, Any]:
        problem = step.coding_problem
        assert problem is not None
        language, code = payload.get("language", "python"), str(payload.get("code", ""))
        self._note(interview_id, f"Running your {language} code against examples and hidden tests…")
        examples = run_tests(language, code, problem.examples)
        hidden = run_tests(language, code, problem.hidden_tests)
        failed_hidden = [r.model_dump() for r in hidden.results if not r.passed][:3]
        summary = (
            f"Submitted {language} solution: examples {examples.passed_count}/{examples.total}, "
            f"hidden tests {hidden.passed_count}/{hidden.total}"
        )
        if examples.compile_error:
            summary += " (compile error)"
        self.store.add_transcript(interview_id, "candidate", "You", summary, step.round_id)
        self.store.add_evidence(interview_id, step.round_id, "code_submission", {
            "problem": problem.title,
            "statement": problem.statement,
            "language": language,
            "code": code[:MAX_CODE_CHARS],
            "explanation": payload.get("explanation", ""),
            "result": summary,
            "first_failed_hidden_tests": failed_hidden,
        })
        return {
            "language": language,
            "code": code,
            "explanation": payload.get("explanation", ""),
            "compile_error": examples.compile_error,
            "examples": f"{examples.passed_count}/{examples.total} passed",
            "hidden_tests": f"{hidden.passed_count}/{hidden.total} passed",
            "first_failed_hidden_tests": failed_hidden,
        }

    def _grade_mcq(self, interview_id: str, step: OrchestratorStep, payload: dict[str, Any]) -> dict[str, Any]:
        section = step.mcq_section
        assert section is not None
        answers: dict[str, Any] = payload.get("answers", {})
        graded = []
        for q in section.questions:
            chosen = answers.get(q.id)
            graded.append({"id": q.id, "chosen": chosen, "correct": q.answer_index, "right": chosen == q.answer_index})
        right = sum(g["right"] for g in graded)
        unanswered = sum(g["chosen"] is None for g in graded)
        summary = f"{section.name}: {right}/{len(graded)} correct, {unanswered} unanswered"
        self.store.add_transcript(interview_id, "candidate", "You", summary, step.round_id)
        self.store.add_evidence(interview_id, step.round_id, "mcq_section", {
            "section": section.name,
            "result": summary,
            "seconds_taken": payload.get("seconds_taken"),
            "time_limit_min": section.time_limit_min,
            "questions": [
                {"question": q.question, "options": q.options, "chosen": g["chosen"], "correct": q.answer_index}
                for q, g in zip(section.questions, graded)
            ],
        })
        return {
            "section": section.name,
            "score": f"{right}/{len(graded)}",
            "unanswered": unanswered,
            "seconds_taken": payload.get("seconds_taken"),
            "time_limit_min": section.time_limit_min,
            "per_question": graded,
        }


def _checked_score(score: RoundScore, rtype: RoundType) -> RoundScore:
    """Guardrail: the backend, not the model, does the arithmetic. Criteria get the rubric's exact names and
    weights, criterion scores are clamped to 0-10, and the round score and verdict are recomputed."""
    expected = rubric_for(rtype)
    by_name = {item.criterion.strip().lower(): item for item in score.rubric}
    if len(score.rubric) == len(expected) and all(c.lower() in by_name for c, _ in expected):
        items = [
            by_name[c.lower()].model_copy(update={"criterion": c, "weight": w, "score": max(0, min(10, by_name[c.lower()].score))})
            for c, w in expected
        ]
    else:  # the judge renamed or dropped criteria: keep its items, normalise their weights
        total = sum(max(0.0, i.weight) for i in score.rubric) or 1.0
        items = [
            i.model_copy(update={"weight": max(0.0, i.weight) / total, "score": max(0, min(10, i.score))})
            for i in score.rubric
        ]
    value = max(0, min(100, round(sum(i.weight * i.score for i in items) * 10)))
    return score.model_copy(update={"rubric": items, "score": value, "verdict": verdict_for(value)})
