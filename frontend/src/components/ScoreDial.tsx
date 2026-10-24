import { motion, useReducedMotion } from "motion/react";
import { cn } from "@/lib/utils";
import { clampScore, scoreTone } from "../format";
import { CountUp, EASE_OUT } from "./motion";
import { TONE_STROKE, TONE_TRACK_STROKE } from "./report/ScoreMeter";

interface Props {
  score: number;
  size?: number;
  label?: string;
  className?: string;
}

/** Radial meter for a 0-100 score: the ring draws and the number counts up once, on mount. */
export function ScoreDial({ score, size = 120, label = "Score", className }: Props) {
  const reduce = useReducedMotion();
  const value = clampScore(score);
  const tone = scoreTone(value);
  const stroke = size >= 140 ? 10 : 8;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const center = size / 2;
  const offset = circumference * (1 - value / 100);

  return (
    <div
      role="img"
      aria-label={`${label}: ${value} out of 100`}
      className={cn("relative inline-grid shrink-0 place-items-center", className)}
      style={{ width: size, height: size }}
    >
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden="true" className="-rotate-90">
        <circle
          className={TONE_TRACK_STROKE[tone]}
          cx={center}
          cy={center}
          r={radius}
          strokeWidth={stroke}
          fill="none"
        />
        {value > 0 && (
          <motion.circle
            className={TONE_STROKE[tone]}
            cx={center}
            cy={center}
            r={radius}
            strokeWidth={stroke}
            fill="none"
            strokeLinecap="round"
            strokeDasharray={circumference}
            initial={reduce ? false : { strokeDashoffset: circumference }}
            animate={{ strokeDashoffset: offset }}
            transition={{ duration: 0.8, ease: EASE_OUT }}
          />
        )}
      </svg>
      <span className="absolute inset-0 flex flex-col items-center justify-center" aria-hidden="true">
        <span className="font-heading leading-none font-normal text-foreground tabular-nums" style={{ fontSize: Math.round(size * 0.34) }}>
          <CountUp value={value} duration={0.8} />
        </span>
        <span className="mt-1 text-xs text-muted-foreground">of 100</span>
      </span>
    </div>
  );
}
