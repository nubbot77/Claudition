from __future__ import annotations

import shutil

import pytest

from app import code_runner
from app.schemas import TestCase as Case  # aliased so pytest doesn't try to collect it

ADD_PY = "a, b = map(int, input().split())\nprint(a + b)\n"


def test_python_always_available() -> None:
    assert "python" in code_runner.available_languages()


def test_python_pass() -> None:
    report = code_runner.run_tests(
        "python", ADD_PY, [Case(input="1 2\n", expected_output="3\n"), Case(input="10 -4", expected_output="6")],
    )
    assert report.compile_error is None
    assert (report.passed_count, report.total) == (2, 2)
    first = report.results[0]
    assert first.passed and not first.timed_out
    assert first.actual_output.strip() == "3"
    assert first.time_ms >= 0
    dumped = report.model_dump()
    assert dumped["passed_count"] == 2 and dumped["total"] == 2


def test_python_wrong_answer() -> None:
    report = code_runner.run_tests("python", ADD_PY, [Case(input="2 2", expected_output="5")])
    result = report.results[0]
    assert not result.passed and not result.timed_out
    assert result.actual_output.strip() == "4"
    assert report.passed_count == 0 and report.total == 1


def test_python_runtime_error() -> None:
    code = "print('partial')\nraise ValueError('boom')\n"
    result = code_runner.run_tests("python", code, [Case(input="", expected_output="partial")]).results[0]
    assert not result.passed
    assert "ValueError" in result.stderr and "boom" in result.stderr


def test_python_timeout() -> None:
    result = code_runner.run_tests(
        "python", "while True:\n    pass\n", [Case(input="", expected_output="x")], per_test_timeout_s=1,
    ).results[0]
    assert result.timed_out and not result.passed
    assert result.time_ms < 10_000


def test_output_cap_stops_runaway_printing() -> None:
    code = "while True:\n    print('x' * 1000)\n"
    result = code_runner.run_tests("python", code, [Case(input="", expected_output="x")], per_test_timeout_s=10).results[0]
    assert not result.passed
    assert len(result.actual_output.encode("utf-8")) <= code_runner.MAX_OUTPUT_BYTES
    assert "exceeded" in result.stderr


def test_trailing_whitespace_and_crlf_are_normalized() -> None:
    code = "import sys\nsys.stdout.buffer.write(b'1  \\r\\n2\\t\\r\\n\\r\\n\\r\\n')\n"
    report = code_runner.run_tests(
        "python", code,
        [Case(input="", expected_output="1\n2"), Case(input="", expected_output="1 \r\n2\r\n\r\n")],
    )
    assert [r.passed for r in report.results] == [True, True]


def test_comparison_is_case_sensitive() -> None:
    result = code_runner.run_tests("python", "print('Yes')", [Case(input="", expected_output="yes")]).results[0]
    assert not result.passed


def test_normalize_output() -> None:
    assert code_runner.normalize_output("a \r\nb\t\n\n \n") == "a\nb"
    assert code_runner.normalize_output("\na") == "\na"  # leading blank lines still count


def test_tests_are_capped(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(code_runner, "MAX_TESTS", 2)
    report = code_runner.run_tests("python", "print(1)", [Case(input="", expected_output="1")] * 5)
    assert len(report.results) == 2 and report.total == 2


def test_unicode_round_trip() -> None:
    result = code_runner.run_tests("python", "print(input()[::-1])", [Case(input="héllo→", expected_output="→olléh")]).results[0]
    assert result.passed, result.stderr


@pytest.mark.skipif(shutil.which("node") is None, reason="node not installed")
def test_javascript_pass() -> None:
    code = (
        "const [a, b] = require('fs').readFileSync(0, 'utf8').trim().split(/\\s+/).map(Number);\n"
        "console.log(a + b);\n"
    )
    report = code_runner.run_tests("javascript", code, [Case(input="1 2", expected_output="3")])
    assert report.passed_count == 1, report.results[0].stderr


@pytest.mark.skipif(shutil.which("node") is None, reason="node not installed")
def test_javascript_output_not_coloured_when_force_color_inherited(monkeypatch) -> None:
    monkeypatch.setenv("FORCE_COLOR", "1")
    report = code_runner.run_tests("javascript", "console.log(-1);\n", [Case(input="", expected_output="-1")])
    assert report.passed_count == 1, repr(report.results[0].actual_output)


@pytest.mark.skipif(shutil.which("javac") is not None, reason="javac installed, java is available")
def test_missing_java_raises() -> None:
    assert "java" not in code_runner.available_languages()
    with pytest.raises(ValueError):
        code_runner.run_tests("java", "public class Main {}", [Case(input="", expected_output="")])


def test_unavailable_language_raises(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(code_runner.shutil, "which", lambda name: None)
    assert code_runner.available_languages() == ["python"]
    for lang in ("javascript", "java", "cpp"):
        with pytest.raises(ValueError):
            code_runner.run_tests(lang, "", [Case(input="", expected_output="")])


@pytest.mark.skipif(shutil.which("g++") is None, reason="g++ not installed")
def test_cpp_compile_error() -> None:
    report = code_runner.run_tests("cpp", "int main( {", [Case(input="", expected_output="")])
    assert report.compile_error and report.results == []
