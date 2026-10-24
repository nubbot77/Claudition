import { ArrowRight, ChevronDown, Loader2 } from "@/lib/icons";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Skeleton } from "@/components/ui/skeleton";
import { clampScore } from "../format";
import { useSpeakOnMount, type Tts } from "../hooks/useSpeech";
import type { PublicStep, RoundScore, RubricItem } from "../types";
import { VerdictBadge } from "./Badges";
import { InlineError } from "./InlineError";
import { InterviewerBubble } from "./InterviewerBubble";
import { PointsList } from "./PointsList";
import { RubricTable } from "./RubricTable";
import { ScoreDial } from "./ScoreDial";

interface Props {
  step: PublicStep;
  /** null while the judge is still scoring the round in the background */
  score: RoundScore | null;
  roundName: string;
  tts: Tts;
  busy: boolean;
  error: string | null;
  isLast: boolean;
  onContinue: () => void;
}

function extremes(rubric: RubricItem[]): { best: RubricItem; worst: RubricItem } | null {
  if (rubric.length < 2) return null;
  const sorted = [...rubric].sort((a, b) => clampScore(b.score, 10) - clampScore(a.score, 10));
  const best = sorted[0];
  const worst = sorted[sorted.length - 1];
  if (clampScore(best.score, 10) === clampScore(worst.score, 10)) return null;
  return { best, worst };
}

function Stat({ label, value, detail }: { label: string; value: string; detail?: string }) {
  return (
    <div className="flex min-w-0 flex-col gap-1 px-5 py-3.5">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="flex min-w-0 items-baseline justify-between gap-3">
        <span className="truncate text-sm font-medium text-foreground" title={value}>
          {value}
        </span>
        {detail && <span className="shrink-0 font-mono text-[13px] text-muted-foreground tabular-nums">{detail}</span>}
      </dd>
    </div>
  );
}

/** Shown while the judge scores the round: the closing line is already spoken, the scorecard fills in. */
function ScoringPlaceholder({ roundName }: { roundName: string }) {
  return (
    <header className="overflow-hidden rounded-lg border border-border bg-card shadow-xs" aria-busy="true">
      <div className="flex flex-col gap-5 p-5 sm:flex-row sm:items-center sm:gap-6 sm:p-6">
        <div className="flex size-28 shrink-0 items-center justify-center rounded-full border-4 border-muted">
          <Loader2 className="size-7 text-muted-foreground motion-safe:animate-spin" aria-hidden="true" />
        </div>
        <div className="flex min-w-0 flex-1 flex-col gap-2">
          <p className="text-[13px] text-muted-foreground">Round scorecard</p>
          <h2 id="feedback-title" className="text-2xl font-semibold tracking-tight text-balance text-primary">
            {roundName}
          </h2>
          <p className="text-sm text-muted-foreground" role="status">
            The judge is scoring your answers against the rubric. This usually takes 10–20 seconds.
          </p>
          <div className="flex flex-col gap-2 pt-1">
            <Skeleton className="h-3 w-3/4" />
            <Skeleton className="h-3 w-1/2" />
          </div>
        </div>
      </div>
    </header>
  );
}

