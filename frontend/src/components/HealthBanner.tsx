import type { ReactNode } from "react";
import { CircleAlert, CircleCheck, CircleDashed, CircleX, LoaderCircle, RotateCw, TriangleAlert } from "@/lib/icons";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { capitalize } from "../format";
import type { Health } from "../types";

interface Props {
  health: Health | null;
  error: string | null;
  loading: boolean;
}

const LANGUAGE_LABEL: Record<string, string> = {
  python: "Python",
  javascript: "JavaScript",
  java: "Java",
  cpp: "C++",
};

function Code({ children }: { children: ReactNode }) {
  return (
    <code className="rounded-sm bg-background/70 px-1 py-px font-mono text-[12px] text-foreground">{children}</code>
  );
}

/* ---------------------------------------------------------------------------------------------- */
/* Blocking problems: shown above the setup form only when an interview can't start.               */
/* ---------------------------------------------------------------------------------------------- */

interface Problem {
  tone: "danger" | "warning";
  title: string;
  body: ReactNode;
}

function problemOf({ health, error, loading }: Props): Problem | null {
  if (loading) return null;
  if (error || !health) {
    const detail = error && !error.startsWith("Can't reach") ? `${error} ` : "";
    return {
      tone: "danger",
      title: "The interview server isn't reachable",
      body: (
        <>
          {detail}Start it with <Code>start.cmd</Code> (Windows) or <Code>./start.sh</Code> (macOS/Linux), then reload
          this page.
        </>
      ),
    };
  }
  if (!health.claude_found) {
    return {
      tone: "danger",
      title: "Claude Code CLI not found",
      body: (
        <>
          Install it with <Code>npm install -g @anthropic-ai/claude-code</Code>, make sure the <Code>claude</Code>{" "}
          command is on your PATH, then restart Claudition.
        </>
      ),
    };
  }
  if (!health.auth.loggedIn) {
    return {
      tone: "warning",
      title: "Claude Code isn't signed in",
      body: (
        <>
          Run <Code>claude auth login</Code> in a terminal and sign in with your Claude Pro or Max account, then reload
          this page. Interviews run on your own subscription and can't start until you do.
        </>
      ),
    };
  }
  return null;
}

/** Alert for problems that stop an interview from starting. Renders nothing while checking or when all is well. */
export function HealthBanner(props: Props) {
  const problem = problemOf(props);
  if (!problem) return null;
  const danger = problem.tone === "danger";
  const Icon = danger ? CircleAlert : TriangleAlert;

  return (
    <div
      role="alert"
      className={cn(
        "flex flex-col gap-3 rounded-lg border px-4 py-3 sm:flex-row sm:items-start",
        danger
          ? "border-destructive/25 bg-destructive-soft text-destructive-soft-foreground"
          : "border-warning/30 bg-warning-soft text-warning-soft-foreground",
      )}
    >
      <div className="flex min-w-0 flex-1 items-start gap-3">
        <Icon aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
        <div className="min-w-0 flex-1">
          <p className="text-sm leading-5 font-semibold">{problem.title}</p>
          <p className="mt-0.5 text-[13px] leading-5 break-words opacity-90">{problem.body}</p>
        </div>
      </div>
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="self-start sm:ml-auto"
        onClick={() => window.location.reload()}
      >
        <RotateCw data-icon="inline-start" />
        Reload
      </Button>
    </div>
  );
}

/* ---------------------------------------------------------------------------------------------- */
/* System status card (side column)                                                                */
/* ---------------------------------------------------------------------------------------------- */

type RowState = "ok" | "warn" | "error" | "info" | "pending";

const STATE_ICON: Record<RowState, { icon: typeof CircleCheck; className: string; label: string }> = {
  ok: { icon: CircleCheck, className: "text-success", label: "OK" },
  warn: { icon: TriangleAlert, className: "text-warning", label: "Warning" },
  error: { icon: CircleX, className: "text-destructive", label: "Problem" },
  info: { icon: CircleDashed, className: "text-muted-foreground", label: "Note" },
  pending: { icon: LoaderCircle, className: "animate-spin text-muted-foreground", label: "Checking" },
};

interface StatusRow {
  label: string;
  state: RowState;
  value: string;
  detail?: string;
}

