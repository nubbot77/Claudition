import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const STEPS = [
  {
    title: "Research",
    meta: "3–8 min",
    body: "Reads recent candidate reports and your job description, then drafts a round-by-round plan with sources. You review it before anything starts.",
  },
  {
    title: "Rounds",
    meta: "Timed",
    body: "Aptitude, coding, technical, system design, behavioural, HR or group discussion, in the order the company runs them. Answer by voice or text.",
  },
  {
    title: "Report",
    meta: "At the end",
    body: "Rubric scores for every round, a hiring verdict, and a 7-day prep plan built from your gaps.",
  },
] as const;

/** The three stages of a mock interview, as a compact vertical stepper. */
export function HowItWorks() {
  return (
    <Card size="sm">
      <CardHeader>
        <CardTitle>
          <h2 className="text-sm leading-5 font-semibold">How it works</h2>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ol className="flex flex-col">
          {STEPS.map((step, i) => (
            <li key={step.title} className="relative flex gap-3 pb-4 last:pb-0">
              {i < STEPS.length - 1 && (
                <span aria-hidden="true" className="absolute top-7 bottom-1 left-3 w-px -translate-x-1/2 bg-border" />
              )}
              <span
                aria-hidden="true"
                className="flex size-6 shrink-0 items-center justify-center rounded-full border border-border bg-muted font-mono text-[11px] font-medium text-foreground tabular-nums"
              >
                {i + 1}
              </span>
              <div className="min-w-0 flex-1 pt-0.5">
                <div className="flex items-baseline justify-between gap-2">
                  <h3 className="text-[13px] leading-5 font-semibold">
                    <span className="sr-only">Step {i + 1}: </span>
                    {step.title}
                  </h3>
                  <span className="shrink-0 text-xs text-muted-foreground">{step.meta}</span>
                </div>
                <p className="mt-0.5 text-[13px] leading-5 text-muted-foreground">{step.body}</p>
              </div>
            </li>
          ))}
        </ol>
      </CardContent>
    </Card>
  );
}
