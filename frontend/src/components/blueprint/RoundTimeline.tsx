import type { ReactNode } from "react";
import { Clock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { capitalize, roundTypeLabel } from "../../format";
import type { BlueprintRound, Confidence } from "../../types";
import { SourceLink } from "../SourceLink";
import { budgetLabel, CONFIDENCE_LEVEL, DIFFICULTY_VARIANT } from "./meta";

/** Three-bar meter: how consistently the sources describe this round. */
export function ConfidenceMeter({ value }: { value: Confidence }) {
  const level = CONFIDENCE_LEVEL[value] ?? 0;
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span
          tabIndex={0}
          className="inline-flex items-center gap-1.5 rounded-sm text-[13px] font-medium outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <span aria-hidden="true" className="inline-flex h-3 items-end gap-[2px]">
            {[1, 2, 3].map((bar) => (
              <span
                key={bar}
                className={cn(
                  "w-[3px] rounded-[1px]",
                  bar === 1 ? "h-1.5" : bar === 2 ? "h-2.5" : "h-3",
                  bar <= level
                    ? level === 1
                      ? "bg-warning"
                      : level === 2
                        ? "bg-accent"
                        : "bg-success"
                    : "bg-border",
                )}
              />
            ))}
          </span>
          {capitalize(value)}
        </span>
      </TooltipTrigger>
      <TooltipContent>How consistently the sources describe this round</TooltipContent>
    </Tooltip>
  );
}

function Fact({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex min-w-0 flex-col gap-1">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="text-[13px] leading-5 font-medium">{children}</dd>
    </div>
  );
}

export function RoundItem({ round, index, last }: { round: BlueprintRound; index: number; last: boolean }) {
  const budget = budgetLabel(round.type, round.question_budget);
  const headingId = `round-${round.id}-title`;

  return (
    <li id={`round-${round.id}`} className="relative flex scroll-mt-6 gap-3 pb-6 last:pb-0 sm:gap-4">
      {!last && (
        <span aria-hidden="true" className="absolute top-8 bottom-0 left-3.5 w-px -translate-x-1/2 bg-border" />
      )}
      <span
        aria-hidden="true"
        className="relative z-[1] mt-4 flex size-7 shrink-0 items-center justify-center rounded-full bg-brand-navy font-mono text-xs font-medium text-brand-navy-foreground tabular-nums"
      >
        {index + 1}
      </span>

      <article
        aria-labelledby={headingId}
        className="min-w-0 flex-1 rounded-lg border border-border bg-card shadow-xs"
      >
        <header className="flex flex-col gap-2 px-4 pt-4 sm:flex-row sm:items-start sm:justify-between sm:gap-4 sm:px-5">
          <div className="min-w-0">
            <Badge variant="outline" className="mb-1.5">
              {roundTypeLabel(round.type)}
            </Badge>
            <h3 id={headingId} className="text-base leading-6 font-semibold tracking-tight text-balance">
              <span className="sr-only">Round {index + 1}: </span>
              {round.name}
            </h3>
          </div>
          <span className="inline-flex shrink-0 items-center gap-1.5 font-mono text-[13px] text-muted-foreground tabular-nums sm:pt-0.5">
            <Clock aria-hidden="true" className="size-3.5" />
            {round.duration_min} min
          </span>
        </header>

        <dl className="mx-4 mt-3 grid grid-cols-2 gap-x-4 gap-y-3 border-y border-border py-3 sm:mx-5 sm:grid-cols-3">
          <Fact label="Difficulty">
            <Badge variant={DIFFICULTY_VARIANT[round.difficulty] ?? "secondary"}>{capitalize(round.difficulty)}</Badge>
          </Fact>
          <Fact label="Source confidence">
            <ConfidenceMeter value={round.confidence} />
          </Fact>
          <Fact label="Scope">
            <span className="tabular-nums">{budget || "Set by the interviewer"}</span>
          </Fact>
        </dl>

        <div className="flex flex-col gap-3 px-4 py-4 sm:px-5">
          {round.focus.length > 0 && (
            <div className="flex flex-col gap-1.5">
              <span id={`${headingId}-focus`} className="text-xs text-muted-foreground">
                Focus
              </span>
              <ul aria-labelledby={`${headingId}-focus`} className="flex flex-wrap gap-1.5">
                {round.focus.map((f, i) => (
                  <li key={i}>
                    <Badge variant="secondary" className="h-auto min-h-5 py-0.5 whitespace-normal">
                      {f}
                    </Badge>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {round.notes && (
            <p className="max-w-[72ch] text-[13px] leading-5 text-pretty text-muted-foreground">{round.notes}</p>
          )}
        </div>

        {round.sources.length > 0 && (
          <div className="rounded-b-lg border-t border-border bg-muted/30 px-4 py-3 sm:px-5">
            <h4 className="mb-2 text-xs font-medium text-muted-foreground">
              Sources <span className="font-mono tabular-nums">{round.sources.length}</span>
            </h4>
            <ul className="flex flex-col gap-2">
              {round.sources.map((s, i) => (
                <li key={i}>
                  <SourceLink source={s} />
                </li>
              ))}
            </ul>
          </div>
        )}
      </article>
    </li>
  );
}
