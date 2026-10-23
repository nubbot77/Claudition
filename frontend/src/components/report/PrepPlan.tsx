import { CircleCheck } from "lucide-react";
import { useId, useMemo } from "react";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import type { DayPlan } from "../../types";
import { useLocalState } from "./useLocalState";

interface Props {
  plan: DayPlan[];
  /** localStorage key for the ticked tasks. */
  storageKey: string;
}

/** Day-by-day checklist. Ticks persist in this browser and print as they are. */
export function PrepPlan({ plan, storageKey }: Props) {
  const baseId = useId();
  const days = useMemo(() => [...plan].sort((a, b) => a.day - b.day), [plan]);
  const [done, setDone] = useLocalState<string[]>(storageKey, []);
  const doneSet = new Set(done);
  const total = days.reduce((n, d) => n + d.tasks.length, 0);
  const completed = days.reduce((n, d) => n + d.tasks.filter((_, i) => doneSet.has(`${d.day}:${i}`)).length, 0);

  const toggle = (taskId: string, checked: boolean) =>
    setDone((prev) => (checked ? [...new Set([...prev, taskId])] : prev.filter((t) => t !== taskId)));

  return (
    <section aria-labelledby="plan-title" className="flex flex-col gap-3 print:break-before-page">
      <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-2">
        <div className="flex flex-col gap-0.5">
          <h3 id="plan-title" className="text-base font-semibold text-foreground">
            7-day prep plan
          </h3>
          <p className="text-[13px] text-muted-foreground print:hidden">
            Tick tasks off as you finish them. Progress is saved in this browser.
          </p>
        </div>
        {total > 0 && (
          <div className="flex items-center gap-3 print:hidden">
            <span className="font-mono text-[13px] text-muted-foreground tabular-nums">
              {completed}/{total} tasks
            </span>
            <Progress
              value={(completed / total) * 100}
              className="w-28 sm:w-36"
              aria-label={`${completed} of ${total} prep tasks done`}
            />
          </div>
        )}
      </div>

      <ol className="divide-y divide-border overflow-hidden rounded-lg border border-border bg-card shadow-xs print:shadow-none">
        {days.map((d) => {
          const dayDone = d.tasks.filter((_, i) => doneSet.has(`${d.day}:${i}`)).length;
          const complete = d.tasks.length > 0 && dayDone === d.tasks.length;
          return (
            <li
              key={d.day}
              className="grid gap-x-6 gap-y-2 px-4 py-4 sm:grid-cols-[7rem_minmax(0,1fr)] sm:px-5 print:break-inside-avoid"
            >
              <div className="flex items-baseline gap-3 sm:flex-col sm:gap-1">
                <span className="text-sm font-semibold text-foreground">Day {d.day}</span>
                <span
                  className={cn(
                    "inline-flex items-center gap-1 text-xs tabular-nums print:hidden",
                    complete ? "text-success-soft-foreground" : "text-muted-foreground",
                  )}
                >
                  {complete && <CircleCheck className="size-3.5" aria-hidden="true" />}
                  {complete ? "Done" : `${dayDone} of ${d.tasks.length} done`}
                </span>
              </div>
              <div className="min-w-0">
                <h4 className="text-sm leading-6 font-semibold text-primary">{d.focus}</h4>
                {d.tasks.length > 0 && (
                  <ul className="mt-1 flex flex-col">
                    {d.tasks.map((task, i) => {
                      const taskId = `${d.day}:${i}`;
                      const inputId = `${baseId}-${d.day}-${i}`;
                      const checked = doneSet.has(taskId);
                      return (
                        <li key={i}>
                          <label
                            htmlFor={inputId}
                            className="-mx-2 flex cursor-pointer items-start gap-3 rounded-md px-2 py-1.5 transition-colors duration-150 hover:bg-muted/60"
                          >
                            <input
                              id={inputId}
                              type="checkbox"
                              checked={checked}
                              onChange={(e) => toggle(taskId, e.target.checked)}
                              className="mt-1 size-4 shrink-0 cursor-pointer accent-accent print:accent-auto"
                            />
                            <span
                              className={cn(
                                "text-sm leading-6 transition-colors duration-150",
                                checked
                                  ? "text-muted-foreground line-through decoration-muted-foreground/60 print:text-foreground print:no-underline"
                                  : "text-foreground",
                              )}
                            >
                              {task}
                            </span>
                          </label>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
