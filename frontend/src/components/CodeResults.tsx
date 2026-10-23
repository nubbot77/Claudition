import { ChevronRight, CircleCheck, CircleX, Clock, FlaskConical, TriangleAlert } from "lucide-react";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import type { CodeRunResult, TestResult } from "../types";
import { FadeIn } from "./motion";

function IoBlock({ label, text, tone }: { label: string; text: string; tone?: "fail" | "error" }) {
  return (
    <div className="flex min-w-0 flex-col gap-1">
      <span className="text-xs text-muted-foreground">{label}</span>
      <pre
        className={cn(
          "max-h-40 overflow-auto rounded-md border px-3 py-2 font-mono text-[12.5px] leading-5 whitespace-pre text-foreground",
          tone === "fail" && "border-destructive/30 bg-destructive-soft/60",
          tone === "error" && "border-destructive/30 bg-destructive-soft/60 whitespace-pre-wrap text-destructive-soft-foreground",
          !tone && "border-border bg-muted/50",
        )}
      >
        {text === "" ? <span className="text-muted-foreground italic">(empty)</span> : text}
      </pre>
    </div>
  );
}

function status(r: TestResult): { label: string; variant: "success" | "destructive" | "warning" } {
  if (r.passed) return { label: "Passed", variant: "success" };
  if (r.timed_out) return { label: "Timed out", variant: "warning" };
  return { label: "Wrong answer", variant: "destructive" };
}

function TestRow({ result, index, defaultOpen }: { result: TestResult; index: number; defaultOpen: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  const s = status(result);
  const Icon = result.passed ? CircleCheck : CircleX;

  return (
    <li className="border-b border-border last:border-0">
      <Collapsible open={open} onOpenChange={setOpen}>
        <CollapsibleTrigger className="group flex w-full items-center gap-3 px-3 py-2.5 text-left transition-colors duration-150 hover:bg-muted/50 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none focus-visible:ring-inset sm:px-4">
          <ChevronRight
            className="size-3.5 shrink-0 text-muted-foreground transition-transform duration-150 group-data-[state=open]:rotate-90"
            aria-hidden="true"
          />
          <Icon
            className={cn("size-4 shrink-0", result.passed ? "text-success" : "text-destructive")}
            aria-hidden="true"
          />
          <span className="text-[13px] font-medium text-foreground">Example {index + 1}</span>
          <Badge variant={s.variant}>{s.label}</Badge>
          <span className="ml-auto inline-flex items-center gap-1 font-mono text-xs text-muted-foreground tabular-nums">
            <Clock className="size-3" aria-hidden="true" />
            {Math.round(result.time_ms)} ms
          </span>
        </CollapsibleTrigger>
        <CollapsibleContent className="overflow-hidden data-closed:animate-collapsible-up data-open:animate-collapsible-down">
          <div className="flex flex-col gap-3 px-3 pt-1 pb-4 sm:pr-4 sm:pl-[3.25rem]">
            <div className="grid gap-3 @lg:grid-cols-3">
              <IoBlock label="Input" text={result.input} />
              <IoBlock label="Expected output" text={result.expected_output} />
              <IoBlock label="Your output" text={result.actual_output ?? ""} tone={result.passed ? undefined : "fail"} />
            </div>
            {result.stderr && <IoBlock label="Standard error" text={result.stderr} tone="error" />}
          </div>
        </CollapsibleContent>
      </Collapsible>
    </li>
  );
}

/** Console output for "Run examples": a summary line, then one expandable row per example. */
export function CodeResults({ result }: { result: CodeRunResult }) {
  const allPassed = !result.compile_error && result.total > 0 && result.passed_count === result.total;
  const firstFail = result.results.findIndex((r) => !r.passed);
  const totalMs = result.results.reduce((n, r) => n + r.time_ms, 0);

  return (
    <FadeIn y={4} className="@container flex flex-col" aria-label="Example run results">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 border-b border-border px-3 py-2.5 sm:px-4" role="status">
        {allPassed ? (
          <CircleCheck className="size-4 text-success" aria-hidden="true" />
        ) : (
          <CircleX className="size-4 text-destructive" aria-hidden="true" />
        )}
        <span className={cn("text-sm font-semibold", allPassed ? "text-success-soft-foreground" : "text-destructive-soft-foreground")}>
          {result.compile_error
            ? "Compilation failed"
            : `${result.passed_count} of ${result.total} examples passed`}
        </span>
        {!result.compile_error && result.results.length > 0 && (
          <span className="ml-auto flex items-center gap-3">
            <span className="flex gap-1" aria-hidden="true">
              {result.results.map((r, i) => (
                <span key={i} className={cn("h-1.5 w-5 rounded-full", r.passed ? "bg-success" : "bg-destructive")} />
              ))}
            </span>
            <span className="font-mono text-xs text-muted-foreground tabular-nums">{Math.round(totalMs)} ms total</span>
          </span>
        )}
      </div>
      {result.compile_error && (
        <div className="flex flex-col gap-1.5 px-3 py-3 sm:px-4">
          <span className="text-xs text-muted-foreground">Compiler output</span>
          <pre className="max-h-56 overflow-auto rounded-md border border-destructive/30 bg-destructive-soft/60 px-3 py-2 font-mono text-[12.5px] leading-5 whitespace-pre-wrap text-destructive-soft-foreground">
            {result.compile_error}
          </pre>
        </div>
      )}
      {result.results.length > 0 && (
        <ol>
          {result.results.map((r, i) => (
            <TestRow key={i} result={r} index={i} defaultOpen={i === firstFail} />
          ))}
        </ol>
      )}
    </FadeIn>
  );
}

/** Test-results tab before anything has run, while running, and when the runner errors. */
export function CodeResultsPlaceholder({
  state,
  exampleCount,
  hiddenCount,
  error,
}: {
  state: "idle" | "running" | "error";
  exampleCount: number;
  hiddenCount: number;
  error?: string | null;
}) {
  if (state === "running") {
    return (
      <div className="flex flex-col" role="status">
        <p className="border-b border-border px-3 py-2.5 text-[13px] text-muted-foreground sm:px-4">
          Running {exampleCount} example{exampleCount === 1 ? "" : "s"}…
        </p>
        {Array.from({ length: Math.max(1, exampleCount) }, (_, i) => (
          <div key={i} className="flex items-center gap-3 border-b border-border px-3 py-3 last:border-0 sm:px-4">
            <Skeleton className="size-4 rounded-full" />
            <Skeleton className="h-3.5 w-24" />
            <Skeleton className="ml-auto h-3.5 w-12" />
          </div>
        ))}
      </div>
    );
  }
  if (state === "error") {
    return (
      <div className="m-3 flex gap-2.5 rounded-md border border-destructive/30 bg-destructive-soft px-3 py-2.5 text-[13px] leading-5 text-destructive-soft-foreground sm:m-4" role="alert">
        <TriangleAlert className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
        <span className="min-w-0">
          <span className="font-medium">The examples didn't run.</span> {error}
        </span>
      </div>
    );
  }
  return (
    <div className="flex items-start gap-3 px-3 py-4 sm:px-4">
      <FlaskConical className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
      <div className="flex flex-col gap-0.5 text-[13px] leading-5">
        <span className="font-medium text-foreground">
          Run your code against the {exampleCount} example{exampleCount === 1 ? "" : "s"} to check it.
        </span>
        <span className="text-muted-foreground">
          {hiddenCount > 0
            ? `${hiddenCount} hidden test${hiddenCount === 1 ? "" : "s"} run only when you submit.`
            : "Your submission is graded on the same examples."}
        </span>
      </div>
    </div>
  );
}
