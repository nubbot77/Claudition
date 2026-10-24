import { useCallback, useMemo, useRef, useState } from "react";
import { CornerDownRight } from "lucide-react";
import { normalizeText } from "../format";
import { useSpeakOnMount, type Tts } from "../hooks/useSpeech";
import { useSessionState, useStartTime } from "../lib/storage";
import type { CandidateAnswerPayload, PublicStep, TranscriptEntry } from "../types";
import { AnswerComposer } from "./AnswerComposer";
import { InterviewerBubble } from "./InterviewerBubble";
import { SidePanel } from "./room/SidePanel";
import { Timer } from "./Timer";
import { TranscriptList } from "./TranscriptList";
import { slimBoard, type BoardElement } from "./whiteboard/board";
import { Whiteboard } from "./whiteboard/Whiteboard";

interface Props {
  step: PublicStep;
  entries: TranscriptEntry[];
  tts: Tts;
  stepKey: string;
  roundKey: string;
  busy: boolean;
  error: string | null;
  onAnswer: (payload: CandidateAnswerPayload) => void;
}

function withoutCurrentQuestion(entries: TranscriptEntry[], question: string): TranscriptEntry[] {
  const last = entries[entries.length - 1];
  if (last && last.role === "interviewer" && normalizeText(last.text) === normalizeText(question)) {
    return entries.slice(0, -1);
  }
  return entries;
}

export function VoiceRound({ step, entries, tts, stepKey, roundKey, busy, error, onAnswer }: Props) {
  const startedAt = useStartTime(`${stepKey}:started`);
  const [answer, setAnswer] = useSessionState(`${stepKey}:answer`, "");
  const [usedVoice, setUsedVoice] = useState(false);
  const isDesign = step.round_type === "system_design";
  const history = useMemo(() => withoutCurrentQuestion(entries, step.speech_text), [entries, step.speech_text]);
  const markVoice = useCallback(() => setUsedVoice(true), []);
  const followUp = step.question_kind === "follow_up";

  // Whiteboard: the board is sent only when it changed since the last answer, so the interviewer
  // never re-reads an unchanged diagram (each copy costs tokens on every later turn).
  const board = useRef<readonly BoardElement[]>([]);
  const [boardSig, setBoardSig] = useState("");
  const [sentSig, setSentSig] = useSessionState(`${roundKey}:board-sent`, "");
  const onBoardChange = useCallback((elements: readonly BoardElement[], signature: string) => {
    board.current = elements;
    setBoardSig(signature);
  }, []);
  const boardPending = isDesign && boardSig !== "" && boardSig !== sentSig;

  useSpeakOnMount(tts, () => [{ text: step.speech_text }]);

  const submit = () => {
    const payload: CandidateAnswerPayload = {
      text: answer.trim(),
      answer_mode: usedVoice ? "voice" : "text",
      seconds_taken: Math.round((Date.now() - startedAt) / 1000),
    };
    if (boardPending) {
      payload.diagram = slimBoard(board.current);
      setSentSig(boardSig);
    }
    onAnswer(payload);
  };

  const composer = (
    <AnswerComposer
      id="answer"
      label="Your answer"
      placeholder={
        isDesign ? "Explain your design while you draw it on the whiteboard…" : "Speak or type your answer…"
      }
      value={answer}
      setValue={setAnswer}
      onVoiceUsed={markVoice}
      onListenStart={tts.cancel}
      onSubmit={submit}
      submitLabel="Submit answer"
      busy={busy}
      canSubmit={answer.trim().length > 0 || boardPending}
      error={error}
      meta={<Timer mode="elapsed" variant="plain" since={startedAt} label="Answer time" />}
    />
  );

  const transcript = (
    <SidePanel
      title="Transcript"
      titleId="round-log-title"
      description="Everything said in this round so far."
      meta={history.length ? `${history.length} ${history.length === 1 ? "entry" : "entries"}` : undefined}
    >
      <TranscriptList
        items={history}
        label="Round transcript"
        emptyText="This is the first question of the round."
        className={isDesign ? "max-h-80" : "max-h-[32rem]"}
      />
    </SidePanel>
  );

  const bubble = (
    <InterviewerBubble
      name={step.interviewer_name}
      text={step.speech_text}
      tts={tts}
      kicker={
        followUp ? (
          <span className="inline-flex items-center gap-1.5 text-accent-soft-foreground">
            <CornerDownRight aria-hidden="true" className="size-3.5" />
            Follow-up on your last answer
          </span>
        ) : undefined
      }
    />
  );

  if (isDesign) {
    return (
      <div className="flex min-w-0 flex-col gap-6">
        {bubble}
        <Whiteboard storageKey={`${roundKey}:whiteboard`} onChange={onBoardChange} pending={boardPending} />
        <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
          {composer}
          <aside className="flex min-w-0 flex-col gap-4" aria-label="Round notes">
            {transcript}
          </aside>
        </div>
      </div>
    );
  }

  return (
    <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
      <div className="flex min-w-0 flex-col gap-4">
        {bubble}
        {composer}
      </div>
      <aside className="flex min-w-0 flex-col gap-4" aria-label="Round notes">
        {transcript}
      </aside>
    </div>
  );
}
