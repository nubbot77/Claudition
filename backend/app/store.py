"""SQLite persistence. One short-lived connection per call keeps it safe across worker threads."""

from __future__ import annotations

import json
import sqlite3
from contextlib import contextmanager
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Any, Iterator

from .claude_runner import DATA_DIR

DB_PATH = DATA_DIR / "interviews.db"
BLUEPRINT_TTL = timedelta(days=90)

_SCHEMA = """
CREATE TABLE IF NOT EXISTS interviews (
    id TEXT PRIMARY KEY,
    profile TEXT NOT NULL,
    status TEXT NOT NULL,
    started INTEGER NOT NULL DEFAULT 0,
    step TEXT,
    blueprint TEXT,
    error TEXT,
    last_event TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS transcript (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    interview_id TEXT NOT NULL,
    role TEXT NOT NULL,
    speaker TEXT NOT NULL,
    text TEXT NOT NULL,
    round_id TEXT,
    at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS round_scores (
    interview_id TEXT NOT NULL,
    round_id TEXT NOT NULL,
    score TEXT NOT NULL,
    at TEXT NOT NULL,
    PRIMARY KEY (interview_id, round_id)
);
CREATE TABLE IF NOT EXISTS steps (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    interview_id TEXT NOT NULL,
    round_id TEXT,
    action TEXT NOT NULL,
    question_kind TEXT,
    gd_concluded INTEGER NOT NULL DEFAULT 0,
    at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS evidence (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    interview_id TEXT NOT NULL,
    round_id TEXT,
    kind TEXT NOT NULL,
    data TEXT NOT NULL,
    at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS blueprint_cache (
    key TEXT PRIMARY KEY,
    blueprint TEXT NOT NULL,
    created_at TEXT NOT NULL
);
"""


def now() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="seconds")


