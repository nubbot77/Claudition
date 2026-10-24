import { useMemo } from "react";
import { ArrowRight, Clock, Layers, Link2, LoaderCircle, TriangleAlert } from "@/lib/icons";
import { FadeIn } from "@/components/motion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { formatMinutes, roundTypeLabel } from "../format";
import { useSpeakOnMount, type Tts } from "../hooks/useSpeech";
import type { BlueprintRound, CompanyBlueprint, PublicStep } from "../types";
import { QuestionBank } from "./blueprint/QuestionBank";
import { RoundItem } from "./blueprint/RoundTimeline";
import { InlineError } from "./InlineError";
import { InterviewerBubble } from "./InterviewerBubble";

interface Props {
  blueprint: CompanyBlueprint;
  step: PublicStep;
  tts: Tts;
  busy: boolean;
  error: string | null;
  onBegin: () => void;
}

/** Proportional strip of each round's share of the total time; segments jump to the round. */
function TimeAllocation({ rounds, totalMin }: { rounds: BlueprintRound[]; totalMin: number }) {
  if (!totalMin) return null;
  return (
    <nav aria-label="Rounds by time" className="flex flex-col gap-1.5">
      <div className="flex h-7 w-full gap-0.5 overflow-hidden rounded-md">
        {rounds.map((r, i) => {
          const share = Math.max(r.duration_min || 0, 0) / totalMin;
          return (
            <Tooltip key={r.id}>
              <TooltipTrigger asChild>
                <a
                  href={`#round-${r.id}`}
                  style={{ flexGrow: share, flexBasis: 0 }}
                  className="flex min-w-6 items-center justify-center bg-accent/85 font-mono text-[11px] font-medium text-accent-foreground no-underline tabular-nums outline-none hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset dark:bg-accent/70"
                >
                  {i + 1}
                  <span className="sr-only">
                    : {r.name}, {r.duration_min} min
                  </span>
                </a>
              </TooltipTrigger>
              <TooltipContent>
                {roundTypeLabel(r.type)}, {r.duration_min} min
              </TooltipContent>
            </Tooltip>
          );
        })}
      </div>
      <div className="flex justify-between font-mono text-[11px] text-muted-foreground tabular-nums">
        <span>0 min</span>
        <span>{formatMinutes(totalMin)}</span>
      </div>
    </nav>
  );
}

