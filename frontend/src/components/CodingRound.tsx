import {
  ChevronDown,
  Clock,
  Code2,
  Copy,
  FlaskConical,
  Info,
  Loader2,
  Play,
  RotateCcw,
  Send,
  TriangleAlert,
  WrapText,
} from "@/lib/icons";
import {
  useCallback,
  useEffect,
  useRef,
  useMemo,
  useState,
  type CSSProperties,
  type KeyboardEvent as ReactKeyboardEvent,
  type PointerEvent as ReactPointerEvent,
  type RefObject,
} from "react";
import { toast } from "sonner";
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
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Toggle } from "@/components/ui/toggle";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { api, errorMessage } from "../api";
import { wordCount } from "../format";
import { useSpeakOnMount, type Tts } from "../hooks/useSpeech";
import { useSessionState, useStartTime } from "../lib/storage";
import type { CodeRunResult, CodeSubmittedPayload, CodingProblem, Health, Language, PublicStep } from "../types";
import { CountdownTimer } from "./assessment/CountdownTimer";
import { CodeEditor } from "./CodeEditor";
import { CodeResults, CodeResultsPlaceholder } from "./CodeResults";
import { InlineError } from "./InlineError";
import { InterviewerBubble } from "./InterviewerBubble";

const LANGUAGE_LABEL: Record<Language, string> = {
  python: "Python 3",
  javascript: "JavaScript (Node)",
  java: "Java",
  cpp: "C++",
};

const SPLIT_MIN = 30;
const SPLIT_MAX = 62;
const SPLIT_DEFAULT = 42;

interface Props {
  step: PublicStep;
  problem: CodingProblem;
  health: Health | null;
  tts: Tts;
  stepKey: string;
  busy: boolean;
  error: string | null;
  onSubmit: (payload: CodeSubmittedPayload) => void;
}

function starterFor(problem: CodingProblem, language: string): string {
  return problem.starter_code.find((s) => s.language === language)?.code ?? "";
}

function starterMap(problem: CodingProblem): Record<string, string> {
  return Object.fromEntries(problem.languages.map((l) => [l, starterFor(problem, l)]));
}

function plural(n: number, word: string): string {
  return `${n} ${word}${n === 1 ? "" : "s"}`;
}

function Kbd({ children }: { children: string }) {
  return (
    <kbd className="inline-flex h-5 min-w-5 items-center justify-center rounded-sm border border-border bg-muted px-1 font-mono text-[11px] font-medium text-muted-foreground">
      {children}
    </kbd>
  );
}

/* ---------------------------------------------------------------------------------------------- */

function copyText(text: string, what: string) {
  if (!navigator.clipboard) {
    toast.error("Clipboard isn't available in this browser");
    return;
  }
  navigator.clipboard.writeText(text).then(
    () => toast(`${what} copied`),
    () => toast.error(`Couldn't copy the ${what.toLowerCase()}`),
  );
}

