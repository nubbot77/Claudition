import { CircleCheck, CircleMinus, CircleX } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { capitalize, verdictLabel } from "../format";
import type { Confidence, Difficulty, Verdict } from "../types";

type Tone = "success" | "warning" | "destructive";

const VERDICT_TONE: Record<Verdict, Tone> = {
  strong_hire: "success",
  hire: "success",
  lean_hire: "warning",
  lean_no_hire: "destructive",
  no_hire: "destructive",
};

const TONE_ICON = { success: CircleCheck, warning: CircleMinus, destructive: CircleX } as const;

/** Hiring verdict. Icon + label, so it reads without colour (and in greyscale print). */
export function VerdictBadge({
  verdict,
  large = false,
  className,
}: {
  verdict: Verdict;
  large?: boolean;
  className?: string;
}) {
  const tone = VERDICT_TONE[verdict] ?? "warning";
  const Icon = TONE_ICON[tone];
  return (
    <Badge variant={tone} size={large ? "lg" : "default"} className={cn("print:border-current", className)}>
      <Icon aria-hidden="true" />
      {verdictLabel(verdict)}
    </Badge>
  );
}

const DIFFICULTY_TONE: Record<Difficulty, Tone> = { easy: "success", medium: "warning", hard: "destructive" };

const CONFIDENCE_DOT: Record<Confidence, string> = {
  high: "bg-success",
  medium: "bg-warning",
  low: "bg-destructive",
};

export function DifficultyPill({ value }: { value: Difficulty }) {
  return <Badge variant={DIFFICULTY_TONE[value] ?? "secondary"}>{capitalize(value)}</Badge>;
}

export function ConfidencePill({ value }: { value: Confidence }) {
  return (
    <Badge variant="outline" title="How well sources agree on this round">
      <span aria-hidden="true" className={cn("size-1.5 rounded-full", CONFIDENCE_DOT[value] ?? "bg-muted-foreground")} />
      {capitalize(value)} confidence
    </Badge>
  );
}
