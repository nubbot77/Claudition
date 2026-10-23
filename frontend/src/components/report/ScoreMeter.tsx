import { motion, useReducedMotion } from "motion/react";
import { cn } from "@/lib/utils";
import { clampScore, scoreTone, type ScoreTone } from "../../format";
import { EASE_OUT } from "../motion";

/**
 * Score colour follows the meter rule: the fill carries severity (action blue -> amber -> rose) and the track is a
 * light step of the same hue, so the state reads across the whole bar. The number beside it always carries the
 * value; colour is never the only signal.
 */
export const TONE_FILL: Record<ScoreTone, string> = {
  good: "bg-accent",
  mid: "bg-warning",
  low: "bg-destructive",
};

export const TONE_TRACK: Record<ScoreTone, string> = {
  good: "bg-accent/15",
  mid: "bg-warning/20",
  low: "bg-destructive/15",
};

export const TONE_STROKE: Record<ScoreTone, string> = {
  good: "stroke-accent",
  mid: "stroke-warning",
  low: "stroke-destructive",
};

export const TONE_TRACK_STROKE: Record<ScoreTone, string> = {
  good: "stroke-accent/15",
  mid: "stroke-warning/20",
  low: "stroke-destructive/15",
};

/** Tone for a score on any scale (0-10 rubric scores, 0-100 round scores). */
export function toneFor(value: number, max = 100): ScoreTone {
  return scoreTone(max > 0 ? (value / max) * 100 : 0);
}

interface ScoreMeterProps {
  value: number;
  max?: number;
  /** Accessible name. Omit when a visible number sits next to the bar (the bar is then hidden from AT). */
  label?: string;
  className?: string;
}

/** Thin horizontal meter for a score against its maximum. */
export function ScoreMeter({ value, max = 100, label, className }: ScoreMeterProps) {
  const reduce = useReducedMotion();
  const v = clampScore(value, max);
  const pct = max > 0 ? (v / max) * 100 : 0;
  const tone = toneFor(v, max);

  return (
    <span
      role={label ? "meter" : undefined}
      aria-label={label}
      aria-valuemin={label ? 0 : undefined}
      aria-valuemax={label ? max : undefined}
      aria-valuenow={label ? v : undefined}
      aria-hidden={label ? undefined : true}
      className={cn(
        "relative block h-1.5 w-full overflow-hidden rounded-full [print-color-adjust:exact]",
        TONE_TRACK[tone],
        className,
      )}
    >
      <motion.span
        className={cn("absolute inset-0 block rounded-full", TONE_FILL[tone])}
        initial={reduce ? false : { x: "-100%" }}
        animate={{ x: `${pct - 100}%` }}
        transition={{ duration: 0.6, ease: EASE_OUT }}
      />
    </span>
  );
}
