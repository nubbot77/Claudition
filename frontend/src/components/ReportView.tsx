import { Info, Printer, Plus } from "@/lib/icons";
import { useReducedMotion } from "motion/react";
import { useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { capitalize, clampScore, parseServerTime } from "../format";
import { useSpeakOnMount, type Tts } from "../hooks/useSpeech";
import type { FinalReport, InterviewProfile, RoundScore } from "../types";
import { VerdictBadge } from "./Badges";
import { InterviewerBubble } from "./InterviewerBubble";
import { PointsList } from "./PointsList";
import { PrepPlan } from "./report/PrepPlan";
import { ScoreMeter } from "./report/ScoreMeter";
import { hashText } from "./report/useLocalState";
import { usePrinting } from "./report/usePrinting";
import { RoundScoreCard, roundAnchor } from "./RoundScoreCard";
import { ScoreDial } from "./ScoreDial";

/**
 * Printing always uses the light palette (dark-mode text would vanish on paper) and keeps meter/badge fills.
 * Scoped to the report so the rest of the app is unaffected.
 */
const PRINT_LIGHT =
  "[print-color-adjust:exact] print:[color-scheme:light] print:[--background:#fff] print:[--foreground:#0f172a] print:[--card:#fff] print:[--card-foreground:#0f172a] print:[--primary:#0f2a4a] print:[--muted:#f1f5f9] print:[--muted-foreground:#475569] print:[--border:#cbd5e1] print:[--accent:#2563eb] print:[--accent-soft:#eff6ff] print:[--accent-soft-foreground:#1d4ed8] print:[--success:#059669] print:[--success-soft:#ecfdf5] print:[--success-soft-foreground:#047857] print:[--warning:#d97706] print:[--warning-soft:#fffbeb] print:[--warning-soft-foreground:#b45309] print:[--destructive:#e11d48] print:[--destructive-soft:#fff1f2] print:[--destructive-soft-foreground:#be123c]";

const CARD = "rounded-lg border border-border bg-card shadow-xs print:shadow-none";

interface Props {
  report: FinalReport;
  profile: InterviewProfile;
  speech: string;
  interviewerName: string | null;
  tts: Tts;
  /** When the interview finished (server timestamp). Defaults to today. */
  date?: string | null;
}

function formatReportDate(date: string | null | undefined): string {
  const t = parseServerTime(date) ?? Date.now();
  return new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(t);
}

function ReportHeader({
  profile,
  date,
  roundsScored,
  title = "Interview debrief",
}: {
  profile: InterviewProfile;
  date?: string | null;
  roundsScored: number;
  title?: string;
}) {
  const meta: { label: string; value: string }[] = [
    { label: "Role", value: profile.role || "Not specified" },
    { label: "Experience", value: profile.experience ? capitalize(profile.experience) : "Not specified" },
    { label: "Rounds scored", value: String(roundsScored) },
    { label: "Report date", value: formatReportDate(date) },
  ];

  return (
    <header className="flex flex-col gap-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex min-w-0 flex-col gap-1">
          <p className="text-[13px] text-muted-foreground">{title}</p>
          <h2 className="text-2xl font-semibold tracking-tight text-balance text-primary">{profile.company}</h2>
        </div>
        <div className="flex flex-wrap gap-2 print:hidden">
          <Button variant="outline" asChild>
            <Link to="/">
              <Plus aria-hidden="true" />
              New interview
            </Link>
          </Button>
          <Button onClick={() => window.print()}>
            <Printer aria-hidden="true" />
            Print report
          </Button>
        </div>
      </div>
      <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-border bg-border sm:grid-cols-4">
        {meta.map((m) => (
          <div key={m.label} className="flex min-w-0 flex-col gap-1 bg-card px-4 py-3">
            <dt className="text-xs text-muted-foreground">{m.label}</dt>
            <dd className="text-sm font-medium break-words text-foreground">
              {m.value}
            </dd>
          </div>
        ))}
      </dl>
    </header>
  );
}

function Notice({ children, tone = "info" }: { children: ReactNode; tone?: "info" | "warning" }) {
  return (
    <div
      role="note"
      className={cn(
        "flex gap-3 rounded-lg border px-4 py-3 text-sm leading-6",
        tone === "warning"
          ? "border-warning/30 bg-warning-soft text-warning-soft-foreground"
          : "border-accent/20 bg-accent-soft text-accent-soft-foreground",
      )}
    >
      <Info className="mt-1 size-4 shrink-0" aria-hidden="true" />
      <div className="min-w-0">{children}</div>
    </div>
  );
}

/** Compact per-round breakdown; each row opens that round's details further down. */
function RoundBreakdown({ scores, onOpen }: { scores: RoundScore[]; onOpen: (index: number) => void }) {
  return (
    <ul className="flex flex-col">
      {scores.map((s, i) => {
        const value = clampScore(s.score);
        return (
          <li key={`${s.round_id}-${i}`} className="border-b border-border last:border-0">
            <button
              type="button"
              onClick={() => onOpen(i)}
              className="grid w-full grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-1.5 rounded-md px-2 py-2.5 text-left transition-colors duration-150 hover:bg-muted/60 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none sm:grid-cols-[minmax(0,1fr)_4.5rem_2rem_auto]"
              aria-label={`${s.round_name}: ${value} out of 100. Show details`}
            >
              <span className="line-clamp-2 text-sm font-medium text-foreground max-sm:col-span-2">{s.round_name}</span>
              <ScoreMeter value={value} className="max-sm:hidden" />
              <span className="font-mono text-[13px] font-medium text-foreground tabular-nums sm:text-right">{value}</span>
              <span className="justify-self-end">
                <VerdictBadge verdict={s.verdict} />
              </span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}

function RoundDetails({
  scores,
  openRounds,
  setOpen,
  printing,
}: {
  scores: RoundScore[];
  openRounds: Set<number>;
  setOpen: (index: number, open: boolean) => void;
  printing: boolean;
}) {
  return (
    <section aria-labelledby="details-title" className="flex flex-col gap-3 print:break-before-page">
      <div className="flex flex-col gap-0.5">
        <h3 id="details-title" className="text-base font-semibold text-foreground">
          Round details
        </h3>
        <p className="text-[13px] text-muted-foreground print:hidden">
          Open a round for its rubric, strengths, gaps and model answer.
        </p>
      </div>
      <ol className="flex flex-col gap-2">
        {scores.map((s, i) => (
          <RoundScoreCard
            key={`${s.round_id}-${i}`}
            score={s}
            index={i}
            open={openRounds.has(i)}
            onOpenChange={(open) => setOpen(i, open)}
            printing={printing}
          />
        ))}
      </ol>
    </section>
  );
}

function useRoundDetails(scores: RoundScore[]) {
  const reduce = useReducedMotion();
  const [openRounds, setOpenRounds] = useState<Set<number>>(() => new Set());
  const setOpen = (index: number, open: boolean) =>
    setOpenRounds((prev) => {
      const next = new Set(prev);
      if (open) next.add(index);
      else next.delete(index);
      return next;
    });
  const reveal = (index: number) => {
    setOpen(index, true);
    const score = scores[index];
    if (!score) return;
    window.requestAnimationFrame(() => {
      const el = document.getElementById(roundAnchor(score, index));
      el?.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" });
      el?.querySelector<HTMLButtonElement>("button")?.focus({ preventScroll: true });
    });
  };
  return { openRounds, setOpen, reveal };
}

export function ReportView({ report, profile, speech, interviewerName, tts, date }: Props) {
  useSpeakOnMount(tts, () => [{ text: speech }]);
  const printing = usePrinting();
  const scores = report.round_scores;
  const { openRounds, setOpen, reveal } = useRoundDetails(scores);
  const notAssessed =
    clampScore(report.overall_score) === 0 && scores.every((s) => clampScore(s.score) === 0);
  const planKey = `prep-plan:${hashText(`${profile.company}|${profile.role}|${report.summary}`)}`;

  return (
    <article className={cn("mx-auto flex w-full max-w-5xl flex-col gap-8 print:max-w-none print:gap-6", PRINT_LIGHT)}>
      <ReportHeader profile={profile} date={date} roundsScored={scores.length} />

      <section aria-labelledby="overall-title" className={cn(CARD, "overflow-hidden print:break-inside-avoid")}>
        <h3 id="overall-title" className="sr-only">
          Overall result
        </h3>
        <div className={cn("grid", scores.length > 0 && "lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]")}>
          <div className="flex flex-col gap-5 p-5 sm:p-6">
            <div className="flex items-center gap-5">
              <ScoreDial score={report.overall_score} size={128} label="Overall score" />
              <div className="flex flex-col items-start gap-2">
                <span className="text-[13px] text-muted-foreground">Overall score</span>
                <VerdictBadge verdict={report.verdict} large />
              </div>
            </div>
            {notAssessed && (
              <Notice>The session ended before any work was submitted, so there was nothing to score.</Notice>
            )}
            <p className="max-w-[72ch] text-sm leading-6 text-pretty text-foreground">{report.summary}</p>
          </div>
          {scores.length > 0 && (
            <div className="flex flex-col gap-2 border-border bg-muted/30 p-5 max-lg:border-t sm:p-6 lg:border-l print:bg-transparent">
              <h4 className="px-2 text-sm font-semibold text-foreground">Score by round</h4>
              <RoundBreakdown scores={scores} onOpen={reveal} />
            </div>
          )}
        </div>
      </section>

      {speech.trim() && (
        <div className="print:hidden">
          <InterviewerBubble name={interviewerName} text={speech} tts={tts} compact />
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        <PointsList title="Top strengths" items={report.top_strengths} tone="good" />
        <PointsList title="Top gaps" items={report.top_gaps} tone="gap" />
      </div>

      {report.prep_plan_7d.length > 0 && <PrepPlan plan={report.prep_plan_7d} storageKey={planKey} />}

      {scores.length > 0 && (
        <RoundDetails scores={scores} openRounds={openRounds} setOpen={setOpen} printing={printing} />
      )}
    </article>
  );
}

export function EndedView({
  profile,
  scores,
  date,
}: {
  profile: InterviewProfile;
  scores: RoundScore[];
  date?: string | null;
}) {
  const printing = usePrinting();
  const { openRounds, setOpen, reveal } = useRoundDetails(scores);

  return (
    <article className={cn("mx-auto flex w-full max-w-5xl flex-col gap-8 print:max-w-none print:gap-6", PRINT_LIGHT)}>
      <ReportHeader profile={profile} date={date} roundsScored={scores.length} title="Interview ended" />
      <Notice tone="warning">
        This interview ended before a final report was written.{" "}
        {scores.length ? "Scores from the rounds you finished are below." : "No rounds were scored."}
      </Notice>

      {scores.length > 0 ? (
        <>
          <section aria-labelledby="ended-scores" className={cn(CARD, "p-5 sm:p-6")}>
            <h3 id="ended-scores" className="mb-2 px-2 text-sm font-semibold text-foreground">
              Score by round
            </h3>
            <RoundBreakdown scores={scores} onOpen={reveal} />
          </section>
          <RoundDetails scores={scores} openRounds={openRounds} setOpen={setOpen} printing={printing} />
        </>
      ) : (
        <section className={cn(CARD, "flex flex-col items-start gap-3 p-6")}>
          <h3 className="text-base font-semibold text-foreground">Nothing to review yet</h3>
          <p className="max-w-[60ch] text-sm leading-6 text-muted-foreground">
            Run a new mock interview and finish at least one round to get a scorecard with rubric feedback.
          </p>
          <Button asChild className="print:hidden">
            <Link to="/">Start a new interview</Link>
          </Button>
        </section>
      )}
    </article>
  );
}