export function RoundFeedback({ step, score, roundName, tts, busy, error, isLast, onContinue }: Props) {
  useSpeakOnMount(tts, () => [{ text: step.speech_text }]);
  const [answerOpen, setAnswerOpen] = useState(false);

  if (!score) {
    return (
      <article className="mx-auto flex w-full max-w-5xl flex-col gap-6" aria-labelledby="feedback-title">
        <ScoringPlaceholder roundName={roundName} />
        <InterviewerBubble name={step.interviewer_name} text={step.speech_text} tts={tts} />
        <footer className="flex flex-col items-stretch gap-3 border-t border-border pt-5 sm:flex-row sm:items-center sm:justify-end">
          <InlineError message={error} />
          <p className="text-[13px] text-muted-foreground sm:mr-auto">
            You can move on now; this round's score will also be in your final report.
          </p>
          <Button size="lg" variant="outline" onClick={onContinue} disabled={busy} className="sm:min-w-44">
            {isLast ? "Continue to final report" : "Next round"}
            <ArrowRight aria-hidden="true" />
          </Button>
        </footer>
      </article>
    );
  }

  const range = extremes(score.rubric);
  const modelAnswer = score.model_answer.trim();

  return (
    <article className="mx-auto flex w-full max-w-5xl flex-col gap-6" aria-labelledby="feedback-title">
      <header className="overflow-hidden rounded-lg border border-border bg-card shadow-xs">
        <div className="flex flex-col gap-5 p-5 sm:flex-row sm:items-center sm:gap-6 sm:p-6">
          <ScoreDial score={score.score} size={112} label={`${score.round_name} score`} />
          <div className="flex min-w-0 flex-col gap-2">
            <p className="text-[13px] text-muted-foreground">Round scorecard</p>
            <h2 id="feedback-title" className="text-2xl font-semibold tracking-tight text-balance text-primary">
              {score.round_name}
            </h2>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
              <VerdictBadge verdict={score.verdict} large />
              {score.rubric.length > 0 && (
                <span className="text-[13px] text-muted-foreground">
                  Scored on {score.rubric.length} rubric {score.rubric.length === 1 ? "criterion" : "criteria"}
                </span>
              )}
            </div>
          </div>
        </div>
        {range && (
          <dl className="grid border-t border-border bg-muted/30 sm:grid-cols-2 sm:divide-x sm:divide-border max-sm:divide-y max-sm:divide-border">
            <Stat label="Strongest criterion" value={range.best.criterion} detail={`${clampScore(range.best.score, 10)}/10`} />
            <Stat label="Most room to improve" value={range.worst.criterion} detail={`${clampScore(range.worst.score, 10)}/10`} />
          </dl>
        )}
      </header>

      <InterviewerBubble name={step.interviewer_name} text={step.speech_text} tts={tts} />

      <section aria-labelledby="rubric-title" className="overflow-hidden rounded-lg border border-border bg-card shadow-xs">
        <header className="flex items-baseline justify-between gap-3 border-b border-border px-5 py-3">
          <h3 id="rubric-title" className="text-base font-semibold text-foreground">
            Rubric
          </h3>
          <span className="text-xs text-muted-foreground">Scores out of 10</span>
        </header>
        <RubricTable items={score.rubric} caption={`${score.round_name} rubric`} />
      </section>

      <div className="grid gap-4 md:grid-cols-2">
        <PointsList title="Strengths" items={score.strengths} tone="good" />
        <PointsList title="Gaps to close" items={score.gaps} tone="gap" />
      </div>

      {modelAnswer && (
        <Collapsible
          open={answerOpen}
          onOpenChange={setAnswerOpen}
          className="rounded-lg border border-border bg-card shadow-xs"
        >
          <CollapsibleTrigger className="group flex w-full items-center justify-between gap-3 rounded-lg px-5 py-3.5 text-left transition-colors hover:bg-muted/50 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none">
            <span className="flex flex-col gap-0.5">
              <span className="text-sm font-semibold text-foreground">Model answer</span>
              <span className="text-[13px] text-muted-foreground">What a strong answer to this round covers</span>
            </span>
            <ChevronDown
              className="size-4 shrink-0 text-muted-foreground transition-transform duration-200 group-data-[state=open]:rotate-180"
              aria-hidden="true"
            />
          </CollapsibleTrigger>
          <CollapsibleContent className="overflow-hidden data-closed:animate-collapsible-up data-open:animate-collapsible-down">
            <p className="max-w-[75ch] border-t border-border px-5 py-4 text-sm leading-6 whitespace-pre-line text-foreground">
              {modelAnswer}
            </p>
          </CollapsibleContent>
        </Collapsible>
      )}

      <footer className="flex flex-col items-stretch gap-3 border-t border-border pt-5 sm:flex-row sm:items-center sm:justify-end">
        <InlineError message={error} />
        <Button size="lg" onClick={onContinue} disabled={busy} className="sm:min-w-44">
          {busy ? (
            <>
              <Loader2 className="motion-safe:animate-spin" aria-hidden="true" />
              Continuing…
            </>
          ) : (
            <>
              {isLast ? "Continue to final report" : "Next round"}
              <ArrowRight aria-hidden="true" />
            </>
          )}
        </Button>
      </footer>
    </article>
  );
}