class Store:
    def __init__(self, path: Path = DB_PATH) -> None:
        self.path = path
        path.parent.mkdir(parents=True, exist_ok=True)
        with self._conn() as db:
            db.executescript(_SCHEMA)

    @contextmanager
    def _conn(self) -> Iterator[sqlite3.Connection]:
        db = sqlite3.connect(self.path)
        db.row_factory = sqlite3.Row
        try:
            yield db
            db.commit()
        finally:
            db.close()

    # ---------- interviews ----------

    def create_interview(self, interview_id: str, profile: dict[str, Any]) -> None:
        ts = now()
        with self._conn() as db:
            db.execute(
                "INSERT INTO interviews (id, profile, status, created_at, updated_at) VALUES (?, ?, 'thinking', ?, ?)",
                (interview_id, json.dumps(profile), ts, ts),
            )

    def get_interview(self, interview_id: str) -> dict[str, Any] | None:
        with self._conn() as db:
            row = db.execute("SELECT * FROM interviews WHERE id = ?", (interview_id,)).fetchone()
        if row is None:
            return None
        data = dict(row)
        for key in ("profile", "step", "blueprint", "last_event"):
            data[key] = json.loads(data[key]) if data[key] else None
        return data

    def list_interviews(self) -> list[dict[str, Any]]:
        with self._conn() as db:
            rows = db.execute("SELECT id, profile, status, created_at FROM interviews ORDER BY created_at DESC").fetchall()
        out = []
        for row in rows:
            profile = json.loads(row["profile"])
            out.append({
                "id": row["id"], "company": profile["company"], "role": profile["role"],
                "experience": profile["experience"], "status": row["status"], "created_at": row["created_at"],
            })
        return out

    def update_interview(self, interview_id: str, **fields: Any) -> None:
        for key in ("step", "blueprint", "last_event"):
            if key in fields and fields[key] is not None:
                fields[key] = json.dumps(fields[key])
        fields["updated_at"] = now()
        cols = ", ".join(f"{k} = ?" for k in fields)
        with self._conn() as db:
            db.execute(f"UPDATE interviews SET {cols} WHERE id = ?", (*fields.values(), interview_id))

    def fail_stuck_turns(self) -> None:
        with self._conn() as db:
            db.execute(
                "UPDATE interviews SET status = 'error', error = ? WHERE status = 'thinking'",
                ("The backend restarted during this turn. Press Retry.",),
            )

    # ---------- transcript and scores ----------

    def add_transcript(self, interview_id: str, role: str, speaker: str, text: str, round_id: str | None) -> None:
        if not text.strip():
            return
        with self._conn() as db:
            db.execute(
                "INSERT INTO transcript (interview_id, role, speaker, text, round_id, at) VALUES (?, ?, ?, ?, ?, ?)",
                (interview_id, role, speaker, text, round_id, now()),
            )

    def transcript(self, interview_id: str) -> list[dict[str, Any]]:
        with self._conn() as db:
            rows = db.execute(
                "SELECT role, speaker, text, round_id, at FROM transcript WHERE interview_id = ? ORDER BY id",
                (interview_id,),
            ).fetchall()
        return [dict(r) for r in rows]

    def add_evidence(self, interview_id: str, round_id: str | None, kind: str, data: dict[str, Any]) -> None:
        """Material the judge needs beyond the transcript: submitted code, MCQ details, whiteboard."""
        with self._conn() as db:
            db.execute(
                "INSERT INTO evidence (interview_id, round_id, kind, data, at) VALUES (?, ?, ?, ?, ?)",
                (interview_id, round_id, kind, json.dumps(data, ensure_ascii=False), now()),
            )

    def round_evidence(self, interview_id: str, round_id: str) -> list[dict[str, Any]]:
        with self._conn() as db:
            rows = db.execute(
                "SELECT kind, data FROM evidence WHERE interview_id = ? AND round_id = ? ORDER BY id",
                (interview_id, round_id),
            ).fetchall()
        return [{"kind": r["kind"], **json.loads(r["data"])} for r in rows]

    def log_step(
        self, interview_id: str, round_id: str | None, action: str, question_kind: str | None, gd_concluded: bool
    ) -> None:
        with self._conn() as db:
            db.execute(
                "INSERT INTO steps (interview_id, round_id, action, question_kind, gd_concluded, at) VALUES (?, ?, ?, ?, ?, ?)",
                (interview_id, round_id, action, question_kind, int(gd_concluded), now()),
            )

    def round_steps(self, interview_id: str, round_id: str) -> list[dict[str, Any]]:
        with self._conn() as db:
            rows = db.execute(
                "SELECT action, question_kind, gd_concluded, at FROM steps WHERE interview_id = ? AND round_id = ? ORDER BY id",
                (interview_id, round_id),
            ).fetchall()
        return [dict(r) for r in rows]

    def save_round_score(self, interview_id: str, round_id: str, score: dict[str, Any]) -> None:
        with self._conn() as db:
            db.execute(
                "INSERT OR REPLACE INTO round_scores (interview_id, round_id, score, at) VALUES (?, ?, ?, ?)",
                (interview_id, round_id, json.dumps(score), now()),
            )

    def round_scores(self, interview_id: str) -> list[dict[str, Any]]:
        with self._conn() as db:
            rows = db.execute(
                "SELECT score FROM round_scores WHERE interview_id = ? ORDER BY at, rowid", (interview_id,)
            ).fetchall()
        return [json.loads(r["score"]) for r in rows]

    # ---------- blueprint cache ----------

    @staticmethod
    def blueprint_key(company: str, role: str, experience: str) -> str:
        return "|".join(part.strip().lower() for part in (company, role, experience))

    def cached_blueprint(self, key: str) -> dict[str, Any] | None:
        with self._conn() as db:
            row = db.execute("SELECT blueprint, created_at FROM blueprint_cache WHERE key = ?", (key,)).fetchone()
        if row is None:
            return None
        if datetime.fromisoformat(row["created_at"]) < datetime.now(timezone.utc) - BLUEPRINT_TTL:
            return None
        return json.loads(row["blueprint"])

    def cache_blueprint(self, key: str, blueprint: dict[str, Any]) -> None:
        with self._conn() as db:
            db.execute(
                "INSERT OR REPLACE INTO blueprint_cache (key, blueprint, created_at) VALUES (?, ?, ?)",
                (key, json.dumps(blueprint), now()),
            )
