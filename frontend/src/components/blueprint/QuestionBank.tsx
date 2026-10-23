import { useMemo, useState } from "react";
import { ChevronDown } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";
import { hostOf, roundTypeLabel } from "../../format";
import type { BlueprintRound, QuestionRef } from "../../types";
import { ExternalLink } from "../SourceLink";

interface Props {
  questions: QuestionRef[];
  rounds: BlueprintRound[];
}

/** Questions reported by candidates, grouped by round type in interview order. Collapsed by default. */
export function QuestionBank({ questions, rounds }: Props) {
  const [open, setOpen] = useState(false);

  const groups = useMemo(() => {
    const order = new Map<string, number>();
    rounds.forEach((r, i) => {
      if (!order.has(r.type)) order.set(r.type, i);
    });
    const byType = new Map<string, QuestionRef[]>();
    for (const q of questions) {
      const list = byType.get(q.round_type) ?? [];
      list.push(q);
      byType.set(q.round_type, list);
    }
    return [...byType.entries()].sort(
      ([a], [b]) => (order.get(a) ?? Number.MAX_SAFE_INTEGER) - (order.get(b) ?? Number.MAX_SAFE_INTEGER),
    );
  }, [questions, rounds]);

  return (
    <Collapsible open={open} onOpenChange={setOpen} className="rounded-lg border border-border bg-card shadow-xs">
      <CollapsibleTrigger asChild>
        <button
          type="button"
          className="flex w-full items-center gap-3 rounded-lg px-4 py-3.5 text-left outline-none hover:bg-muted/50 focus-visible:ring-2 focus-visible:ring-ring sm:px-5"
        >
          <span className="min-w-0 flex-1">
            <span className="flex items-center gap-2 text-sm font-semibold">
              Question bank
              <span className="font-mono text-[13px] font-normal text-muted-foreground tabular-nums">
                {questions.length}
              </span>
            </span>
            <span className="block text-[13px] text-muted-foreground">
              Questions candidates report from this company, grouped by round type
            </span>
          </span>
          <ChevronDown
            aria-hidden="true"
            className={cn("size-4 shrink-0 text-muted-foreground transition-transform duration-200", open && "rotate-180")}
          />
        </button>
      </CollapsibleTrigger>
      <CollapsibleContent className="overflow-hidden data-[state=closed]:animate-collapsible-up data-[state=open]:animate-collapsible-down motion-reduce:animate-none">
        <div className="flex flex-col gap-5 border-t border-border px-4 py-4 sm:px-5">
          {groups.map(([type, list]) => (
            <section key={type} aria-label={roundTypeLabel(type)} className="flex flex-col gap-2">
              <h4 className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
                {roundTypeLabel(type)}
                <span className="font-mono tabular-nums">{list.length}</span>
              </h4>
              <ul className="flex flex-col divide-y divide-border rounded-md border border-border">
                {list.map((q, i) => (
                  <li
                    key={i}
                    className="flex flex-col gap-1 px-3 py-2.5 sm:flex-row sm:items-baseline sm:justify-between sm:gap-4"
                  >
                    <span className="min-w-0 text-[13px] leading-5 text-pretty">{q.question}</span>
                    {q.source_url && (
                      <ExternalLink url={q.source_url} className="shrink-0 text-xs">
                        <span className="max-w-[14rem] truncate">{hostOf(q.source_url) || "Source"}</span>
                      </ExternalLink>
                    )}
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}
