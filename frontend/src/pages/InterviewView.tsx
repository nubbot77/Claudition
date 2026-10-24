import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { CircleAlert, CircleDashed, RotateCcw, SearchX, WifiOff } from "lucide-react";
import { StepTransition } from "@/components/motion";
import { Button } from "@/components/ui/button";
import { BlueprintView } from "../components/BlueprintView";
import { CodingRound } from "../components/CodingRound";
import { ConfirmDialog } from "../components/ConfirmDialog";
import { GdRound } from "../components/GdRound";
import { InlineError } from "../components/InlineError";
import { InterviewHeader } from "../components/InterviewHeader";
import { McqRound } from "../components/McqRound";
import { EndedView, ReportView } from "../components/ReportView";
import { RoundClock, RoundTimeNotice } from "../components/RoundClock";
import { RoundFeedback } from "../components/RoundFeedback";
import { ConnectionNote, RoomSkeleton, StatePanel } from "../components/room/RoomStates";
import { parsePerson } from "../components/room/people";
import { ThinkingPanel } from "../components/ThinkingPanel";
import { VoiceRound } from "../components/VoiceRound";
import { parseServerTime, roundTypeLabel } from "../format";
import type { Tts } from "../hooks/useSpeech";
import { useStartTime } from "../lib/storage";
import type { Health, InterviewEvent, InterviewState, RoundProgress, TranscriptEntry } from "../types";

/**
 * Everything InterviewPage renders, driven purely by props. InterviewPage owns polling and the API;
 * the dev preview (/__preview) renders this with fixture state and stubbed callbacks.
 */
export interface InterviewViewProps {
  id: string;
  state: InterviewState | null;
  /** Last polling error (the page keeps retrying). */
  loadError: string | null;
  notFound: boolean;
  health: Health | null;
  tts: Tts;
  /** An event or retry request is in flight. */
  busy: boolean;
  /** Error from the last event/retry request. */
  actionError: string | null;
  /** Sends an interview event; resolves true when the server accepted it. */
  send: (event: InterviewEvent) => Promise<boolean>;
  onRetry: () => void;
  onClearActionError: () => void;
}

interface StepProps {
  id: string;
  state: InterviewState;
  roundEntries: TranscriptEntry[];
  progress: RoundProgress | null;
  health: Health | null;
  tts: Tts;
  busy: boolean;
  error: string | null;
  send: (event: InterviewEvent) => Promise<boolean>;
}

function MissingPayload({ busy, error, onContinue }: { busy: boolean; error: string | null; onContinue: () => void }) {
  return (
    <StatePanel
      icon={<CircleAlert />}
      tone="warning"
      title="The interviewer's last step arrived incomplete"
      titleId="missing-title"
      actions={
        <Button type="button" variant="outline" onClick={onContinue} disabled={busy}>
          Ask the interviewer to continue
        </Button>
      }
    >
      <p>Ask them to continue and the step is sent again. Your answers so far are kept.</p>
      <InlineError message={error} />
    </StatePanel>
  );
}

function StepView({ id, state, roundEntries, progress, health, tts, busy, error, send }: StepProps) {
  const step = state.step;
  if (!step) {
    return (
      <StatePanel icon={<CircleDashed />} title="Waiting for the interviewer…" titleId="waiting-title" role="status">
        <p>The next step appears here as soon as it is ready.</p>
      </StatePanel>
    );
  }

  const baseKey = `${step.round_id ?? "-"}:${state.transcript.length}:${step.action}`;
  const stepKey = `iv:${id}:${baseKey}`;
  const roundKey = `iv:${id}:${step.round_id ?? "-"}`;
  const common = { tts, busy, error };
  const proceed = () => void send({ type: "continue", payload: {} });
  const missing = <MissingPayload busy={busy} error={error} onContinue={proceed} />;

  switch (step.action) {
    case "show_blueprint": {
      const blueprint = step.blueprint ?? state.blueprint;
      if (!blueprint) return missing;
      return (
        <BlueprintView
          key={baseKey}
          {...common}
          blueprint={blueprint}
          step={step}
          onBegin={() => void send({ type: "begin_rounds", payload: {} })}
        />
      );
    }
    case "ask_question":
      return (
        <VoiceRound
          key={baseKey}
          {...common}
          step={step}
          entries={roundEntries}
          stepKey={stepKey}
          roundKey={roundKey}
          onAnswer={(payload) => void send({ type: "candidate_answer", payload })}
        />
      );
    case "present_coding_problem":
      if (!step.coding_problem) return missing;
      return (
        <CodingRound
          key={baseKey}
          {...common}
          step={step}
          problem={step.coding_problem}
          health={health}
          stepKey={stepKey}
          onSubmit={(payload) => void send({ type: "code_submitted", payload })}
        />
      );
    case "present_mcq_section":
      if (!step.mcq_section) return missing;
      return (
        <McqRound
          key={baseKey}
          {...common}
          step={step}
          section={step.mcq_section}
          stepKey={stepKey}
          onSubmit={(payload) => void send({ type: "mcq_section_done", payload })}
        />
      );
    case "gd_turns":
      if (!step.gd) return missing;
      return (
        <GdRound
          key={baseKey}
          {...common}
          step={step}
          gd={step.gd}
          entries={roundEntries}
          progress={progress}
          stepKey={stepKey}
          roundKey={roundKey}
          onSpeak={(text) => void send({ type: "gd_user_spoke", payload: { text } })}
          onContinue={proceed}
        />
      );
    case "round_feedback": {
      const score = step.round_score ?? state.round_scores.find((s) => s.round_id === step.round_id);
      if (!score) return missing;
      const total = state.blueprint?.rounds.length ?? 0;
      const isLast = total > 0 && state.round_scores.length >= total;
      return <RoundFeedback key={baseKey} {...common} step={step} score={score} isLast={isLast} onContinue={proceed} />;
    }
    case "final_report":
      if (!step.report) return <EndedView profile={state.profile} scores={state.round_scores} />;
      return (
        <ReportView
          key={baseKey}
          tts={tts}
          report={step.report}
          profile={state.profile}
          speech={step.speech_text}
          interviewerName={step.interviewer_name}
        />
      );
    default:
      return missing;
  }
}

