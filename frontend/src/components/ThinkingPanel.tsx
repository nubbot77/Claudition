import { useEffect, useMemo, useRef } from "react";
import { motion } from "motion/react";
import {
  Database,
  FileText,
  Gauge,
  GitBranch,
  Info,
  LoaderCircle,
  Play,
  Receipt,
  RotateCw,
  Search,
  SquareTerminal,
  type LucideIcon,
} from "@/lib/icons";
import { FadeIn, baseTransition } from "@/components/motion";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { formatClock, formatTime, hostOf, parseServerTime, ROLE_LABEL, safeHref } from "../format";
import { useNow } from "../hooks/useNow";
import type { Action, InterviewState, TranscriptEntry } from "../types";

const AFTER_ACTION: Record<Action, string> = {
  show_blueprint: "Setting up the first round",
  ask_question: "The interviewer is considering your answer",
  present_coding_problem: "Reviewing your solution",
  present_mcq_section: "Scoring your section",
  gd_turns: "The panel is responding",
  round_feedback: "Preparing the next round",
  final_report: "Writing up your report",
};

/** Research usually finishes inside this window (minutes). */
const TYPICAL_MIN = 3;
const TYPICAL_MAX = 8;
const MAX_LOG_LINES = 200;

/* ---------------------------------------------------------------------------------------------- */
/* Progress lines                                                                                  */
/* ---------------------------------------------------------------------------------------------- */

type LineKind = "session" | "delegate" | "search" | "read" | "cost" | "check" | "cache" | "run" | "retry" | "note";

interface LogLine {
  kind: LineKind;
  /** Run by a delegated researcher rather than the lead interviewer. */
  sub: boolean;
  /** Leading words in the foreground colour. */
  lead: string;
  /** Remainder in the muted colour. */
  detail: string;
  /** For delegations: the researcher's name. */
  agent?: string;
  /** For "Reading" lines. */
  url?: string;
}

const KIND_ICON: Record<LineKind, LucideIcon> = {
  session: SquareTerminal,
  delegate: GitBranch,
  search: Search,
  read: FileText,
  cost: Receipt,
  check: Gauge,
  cache: Database,
  run: Play,
  retry: RotateCw,
  note: Info,
};

/** Parses the backend's progress lines (see backend/app/claude_runner.py describe_stream_event). */
function parseLine(raw: string): LogLine {
  const sub = /^\s*↳/.test(raw);
  const text = raw.replace(/^\s*↳\s*/, "").trim();
  let m: RegExpExecArray | null;
  if ((m = /^Session ready \((.*)\)$/.exec(text))) return { kind: "session", sub, lead: "Session ready", detail: m[1] };
  if ((m = /^Delegating to ([^:]+):\s*(.*)$/.exec(text))) {
    return { kind: "delegate", sub, lead: "Delegated to", agent: m[1].trim(), detail: m[2] };
  }
  if ((m = /^Searching:\s*(.*)$/.exec(text))) return { kind: "search", sub, lead: "Search", detail: m[1] };
  if ((m = /^Reading:\s*(.*)$/.exec(text))) return { kind: "read", sub, lead: "Read", detail: m[1], url: m[1] };
  if ((m = /^Session cost estimate so far (\$[\d.]+)/.exec(text))) {
    return { kind: "cost", sub, lead: "Cost estimate", detail: `${m[1]} so far, counts toward your plan's usage` };
  }
  if (/^Budget (check|still)/.test(text)) return { kind: "check", sub, lead: text, detail: "" };
  if (/^Using cached research/.test(text)) return { kind: "cache", sub, lead: text, detail: "" };
  if (/^Running your/.test(text)) return { kind: "run", sub, lead: text, detail: "" };
  if (/^Claude API retry|malformed/i.test(text)) return { kind: "retry", sub, lead: text, detail: "" };
  return { kind: "note", sub, lead: text, detail: "" };
}

/** One-line, present-tense summary of the newest progress line. */
function currentActivity(line: LogLine | undefined, researching: boolean): string {
  if (!line) return researching ? "Starting the research session" : "Starting";
  switch (line.kind) {
    case "session":
      return researching ? "Planning what to research" : "Reviewing the conversation so far";
    case "delegate":
      return `${line.agent ?? "A researcher"} is working on: ${line.detail}`;
    case "search":
      return `Searching for “${line.detail}”`;
    case "read":
      return `Reading ${hostOf(line.url ?? "") || line.detail}`;
    case "cost":
      return researching ? "Drafting the interview plan" : "Finishing up";
    default:
      return line.lead.replace(/…$/, "");
  }
}

