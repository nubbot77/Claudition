import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface Props {
  title: ReactNode;
  titleId?: string;
  description?: ReactNode;
  descriptionId?: string;
  /** Right-aligned detail in the header (count, status). */
  meta?: ReactNode;
  children: ReactNode;
  className?: string;
}

/** Bordered panel used in the room's side column: compact header, then content. */
export function SidePanel({ title, titleId, description, descriptionId, meta, children, className }: Props) {
  return (
    <section aria-labelledby={titleId} className={cn("rounded-lg border border-border bg-card shadow-xs", className)}>
      <header className="flex items-start justify-between gap-3 border-b border-border px-4 py-3">
        <div className="min-w-0">
          <h2 id={titleId} className="text-sm leading-5 font-semibold text-foreground">
            {title}
          </h2>
          {description && (
            <p id={descriptionId} className="text-[13px] leading-5 text-muted-foreground">
              {description}
            </p>
          )}
        </div>
        {meta && (
          <span className="shrink-0 pt-0.5 font-mono text-[11px] leading-4 text-muted-foreground tabular-nums">
            {meta}
          </span>
        )}
      </header>
      <div className="px-4 py-3">{children}</div>
    </section>
  );
}
