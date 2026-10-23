import { CircleAlert, CircleCheck } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  title: string;
  items: string[];
  tone: "good" | "gap";
  headingLevel?: "h2" | "h3" | "h4";
  emptyText?: string;
  className?: string;
}

/** Strengths or gaps: a bordered panel with one icon-led line per point. */
export function PointsList({ title, items, tone, headingLevel = "h3", emptyText = "Nothing noted.", className }: Props) {
  const Heading = headingLevel;
  const Icon = tone === "good" ? CircleCheck : CircleAlert;
  const iconClass = tone === "good" ? "text-success" : "text-warning";

  return (
    <section
      className={cn(
        "flex flex-col rounded-lg border border-border bg-card shadow-xs print:break-inside-avoid print:shadow-none",
        className,
      )}
    >
      <header className="flex items-center justify-between gap-3 border-b border-border px-5 py-3">
        <Heading className="flex items-center gap-2 text-sm font-semibold text-foreground">
          <Icon className={cn("size-4", iconClass)} aria-hidden="true" />
          {title}
        </Heading>
        {items.length > 0 && (
          <span className="font-mono text-xs text-muted-foreground tabular-nums" aria-hidden="true">
            {items.length}
          </span>
        )}
      </header>
      {items.length ? (
        <ul className="flex flex-col gap-3 px-5 py-4">
          {items.map((item, i) => (
            <li key={i} className="flex gap-2.5 text-sm leading-6 text-foreground">
              <Icon className={cn("mt-[5px] size-3.5 shrink-0", iconClass)} aria-hidden="true" />
              <span className="min-w-0">{item}</span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="px-5 py-4 text-sm text-muted-foreground">{emptyText}</p>
      )}
    </section>
  );
}