export function BlueprintView({ blueprint, step, tts, busy, error, onBegin }: Props) {
  useSpeakOnMount(tts, () => [{ text: step.speech_text }]);
  const rounds = useMemo(() => [...blueprint.rounds].sort((a, b) => a.order - b.order), [blueprint.rounds]);
  const totalMin = rounds.reduce((sum, r) => sum + (r.duration_min || 0), 0);
  const sourceCount = useMemo(
    () => new Set(rounds.flatMap((r) => r.sources.map((s) => s.url))).size,
    [rounds],
  );
  const roundWord = rounds.length === 1 ? "round" : "rounds";

  return (
    <article aria-labelledby="plan-title" className="flex flex-col gap-8">
      <FadeIn className="flex flex-col gap-4">
        <header className="flex flex-col gap-3">
          <h2 id="plan-title" className="text-2xl leading-8 font-semibold tracking-tight text-balance text-primary">
            {blueprint.company} · {blueprint.role}
          </h2>
          <ul className="flex flex-wrap items-center gap-x-5 gap-y-2 text-[13px] text-muted-foreground">
            {blueprint.level && (
              <li>
                <Badge variant="default" size="lg">
                  {blueprint.level}
                </Badge>
              </li>
            )}
            <li className="inline-flex items-center gap-1.5">
              <Layers aria-hidden="true" className="size-3.5" />
              <span className="font-medium text-foreground tabular-nums">{rounds.length}</span> {roundWord}
            </li>
            {totalMin > 0 && (
              <li className="inline-flex items-center gap-1.5">
                <Clock aria-hidden="true" className="size-3.5" />
                <span className="font-medium text-foreground tabular-nums">{formatMinutes(totalMin)}</span> total
              </li>
            )}
            {sourceCount > 0 && (
              <li className="inline-flex items-center gap-1.5">
                <Link2 aria-hidden="true" className="size-3.5" />
                <span className="font-medium text-foreground tabular-nums">{sourceCount}</span>{" "}
                {sourceCount === 1 ? "source" : "sources"}
              </li>
            )}
          </ul>
          {blueprint.summary && (
            <p className="max-w-[75ch] text-sm leading-6 text-pretty text-foreground/90">{blueprint.summary}</p>
          )}
        </header>
        <TimeAllocation rounds={rounds} totalMin={totalMin} />
      </FadeIn>

      <div className="grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_20rem] xl:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="flex min-w-0 flex-col gap-8">
          <InterviewerBubble name={step.interviewer_name} text={step.speech_text} tts={tts} />

          <section aria-labelledby="plan-rounds" className="flex flex-col gap-4">
            <h3 id="plan-rounds" className="text-base leading-6 font-semibold">
              Rounds
            </h3>
            <ol className="flex flex-col">
              {rounds.map((r, i) => (
                <RoundItem key={r.id} round={r} index={i} last={i === rounds.length - 1} />
              ))}
            </ol>
          </section>

          {blueprint.question_bank.length > 0 && (
            <QuestionBank questions={blueprint.question_bank} rounds={rounds} />
          )}
        </div>

        <aside aria-label="Plan notes" className="flex min-w-0 flex-col gap-4 lg:sticky lg:top-6">
          {blueprint.conflicts.length > 0 && (
            <section
              aria-labelledby="plan-conflicts"
              className="rounded-lg border border-warning/30 bg-warning-soft px-4 py-3.5 text-warning-soft-foreground"
            >
              <h3 id="plan-conflicts" className="flex items-center gap-2 text-sm leading-5 font-semibold">
                <TriangleAlert aria-hidden="true" className="size-4 shrink-0" />
                Where sources disagree
              </h3>
              <ul className="mt-2 flex list-disc flex-col gap-1.5 pl-5 text-[13px] leading-5 marker:text-warning">
                {blueprint.conflicts.map((c, i) => (
                  <li key={i}>{c}</li>
                ))}
              </ul>
            </section>
          )}

          {blueprint.focus_areas.length > 0 && (
            <section aria-labelledby="plan-focus" className="rounded-lg border border-border bg-card px-4 py-3.5 shadow-xs">
              <h3 id="plan-focus" className="text-sm leading-5 font-semibold">
                What they look for
              </h3>
              <ul className="mt-2 flex flex-col divide-y divide-border">
                {blueprint.focus_areas.map((f, i) => (
                  <li key={i} className="py-2 text-[13px] leading-5 first:pt-1 last:pb-0">
                    {f}
                  </li>
                ))}
              </ul>
            </section>
          )}
        </aside>
      </div>

      <div className="sticky bottom-0 z-10 -mt-2 border-t border-border bg-background pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <p className="text-[13px] text-muted-foreground sm:mr-auto">
            <span className="font-medium text-foreground tabular-nums">
              {rounds.length} {roundWord}
            </span>
            {totalMin > 0 && <>, about {formatMinutes(totalMin)}. </>}
            <span className="hidden md:inline">Each round is timed; you can end the interview at any point.</span>
          </p>
          <InlineError message={error} className="sm:max-w-sm" />
          <Button type="button" size="lg" onClick={onBegin} disabled={busy} className="w-full sm:w-auto sm:min-w-44">
            {busy ? (
              <>
                <LoaderCircle data-icon="inline-start" aria-hidden="true" className="animate-spin" />
                Starting…
              </>
            ) : (
              <>
                Start interview
                <ArrowRight data-icon="inline-end" aria-hidden="true" />
              </>
            )}
          </Button>
        </div>
      </div>
    </article>
  );
}
