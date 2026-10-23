"""Runs the candidate's code locally against stdin/stdout test cases.

Single local user running their own code, but every run still gets a fresh temp dir,
per-test timeouts and capped output (the process is killed once a stream passes the cap).
"""

from __future__ import annotations

import os
import shutil
import subprocess
import sys
import tempfile
import threading
import time
from dataclasses import dataclass
from pathlib import Path
from typing import IO, Callable

from pydantic import BaseModel, Field

from .schemas import Language, TestCase

MAX_TESTS = 50
MAX_OUTPUT_BYTES = 64 * 1024

_FLAGS = subprocess.CREATE_NO_WINDOW if sys.platform == "win32" else 0
_EXE_SUFFIX = ".exe" if sys.platform == "win32" else ""
_SOURCE_FILE: dict[str, str] = {
    "python": "main.py",
    "javascript": "main.js",
    "java": "Main.java",
    "cpp": "main.cpp",
}


class TestResult(BaseModel):
    input: str
    expected_output: str
    actual_output: str
    passed: bool
    stderr: str
    time_ms: int
    timed_out: bool


class RunReport(BaseModel):
    language: Language
    compile_error: str | None
    results: list[TestResult]
    passed_count: int
    total: int = Field(description="Tests requested (after the cap), also when compilation failed")


# ---------- toolchains ----------


def available_languages() -> list[str]:
    """Languages runnable here. Python is always available through this interpreter."""
    langs = ["python"]
    if shutil.which("node"):
        langs.append("javascript")
    if shutil.which("javac") and shutil.which("java"):
        langs.append("java")
    if shutil.which("g++"):
        langs.append("cpp")
    return langs


def _tool(name: str) -> str:
    return shutil.which(name) or name


def _commands(language: str, work: Path) -> tuple[list[str] | None, list[str]]:
    """(compile command or None, run command) for the source file already written to `work`."""
    if language == "python":
        # -X utf8: stdin/stdout are UTF-8 even on Windows (-I would ignore PYTHONIOENCODING)
        return None, [sys.executable, "-I", "-X", "utf8", "main.py"]
    if language == "javascript":
        return None, [_tool("node"), "main.js"]
    if language == "java":
        return (
            [_tool("javac"), "-encoding", "UTF-8", "Main.java"],
            [_tool("java"), "-Dfile.encoding=UTF-8", "-Dstdout.encoding=UTF-8", "-cp", ".", "Main"],
        )
    exe = work / f"main{_EXE_SUFFIX}"
    return [_tool("g++"), "-O2", "-std=c++17", "-o", str(exe), "main.cpp"], [str(exe)]


# ---------- process ----------


@dataclass
class _Exec:
    stdout: str
    stderr: str
    returncode: int | None
    time_ms: int
    timed_out: bool
    overflow: bool


def _feed(stream: IO[bytes], data: bytes) -> None:
    try:
        stream.write(data)
    except (OSError, ValueError):
        pass  # process exited without reading all of stdin
    finally:
        try:
            stream.close()
        except OSError:
            pass


def _drain(stream: IO[bytes], sink: bytearray, on_overflow: Callable[[], None]) -> None:
    while chunk := stream.read1(65536):  # type: ignore[attr-defined]
        room = MAX_OUTPUT_BYTES - len(sink)
        if len(chunk) > room:
            sink += chunk[:room]
            on_overflow()
            break
        sink += chunk
    try:
        stream.close()
    except OSError:
        pass


def _decode(raw: bytearray) -> str:
    return bytes(raw).decode("utf-8", errors="replace").replace("\r\n", "\n")


def _plain_env() -> dict[str, str]:
    """Inherited FORCE_COLOR makes Node colour console.log output, which then fails exact-match judging."""
    env = {k: v for k, v in os.environ.items() if k not in ("FORCE_COLOR", "CLICOLOR_FORCE")}
    env["NO_COLOR"] = "1"
    return env


