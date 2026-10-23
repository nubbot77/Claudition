import { ChevronDown, CircleAlert, CircleCheck } from "lucide-react";
import { useState } from "react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";
import { clampScore } from "../format";
import type { RoundScore } from "../types";
import { VerdictBadge } from "./Badges";
import { RubricTable } from "./RubricTable";
import { ScoreMeter } from "./report/ScoreMeter";

/** DOM id of a round's detail row, so summary rows can link to it. */
export function roundAnchor(score: RoundScore, index: number): string {
  return `round-${index + 1}-${score.round_id.replace(/[^a-zA-Z0-9_-]/g, "")}`;
}

function DetailList({ title, items, tone }: { title: string; items: string[]; tone: "good" | "gap" }) {
  const Icon = tone === "good" ? CircleCheck : CircleAlert;
  const iconClass = tone === "good" ? "text-success" : "text-warning";
  return (
    <div className="flex min-w-0 flex-col gap-2">
      <h5 className="text-[13px] font-semibold text-foreground">{title}</h5>
      {items.length ? (
        <ul className="flex flex-col gap-2">
          {items.map((item, i) => (
            <li key={i} className="flex gap-2.5 text-sm leading-6 text-foreground">
              <Icon className={cn("mt-[5px] size-3.5 shrink-0", iconClass)} aria-hidden="true" />
              <span className="min-w-0">{item}</span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-muted-foreground">Nothing noted.</p>
      )}
    </div>
  );
}

interface Props {
  score: RoundScore;
  index: number;
  /** Controlled open state (the report opens rows from its summary). Uncontrolled when omitted. */
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  /** Forces the row open while the page prints. */
  printing?: boolean;
}

/** One round in the report's detail list: a summary row that expands to rubric, strengths, gaps and model answer. */
export function RoundScoreCard({ score, index, open, onOpenChange, printing = false }: Props) {
  const [localOpen, setLocalOpen] = useState(false);
  const isOpen = (open ?? localOpen) || printing;
  const value = clampScore(score.score);
  const modelAnswer = score.model_answer.trim();

  return (
    <li
      id={roundAnchor(score, index)}
      className="scroll-mt-20 overflow-hidden rounded-lg border border-border bg-card shadow-xs print:shadow-none"
    >
      <Collapsible
        open={isOpen}
        onOpenChange={(next) => {
          setLocalOpen(next);
          onOpenChange?.(next);
        }}
      >
        <CollapsibleTrigger className="group grid w-full grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-2 px-4 py-3.5 text-left transition-colors duration-150 hover:bg-muted/50 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none focus-visible:ring-inset sm:grid-cols-[minmax(0,1fr)_11rem_7.5rem_1rem] sm:px-5">
          <span className="flex min-w-0 flex-col">
            <span className="text-xs text-muted-foreground">Round {index + 1}</span>
            <span className="truncate text-sm font-semibold text-foreground">{score.round_name}</span>
          </span>
          <ChevronDown
            className="size-4 justify-self-end text-muted-foreground transition-transform duration-200 group-data-[state=open]:rotate-180 sm:order-last print:hidden"
            aria-hidden="true"
          />
          <span className="flex min-w-0 items-center gap-3">
            <ScoreMeter value={value} className="w-full" />
            <span className="w-14 shrink-0 text-right font-mono text-[13px] font-medium text-foreground tabular-nums">
              {value}
              <span className="text-muted-foreground">/100</span>
            </span>
          </span>
          <span className="justify-self-end">
            <VerdictBadge verdict={score.verdict} />
          </span>
        </CollapsibleTrigger>
        <CollapsibleContent className="overflow-hidden data-closed:animate-collapsible-up data-open:animate-collapsible-down print:animate-none">
          <div className="border-t border-border">
            <RubricTable items={score.rubric} caption={`${score.round_name} rubric`} />
          </div>
          <div className="grid gap-6 border-t border-border px-4 py-4 sm:px-5 md:grid-cols-2">
            <DetailList title="Strengths" items={score.strengths} tone="good" />
            <DetailList title="Gaps" items={score.gaps} tone="gap" />
          </div>
          {modelAnswer && (
            <div className="flex flex-col gap-2 border-t border-border bg-muted/30 px-4 py-4 sm:px-5 print:bg-transparent">
              <h5 className="text-[13px] font-semibold text-foreground">Model answer</h5>
              <p className="max-w-[80ch] text-sm leading-6 whitespace-pre-line text-foreground">{modelAnswer}</p>
            </div>
          )}
        </CollapsibleContent>
      </Collapsible>
    </li>
  );
}
