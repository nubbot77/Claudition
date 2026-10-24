import { ArrowLeft, ArrowRight, Eraser, Flag, Loader2, Send } from "@/lib/icons";
import { useCallback, useEffect, useId, useRef, useState } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Toggle } from "@/components/ui/toggle";
import { cn } from "@/lib/utils";
import { useSpeakOnMount, type Tts } from "../hooks/useSpeech";
import { useSessionState, useStartTime } from "../lib/storage";
import type { McqDonePayload, McqSection, PublicStep } from "../types";
import { CountdownTimer } from "./assessment/CountdownTimer";
import { InlineError } from "./InlineError";
import { InterviewerBubble } from "./InterviewerBubble";
import { StepTransition } from "./motion";

const LETTERS = "ABCDEFGHIJ";

interface Props {
  step: PublicStep;
  section: McqSection;
  tts: Tts;
  stepKey: string;
  busy: boolean;
  error: string | null;
  onSubmit: (payload: McqDonePayload) => void;
}

function Kbd({ children }: { children: string }) {
  return (
    <kbd className="inline-flex h-5 min-w-5 items-center justify-center rounded-sm border border-border bg-muted px-1 font-mono text-[11px] font-medium text-muted-foreground">
      {children}
    </kbd>
  );
}

function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  return target.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName);
}

function LegendSwatch({ className, label }: { className: string; label: string }) {
  return (
    <li className="flex items-center gap-2">
      <span aria-hidden="true" className={cn("relative size-3.5 shrink-0 rounded-sm", className)} />
      {label}
    </li>
  );
}

