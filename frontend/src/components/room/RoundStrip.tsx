import { Check, CornerDownRight } from "@/lib/icons";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { formatMinutes, roundTypeLabel } from "../../format";
import type { BlueprintRound, QuestionKind, RoundProgress, RoundProgressUnit, RoundType } from "../../types";

type StepState = "done" | "current" | "upcoming";

interface StripProps {
  rounds: BlueprintRound[];
  currentRoundId: string | null;
  completedRoundIds: Set<string>;
  /** Server budget for the current round (already matched to currentRoundId), or null. */
  progress: RoundProgress | null;
  questionKind?: QuestionKind | null;
  /** Shown on small screens when no round is active ("Interview plan", "Final report"). */
  statusLabel: string | null;
}

function stepState(round: BlueprintRound, currentRoundId: string | null, completed: Set<string>): StepState {
  if (round.id === currentRoundId) return "current";
  return completed.has(round.id) ? "done" : "upcoming";
}

const STATE_TEXT: Record<StepState, string> = {
  done: "completed",
  current: "current round",
  upcoming: "not started",
};

function StepIndicator({ state, number }: { state: StepState; number: number }) {
  return (
    <span
      className={cn(
        "flex size-5 shrink-0 items-center justify-center rounded-full font-mono text-[11px] leading-none font-semibold tabular-nums",
        state === "done" && "bg-success-soft text-success-soft-foreground ring-1 ring-success/30 ring-inset",
        state === "current" && "bg-accent text-accent-foreground",
        state === "upcoming" && "bg-card text-muted-foreground ring-1 ring-input ring-inset",
      )}
    >
      {state === "done" ? <Check className="size-3" strokeWidth={3} /> : number}
    </span>
  );
}

/* ---------------------------------------------------------------------------------------------- */

function inferUnit(type: RoundType): RoundProgressUnit {
  if (type === "coding") return "problem";
  if (type === "group_discussion") return "contribution";
  if (type === "aptitude_mcq") return "mcq_section";
  return "question";
}

interface CounterProps {
  progress: RoundProgress | null;
  questionKind?: QuestionKind | null;
  compact?: boolean;
}

/** "Question 2 of 4" (or Problem / Contributions) from the server's round budget, plus a follow-up marker. */
export function QuestionCounter({ progress, questionKind, compact = false }: CounterProps) {
  if (!progress) return null;
  const unit = progress.unit ?? inferUnit(progress.round_type);
  const budget = Math.max(0, Math.round(progress.budget));
  if (unit === "mcq_section" || budget <= 0) return null;

  const contribution = unit === "contribution";
  const used = Math.min(budget, contribution ? Math.max(0, progress.used) : Math.max(1, progress.used));
  const noun = contribution ? "Contributions" : unit === "problem" ? "Problem" : "Question";
  const followUp = questionKind === "follow_up";
  const showPips = !compact && budget <= 10;

  return (
    <div className="flex shrink-0 items-center gap-2.5">
      {followUp && !compact && (
        <Badge variant="accent" className="gap-1">
          <CornerDownRight aria-hidden="true" />
          Follow-up
          {!compact && progress.max_follow_ups > 0 && (
            <span className="font-mono tabular-nums">
              {Math.max(1, progress.follow_ups)}/{progress.max_follow_ups}
            </span>
          )}
        </Badge>
      )}
      {showPips && (
        <span aria-hidden="true" className="hidden items-center gap-1 sm:flex">
          {Array.from({ length: budget }, (_, i) => {
            const filled = contribution ? i < used : i < used - 1;
            const current = !contribution && i === used - 1;
            return (
              <span
                key={i}
                className={cn(
                  "h-1.5 w-3 rounded-full transition-colors duration-200",
                  current ? "bg-accent" : filled ? "bg-primary/60" : "bg-input",
                )}
              />
            );
          })}
        </span>
      )}
      <p className="text-[13px] whitespace-nowrap text-muted-foreground">
        <span className="font-medium text-foreground">{noun}</span>{" "}
        <span className="font-mono font-medium text-foreground tabular-nums">{used}</span> of{" "}
        <span className="font-mono tabular-nums">{budget}</span>
      </p>
    </div>
  );
}