function ProblemPanel({ problem, languages }: { problem: CodingProblem; languages: Language[] }) {
  const sectionTitle = "mb-2 text-[13px] font-semibold text-foreground";

  return (
    <section
      aria-labelledby="problem-title"
      className="@container flex min-w-0 flex-col border-b border-border lg:w-(--split) lg:shrink-0 lg:border-b-0"
    >
      <header className="flex flex-col gap-1.5 border-b border-border px-4 py-3 sm:px-5">
        <h2 id="problem-title" className="text-lg leading-7 font-semibold tracking-tight text-primary">
          {problem.title}
        </h2>
        <ul className="flex flex-wrap gap-x-4 gap-y-1 text-[13px] text-muted-foreground">
          {problem.time_limit_min > 0 && (
            <li className="inline-flex items-center gap-1.5">
              <Clock className="size-3.5" aria-hidden="true" />
              {problem.time_limit_min} min
            </li>
          )}
          <li className="inline-flex items-center gap-1.5">
            <FlaskConical className="size-3.5" aria-hidden="true" />
            {plural(problem.examples.length, "example")}
            {problem.hidden_test_count > 0 && `, ${problem.hidden_test_count} hidden`}
          </li>
          <li className="inline-flex items-center gap-1.5">
            <Code2 className="size-3.5" aria-hidden="true" />
            {languages.map((l) => LANGUAGE_LABEL[l] ?? l).join(", ")}
          </li>
        </ul>
      </header>

      <div
        className="flex min-h-0 flex-1 flex-col gap-6 px-4 py-4 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none focus-visible:ring-inset sm:px-5 lg:overflow-y-auto"
        tabIndex={0}
        aria-label="Problem description"
      >
        <div>
          <h3 className="sr-only">Description</h3>
          <p className="max-w-[72ch] text-sm leading-6 whitespace-pre-line text-foreground">{problem.statement}</p>
        </div>

        {problem.examples.length > 0 && (
          <div>
            <h3 className={sectionTitle}>Examples</h3>
            <ol className="flex flex-col gap-3">
              {problem.examples.map((ex, i) => (
                <li key={i} className="overflow-hidden rounded-md border border-border">
                  <div className="flex items-center justify-between gap-2 border-b border-border bg-muted/40 py-1 pr-1 pl-3">
                    <span className="text-[13px] font-medium text-foreground">Example {i + 1}</span>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon-xs"
                          aria-label={`Copy example ${i + 1} input`}
                          onClick={() => copyText(ex.input, "Input")}
                        >
                          <Copy />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Copy input</TooltipContent>
                    </Tooltip>
                  </div>
                  <div className="grid divide-y divide-border @sm:grid-cols-2 @sm:divide-x @sm:divide-y-0">
                    <div className="min-w-0 px-3 py-2.5">
                      <p className="mb-1 text-xs text-muted-foreground">Input</p>
                      <pre className="overflow-x-auto font-mono text-[13px] leading-5 text-foreground">{ex.input}</pre>
                    </div>
                    <div className="min-w-0 px-3 py-2.5">
                      <p className="mb-1 text-xs text-muted-foreground">Output</p>
                      <pre className="overflow-x-auto font-mono text-[13px] leading-5 text-foreground">
                        {ex.expected_output}
                      </pre>
                    </div>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        )}

        {problem.constraints.length > 0 && (
          <div>
            <h3 className={sectionTitle}>Constraints</h3>
            <ul className="flex list-disc flex-col gap-1 pl-5 text-sm leading-6 text-foreground marker:text-muted-foreground">
              {problem.constraints.map((c, i) => (
                <li key={i}>{c}</li>
              ))}
            </ul>
          </div>
        )}

        <p className="flex gap-2.5 rounded-md bg-muted/60 px-3 py-2.5 text-[13px] leading-5 text-muted-foreground">
          <Info className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
          <span>
            Programs read from standard input and print to standard output.
            {problem.hidden_test_count > 0 &&
              ` Submitting also runs ${plural(problem.hidden_test_count, "hidden test")}.`}
          </span>
        </p>
      </div>
    </section>
  );
}

/* ---------------------------------------------------------------------------------------------- */

/** Draggable divider between the problem and the editor (lg+). Arrow keys resize too. */
function Splitter({
  value,
  onChange,
  containerRef,
  onDragging,
}: {
  value: number;
  onChange: (v: number) => void;
  containerRef: RefObject<HTMLDivElement>;
  onDragging: (dragging: boolean) => void;
}) {
  const clamp = (v: number) => Math.min(SPLIT_MAX, Math.max(SPLIT_MIN, Math.round(v)));

  const onPointerDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    onDragging(true);
  };
  const onPointerMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (!e.currentTarget.hasPointerCapture(e.pointerId)) return;
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect || rect.width === 0) return;
    onChange(clamp(((e.clientX - rect.left) / rect.width) * 100));
  };
  const stop = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (e.currentTarget.hasPointerCapture(e.pointerId)) e.currentTarget.releasePointerCapture(e.pointerId);
    onDragging(false);
  };
  const onKeyDown = (e: ReactKeyboardEvent<HTMLDivElement>) => {
    const step = e.shiftKey ? 10 : 2;
    if (e.key === "ArrowLeft") onChange(clamp(value - step));
    else if (e.key === "ArrowRight") onChange(clamp(value + step));
    else if (e.key === "Home") onChange(SPLIT_MIN);
    else if (e.key === "End") onChange(SPLIT_MAX);
    else return;
    e.preventDefault();
  };

  return (
    <div
      role="separator"
      aria-orientation="vertical"
      aria-label="Resize problem panel"
      aria-valuenow={value}
      aria-valuemin={SPLIT_MIN}
      aria-valuemax={SPLIT_MAX}
      tabIndex={0}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={stop}
      onPointerCancel={stop}
      onKeyDown={onKeyDown}
      onDoubleClick={() => onChange(SPLIT_DEFAULT)}
      className="group relative z-10 -mx-1 hidden w-2 shrink-0 cursor-col-resize touch-none outline-none lg:block"
    >
      <span className="absolute inset-y-0 left-1/2 w-px -translate-x-1/2 bg-border transition-colors duration-150 group-hover:w-0.5 group-hover:bg-accent group-focus-visible:w-0.5 group-focus-visible:bg-accent group-active:bg-accent" />
    </div>
  );
}

