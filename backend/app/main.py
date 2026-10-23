"""FastAPI entry point. Run from backend/:  uv run uvicorn app.main:app --port 8000"""

from __future__ import annotations

import asyncio
from contextlib import asynccontextmanager
from typing import Any, AsyncIterator

from fastapi import FastAPI, HTTPException, Response
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from .claude_runner import ClaudeError, auth_status, claude_executable, close_all_sessions
from . import tts
from .code_runner import RunReport, available_languages, run_tests
from .interview import Busy, InterviewService, NotFound, render_system_prompt
from .schemas import CodeRunIn, EventIn, InterviewProfile
from .store import Store

store = Store()
service = InterviewService(store)


@asynccontextmanager
async def lifespan(_: FastAPI) -> AsyncIterator[None]:
    render_system_prompt()
    store.fail_stuck_turns()
    yield
    close_all_sessions()


app = FastAPI(title="Mock Interview Platform", lifespan=lifespan)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/api/health")
async def health() -> dict[str, Any]:
    try:
        claude_executable()
        found = True
    except ClaudeError:
        found = False
    status = await asyncio.to_thread(auth_status) if found else {"loggedIn": False, "authMethod": "none"}
    return {
        "claude_found": found,
        "auth": {k: status.get(k) for k in ("loggedIn", "authMethod", "subscriptionType")},
        "languages": available_languages(),
        "tts": tts.tts_status(),
    }


@app.post("/api/interviews")
async def create_interview(profile: InterviewProfile) -> dict[str, str]:
    return {"id": service.create(profile)}


@app.get("/api/interviews")
async def list_interviews() -> list[dict[str, Any]]:
    return store.list_interviews()


@app.get("/api/interviews/{interview_id}")
async def get_interview(interview_id: str) -> dict[str, Any]:
    try:
        return service.state(interview_id)
    except NotFound:
        raise HTTPException(404, "Interview not found")


@app.post("/api/interviews/{interview_id}/events", status_code=202)
async def post_event(interview_id: str, event: EventIn) -> dict[str, str]:
    try:
        service.submit(interview_id, event)
    except NotFound:
        raise HTTPException(404, "Interview not found")
    except Busy:
        raise HTTPException(409, "The interviewer is still thinking")
    return {"status": "thinking"}


@app.post("/api/interviews/{interview_id}/retry", status_code=202)
async def retry(interview_id: str) -> dict[str, str]:
    try:
        service.retry(interview_id)
    except NotFound:
        raise HTTPException(404, "Interview not found")
    except Busy:
        raise HTTPException(409, "Nothing to retry")
    return {"status": "thinking"}


@app.post("/api/code/run")
async def run_code(body: CodeRunIn) -> RunReport:
    try:
        return await asyncio.to_thread(run_tests, body.language, body.code, body.tests)
    except ValueError as exc:
        raise HTTPException(400, str(exc))


class TtsIn(BaseModel):
    text: str
    voice: str = tts.DEFAULT_VOICE
    speed: float = 1.0


@app.post("/api/tts", response_class=Response, responses={200: {"content": {"audio/wav": {}}}})
async def text_to_speech(body: TtsIn) -> Response:
    try:
        tts.validate(body.text, body.voice, body.speed)
        audio = await asyncio.to_thread(tts.synthesize, body.text, body.voice, body.speed)
    except tts.TtsInputError as exc:
        raise HTTPException(400, str(exc))
    except tts.TtsUnavailable as exc:
        raise HTTPException(503, str(exc))
    return Response(audio, media_type="audio/wav", headers={"Cache-Control": "no-store"})


@app.get("/api/tts/voices")
async def tts_voices() -> list[dict[str, str]]:
    return tts.list_voices()


@app.post("/api/tts/warmup", status_code=202)
async def tts_warmup() -> dict[str, Any]:
    """Start loading the voice model in the background so the first line isn't delayed."""
    tts.warm_up_in_background()
    return tts.tts_status()
