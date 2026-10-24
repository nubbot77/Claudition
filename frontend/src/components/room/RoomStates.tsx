import type { ReactNode } from "react";
import { RefreshCw } from "@/lib/icons";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

type Tone = "neutral" | "warning" | "danger";

const ICON_TONE: Record<Tone, string> = {
  neutral: "bg-muted text-muted-foreground",
  warning: "bg-warning-soft text-warning-soft-foreground",
  danger: "bg-destructive-soft text-destructive-soft-foreground",
};

interface StatePanelProps {
  icon: ReactNode;
  title: string;
  titleId?: string;
  tone?: Tone;
  children?: ReactNode;
  actions?: ReactNode;
  role?: "alert" | "status";
  className?: string;
}

/** Full-width state card for the room: not found, offline, interviewer error, incomplete step. */
export function StatePanel({
  icon,
  title,
  titleId,
  tone = "neutral",
  children,
  actions,
  role,
  className,
}: StatePanelProps) {
  return (
    <section
      role={role}
      aria-labelledby={titleId}
      className={cn(
        "mx-auto flex w-full max-w-2xl flex-col gap-4 rounded-lg border border-border bg-card p-5 shadow-xs sm:flex-row sm:p-6",
        className,
      )}
    >
      <span
        aria-hidden="true"
        className={cn("flex size-10 shrink-0 items-center justify-center rounded-md [&_svg]:size-5", ICON_TONE[tone])}
      >
        {icon}
      </span>
      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <h2 id={titleId} className="text-base leading-6 font-semibold text-foreground">
          {title}
        </h2>
        {children && <div className="flex flex-col gap-2 text-sm leading-6 text-muted-foreground">{children}</div>}
        {actions && <div className="mt-2 flex flex-wrap items-center gap-2">{actions}</div>}
      </div>
    </section>
  );
}

/** Slim strip shown while polling fails but the last state is still on screen. */
export function ConnectionNote({ message }: { message: string }) {
  return (
    <p
      role="status"
      className="flex items-center gap-2 rounded-md border border-warning/35 bg-warning-soft px-3 py-2 text-[13px] leading-5 text-warning-soft-foreground"
    >
      <RefreshCw aria-hidden="true" className="size-3.5 shrink-0 motion-safe:animate-spin" />
      <span className="min-w-0">
        <span className="font-medium">Connection lost. Retrying…</span>{" "}
        <span className="break-words opacity-80">{message}</span>
      </span>
    </p>
  );
}

/** Loading skeleton shaped like the room: interviewer tile + composer, transcript panel on the side. */
export function RoomSkeleton() {
  return (
    <div
      role="status"
      aria-label="Loading interview"
      className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]"
    >
      <div className="flex flex-col gap-4">
        <div className="flex gap-4 rounded-lg border border-border bg-card p-3">
          <Skeleton className="hidden aspect-[4/3] w-[8.75rem] shrink-0 sm:block" />
          <div className="flex flex-1 flex-col gap-3 py-1.5 pr-2">
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-3 w-28" />
            <Skeleton className="mt-2 h-4 w-full" />
            <Skeleton className="h-4 w-11/12" />
            <Skeleton className="h-4 w-2/3" />
          </div>
        </div>
        <div className="rounded-lg border border-border bg-card">
          <div className="flex flex-col gap-2 p-4">
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-3 w-64 max-w-full" />
          </div>
          <div className="h-36" />
          <div className="flex items-center justify-between border-t border-border px-3 py-2.5">
            <Skeleton className="h-8 w-32" />
            <Skeleton className="h-9 w-32" />
          </div>
        </div>
      </div>
      <div className="flex flex-col gap-4 rounded-lg border border-border bg-card p-4">
        <Skeleton className="h-4 w-24" />
        {[0, 1, 2].map((i) => (
          <div key={i} className="flex gap-3">
            <Skeleton className="size-7 shrink-0" />
            <div className="flex flex-1 flex-col gap-2">
              <Skeleton className="h-3 w-24" />
              <Skeleton className="h-3 w-full" />
              <Skeleton className="h-3 w-4/5" />
            </div>
          </div>
        ))}
      </div>
      <span className="sr-only">Loading interview…</span>
    </div>
  );
}