def _execute(cmd: list[str], cwd: Path, stdin: str, timeout_s: float) -> _Exec:
    """Run one process with a wall-clock timeout; stdin is fed and output drained on threads."""
    out, err = bytearray(), bytearray()
    overflow = threading.Event()
    start = time.perf_counter()
    proc = subprocess.Popen(
        cmd, cwd=cwd, creationflags=_FLAGS, env=_plain_env(),
        stdin=subprocess.PIPE, stdout=subprocess.PIPE, stderr=subprocess.PIPE,
    )

    def _kill_for_overflow() -> None:
        overflow.set()
        proc.kill()

    threads = [
        threading.Thread(target=_feed, args=(proc.stdin, stdin.encode("utf-8")), daemon=True),
        threading.Thread(target=_drain, args=(proc.stdout, out, _kill_for_overflow), daemon=True),
        threading.Thread(target=_drain, args=(proc.stderr, err, _kill_for_overflow), daemon=True),
    ]
    for t in threads:
        t.start()
    timed_out = False
    try:
        proc.wait(timeout=timeout_s)
    except subprocess.TimeoutExpired:
        timed_out = True
        proc.kill()
        proc.wait()
    elapsed_ms = int((time.perf_counter() - start) * 1000)
    for t in threads:
        t.join(timeout=2)  # a leftover grandchild may keep a pipe open; don't hang on it
    return _Exec(
        stdout=_decode(out), stderr=_decode(err), returncode=proc.returncode,
        time_ms=elapsed_ms, timed_out=timed_out, overflow=overflow.is_set(),
    )


# ---------- judging ----------


def normalize_output(text: str) -> str:
    """CRLF to LF, trailing whitespace per line dropped, trailing blank lines dropped. Case-sensitive."""
    lines = [line.rstrip() for line in text.replace("\r\n", "\n").split("\n")]
    while lines and not lines[-1]:
        lines.pop()
    return "\n".join(lines)


def _run_case(cmd: list[str], work: Path, case: TestCase, timeout_s: float) -> TestResult:
    stdin = case.input if not case.input or case.input.endswith("\n") else case.input + "\n"
    ex = _execute(cmd, work, stdin, timeout_s)
    stderr = ex.stderr
    if ex.overflow:
        stderr += f"\n[output exceeded {MAX_OUTPUT_BYTES // 1024} KB; process stopped]"
    elif not ex.timed_out and ex.returncode != 0 and not stderr.strip():
        stderr = f"Process exited with code {ex.returncode}"
    passed = (
        not ex.timed_out and not ex.overflow and ex.returncode == 0
        and normalize_output(ex.stdout) == normalize_output(case.expected_output)
    )
    return TestResult(
        input=case.input, expected_output=case.expected_output, actual_output=ex.stdout,
        passed=passed, stderr=stderr, time_ms=ex.time_ms, timed_out=ex.timed_out,
    )


def run_tests(
    language: Language, code: str, tests: list[TestCase],
    per_test_timeout_s: float = 5.0, compile_timeout_s: float = 30.0,
) -> RunReport:
    """Compile (if needed) and run `code` on each test. Blocking: call via asyncio.to_thread."""
    if language not in available_languages():
        raise ValueError(f"{language} is not available on this machine")
    tests = list(tests)[:MAX_TESTS]
    with tempfile.TemporaryDirectory(prefix="coderun-", ignore_cleanup_errors=True) as tmp:
        work = Path(tmp)
        (work / _SOURCE_FILE[language]).write_bytes(code.encode("utf-8"))
        compile_cmd, run_cmd = _commands(language, work)
        if compile_cmd is not None:
            ex = _execute(compile_cmd, work, "", compile_timeout_s)
            if ex.timed_out or ex.returncode != 0:
                if ex.timed_out:
                    error = f"Compilation timed out after {compile_timeout_s:g}s"
                else:
                    error = (ex.stderr + ex.stdout).strip() or f"Compiler exited with code {ex.returncode}"
                return RunReport(
                    language=language, compile_error=error, results=[], passed_count=0, total=len(tests),
                )
        results = [_run_case(run_cmd, work, case, per_test_timeout_s) for case in tests]
    return RunReport(
        language=language, compile_error=None, results=results,
        passed_count=sum(r.passed for r in results), total=len(results),
    )