function ErrorPanel({ message, busy, onRetry }: { message: string | null; busy: boolean; onRetry: () => void }) {
  return (
    <StatePanel
      icon={<CircleAlert />}
      tone="danger"
      title="The interviewer ran into a problem"
      titleId="error-title"
      role="alert"
      actions={
        <Button type="button" onClick={onRetry} disabled={busy}>
          <RotateCcw className={busy ? "motion-safe:animate-spin" : undefined} />
          {busy ? "Retrying…" : "Retry last step"}
        </Button>
      }
    >
      <p>Nothing you submitted is lost. Retry to send the last step again.</p>
      <pre className="max-h-40 overflow-auto rounded-md border border-border bg-muted/50 px-3 py-2 font-mono text-xs leading-5 break-words whitespace-pre-wrap text-foreground">
        {message || "The last step failed."}
      </pre>
    </StatePanel>
  );
}

function earliestEntry(entries: TranscriptEntry[]): number | null {
  let min: number | null = null;
  for (const e of entries) {
    const t = parseServerTime(e.at);
    if (t != null && (min == null || t < min)) min = t;
  }
  return min;
}

export function InterviewView({
  id,
  state,
  loadError,
  notFound,
  health,
  tts,
  busy,
  actionError,
  send,
  onRetry,
  onClearActionError,
}: InterviewViewProps) {
  const [confirmEnd, setConfirmEnd] = useState(false);

  const endInterview = async () => {
    if (await send({ type: "end_interview", payload: {} })) setConfirmEnd(false);
  };

  const step = state?.step ?? null;
  const blueprint = state?.blueprint ?? step?.blueprint ?? null;
  const roundId = step?.round_id ?? null;
  const rounds = useMemo(() => (blueprint ? [...blueprint.rounds].sort((a, b) => a.order - b.order) : []), [blueprint]);
  const round = rounds.find((r) => r.id === roundId) ?? null;
  const roundEntries = useMemo(
    () => (state && roundId ? state.transcript.filter((e) => e.round_id === roundId) : []),
    [state, roundId],
  );
  const completedRoundIds = useMemo(() => new Set(state?.round_scores.map((s) => s.round_id) ?? []), [state]);
  const finished = state?.status === "finished" || step?.action === "final_report";
  const fallbackRoundStart = useStartTime(`iv:${id}:${roundId ?? "-"}:round-start`);
  const roundStart = earliestEntry(roundEntries) ?? fallbackRoundStart;

  let roundLabel: string | null = null;
  if (state) {
    if (finished) roundLabel = "Final report";
    else if (!blueprint) roundLabel = "Company research";
    else if (step?.action === "show_blueprint") roundLabel = "Interview plan";
    else if (round) roundLabel = round.name;
    else if (step?.round_score) roundLabel = step.round_score.round_name;
    else if (step?.round_type) roundLabel = roundTypeLabel(step.round_type);
  }
  const roundPosition = round ? `Round ${rounds.indexOf(round) + 1} of ${rounds.length}` : null;
  const progress: RoundProgress | null =
    state?.round_progress && roundId && state.round_progress.round_id === roundId ? state.round_progress : null;

  const title = state
    ? `${state.profile.company} · ${state.profile.role}`
    : notFound
      ? "Interview not found"
      : loadError
        ? "Claudition"
        : "Loading interview…";

  useEffect(() => {
    document.title = state ? `${state.profile.company} · ${state.profile.role} — Claudition` : "Claudition";
  }, [state]);

  // Announce each new interviewer line once the step has rendered (a live region that already exists).
  const [announcement, setAnnouncement] = useState("");
  const speech = state?.status === "ready" ? (step?.speech_text ?? "") : "";
  const speaker = step?.interviewer_name ?? null;
  useEffect(() => {
    if (!speech.trim()) return;
    const who = parsePerson(speaker, "Interviewer").name;
    const timer = window.setTimeout(() => setAnnouncement(`${who}: ${speech}`), 300);
    return () => window.clearTimeout(timer);
  }, [speech, speaker]);

  const showClock =
    state?.status === "ready" &&
    !!round &&
    round.duration_min > 0 &&
    (step?.action === "ask_question" || step?.action === "gd_turns");

  const clockProps =
    showClock && round
      ? {
          startedAt: roundStart,
          budgetMin: round.duration_min,
          busy,
          mustWrapUp: !!progress?.must_wrap_up,
          onTimeUp: () => void send({ type: "time_up", payload: { round_id: round.id } }),
        }
      : null;

  let body;
  let bodyKey: string;
  if (notFound) {
    bodyKey = "not-found";
    body = (
      <StatePanel
        icon={<SearchX />}
        title="Interview not found"
        titleId="not-found-title"
        actions={
          <Button asChild variant="outline">
            <Link to="/">Back to start</Link>
          </Button>
        }
      >
        <p>This interview doesn't exist, or the server was restarted and its sessions were cleared.</p>
      </StatePanel>
    );
  } else if (!state) {
    bodyKey = loadError ? "offline" : "loading";
    body = loadError ? (
      <StatePanel
        icon={<WifiOff />}
        tone="warning"
        title="Can't reach the interview server"
        titleId="offline-title"
        role="alert"
      >
        <p className="break-words">{loadError}</p>
        <p className="flex items-center gap-2 text-[13px]">
          <RotateCcw aria-hidden="true" className="size-3.5 motion-safe:animate-spin" />
          Retrying automatically every few seconds.
        </p>
      </StatePanel>
    ) : (
      <RoomSkeleton />
    );
  } else {
    bodyKey = `${state.status}:${state.transcript.length}:${step?.action ?? "-"}`;
    if (state.status === "thinking") {
      body = <ThinkingPanel state={state} />;
    } else if (state.status === "error") {
      body = <ErrorPanel message={actionError ?? state.error} busy={busy} onRetry={onRetry} />;
    } else if (state.status === "finished") {
      body = step?.report ? (
        <ReportView
          tts={tts}
          report={step.report}
          profile={state.profile}
          speech={step.speech_text}
          interviewerName={step.interviewer_name}
        />
      ) : (
        <EndedView profile={state.profile} scores={state.round_scores} />
      );
    } else {
      body = (
        <StepView
          id={id}
          state={state}
          roundEntries={roundEntries}
          progress={progress}
          health={health}
          tts={tts}
          busy={busy}
          error={actionError}
          send={send}
        />
      );
    }
  }

  return (
    <>
      <InterviewHeader
        company={state?.profile.company ?? null}
        role={state?.profile.role ?? null}
        roundLabel={roundPosition && roundLabel ? `${roundPosition}: ${roundLabel}` : roundLabel}
        rounds={rounds}
        currentRoundId={roundId}
        completedRoundIds={completedRoundIds}
        progress={progress}
        questionKind={step?.action === "ask_question" ? step.question_kind : null}
        clock={clockProps ? <RoundClock {...clockProps} /> : null}
        tts={tts}
        canEnd={!!state && !finished && !notFound}
        loading={!state && !notFound}
        onEnd={() => {
          onClearActionError();
          setConfirmEnd(true);
        }}
      />
      <main id="main" className="page-container flex flex-1 flex-col gap-4 pt-6 pb-16 lg:pt-8">
        <h1 className="sr-only">
          {title}
          {roundLabel ? ` — ${roundLabel}` : ""}
        </h1>
        <div className="sr-only" aria-live="polite" aria-atomic="true">
          {announcement}
        </div>
        {state && loadError && <ConnectionNote message={loadError} />}
        {clockProps && <RoundTimeNotice {...clockProps} />}
        <StepTransition stepKey={bodyKey} className="flex min-w-0 flex-col">
          {body}
        </StepTransition>
      </main>
      <ConfirmDialog
        open={confirmEnd}
        title="End the interview now?"
        confirmLabel="End interview"
        cancelLabel="Keep going"
        tone="danger"
        busy={busy}
        error={actionError}
        onConfirm={() => void endInterview()}
        onCancel={() => setConfirmEnd(false)}
      >
        <p>
          The interviewer stops here and writes a report from what you've done so far. Rounds you haven't reached won't
          be scored.
        </p>
        {state?.status === "thinking" && (
          <p className="text-[13px] text-warning-soft-foreground">
            The interviewer is still working on the last step. If ending fails, try again in a moment.
          </p>
        )}
      </ConfirmDialog>
    </>
  );
}