function rowsOf({ health, error, loading }: Props): StatusRow[] {
  if (loading) return [];
  if (error || !health) {
    return [{ label: "Interview server", state: "error", value: "Not reachable", detail: "Expected on 127.0.0.1:8000" }];
  }

  const rows: StatusRow[] = [{ label: "Interview server", state: "ok", value: "Connected" }];

  if (!health.claude_found) {
    rows.push({ label: "Claude Code", state: "error", value: "CLI not found on PATH" });
  } else if (!health.auth.loggedIn) {
    rows.push({ label: "Claude Code", state: "warn", value: "Not signed in" });
  } else {
    const plan = health.auth.subscriptionType ? `${capitalize(health.auth.subscriptionType)} plan` : "";
    const method = health.auth.authMethod && health.auth.authMethod !== "none" ? health.auth.authMethod : "";
    rows.push({
      label: "Claude Code",
      state: "ok",
      value: "Signed in",
      detail: [plan, method && `via ${method}`].filter(Boolean).join(", "),
    });
  }

  const languages = health.languages.map((l) => LANGUAGE_LABEL[l] ?? l);
  rows.push(
    languages.length
      ? { label: "Code runner", state: "ok", value: languages.join(", ") }
      : {
          label: "Code runner",
          state: "warn",
          value: "No languages found",
          detail: "Coding rounds can't run your code",
        },
  );

  const tts = health.tts;
  if (tts) {
    if (!tts.available) {
      // not installed is a note (the voice is optional); a voice that failed to load is a warning
      const notInstalled = !tts.error || /not installed|missing/i.test(tts.error);
      rows.push({
        label: "Interviewer voice",
        state: notInstalled ? "info" : "warn",
        value: "Browser voice",
        detail: notInstalled ? "For the neural voice, run start with -Voice (Windows) or --voice" : tts.error!,
      });
    } else if (tts.error) {
      rows.push({ label: "Interviewer voice", state: "warn", value: "Neural voice on CPU (fallback)", detail: tts.error });
    } else {
      const device = tts.device === "cuda" ? "GPU" : tts.device === "cpu" ? "CPU" : "";
      rows.push({
        label: "Interviewer voice",
        state: "ok",
        value: tts.loaded ? `Neural voice ready${device ? ` on ${device}` : ""}` : "Neural voice",
        detail: tts.loaded ? undefined : "Loads on first use",
      });
    }
  }
  return rows;
}

function overallBadge(props: Props) {
  if (props.loading) return <Badge variant="secondary">Checking</Badge>;
  const problem = problemOf(props);
  if (!problem) return <Badge variant="success">Ready</Badge>;
  return problem.tone === "danger" ? (
    <Badge variant="destructive">Offline</Badge>
  ) : (
    <Badge variant="warning">Action needed</Badge>
  );
}

/** Compact definition list of what the interview engine depends on. */
export function SystemStatus(props: Props) {
  const rows = rowsOf(props);

  return (
    <Card size="sm" aria-busy={props.loading || undefined}>
      <CardHeader>
        <CardTitle>
          <h2 className="text-sm leading-5 font-semibold">System status</h2>
        </CardTitle>
        <CardAction>{overallBadge(props)}</CardAction>
      </CardHeader>
      <CardContent>
        {props.loading ? (
          <div className="flex flex-col gap-4 py-1" aria-label="Checking the interview engine">
            {[0, 1, 2].map((i) => (
              <div key={i} className="flex items-start gap-2.5">
                <Skeleton className="size-4 rounded-full" />
                <div className="flex flex-1 flex-col gap-1.5">
                  <Skeleton className="h-3 w-24" />
                  <Skeleton className="h-3 w-40" />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <dl className="flex flex-col divide-y divide-border">
            {rows.map((row) => {
              const { icon: Icon, className, label } = STATE_ICON[row.state];
              return (
                <div key={row.label} className="flex items-start gap-2.5 py-2.5 first:pt-0 last:pb-0">
                  <Icon aria-hidden="true" className={cn("mt-0.5 size-4 shrink-0", className)} />
                  <div className="min-w-0 flex-1">
                    <dt className="text-xs leading-4 text-muted-foreground">{row.label}</dt>
                    <dd className="mt-0.5 text-[13px] leading-5 font-medium break-words text-foreground">
                      <span className="sr-only">{label}: </span>
                      {row.value}
                      {row.detail && (
                        <span className="block text-xs leading-4 font-normal text-muted-foreground">{row.detail}</span>
                      )}
                    </dd>
                  </div>
                </div>
              );
            })}
          </dl>
        )}
      </CardContent>
    </Card>
  );
}