function splitUrl(url: string): { host: string; rest: string } {
  try {
    const u = new URL(url);
    const rest = `${u.pathname === "/" ? "" : u.pathname}${u.search}`;
    return { host: u.hostname.replace(/^www\./, ""), rest };
  } catch {
    return { host: "", rest: url };
  }
}

function LogDetail({ line }: { line: LogLine }) {
  if (line.kind === "read" && line.url) {
    const { host, rest } = splitUrl(line.url);
    const href = safeHref(line.url);
    const content = (
      <>
        <span className="text-foreground/80">{host}</span>
        <span className="text-muted-foreground">{rest}</span>
      </>
    );
    return href ? (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        title={line.url}
        className="block min-w-0 truncate rounded-sm no-underline outline-none hover:underline focus-visible:ring-2 focus-visible:ring-ring"
      >
        {content}
        <span className="sr-only"> (opens in a new tab)</span>
      </a>
    ) : (
      <span className="block min-w-0 truncate" title={line.url}>
        {content}
      </span>
    );
  }
  if (line.kind === "delegate") {
    return (
      <span className="min-w-0 break-words">
        <span className="font-medium text-foreground">{line.agent}</span>
        {line.detail && <span className="text-muted-foreground"> · {line.detail}</span>}
      </span>
    );
  }
  if (line.kind === "search") {
    return <span className="min-w-0 break-words text-muted-foreground">“{line.detail}”</span>;
  }
  return line.detail ? <span className="min-w-0 break-words text-muted-foreground">{line.detail}</span> : null;
}