/* ---------------------------------------------------------------------------------------------- */

/**
 * The bar under the app bar: every blueprint round as a stepper (done = check, current = blue, upcoming = muted)
 * and the current round's question counter. Below md it collapses to "Round 2 of 4" with a segmented progress line.
 */
export function RoundStrip({
  rounds,
  currentRoundId,
  completedRoundIds,
  progress,
  questionKind,
  statusLabel,
}: StripProps) {
  if (!rounds.length) return null;
  const total = rounds.length;
  const currentIndex = rounds.findIndex((r) => r.id === currentRoundId);
  const current = currentIndex >= 0 ? rounds[currentIndex] : null;
  const doneCount = rounds.filter((r) => completedRoundIds.has(r.id)).length;

  return (
    <div className="border-b border-border bg-card">
      <div className="page-container flex min-h-12 items-center gap-4 py-2">
        <nav aria-label="Interview rounds" className="min-w-0 flex-1">
          {/* md and up: the full stepper */}
          <ol className="hidden min-w-0 items-center gap-2 md:flex">
            {rounds.map((round, i) => {
              const state = stepState(round, currentRoundId, completedRoundIds);
              const prevDone = i > 0 && stepState(rounds[i - 1], currentRoundId, completedRoundIds) === "done";
              return (
                <li
                  key={round.id}
                  aria-current={state === "current" ? "step" : undefined}
                  className={cn("flex min-w-0 items-center gap-2", state === "current" ? "shrink-0" : "shrink")}
                >
                  {i > 0 && (
                    <span
                      aria-hidden="true"
                      className={cn("h-px w-4 shrink-0 lg:w-6", prevDone ? "bg-success/40" : "bg-border")}
                    />
                  )}
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span aria-hidden="true" className="flex min-w-0 items-center gap-2">
                        <StepIndicator state={state} number={i + 1} />
                        <span
                          className={cn(
                            "truncate text-[13px] leading-5",
                            state === "current"
                              ? "font-semibold text-foreground"
                              : "hidden text-muted-foreground xl:inline",
                          )}
                        >
                          {roundTypeLabel(round.type) || round.name}
                        </span>
                      </span>
                    </TooltipTrigger>
                    <TooltipContent side="bottom" sideOffset={6}>
                      {round.name}
                      {round.duration_min > 0 ? `, ${formatMinutes(round.duration_min)}` : ""}
                    </TooltipContent>
                  </Tooltip>
                  <span className="sr-only">
                    Round {i + 1} of {total}: {round.name}, {STATE_TEXT[state]}
                  </span>
                </li>
              );
            })}
          </ol>

          {/* Below md: "Round 2 of 4" + segmented progress */}
          <div className="flex min-w-0 flex-col gap-1.5 md:hidden">
            <div className="flex min-w-0 items-center gap-3">
              <p className="flex min-w-0 flex-1 items-baseline gap-2 text-[13px] leading-5">
                {current ? (
                  <>
                    <span className="shrink-0 font-semibold text-foreground">
                      Round <span className="font-mono tabular-nums">{currentIndex + 1}</span> of{" "}
                      <span className="font-mono tabular-nums">{total}</span>
                    </span>
                    <span className="truncate text-muted-foreground">{current.name}</span>
                  </>
                ) : (
                  <>
                    <span className="shrink-0 font-semibold text-foreground">{statusLabel ?? "Rounds"}</span>
                    <span className="truncate text-muted-foreground">
                      {doneCount} of {total} complete
                    </span>
                  </>
                )}
              </p>
              <QuestionCounter progress={progress} questionKind={questionKind} compact />
            </div>
            <div aria-hidden="true" className="flex gap-1">
              {rounds.map((round) => {
                const state = stepState(round, currentRoundId, completedRoundIds);
                return (
                  <span
                    key={round.id}
                    className={cn(
                      "h-1 flex-1 rounded-full",
                      state === "done" && "bg-success",
                      state === "current" && "bg-accent",
                      state === "upcoming" && "bg-input",
                    )}
                  />
                );
              })}
            </div>
          </div>
        </nav>

        <div className="hidden md:flex">
          <QuestionCounter progress={progress} questionKind={questionKind} />
        </div>
      </div>
    </div>
  );
}