/* ---------------------------------------------------------------------------------------------- */

export function CodingRound({ step, problem, health, tts, stepKey, busy, error, onSubmit }: Props) {
  const startedAt = useStartTime(`${stepKey}:started`);
  const languages = useMemo(() => {
    const available = health?.languages;
    const usable = available?.length ? problem.languages.filter((l) => available.includes(l)) : problem.languages;
    return usable.length ? usable : problem.languages;
  }, [problem.languages, health]);
  const runnerMissing = !!health?.languages?.length && !problem.languages.some((l) => health.languages.includes(l));

  const [selected, setSelected] = useSessionState<string>(`${stepKey}:lang`, languages[0] ?? "python");
  const language: Language = (languages.find((l) => l === selected) ?? languages[0] ?? "python") as Language;
  const [codeByLang, setCodeByLang] = useSessionState<Record<string, string>>(`${stepKey}:code`, () =>
    starterMap(problem),
  );
  const [explanation, setExplanation] = useSessionState(`${stepKey}:explanation`, "");
  const [wrap, setWrap] = useSessionState(`${stepKey}:wrap`, false);
  const [split, setSplit] = useSessionState(`coding:split`, SPLIT_DEFAULT);
  const [dragging, setDragging] = useState(false);
  const [running, setRunning] = useState(false);
  const [runResult, setRunResult] = useState<CodeRunResult | null>(null);
  const [runError, setRunError] = useState<string | null>(null);
  const [consoleTab, setConsoleTab] = useState<"results" | "explanation">("results");
  const [consoleOpen, setConsoleOpen] = useState(true);
  const [confirmSubmit, setConfirmSubmit] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);
  const [timeUp, setTimeUp] = useState(false);
  const splitRef = useRef<HTMLDivElement>(null);

  const code = codeByLang[language] ?? starterFor(problem, language);
  const limitSec = Math.max(0, Math.round(problem.time_limit_min * 60));
  const languageLabel = LANGUAGE_LABEL[language] ?? language;
  const canRun = !running && problem.examples.length > 0 && !!code.trim();
  const words = wordCount(explanation);

  useSpeakOnMount(tts, () => [{ text: step.speech_text }]);

  const submit = useCallback(() => {
    setConfirmSubmit(false);
    onSubmit({ language, code, explanation: explanation.trim() });
  }, [onSubmit, language, code, explanation]);

  const submitRef = useRef(submit);
  useEffect(() => {
    submitRef.current = submit;
  });

  const handleExpire = useCallback(() => {
    setTimeUp(true);
    setConfirmSubmit(false);
    submitRef.current();
  }, []);

  const runExamples = async () => {
    if (!canRun) return;
    setRunning(true);
    setRunError(null);
    setConsoleTab("results");
    setConsoleOpen(true);
    try {
      setRunResult(await api.runCode({ language, code, tests: problem.examples }));
    } catch (e) {
      setRunResult(null);
      setRunError(errorMessage(e));
    } finally {
      setRunning(false);
    }
  };

  const runRef = useRef(runExamples);
  useEffect(() => {
    runRef.current = runExamples;
  });
  const runFromEditor = useCallback(() => void runRef.current(), []);

  const resetCode = () => {
    setCodeByLang((prev) => ({ ...prev, [language]: starterFor(problem, language) }));
    setRunResult(null);
    setRunError(null);
    toast(`Editor reset to the ${languageLabel} starter code`);
  };

  const resultsLabel = runResult
    ? runResult.compile_error
      ? "error"
      : `${runResult.passed_count}/${runResult.total}`
    : null;
  const resultsPassed = !!runResult && !runResult.compile_error && runResult.passed_count === runResult.total;
  const locked = busy || timeUp;

  return (
    <div className="flex min-w-0 flex-col gap-4">
      <InterviewerBubble name={step.interviewer_name} text={step.speech_text} tts={tts} compact />

      <div
        ref={splitRef}
        style={{ "--split": `${split}%` } as CSSProperties}
        className={cn(
          "flex min-w-0 flex-col overflow-hidden rounded-lg border border-border bg-card shadow-xs lg:h-[clamp(640px,calc(100dvh-11rem),960px)] lg:flex-row",
          dragging && "cursor-col-resize select-none",
        )}
      >
        <ProblemPanel problem={problem} languages={languages} />
        <Splitter value={split} onChange={setSplit} containerRef={splitRef} onDragging={setDragging} />

        <section aria-label="Your solution" className="flex min-w-0 flex-1 flex-col lg:border-l lg:border-border">
          {/* Toolbar */}
          <div className="flex h-12 shrink-0 items-center gap-1.5 border-b border-border px-2 sm:gap-2 sm:px-3">
            <Select
              value={language}
              onValueChange={(v) => {
                setSelected(v);
                setRunResult(null);
                setRunError(null);
              }}
              disabled={locked}
            >
              <SelectTrigger size="sm" aria-label="Language" className="w-[8.75rem] sm:w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent position="popper">
                {languages.map((l) => (
                  <SelectItem key={l} value={l}>
                    {LANGUAGE_LABEL[l] ?? l}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  aria-label="Reset to starter code"
                  onClick={() => setConfirmReset(true)}
                  disabled={locked}
                >
                  <RotateCcw />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Reset to starter code</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Toggle size="sm" pressed={wrap} onPressedChange={setWrap} aria-label="Wrap long lines">
                  <WrapText />
                </Toggle>
              </TooltipTrigger>
              <TooltipContent>Wrap long lines</TooltipContent>
            </Tooltip>
            <div className="ml-auto">
              <CountdownTimer since={startedAt} durationSec={limitSec} onExpire={handleExpire} />
            </div>
          </div>

          {runnerMissing && (
            <p className="flex items-center gap-2 border-b border-warning/30 bg-warning-soft px-3 py-2 text-[13px] text-warning-soft-foreground">
              <TriangleAlert className="size-3.5 shrink-0" aria-hidden="true" />
              The local runner can't execute this problem's languages. You can still write and submit.
            </p>
          )}

          {/* Editor */}
          <div className="relative h-[min(60svh,460px)] min-h-[280px] min-w-0 lg:h-auto lg:min-h-0 lg:flex-1">
            <CodeEditor
              language={language}
              value={code}
              label={`${languageLabel} code editor`}
              wordWrap={wrap}
              onRun={runFromEditor}
              onChange={(v) => setCodeByLang((prev) => ({ ...prev, [language]: v }))}
            />
          </div>

          {/* Console */}
          <Tabs
            value={consoleTab}
            onValueChange={(v) => {
              setConsoleTab(v as "results" | "explanation");
              setConsoleOpen(true);
            }}
            className="shrink-0 gap-0 border-t border-border"
          >
            <div className="flex h-10 items-center justify-between gap-2 border-b border-border bg-muted/30 pr-1.5 pl-2 sm:pl-3">
              <TabsList variant="line" className="h-10 gap-3 p-0">
                <TabsTrigger value="results" className="h-10 flex-none px-1 text-[13px]">
                  Test results
                  {resultsLabel && (
                    <Badge variant={resultsPassed ? "success" : "destructive"} className="font-mono tabular-nums">
                      {resultsLabel}
                    </Badge>
                  )}
                </TabsTrigger>
                <TabsTrigger value="explanation" className="h-10 flex-none px-1 text-[13px]">
                  Explanation
                  {words > 0 && <span className="size-1.5 rounded-full bg-accent" aria-label="(written)" />}
                </TabsTrigger>
              </TabsList>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon-xs"
                    className="hidden lg:inline-flex"
                    aria-label={consoleOpen ? "Collapse console" : "Expand console"}
                    aria-expanded={consoleOpen}
                    onClick={() => setConsoleOpen((o) => !o)}
                  >
                    <ChevronDown className={cn("transition-transform duration-200", !consoleOpen && "rotate-180")} />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>{consoleOpen ? "Collapse console" : "Expand console"}</TooltipContent>
              </Tooltip>
            </div>
            <div className={cn("lg:h-60 lg:overflow-y-auto", !consoleOpen && "lg:hidden")}>
              <TabsContent value="results" className="min-h-28">
                {running ? (
                  <CodeResultsPlaceholder
                    state="running"
                    exampleCount={problem.examples.length}
                    hiddenCount={problem.hidden_test_count}
                  />
                ) : runError ? (
                  <CodeResultsPlaceholder
                    state="error"
                    error={runError}
                    exampleCount={problem.examples.length}
                    hiddenCount={problem.hidden_test_count}
                  />
                ) : runResult ? (
                  <CodeResults result={runResult} />
                ) : (
                  <CodeResultsPlaceholder
                    state="idle"
                    exampleCount={problem.examples.length}
                    hiddenCount={problem.hidden_test_count}
                  />
                )}
              </TabsContent>
              <TabsContent value="explanation" className="flex h-full flex-col gap-2 p-3 sm:p-4">
                <div className="flex items-baseline justify-between gap-3">
                  <Label htmlFor={`${stepKey}-explanation`}>Explain your approach and its complexity</Label>
                  <span className="font-mono text-xs text-muted-foreground tabular-nums">{plural(words, "word")}</span>
                </div>
                <Textarea
                  id={`${stepKey}-explanation`}
                  value={explanation}
                  disabled={locked}
                  placeholder="Your approach in a few lines, edge cases you handled, and time / space complexity."
                  onChange={(e) => setExplanation(e.target.value)}
                  className="min-h-28 flex-1 resize-none [field-sizing:fixed] text-sm"
                />
                <p className="text-xs text-muted-foreground">Optional. The interviewer reads it alongside your code.</p>
              </TabsContent>
            </div>
          </Tabs>

          {/* Actions */}
          <div className="flex flex-col gap-2 border-t border-border px-3 py-2.5">
            {timeUp && (
              <p className="flex items-center gap-2 text-[13px] text-warning-soft-foreground" role="status">
                <Clock className="size-3.5" aria-hidden="true" />
                Time's up. Your current code was submitted.
              </p>
            )}
            <InlineError message={error} />
            <div className="flex items-center gap-2">
              <p className="mr-auto hidden items-center gap-1.5 text-xs text-muted-foreground xl:flex">
                <Kbd>Ctrl</Kbd>
                <Kbd>Enter</Kbd>
                <span className="mr-2">runs examples</span>
                <Kbd>Ctrl</Kbd>
                <Kbd>M</Kbd>
                <span>lets Tab leave the editor</span>
              </p>
              <Button
                variant="outline"
                onClick={() => void runExamples()}
                disabled={!canRun || locked}
                className="max-xl:flex-1 sm:max-xl:flex-none sm:max-xl:ml-auto"
              >
                {running ? <Loader2 className="motion-safe:animate-spin" aria-hidden="true" /> : <Play aria-hidden="true" />}
                {running ? "Running…" : "Run examples"}
              </Button>
              <Button
                onClick={() => setConfirmSubmit(true)}
                disabled={locked || !code.trim()}
                className="max-xl:flex-1 sm:max-xl:flex-none"
              >
                {busy ? <Loader2 className="motion-safe:animate-spin" aria-hidden="true" /> : <Send aria-hidden="true" />}
                {busy ? "Submitting…" : "Submit"}
              </Button>
            </div>
          </div>
        </section>
      </div>

      <AlertDialog open={confirmSubmit} onOpenChange={setConfirmSubmit}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Submit your solution?</AlertDialogTitle>
            <AlertDialogDescription>
              Your {languageLabel} code is graded on {plural(problem.examples.length, "example")}
              {problem.hidden_test_count > 0 && ` and ${plural(problem.hidden_test_count, "hidden test")}`}. You can't edit
              it after submitting.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <dl className="divide-y divide-border rounded-md border border-border text-[13px]">
            <div className="flex items-center justify-between gap-4 px-3 py-2">
              <dt className="text-muted-foreground">Language</dt>
              <dd className="font-medium text-foreground">{languageLabel}</dd>
            </div>
            <div className="flex items-center justify-between gap-4 px-3 py-2">
              <dt className="text-muted-foreground">Last example run</dt>
              <dd className="font-medium text-foreground">
                {runResult
                  ? runResult.compile_error
                    ? "Didn't compile"
                    : `${runResult.passed_count} of ${runResult.total} passed`
                  : "Not run yet"}
              </dd>
            </div>
            <div className="flex items-center justify-between gap-4 px-3 py-2">
              <dt className="text-muted-foreground">Explanation</dt>
              <dd className="font-medium text-foreground">{words ? plural(words, "word") : "Not written"}</dd>
            </div>
          </dl>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep coding</AlertDialogCancel>
            <AlertDialogAction onClick={submit} disabled={busy}>
              Submit solution
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={confirmReset} onOpenChange={setConfirmReset}>
        <AlertDialogContent size="sm">
          <AlertDialogHeader>
            <AlertDialogTitle>Reset to starter code?</AlertDialogTitle>
            <AlertDialogDescription>
              Your {languageLabel} code is replaced by the starter template. This can't be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction variant="destructive" onClick={resetCode}>
              Reset code
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