function ActivityLog({ lines, live }: { lines: string[]; live: boolean }) {
  const listRef = useRef<HTMLOListElement>(null);
  const stick = useRef(true);
  const initialCount = useRef(lines.length);
  const offset = Math.max(0, lines.length - MAX_LOG_LINES);
  const shown = useMemo(() => lines.slice(offset).map(parseLine), [lines, offset]);

  useEffect(() => {
    const el = listRef.current;
    if (el && stick.current) el.scrollTop = el.scrollHeight;
  }, [lines.length]);

  const onScroll = () => {
    const el = listRef.current;
    if (el) stick.current = el.scrollHeight - el.scrollTop - el.clientHeight < 24;
  };

  if (!shown.length) {
    return (
      <p className="flex items-center gap-2 px-4 py-3 font-mono text-xs text-muted-foreground">
        <LoaderCircle aria-hidden="true" className="size-3.5 animate-spin motion-reduce:animate-none" />
        Waiting for the first update…
      </p>
    );
  }

  return (
    <ol
      ref={listRef}
      onScroll={onScroll}
      role="log"
      aria-live="polite"
      aria-label="Activity log"
      tabIndex={0}
      className="max-h-80 overflow-y-auto overscroll-contain py-2 font-mono text-xs leading-5 outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset"
    >
      {shown.map((line, i) => {
        const index = offset + i;
        const latest = live && i === shown.length - 1;
        const Icon = latest ? LoaderCircle : KIND_ICON[line.kind];
        const warn = line.kind === "retry" || line.kind === "check";
        return (
          <motion.li
            key={index}
            initial={index < initialCount.current ? false : { opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            transition={baseTransition}
            className={cn(
              "flex min-w-0 items-start gap-2 border-l-2 py-0.5 pr-4",
              line.sub ? "pl-8" : "pl-3.5",
              latest ? "border-accent bg-accent-soft/60" : "border-transparent",
            )}
          >
            <Icon
              aria-hidden="true"
              className={cn(
                "mt-[3px] size-3.5 shrink-0",
                latest ? "animate-spin text-accent motion-reduce:animate-none" : warn ? "text-warning" : "text-muted-foreground",
              )}
            />
            <span className="flex min-w-0 flex-1 gap-1.5">
              <span className={cn("shrink-0", warn ? "text-warning-soft-foreground" : "text-foreground")}>
                {line.lead}
              </span>
              <LogDetail line={line} />
            </span>
          </motion.li>
        );
      })}
    </ol>
  );
}

/* ---------------------------------------------------------------------------------------------- */
/* Skeletons and side content                                                                      */
/* ---------------------------------------------------------------------------------------------- */

function PlanSkeleton({ company }: { company: string }) {
  return (
    <Card size="sm" aria-hidden="true">
      <CardHeader>
        <CardTitle className="text-sm">Interview plan</CardTitle>
        <CardDescription className="text-[13px]">
          Appears here when research finishes. You review it before round 1.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <span className="text-xs text-muted-foreground">{company}</span>
          <Skeleton className="h-2 w-full motion-reduce:animate-none" />
        </div>
        <ol className="flex flex-col gap-4">
          {[0.62, 0.48, 0.7, 0.55].map((w, i) => (
            <li key={i} className="flex items-start gap-3">
              <span className="flex size-6 shrink-0 items-center justify-center rounded-full border border-border font-mono text-[11px] text-muted-foreground tabular-nums">
                {i + 1}
              </span>
              <div className="flex flex-1 flex-col gap-1.5 pt-1">
                <Skeleton className="h-3 motion-reduce:animate-none" style={{ width: `${w * 100}%` }} />
                <Skeleton className="h-2.5 w-1/3 motion-reduce:animate-none" />
              </div>
              <Skeleton className="mt-1 h-3 w-10 motion-reduce:animate-none" />
            </li>
          ))}
        </ol>
      </CardContent>
    </Card>
  );
}

function speakerOf(entry: TranscriptEntry): string {
  if (entry.role === "candidate") return "You";
  return entry.speaker.trim() || ROLE_LABEL[entry.role];
}

function LastExchange({ entries }: { entries: TranscriptEntry[] }) {
  return (
    <Card size="sm">
      <CardHeader>
        <CardTitle>
          <h3 className="text-sm leading-5 font-semibold">Last exchange</h3>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ol className="flex flex-col gap-4">
          {entries.map((e, i) => (
            <li key={i} className="flex min-w-0 flex-col gap-1">
              <div className="flex items-baseline justify-between gap-3">
                <span
                  className={cn(
                    "truncate text-[13px] font-medium",
                    e.role === "candidate" ? "text-accent" : "text-foreground",
                  )}
                >
                  {speakerOf(e)}
                </span>
                {e.at && (
                  <time dateTime={e.at} className="shrink-0 font-mono text-xs text-muted-foreground tabular-nums">
                    {formatTime(e.at)}
                  </time>
                )}
              </div>
              <p className="line-clamp-4 text-[13px] leading-5 whitespace-pre-line text-muted-foreground">{e.text}</p>
            </li>
          ))}
        </ol>
      </CardContent>
    </Card>
  );
}

function NextStepSkeleton() {
  return (
    <div aria-hidden="true" className="flex flex-col gap-2.5 rounded-lg border border-dashed border-border px-4 py-4">
      <Skeleton className="h-3 w-28 motion-reduce:animate-none" />
      <Skeleton className="h-3 w-full motion-reduce:animate-none" />
      <Skeleton className="h-3 w-5/6 motion-reduce:animate-none" />
      <Skeleton className="h-3 w-2/3 motion-reduce:animate-none" />
    </div>
  );
}

/* ---------------------------------------------------------------------------------------------- */
/* Panel                                                                                           */
/* ---------------------------------------------------------------------------------------------- */

export function ThinkingPanel({ state }: { state: InterviewState }) {
  const mountedAt = useMemo(() => Date.now(), []);
  const now = useNow(1000);
  const since = parseServerTime(state.thinking_since) ?? mountedAt;
  const elapsedSec = Math.max(0, Math.floor((now - since) / 1000));
  const researching = !state.blueprint;
  const company = state.profile?.company?.trim() || "the company";
  const role = state.profile?.role?.trim();

  const parsed = useMemo(() => state.progress.map(parseLine), [state.progress]);
  const latest = parsed[parsed.length - 1];
  const counts = useMemo(
    () => ({
      delegate: parsed.filter((l) => l.kind === "delegate").length,
      search: parsed.filter((l) => l.kind === "search").length,
      read: parsed.filter((l) => l.kind === "read").length,
    }),
    [parsed],
  );
  const recent = useMemo(
    () => (researching ? [] : state.transcript.filter((e) => e.role !== "system").slice(-2)),
    [researching, state.transcript],
  );

  const title = researching
    ? `Researching ${company}'s interview process`
    : state.step
      ? AFTER_ACTION[state.step.action]
      : "The interviewer is thinking";
  const overtime = researching && elapsedSec > TYPICAL_MAX * 60;

  const stats = [
    { label: "Researchers", value: counts.delegate },
    { label: "Searches", value: counts.search },
    { label: "Pages read", value: counts.read },
  ];

  return (
    <section aria-labelledby="thinking-title" aria-busy="true" className="flex flex-col gap-6">
      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_20rem] xl:grid-cols-[minmax(0,1fr)_22rem]">
        <FadeIn className="min-w-0">
          <Card className="gap-0 overflow-hidden py-0">
            <div className="flex flex-col gap-4 px-4 py-5 sm:flex-row sm:items-start sm:px-6">
              <div className="flex min-w-0 flex-1 items-start gap-3">
                <span className="flex size-8 shrink-0 items-center justify-center rounded-md bg-accent-soft text-accent">
                  <LoaderCircle aria-hidden="true" className="size-4 animate-spin motion-reduce:animate-none" />
                </span>
                <div className="min-w-0 flex-1">
                  <h2 id="thinking-title" className="text-lg leading-7 font-semibold tracking-tight text-balance">
                    {title}
                  </h2>
                  {researching && role && <p className="text-[13px] leading-5 text-muted-foreground">{role}</p>}
                  <p className="mt-2 max-w-[62ch] text-[13px] leading-5 text-pretty text-muted-foreground">
                    {researching
                      ? `Reading recent candidate reports and your job description to plan the rounds. This usually takes ${TYPICAL_MIN}–${TYPICAL_MAX} minutes. Keep this tab open; you'll review the plan before anything starts.`
                      : "Take a breath. The next step appears here as soon as it's ready."}
                  </p>
                </div>
              </div>
              <div className="flex shrink-0 items-baseline gap-3 border-t border-border pt-3 sm:flex-col sm:items-end sm:gap-0.5 sm:border-0 sm:pt-0">
                <span className="text-xs text-muted-foreground">Elapsed</span>
                <span role="timer" aria-label="Elapsed time" className="font-mono text-xl leading-7 font-medium tabular-nums">
                  {formatClock(elapsedSec)}
                </span>
                {researching && (
                  <span className="text-xs text-muted-foreground sm:mt-0.5">
                    Typical {TYPICAL_MIN}–{TYPICAL_MAX} min
                  </span>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2 border-t border-border bg-muted/40 px-4 py-2.5 text-[13px] sm:px-6">
              <span className="shrink-0 text-muted-foreground">Now</span>
              <span className="min-w-0 truncate font-medium" title={currentActivity(latest, researching)}>
                {currentActivity(latest, researching)}
              </span>
            </div>

            {overtime && (
              <p className="flex items-start gap-2 border-t border-border bg-warning-soft px-4 py-2.5 text-[13px] leading-5 text-warning-soft-foreground sm:px-6">
                <Info aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
                Taking longer than usual. Research is still running; nothing is lost while you wait.
              </p>
            )}

            {researching && (
              <dl className="grid grid-cols-3 divide-x divide-border border-t border-border">
                {stats.map((s) => (
                  <div key={s.label} className="flex flex-col gap-0.5 px-4 py-3 sm:px-6">
                    <dt className="text-xs text-muted-foreground">{s.label}</dt>
                    <dd className="font-mono text-lg leading-6 font-medium tabular-nums">{s.value}</dd>
                  </div>
                ))}
              </dl>
            )}

            <div className="border-t border-border">
              <div className="flex items-center justify-between gap-3 px-4 pt-3 sm:px-6">
                <h3 className="text-[13px] leading-5 font-semibold">Activity</h3>
                <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                  <span aria-hidden="true" className="relative flex size-2">
                    <span className="absolute inline-flex size-full animate-ping rounded-full bg-success/50 motion-reduce:hidden" />
                    <span className="relative inline-flex size-2 rounded-full bg-success" />
                  </span>
                  Live
                </span>
              </div>
              <ActivityLog lines={state.progress} live />
            </div>
          </Card>
        </FadeIn>

        <FadeIn delay={0.03} className="flex min-w-0 flex-col gap-4">
          {researching ? (
            <PlanSkeleton company={company} />
          ) : (
            <>
              {recent.length > 0 && <LastExchange entries={recent} />}
              <div className="flex flex-col gap-2">
                <span className="text-xs text-muted-foreground">Next step</span>
                <NextStepSkeleton />
              </div>
            </>
          )}
        </FadeIn>
      </div>
    </section>
  );
}
