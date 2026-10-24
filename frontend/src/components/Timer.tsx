import { useEffect, useRef } from "react";
import { Clock3 } from "@/lib/icons";
import { cn } from "@/lib/utils";
import { formatClock } from "../format";
import { useNow } from "../hooks/useNow";

type TimerBase = {
  since: number;
  label: string;
  /** "chip" (default): bordered, for toolbars. "plain": label + value only, for headers. */
  variant?: "chip" | "plain";
  className?: string;
};

type TimerProps =
  | (TimerBase & { mode: "elapsed" })
  | (TimerBase & { mode: "countdown"; durationSec: number; onExpire?: () => void });

export function Timer(props: TimerProps) {
  const now = useNow(500);
  const countdown = props.mode === "countdown";
  const duration = countdown ? props.durationSec : 0;
  const onExpire = countdown ? props.onExpire : undefined;
  const elapsed = Math.max(0, Math.floor((now - props.since) / 1000));
  const remaining = Math.max(0, duration - elapsed);
  const onExpireRef = useRef(onExpire);
  const firedRef = useRef(false);
  const variant = props.variant ?? "chip";

  useEffect(() => {
    onExpireRef.current = onExpire;
  });

  useEffect(() => {
    if (!countdown || remaining > 0 || firedRef.current) return;
    firedRef.current = true;
    onExpireRef.current?.();
  }, [countdown, remaining]);

  let tone: "normal" | "warn" | "danger" = "normal";
  if (countdown && remaining <= 60) tone = "danger";
  else if (countdown && remaining <= Math.min(300, duration * 0.2)) tone = "warn";

  let announcement = "";
  if (countdown && remaining === 0) announcement = "Time is up.";
  else if (countdown && remaining <= 60) announcement = "Less than a minute remaining.";

  return (
    <div
      className={cn(
        "inline-flex shrink-0 items-center gap-2 text-[13px] leading-none",
        variant === "chip" && "h-8 rounded-md border px-2.5",
        variant === "chip" && tone === "normal" && "border-border bg-card dark:bg-transparent",
        variant === "chip" && tone === "warn" && "border-warning/40 bg-warning-soft",
        variant === "chip" && tone === "danger" && "border-destructive/40 bg-destructive-soft",
        props.className,
      )}
    >
      {variant === "chip" && (
        <Clock3
          aria-hidden="true"
          className={cn(
            "size-3.5",
            tone === "normal" && "text-muted-foreground",
            tone === "warn" && "text-warning-soft-foreground",
            tone === "danger" && "text-destructive-soft-foreground",
          )}
        />
      )}
      <span className="text-muted-foreground">{props.label}</span>
      <span
        role="timer"
        className={cn(
          "font-mono font-medium tabular-nums",
          tone === "normal" && "text-foreground",
          tone === "warn" && "text-warning-soft-foreground",
          tone === "danger" && "text-destructive-soft-foreground",
        )}
      >
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