export function McqRound({ step, section, tts, stepKey, busy, error, onSubmit }: Props) {
  const startedAt = useStartTime(`${stepKey}:started`);
  const [answers, setAnswers] = useSessionState<Record<string, number>>(`${stepKey}:answers`, {});
  const [flags, setFlags] = useSessionState<string[]>(`${stepKey}:flags`, []);
  const [index, setIndex] = useSessionState(`${stepKey}:index`, 0);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [timeUp, setTimeUp] = useState(false);
  const groupId = useId();
  const questions = section.questions;
  const safeIndex = Math.max(0, Math.min(index, questions.length - 1));
  const current = questions[safeIndex];
  const answeredCount = questions.filter((q) => answers[q.id] !== undefined).length;
  const unansweredNums = questions.flatMap((q, i) => (answers[q.id] === undefined ? [i + 1] : []));
  const flagSet = new Set(flags);
  const flaggedNums = questions.flatMap((q, i) => (flagSet.has(q.id) ? [i + 1] : []));
  const limitSec = Math.max(0, Math.round(section.time_limit_min * 60));
  const locked = busy || timeUp;
  const isLastQuestion = safeIndex >= questions.length - 1;

  useSpeakOnMount(tts, () => [{ text: step.speech_text }]);

  const submit = useCallback(() => {
    setConfirmOpen(false);
    onSubmit({
      answers: Object.fromEntries(questions.map((q) => [q.id, answers[q.id] ?? null])),
      seconds_taken: Math.round((Date.now() - startedAt) / 1000),
    });
  }, [answers, onSubmit, questions, startedAt]);

  const submitRef = useRef(submit);
  useEffect(() => {
    submitRef.current = submit;
  });

  const handleExpire = useCallback(() => {
    setTimeUp(true);
    setConfirmOpen(false);
    submitRef.current();
  }, []);

  const choose = useCallback(
    (questionId: string, option: number) => setAnswers((prev) => ({ ...prev, [questionId]: option })),
    [setAnswers],
  );

  const clear = (questionId: string) =>
    setAnswers((prev) => {
      const next = { ...prev };
      delete next[questionId];
      return next;
    });

  const toggleFlag = useCallback(
    (questionId: string) =>
      setFlags((prev) => (prev.includes(questionId) ? prev.filter((f) => f !== questionId) : [...prev, questionId])),
    [setFlags],
  );

  const goTo = (i: number) => setIndex(Math.max(0, Math.min(questions.length - 1, i)));

  // Keyboard: 1-9 or A-J pick an option, F marks for review.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!current || locked || confirmOpen || e.defaultPrevented) return;
      if (e.ctrlKey || e.metaKey || e.altKey || isTypingTarget(e.target)) return;
      const key = e.key.toLowerCase();
      let option = -1;
      if (/^[1-9]$/.test(key)) option = Number(key) - 1;
      else if (key.length === 1 && LETTERS.toLowerCase().includes(key)) option = LETTERS.toLowerCase().indexOf(key);
      if (key === "f") {
        // "f" is also option F; only treat it as a flag when there are fewer than six options.
        if (current.options.length < 6) {
          toggleFlag(current.id);
          e.preventDefault();
          return;
        }
      }
      if (option >= 0 && option < current.options.length) {
        choose(current.id, option);
        e.preventDefault();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [current, locked, confirmOpen, choose, toggleFlag]);

  const progress = questions.length ? (answeredCount / questions.length) * 100 : 0;

  return (
    <div className="flex min-w-0 flex-col gap-4">
      <InterviewerBubble name={step.interviewer_name} text={step.speech_text} tts={tts} compact />

      {/* Section header */}
      <header className="flex flex-col gap-4 rounded-lg border border-border bg-card px-4 py-4 shadow-xs sm:flex-row sm:items-center sm:justify-between sm:px-5">
        <div className="flex min-w-0 flex-col gap-1">
          <h2 className="text-lg leading-7 font-semibold tracking-tight text-primary">{section.name}</h2>
          <p className="text-[13px] text-muted-foreground">
            {questions.length} question{questions.length === 1 ? "" : "s"}
            {section.time_limit_min > 0 && ` in ${section.time_limit_min} minutes`}. Answers save as you go.
          </p>
        </div>
        <div className="flex items-center justify-between gap-4 sm:justify-end">
          <div className="flex flex-col gap-1.5">
            <span className="text-xs text-muted-foreground" id={`${groupId}-progress`}>
              <span className="font-mono font-medium text-foreground tabular-nums">
                {answeredCount}/{questions.length}
              </span>{" "}
              answered
            </span>
            <Progress value={progress} className="w-32" aria-labelledby={`${groupId}-progress`} />
          </div>
          <CountdownTimer since={startedAt} durationSec={limitSec} onExpire={handleExpire} />
        </div>
      </header>

      {timeUp && (
        <p
          className="rounded-md border border-warning/30 bg-warning-soft px-4 py-2.5 text-[13px] text-warning-soft-foreground"
          role="status"
        >
          Time's up. Your answers were submitted.
        </p>
      )}

      <div className="grid min-w-0 items-start gap-4 lg:grid-cols-[minmax(0,1fr)_17rem]">
        {/* Question */}
        {current ? (
          <section
            aria-labelledby={`${groupId}-q`}
            className="flex min-w-0 flex-col overflow-hidden rounded-lg border border-border bg-card shadow-xs"
          >
            <div className="flex items-center justify-between gap-3 border-b border-border py-2 pr-2 pl-4 sm:pl-5">
              <span className="text-[13px] font-medium text-muted-foreground">
                Question <span className="font-mono text-foreground tabular-nums">{safeIndex + 1}</span> of{" "}
                <span className="font-mono tabular-nums">{questions.length}</span>
              </span>
              <Toggle
                size="sm"
                variant="outline"
                pressed={flagSet.has(current.id)}
                onPressedChange={() => toggleFlag(current.id)}
                disabled={locked}
                className="data-[state=on]:border-warning/40 data-[state=on]:bg-warning-soft data-[state=on]:text-warning-soft-foreground"
              >
                <Flag aria-hidden="true" className="group-data-[state=on]/toggle:fill-current" />
                {flagSet.has(current.id) ? "Marked for review" : "Mark for review"}
              </Toggle>
            </div>

            <StepTransition stepKey={current.id} y={4} animateOnMount={false} className="flex flex-col gap-5 px-4 py-5 sm:px-5">
              <p id={`${groupId}-q`} className="max-w-[70ch] text-base leading-7 font-medium whitespace-pre-line text-foreground">
                {current.question}
              </p>

              <RadioGroup
                aria-labelledby={`${groupId}-q`}
                value={answers[current.id] !== undefined ? String(answers[current.id]) : ""}
                onValueChange={(v) => choose(current.id, Number(v))}
                disabled={locked}
                className="gap-2"
              >
                {current.options.map((option, i) => {
                  const checked = answers[current.id] === i;
                  const optionId = `${groupId}-${current.id}-${i}`;
                  return (
                    <label
                      key={i}
                      htmlFor={optionId}
                      className={cn(
                        "flex min-h-12 cursor-pointer items-center gap-3 rounded-md border px-3 py-2.5 transition-colors duration-150 has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring has-[:focus-visible]:ring-offset-1 has-[:focus-visible]:ring-offset-card sm:px-4",
                        checked
                          ? "border-accent bg-accent-soft"
                          : "border-border hover:border-input hover:bg-muted/50",
                        locked && "cursor-not-allowed opacity-70",
                      )}
                    >
                      <RadioGroupItem value={String(i)} id={optionId} className="sr-only" />
                      <span
                        aria-hidden="true"
                        className={cn(
                          "inline-flex size-7 shrink-0 items-center justify-center rounded-sm border font-mono text-[13px] font-semibold transition-colors duration-150",
                          checked
                            ? "border-accent bg-accent text-accent-foreground"
                            : "border-input bg-card text-muted-foreground",
                        )}
                      >
                        {LETTERS[i] ?? i + 1}
                      </span>
                      <span className={cn("min-w-0 text-sm leading-6", checked ? "font-medium text-foreground" : "text-foreground")}>
                        {option}
                      </span>
                    </label>
                  );
                })}
              </RadioGroup>

              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="hidden items-center gap-1.5 text-xs text-muted-foreground sm:flex">
                  <Kbd>1</Kbd>–<Kbd>{String(Math.min(current.options.length, 9))}</Kbd>
                  <span className="mr-2">or letters to answer</span>
                  {current.options.length < 6 && (
                    <>
                      <Kbd>F</Kbd>
                      <span>to mark for review</span>
                    </>
                  )}
                </p>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => clear(current.id)}
                  disabled={locked || answers[current.id] === undefined}
                  className="text-muted-foreground"
                >
                  <Eraser aria-hidden="true" />
                  Clear response
                </Button>
              </div>
            </StepTransition>

            <div className="flex items-center justify-between gap-2 border-t border-border bg-muted/30 px-4 py-3 sm:px-5">
              <Button variant="outline" onClick={() => goTo(safeIndex - 1)} disabled={safeIndex === 0}>
                <ArrowLeft aria-hidden="true" />
                Previous
              </Button>
              {isLastQuestion ? (
                <Button onClick={() => setConfirmOpen(true)} disabled={locked}>
                  Review and submit
                </Button>
              ) : (
                <Button onClick={() => goTo(safeIndex + 1)}>
                  Next
                  <ArrowRight aria-hidden="true" />
                </Button>
              )}
            </div>
          </section>
        ) : (
          <section className="rounded-lg border border-border bg-card p-6 text-sm text-muted-foreground shadow-xs">
            This section has no questions. Submit it to move on.
          </section>
        )}

        {/* Palette */}
        <aside
          aria-label="Question palette"
          className="flex flex-col gap-4 rounded-lg border border-border bg-card p-4 shadow-xs lg:sticky lg:top-18"
        >
          <div className="flex items-baseline justify-between gap-2">
            <h3 className="text-sm font-semibold text-foreground">Questions</h3>
            <span className="text-xs text-muted-foreground">
              {flaggedNums.length > 0 && `${flaggedNums.length} marked`}
            </span>
          </div>
          {questions.length > 0 && (
            <nav aria-label="Go to question">
              <ol className="grid grid-cols-[repeat(auto-fill,minmax(2.5rem,1fr))] gap-2">
                {questions.map((q, i) => {
                  const answered = answers[q.id] !== undefined;
                  const flagged = flagSet.has(q.id);
                  const isCurrent = i === safeIndex;
                  return (
                    <li key={q.id}>
                      <button
                        type="button"
                        onClick={() => goTo(i)}
                        aria-current={isCurrent ? "step" : undefined}
                        aria-label={`Question ${i + 1}, ${answered ? "answered" : "not answered"}${flagged ? ", marked for review" : ""}`}
                        className={cn(
                          "relative flex h-10 w-full items-center justify-center rounded-md border font-mono text-[13px] font-medium tabular-nums transition-colors duration-150 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-card focus-visible:outline-none",
                          answered
                            ? "border-accent bg-accent text-accent-foreground hover:bg-accent-hover"
                            : "border-input bg-card text-foreground hover:bg-muted",
                          isCurrent && "ring-2 ring-primary ring-offset-2 ring-offset-card",
                        )}
                      >
                        {i + 1}
                        {flagged && (
                          <span
                            aria-hidden="true"
                            className="absolute -top-1 -right-1 size-2.5 rounded-full bg-warning ring-2 ring-card"
                          />
                        )}
                      </button>
                    </li>
                  );
                })}
              </ol>
            </nav>
          )}
          <ul className="grid grid-cols-2 gap-x-3 gap-y-2 text-xs text-muted-foreground lg:grid-cols-1">
            <LegendSwatch className="border border-accent bg-accent" label="Answered" />
            <LegendSwatch className="border border-input bg-card" label="Not answered" />
            <LegendSwatch
              className="border border-input bg-card after:absolute after:-top-1 after:-right-1 after:size-2 after:rounded-full after:bg-warning"
              label="Marked for review"
            />
            <LegendSwatch className="border border-input bg-card ring-2 ring-primary ring-offset-1 ring-offset-card" label="Current" />
          </ul>
          <div className="flex flex-col gap-2 border-t border-border pt-4">
            <InlineError message={error} />
            <Button variant="brand" onClick={() => setConfirmOpen(true)} disabled={locked} className="w-full">
              {busy ? <Loader2 className="motion-safe:animate-spin" aria-hidden="true" /> : <Send aria-hidden="true" />}
              {busy ? "Submitting…" : "Submit section"}
            </Button>
          </div>
        </aside>
      </div>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Submit this section?</AlertDialogTitle>
            <AlertDialogDescription>You can't change your answers after submitting.</AlertDialogDescription>
          </AlertDialogHeader>
          <dl className="grid grid-cols-3 divide-x divide-border rounded-md border border-border text-center">
            {[
              { label: "Answered", value: answeredCount },
              { label: "Not answered", value: unansweredNums.length },
              { label: "Marked", value: flaggedNums.length },
            ].map((s) => (
              <div key={s.label} className="flex flex-col gap-0.5 px-2 py-3">
                <dd className="font-mono text-xl font-semibold text-foreground tabular-nums">{s.value}</dd>
                <dt className="order-first text-xs text-muted-foreground">{s.label}</dt>
              </div>
            ))}
          </dl>
          {(unansweredNums.length > 0 || flaggedNums.length > 0) && (
            <div className="flex flex-col gap-3 text-[13px]">
              {[
                { label: "Not answered", nums: unansweredNums },
                { label: "Marked for review", nums: flaggedNums },
              ]
                .filter((g) => g.nums.length > 0)
                .map((g) => (
                  <div key={g.label} className="flex flex-col gap-1.5">
                    <span className="text-muted-foreground">{g.label}</span>
                    <div className="flex flex-wrap gap-1.5">
                      {g.nums.map((n) => (
                        <Button
                          key={n}
                          size="xs"
                          variant="outline"
                          className="font-mono tabular-nums"
                          aria-label={`Go to question ${n}`}
                          onClick={() => {
                            setConfirmOpen(false);
                            goTo(n - 1);
                          }}
                        >
                          Q{n}
                        </Button>
                      ))}
                    </div>
                  </div>
                ))}
            </div>
          )}
          <AlertDialogFooter>
            <AlertDialogCancel>Return to section</AlertDialogCancel>
            <AlertDialogAction onClick={submit} disabled={busy}>
              {unansweredNums.length > 0 ? "Submit anyway" : "Submit section"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
