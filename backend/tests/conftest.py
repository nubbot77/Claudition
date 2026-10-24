from __future__ import annotations

import pytest

from app import claude_runner


@pytest.fixture(autouse=True)
def no_real_claude(monkeypatch: pytest.MonkeyPatch) -> None:
    """Tests must never start the real CLI: it would spend the user's plan usage."""

    def refuse(*_args: object, **_kwargs: object) -> None:
        raise AssertionError("a test tried to start the real Claude CLI; fake the call instead")

    monkeypatch.setattr(claude_runner, "run_claude", refuse)
    monkeypatch.setattr(claude_runner.PersistentSession, "_start", refuse)
