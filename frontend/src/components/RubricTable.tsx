import { cn } from "@/lib/utils";
import { clampScore } from "../format";
import type { RubricItem } from "../types";
import { ScoreMeter } from "./report/ScoreMeter";

function weightFormatter(items: RubricItem[]): (w: number) => string {
  const total = items.reduce((sum, item) => sum + (Number.isFinite(item.weight) ? item.weight : 0), 0);
  if (total > 0.9 && total < 1.1) return (w) => `${Math.round(w * 100)}%`;
  if (total > 90 && total < 110) return (w) => `${Math.round(w)}%`;
  return (w) => `×${Math.round(w * 100) / 100}`;
}

const HEAD = "h-9 text-[13px] font-medium whitespace-nowrap text-muted-foreground";

/**
 * Scoring rubric: criterion, weight, score out of 10 (meter + number) and the interviewer's comment.
 * Below 640px each row stacks into a block so nothing scrolls sideways.
 */
export function RubricTable({
  items,
  caption = "Rubric",
  className,
}: {
  items: RubricItem[];
  caption?: string;
  className?: string;
}) {
  if (!items.length) {
    return <p className="px-5 py-4 text-sm text-muted-foreground">No rubric was provided for this round.</p>;
  }
  const formatWeight = weightFormatter(items);

  return (
    <table className={cn("w-full border-collapse text-sm max-sm:block", className)}>
      <caption className="sr-only">{caption}</caption>
      <thead className="max-sm:hidden">
        <tr className="border-b border-border bg-muted/40 print:bg-transparent">
          <th scope="col" className={cn(HEAD, "w-[24%] pr-3 pl-5 text-left")}>
            Criterion
          </th>
          <th scope="col" className={cn(HEAD, "w-20 px-3 text-right")}>
            Weight
          </th>
          <th scope="col" className={cn(HEAD, "w-44 px-3 text-left")}>
            Score
          </th>
          <th scope="col" className={cn(HEAD, "pr-5 pl-3 text-left")}>
            Comment
          </th>
        </tr>
      </thead>
      <tbody className="max-sm:block">
        {items.map((item, i) => {
          const score = clampScore(item.score, 10);
          return (
            <tr
              key={i}
              className="border-b border-border align-top last:border-0 max-sm:grid max-sm:grid-cols-[minmax(0,1fr)_auto] max-sm:gap-x-4 max-sm:gap-y-2 max-sm:px-4 max-sm:py-4 print:break-inside-avoid"
            >
              <th scope="row" className="py-3.5 pr-3 pl-5 text-left text-sm leading-6 font-medium text-foreground max-sm:p-0">
                {item.criterion}
              </th>
              <td className="px-3 py-3.5 text-right font-mono text-[13px] leading-6 text-muted-foreground tabular-nums max-sm:p-0">
                <span className="font-sans sm:sr-only">Weight </span>
                {formatWeight(item.weight)}
              </td>
              <td className="px-3 py-3.5 max-sm:col-span-2 max-sm:p-0">
                <div className="flex h-6 items-center gap-3">
                  <ScoreMeter value={score} max={10} className="w-full max-sm:max-w-40 sm:w-24" />
                  <span className="w-11 shrink-0 font-mono text-[13px] font-medium text-foreground tabular-nums">
                    {score}/10
                  </span>
                </div>
              </td>
              <td className="py-3.5 pr-5 pl-3 text-sm leading-6 text-muted-foreground max-sm:col-span-2 max-sm:p-0">
                {item.comment}
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
