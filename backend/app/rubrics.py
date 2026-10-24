"""Judging rubrics per round type. Rendered into the orchestrator's system prompt.

Each rubric is a list of (criterion, weight); weights in one rubric sum to 1.0.
Opus scores every criterion 0-10 from evidence, and the round score is the weighted sum x 10.
"""

from __future__ import annotations

from .schemas import RoundType

Rubric = list[tuple[str, float]]

GENERIC: Rubric = [
    ("Correctness of answers", 0.4),
    ("Depth and reasoning", 0.3),
    ("Communication clarity", 0.3),
]

RUBRICS: dict[RoundType, Rubric] = {
    RoundType.aptitude_mcq: [
        ("Accuracy", 0.75),
        ("Time management", 0.25),
    ],
    RoundType.technical: [
        ("Concept accuracy", 0.35),
        ("Depth under follow-up questions", 0.25),
        ("Problem-solving approach", 0.2),
        ("Communication clarity", 0.2),
    ],
    RoundType.system_design: [
        ("Requirements and scope clarification", 0.2),
        ("High-level architecture", 0.25),
        ("Data model and APIs", 0.15),
        ("Scaling and trade-offs", 0.25),
        ("Communication and structure", 0.15),
    ],
    RoundType.behavioral: [
        ("STAR structure", 0.25),
        ("Ownership and measurable impact", 0.3),
        ("Fit with company values (e.g. Amazon Leadership Principles)", 0.25),
        ("Self-awareness and learning", 0.2),
    ],
    RoundType.hr: [
        ("Motivation and company knowledge", 0.3),
        ("Clarity and confidence", 0.3),
        ("Honesty and consistency", 0.2),
        ("Professionalism", 0.2),
    ],
    RoundType.managerial: [
        ("Project depth and ownership", 0.35),
        ("Decision making and trade-offs", 0.25),
        ("Team and conflict handling", 0.2),
        ("Communication", 0.2),
    ],
    RoundType.group_discussion: [
        ("Initiation and contribution", 0.25),
        ("Content quality and facts", 0.3),
        ("Listening and building on others", 0.2),
        ("Leadership and summarizing", 0.15),
        ("Communication", 0.1),
    ],
    # Judged against the round's `difficulty` and the company's bar (see CALIBRATION below):
    # an O(n^2) brute force can be full marks on an easy service-company problem and a fail at a
    # product company on a medium/hard one.
    RoundType.coding: [
        ("Correctness: passes examples and hidden tests", 0.3),
        ("Efficiency: time/space complexity vs. the expected optimal for this difficulty", 0.2),
        ("Code quality: readable names, clean structure, idiomatic, no dead code", 0.2),
        ("Edge cases and robustness", 0.1),
        ("Explanation: approach, complexity and trade-offs stated clearly", 0.2),
    ],
}

CALIBRATION = {
    RoundType.coding: (
        "Calibrate coding scores to the round's `difficulty` and the company's real bar. "
        "Efficiency: full marks only for the optimal complexity expected at that level; for easy rounds "
        "at service companies a correct simple solution is enough, for medium/hard rounds at product "
        "companies a brute force scores at most 4. Code quality: judge as a professional reviewer would "
        "(meaningful names, small functions, no magic numbers or copy-paste, idiomatic for the language). "
        "Explanation: from the candidate's written explanation and follow-up answers; full marks need the "
        "approach, exact time and space complexity, and at least one trade-off or alternative."
    ),
}


def rubric_for(round_type: RoundType) -> Rubric:
    return RUBRICS.get(round_type, GENERIC)


def rubric_prompt_section() -> str:
    lines = ["# Rubrics (criterion: weight)"]
    for round_type in RoundType:
        items = ", ".join(f"{name}: {weight:g}" for name, weight in rubric_for(round_type))
        lines.append(f"- {round_type.value}: {items}")
    for round_type, note in CALIBRATION.items():
        lines.append(f"\n{round_type.value} calibration: {note}")
    return "\n".join(lines)
