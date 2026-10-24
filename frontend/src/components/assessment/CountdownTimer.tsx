import { useEffect, useRef } from "react";
import { TimerIcon } from "@/lib/icons";
import { cn } from "@/lib/utils";
import { formatClock } from "../../format";
import { useNow } from "../../hooks/useNow";

interface Props {
  /** Epoch ms when the section started. */
  since: number;
  /** Section length in seconds; 0 shows elapsed time instead of a countdown. */
  durationSec: number;
  /** Fires once when the countdown reaches zero. */
  onExpire?: () => void;
  label?: string;
  className?: string;
}

type Tone = "normal" | "warn" | "danger";

const TONE_CLASS: Record<Tone, string> = {
  normal: "border-border bg-card text-foreground",
  warn: "border-warning/40 bg-warning-soft text-warning-soft-foreground",
  danger: "border-destructive/40 bg-destructive-soft text-destructive-soft-foreground",
};

/**
 * Exam clock for timed sections. Amber in the last five minutes (or the last 40% of a short section),
 * red in the final minute. Screen readers hear the threshold changes, not every tick.
 */
export function CountdownTimer({ since, durationSec, onExpire, label = "Time left", className }: Props) {
  const now = useNow(500);
  const countdown = durationSec > 0;
  const elapsed = Math.max(0, Math.floor((now - since) / 1000));
  const remaining = Math.max(0, durationSec - elapsed);
  const onExpireRef = useRef(onExpire);
  const firedRef = useRef(false);

  useEffect(() => {
    onExpireRef.current = onExpire;
  });

  useEffect(() => {
    if (!countdown || remaining > 0 || firedRef.current) return;
    firedRef.current = true;
    onExpireRef.current?.();
  }, [countdown, remaining]);

  const warnAt = Math.min(300, Math.max(60, Math.round(durationSec * 0.4)));
  let tone: Tone = "normal";
  if (countdown && remaining <= 60) tone = "danger";
  else if (countdown && remaining <= warnAt) tone = "warn";

  let announcement = "";
  if (countdown && remaining === 0) announcement = "Time is up.";
  else if (tone === "danger") announcement = "Less than a minute remaining.";
  else if (tone === "warn") announcement = `Less than ${Math.ceil(warnAt / 60)} minutes remaining.`;

  return (
    <div
      className={cn(
        "inline-flex h-8 shrink-0 items-center gap-2 rounded-md border px-2.5 transition-colors duration-200",
        TONE_CLASS[tone],
        className,
      )}
    >
      <TimerIcon className="size-3.5 shrink-0" aria-hidden="true" />
      <span className={cn("text-xs max-sm:sr-only", tone === "normal" && "text-muted-foreground")}>
        {countdown ? label : "Elapsed"}
      </span>
      <span role="timer" className="font-mono text-[13px] font-semibold tabular-nums">
        {formatClock(countdown ? remaining : elapsed)}
      </span>
      {countdown && (
        <span className="sr-only" aria-live="polite">
          {announcement}
        </span>
      )}
    </div>
  );
}
