import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ChevronRight, History } from "@/lib/icons";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardAction, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { api, errorMessage } from "../api";
import { formatDateTime, parseServerTime, STATUS_LABEL } from "../format";
import type { InterviewStatus, InterviewSummary } from "../types";
import { experienceLabel } from "./home/experience";
import { InlineError } from "./InlineError";

const COLLAPSED_COUNT = 6;

const STATUS_VARIANT: Record<InterviewStatus, "accent" | "success" | "destructive"> = {
  thinking: "accent",
  ready: "accent",
  finished: "success",
  error: "destructive",
};

const ACTION_LABEL: Record<InterviewStatus, string> = {
  thinking: "Resume",
  ready: "Resume",
  finished: "View report",
  error: "Open",
};

function StatusBadge({ status }: { status: InterviewStatus }) {
  return (
    <Badge variant={STATUS_VARIANT[status] ?? "secondary"}>
      {status === "thinking" || status === "ready" ? (
        <span aria-hidden="true" className="size-1.5 rounded-full bg-current" />
      ) : null}
      {STATUS_LABEL[status] ?? status}
    </Badge>
  );
}

function LoadingRows() {
  return (
    <div className="flex flex-col divide-y divide-border border-t border-border" aria-label="Loading past interviews">
      {[0, 1, 2].map((i) => (
        <div key={i} className="flex items-center gap-4 px-4 py-3.5">
          <div className="flex flex-1 flex-col gap-1.5">
            <Skeleton className="h-3.5 w-32" />
            <Skeleton className="h-3 w-48" />
          </div>
          <Skeleton className="h-5 w-20" />
          <Skeleton className="hidden h-3 w-28 sm:block" />
        </div>
      ))}
    </div>
  );
}

export function PastInterviews() {
  const [items, setItems] = useState<InterviewSummary[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    api
      .listInterviews()
      .then((list) => {
        if (cancelled) return;
        const sorted = [...list].sort(
          (a, b) => (parseServerTime(b.created_at) ?? 0) - (parseServerTime(a.created_at) ?? 0),
        );
        setItems(sorted);
      })
      .catch((e: unknown) => {
        if (!cancelled) setError(errorMessage(e));
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const count = items?.length ?? 0;
  const visible = items && !expanded ? items.slice(0, COLLAPSED_COUNT) : items;
  const hiddenCount = count - (visible?.length ?? 0);

  return (
    <Card className="gap-0 overflow-hidden py-0" aria-labelledby="past-title" role="region">
      <CardHeader className="py-4">
        <CardTitle>
          <h2 id="past-title" className="flex items-center gap-2 text-base leading-6 font-semibold">
            Past interviews
            {count > 0 && (
              <span className="font-mono text-[13px] font-normal text-muted-foreground tabular-nums">{count}</span>
            )}
          </h2>
        </CardTitle>
        <CardDescription className="text-[13px]">Resume a session in progress or read a finished report.</CardDescription>
        {count > COLLAPSED_COUNT && (
          <CardAction>
            <Button type="button" variant="ghost" size="sm" onClick={() => setExpanded((v) => !v)}>
              {expanded ? "Show recent" : `Show all ${count}`}
            </Button>
          </CardAction>
        )}
      </CardHeader>

      {error ? (
        <div className="border-t border-border p-4">
          <InlineError title="Couldn't load past interviews" message={error} />
        </div>
      ) : items === null ? (
        <LoadingRows />
      ) : items.length === 0 ? (
        <div className="flex items-start gap-3 border-t border-border px-4 py-6">
          <span className="flex size-8 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
            <History aria-hidden="true" className="size-4" />
          </span>
          <div>
            <p className="text-sm font-medium">No interviews yet</p>
            <p className="mt-0.5 text-[13px] text-muted-foreground">
              Interviews you start are listed here with their status and report.
            </p>
          </div>
        </div>
      ) : (
        <div className="border-t border-border">
          <Table className="text-[13px]">
            <TableHeader className="bg-muted/40">
              <TableRow className="hover:bg-transparent">
                <TableHead className="pl-4">Interview</TableHead>
                <TableHead className="hidden md:table-cell">Experience</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="hidden sm:table-cell">Started</TableHead>
                <TableHead className="w-10 pr-4 md:w-32">
                  <span className="sr-only">Action</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {visible?.map((it) => {
                const action = ACTION_LABEL[it.status] ?? "Open";
                const started = formatDateTime(it.created_at);
                return (
                  <TableRow key={it.id} className="group/row relative hover:bg-muted/50">
                    <TableCell className="w-full max-w-0 py-3 pl-4 align-middle">
                      <Link
                        to={`/interview/${encodeURIComponent(it.id)}`}
                        className="block truncate font-medium text-foreground no-underline outline-none after:absolute after:inset-0 after:rounded-sm focus-visible:after:ring-2 focus-visible:after:ring-ring focus-visible:after:ring-inset"
                      >
                        {it.company}
                        <span className="sr-only">
                          , {it.role}. {action}
                        </span>
                      </Link>
                      <span aria-hidden="true" className="block truncate text-muted-foreground">
                        {it.role}
                      </span>
                      <span aria-hidden="true" className="block truncate text-xs text-muted-foreground sm:hidden">
                        {started}
                      </span>
                    </TableCell>
                    <TableCell className="hidden align-middle text-muted-foreground md:table-cell">
                      {experienceLabel(it.experience) || "—"}
                    </TableCell>
                    <TableCell className="align-middle">
                      <StatusBadge status={it.status} />
                    </TableCell>
                    <TableCell className="hidden align-middle whitespace-nowrap text-muted-foreground tabular-nums sm:table-cell">
                      <time dateTime={it.created_at}>{started}</time>
                    </TableCell>
                    <TableCell className="pr-4 text-right align-middle">
                      <span
                        aria-hidden="true"
                        className="inline-flex items-center gap-1 text-[13px] font-medium whitespace-nowrap text-muted-foreground transition-colors group-hover/row:text-accent"
                      >
                        <span className="hidden md:inline">{action}</span>
                        <ChevronRight className="size-4" />
                      </span>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
          {hiddenCount > 0 && (
            <div className="border-t border-border px-4 py-2 text-xs text-muted-foreground">
              {hiddenCount} older {hiddenCount === 1 ? "interview" : "interviews"} hidden
            </div>
          )}
        </div>
      )}
    </Card>
  );
}
