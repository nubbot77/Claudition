import { Clock3, TimerOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { formatClock } from "../format";
import { useNow } from "../hooks/useNow";

interface Props {
  startedAt: number;
  budgetMin: number;
  busy: boolean;
  onTimeUp: () => void;
  /** The server has told the interviewer to wrap the round up (round_progress.must_wrap_up). */
  mustWrapUp?: boolean;
}

function useRoundTime(startedAt: number, budgetMin: number) {
  const now = useNow(1000);
  const budget = Math.max(0, Math.round(budgetMin * 60));
  const elapsed = Math.max(0, Math.floor((now - startedAt) / 1000));
  return { budget, elapsed, over: budget > 0 && elapsed >= budget };
}

/** Round clock for the app bar: elapsed / budget in mono. Amber once past the budget, red when the round must wrap up. */
export function RoundClock({ startedAt, budgetMin, mustWrapUp = false }: Props) {
  const { budget, elapsed, over } = useRoundTime(startedAt, budgetMin);
  const tone = mustWrapUp ? "danger" : over ? "warn" : "normal";
  const label = `Round time ${formatClock(elapsed)}${budget > 0 ? ` of ${formatClock(budget)}` : ""}${
    mustWrapUp ? ", wrapping up" : over ? ", over time" : ""
  }`;

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div
          role="timer"
          aria-label={label}
          className={cn(
            "inline-flex h-8 items-center gap-1.5 rounded-md border px-2 font-mono text-[13px] leading-none font-medium tabular-nums transition-colors duration-200 sm:px-2.5",
            tone === "normal" && "border-border bg-card text-foreground dark:bg-transparent",
            tone === "warn" && "border-warning/40 bg-warning-soft text-warning-soft-foreground",
            tone === "danger" && "border-destructive/40 bg-destructive-soft text-destructive-soft-foreground",
          )}
        >
          <Clock3 aria-hidden="true" className="hidden size-3.5 opacity-70 sm:block" />
          <span>{formatClock(elapsed)}</span>
          {budget > 0 && (
            <span className="hidden opacity-60 sm:inline">
              <span className="px-0.5">/</span>
              {formatClock(budget)}
            </span>
          )}
        </div>
      </TooltipTrigger>
      <TooltipContent side="bottom" sideOffset={6}>
        {mustWrapUp ? "The interviewer is wrapping this round up" : over ? "Past the planned round time" : "Time in this round"}
      </TooltipContent>
    </Tooltip>
  );
}

/** In-page notice once the round runs past its budget, with the existing "Wrap up round" (time_up) action. */
export function RoundTimeNotice({ startedAt, budgetMin, busy, onTimeUp, mustWrapUp = false }: Props) {
  const { budget, over } = useRoundTime(startedAt, budgetMin);
  if (!over) return null;

  return (
    <div
      role="status"
      className={cn(
        "flex flex-wrap items-center gap-x-3 gap-y-2 rounded-lg border px-4 py-3 text-[13px] leading-5",
        mustWrapUp
          ? "border-destructive/30 bg-destructive-soft text-destructive-soft-foreground"
          : "border-warning/35 bg-warning-soft text-warning-soft-foreground",
      )}
    >
      <TimerOff aria-hidden="true" className="size-4 shrink-0" />
      <p className="min-w-0 flex-1">
        <span className="font-semibold">
          {mustWrapUp ? "This round is wrapping up." : `Planned round time (${formatClock(budget)}) is up.`}
        </span>{" "}
        Finish your current answer, or move on now.
      </p>
      <Button
        type="button"
        size="sm"
        variant="outline"
        className="ml-auto border-current/30 bg-card text-foreground"
        onClick={onTimeUp}
        disabled={busy}
      >
        Wrap up round
      </Button>
    </div>
  );
}
