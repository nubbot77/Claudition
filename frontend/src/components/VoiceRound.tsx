import { useCallback, useMemo, useState } from "react";
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
  const [scratch, setScratch] = useSessionState(`${roundKey}:scratchpad`, "");
  const [usedVoice, setUsedVoice] = useState(false);
  const isDesign = step.round_type === "system_design";
  const history = useMemo(() => withoutCurrentQuestion(entries, step.speech_text), [entries, step.speech_text]);
  const markVoice = useCallback(() => setUsedVoice(true), []);
  const followUp = step.question_kind === "follow_up";

  useSpeakOnMount(tts, () => [{ text: step.speech_text }]);

  const submit = () => {
    const body = answer.trim();
    const pad = isDesign ? scratch.trim() : "";
    onAnswer({
      text: pad ? `${body}\n\n[Scratchpad]\n${pad}` : body,
      answer_mode: usedVoice ? "voice" : "text",
      seconds_taken: Math.round((Date.now() - startedAt) / 1000),
    });
  };

  return (
    <div
      className={
        isDesign
          ? "grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_25rem]"
          : "grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]"
      }
    >
      <div className="flex min-w-0 flex-col gap-4">
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
        <AnswerComposer
          id="answer"
          label="Your answer"
          placeholder={
            isDesign
              ? "Talk through your design. Use the scratchpad for classes and APIs…"
              : "Speak or type your answer…"
          }
          value={answer}
          setValue={setAnswer}
          onVoiceUsed={markVoice}
          onListenStart={tts.cancel}
          onSubmit={submit}
          submitLabel="Submit answer"
          busy={busy}
          canSubmit={answer.trim().length > 0 || (isDesign && scratch.trim().length > 0)}
          error={error}
          meta={<Timer mode="elapsed" variant="plain" since={startedAt} label="Answer time" />}
        />
      </div>

      <aside className="flex min-w-0 flex-col gap-4" aria-label="Round notes">
        {isDesign && (
          <SidePanel
            title={
              <label htmlFor="scratchpad" className="cursor-text">
                Scratchpad
              </label>
            }
            description="Attached to every answer in this round."
            descriptionId="scratchpad-hint"
            meta={scratch.trim() ? `${scratch.split("\n").length} lines` : undefined}
          >
            <textarea
              id="scratchpad"
              rows={12}
              value={scratch}
              aria-describedby="scratchpad-hint"
              spellCheck={false}
              placeholder={"Components, classes and APIs\nData model\nTrade-offs and open questions"}
              onChange={(e) => setScratch(e.target.value)}
              className="block min-h-64 w-full resize-y rounded-md border border-input bg-muted/40 px-3 py-2.5 font-mono text-[13px] leading-6 text-foreground outline-none placeholder:text-muted-foreground/60 focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/20"
            />
          </SidePanel>
        )}

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
      </aside>
    </div>
  );
}
