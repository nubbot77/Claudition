import { useCallback, useMemo, type Dispatch, type KeyboardEvent, type ReactNode, type SetStateAction } from "react";
import { Info, LoaderCircle, Mic, Square } from "@/lib/icons";
import { FadePresence } from "@/components/motion";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { joinText, wordCount } from "../format";
import { useSpeechRecognition } from "../hooks/useSpeech";
import { InlineError } from "./InlineError";
import { Kbd } from "./room/Kbd";
import { isApplePlatform } from "./room/people";

interface Props {
  id: string;
  label: string;
  hint?: string;
  placeholder?: string;
  value: string;
  setValue: Dispatch<SetStateAction<string>>;
  onVoiceUsed: () => void;
  onListenStart?: () => void;
  onSubmit: () => void;
  submitLabel: string;
  micLabel?: string;
  busy: boolean;
  canSubmit?: boolean;
  error?: string | null;
  rows?: number;
  /** Right side of the header, e.g. the answer timer. */
  meta?: ReactNode;
  /** Rendered under the composer. */
  extra?: ReactNode;
  /** Secondary action in the footer, before Submit (e.g. "Skip summary"). */
  secondaryAction?: ReactNode;
}

export function AnswerComposer({
  id,
  label,
  hint,
  placeholder,
  value,
  setValue,
  onVoiceUsed,
  onListenStart,
  onSubmit,
  submitLabel,
  micLabel = "Speak answer",
  busy,
  canSubmit,
  error,
  rows = 7,
  meta,
  extra,
  secondaryAction,
}: Props) {
  const appendFinal = useCallback(
    (chunk: string) => {
      setValue((prev) => joinText(prev, chunk));
      onVoiceUsed();
    },
    [setValue, onVoiceUsed],
  );
  const mic = useSpeechRecognition(appendFinal);
  const ready = (canSubmit ?? value.trim().length > 0) && !busy;
  const hintId = `${id}-hint`;
  const words = wordCount(value);
  const mod = useMemo(() => (isApplePlatform() ? "⌘" : "Ctrl"), []);

  const toggleMic = () => {
    if (mic.listening) {
      mic.stop();
    } else {
      onListenStart?.();
      mic.start();
    }
  };

  const submit = () => {
    if (!ready) return;
    if (mic.listening) mic.stop();
    onSubmit();
  };

  const onKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      submit();
    }
  };

  return (
    <div className="flex flex-col gap-3">
      <div
        className={cn(
          "overflow-hidden rounded-lg border bg-card shadow-xs transition-[border-color,box-shadow] duration-150",
          "has-[textarea:focus-visible]:border-ring has-[textarea:focus-visible]:ring-3 has-[textarea:focus-visible]:ring-ring/15",
          mic.listening ? "border-destructive/50" : "border-border",
        )}
      >
        <div className="flex items-start justify-between gap-3 px-4 pt-3.5 pb-1">
          <div className="min-w-0">
            <label htmlFor={id} className="block text-sm leading-5 font-semibold text-foreground">
              {label}
            </label>
            <p id={hintId} className="text-[13px] leading-5 text-muted-foreground">
              {hint ?? "Speak or type. Your words appear here and you can edit them before submitting."}
            </p>
          </div>
          {meta && <div className="shrink-0">{meta}</div>}
        </div>

        <textarea
          id={id}
          rows={rows}
          value={value}
          placeholder={placeholder}
          aria-describedby={hintId}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={onKeyDown}
          className="block min-h-28 w-full resize-y border-0 bg-transparent px-4 py-2.5 text-[15px] leading-7 text-foreground shadow-none outline-none placeholder:text-muted-foreground/80 focus-visible:outline-none"
        />

        <FadePresence show={mic.listening}>
          <div className="mx-4 mb-2 flex min-h-9 items-start gap-2 rounded-md bg-destructive-soft/60 px-3 py-2 text-[13px] leading-5">
            <span className="relative mt-1.5 flex size-2 shrink-0" aria-hidden="true">
              <span className="absolute inline-flex size-full rounded-full bg-destructive opacity-60 motion-safe:animate-ping" />
              <span className="relative inline-flex size-2 rounded-full bg-destructive" />
            </span>
            <p className="min-w-0 flex-1 text-muted-foreground" aria-live="polite">
              {mic.interim ? (
                <span className="text-foreground/80 italic">{mic.interim}</span>
              ) : (
                <span className="font-medium text-destructive-soft-foreground">Listening…</span>
              )}
            </p>
          </div>
        </FadePresence>

        <div className="flex flex-wrap items-center gap-x-3 gap-y-2 border-t border-border bg-muted/40 px-3 py-2.5">
          {mic.supported ? (
            <Button
              type="button"
              variant={mic.listening ? "destructive-outline" : "outline"}
              size="sm"
              aria-pressed={mic.listening}
              onClick={toggleMic}
            >
              {mic.listening ? <Square className="fill-current" /> : <Mic />}
              {mic.listening ? "Stop listening" : micLabel}
            </Button>
          ) : (
            <p className="flex items-center gap-1.5 text-[13px] text-muted-foreground">
              <Info aria-hidden="true" className="size-3.5 shrink-0" />
              Voice input needs Chrome or Edge. Type your answer.
            </p>
          )}

          <span className="font-mono text-xs text-muted-foreground tabular-nums" aria-live="off">
            {words} {words === 1 ? "word" : "words"}
          </span>

          <div className="ml-auto flex items-center gap-3">
            <span className="hidden items-center gap-1 text-xs text-muted-foreground sm:flex" aria-hidden="true">
              <Kbd>{mod}</Kbd>
              <Kbd>Enter</Kbd>
              <span className="ml-0.5">to submit</span>
            </span>
            {secondaryAction}
            <Button
              type="button"
              onClick={submit}
              disabled={!ready}
              aria-keyshortcuts="Control+Enter Meta+Enter"
            >
              {busy && <LoaderCircle className="animate-spin" />}
              {busy ? "Sending…" : submitLabel}
            </Button>
          </div>
        </div>
      </div>

      {mic.supported && <InlineError message={mic.error} />}
      <InlineError message={error} />
      {extra}
    </div>
  );
}
