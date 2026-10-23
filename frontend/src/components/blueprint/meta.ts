import type { Confidence, Difficulty, RoundType } from "../../types";

export const DIFFICULTY_VARIANT: Record<Difficulty, "success" | "warning" | "destructive"> = {
  easy: "success",
  medium: "warning",
  hard: "destructive",
};

export const CONFIDENCE_LEVEL: Record<Confidence, number> = { low: 1, medium: 2, high: 3 };

const UNIT: Record<RoundType, [singular: string, plural: string]> = {
  aptitude_mcq: ["question", "questions"],
  coding: ["problem", "problems"],
  technical: ["question", "questions"],
  system_design: ["question", "questions"],
  behavioral: ["question", "questions"],
  hr: ["question", "questions"],
  managerial: ["question", "questions"],
  group_discussion: ["contribution", "contributions"],
};

/** "4 questions", "1 problem", "2 contributions". Empty when the blueprint has no budget. */
export function budgetLabel(type: RoundType, budget: number | undefined): string {
  if (budget == null || !Number.isFinite(budget) || budget <= 0) return "";
  const [one, many] = UNIT[type] ?? ["question", "questions"];
  return `${budget} ${budget === 1 ? one : many}`;
}
