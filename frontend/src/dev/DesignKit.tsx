/** Dev-only reference sheet: tokens, type scale, tuned shadcn components and motion helpers. /__preview?screen=kit */
import { useState } from "react";
import { ArrowRight, Mic, Play, RotateCcw, Send } from "lucide-react";
import { toast } from "sonner";
import { CountUp, FadeIn, SpeakingBars, Stagger, StaggerItem, StepTransition } from "@/components/motion";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Progress } from "@/components/ui/progress";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Slider } from "@/components/ui/slider";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Toggle } from "@/components/ui/toggle";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

const SWATCHES = [
  ["background", "bg-background"],
  ["card", "bg-card"],
  ["muted", "bg-muted"],
  ["border", "bg-border"],
  ["primary (navy)", "bg-primary"],
  ["brand-navy", "bg-brand-navy"],
  ["accent (action)", "bg-accent"],
  ["accent-soft", "bg-accent-soft"],
  ["success", "bg-success"],
  ["warning", "bg-warning"],
  ["destructive", "bg-destructive"],
  ["gd-1", "bg-gd-1"],
  ["gd-2", "bg-gd-2"],
  ["gd-3", "bg-gd-3"],
  ["gd-4", "bg-gd-4"],
  ["gd-5", "bg-gd-5"],
] as const;

const STEPS = ["Question 1 of 4", "Follow-up", "Question 2 of 4"];

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-base font-semibold tracking-tight">{title}</h2>
      {children}
    </section>
  );
}

export function DesignKit() {
  const [replay, setReplay] = useState(0);
  const [speaking, setSpeaking] = useState(true);
  const [step, setStep] = useState(0);
  const [score, setScore] = useState(82);

  return (
    <main id="main" className="page-container flex flex-col gap-10 py-8">
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">Design kit</h1>
        <p className="text-muted-foreground">
          Tokens, type and components as tuned for Claudition. Dark mode follows the OS.
        </p>
      </header>

      <Section title="Colour tokens">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-8">
          {SWATCHES.map(([name, cls]) => (
            <div key={name} className="flex flex-col gap-1.5">
              <div className={`h-10 rounded-md border ${cls}`} />
              <span className="text-xs text-muted-foreground">{name}</span>
            </div>
          ))}
        </div>
      </Section>

      <Section title="Type">
        <div className="flex flex-col gap-2">
          <p className="text-2xl font-semibold tracking-tight">Page title, 24px semibold</p>
          <p className="text-base font-semibold">Section title, 16px semibold</p>
          <p className="text-sm">Body, 14px. The interviewer researches the company's real process before the first round.</p>
          <p className="text-[13px] font-medium">Label, 13px medium</p>
          <p className="text-xs text-muted-foreground">Caption, 12px muted</p>
          <p className="font-mono text-2xl font-medium tabular-nums">08:32 / 20:00 · 91/100</p>
        </div>
      </Section>

      <Section title="Buttons">
        <div className="flex flex-wrap items-center gap-2">
          <Button>
            Submit answer
            <Send data-icon="inline-end" />
          </Button>
          <Button variant="brand">Brand</Button>
          <Button variant="outline">
            <Play data-icon="inline-start" />
            Run code
          </Button>
          <Button variant="secondary">Secondary</Button>
          <Button variant="ghost">Ghost</Button>
          <Button variant="destructive-outline">End interview</Button>
          <Button variant="destructive">End now</Button>
          <Button variant="link">View sources</Button>
          <Button disabled>Disabled</Button>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button size="xs">Extra small</Button>
          <Button size="sm">Small</Button>
          <Button>Default</Button>
          <Button size="lg">
            Start research
            <ArrowRight data-icon="inline-end" />
          </Button>
          <Button size="icon" variant="outline" aria-label="Speak">
            <Mic />
          </Button>
        </div>
      </Section>

      <Section title="Badges">
        <div className="flex flex-wrap items-center gap-2">
          <Badge>Navy</Badge>
          <Badge variant="secondary">Coding</Badge>
          <Badge variant="outline">Medium</Badge>
          <Badge variant="accent">In progress</Badge>
          <Badge variant="success">Strong hire</Badge>
          <Badge variant="warning">Lean hire</Badge>
          <Badge variant="destructive">No hire</Badge>
          <Badge variant="success" size="lg">
            9/9 hidden tests
          </Badge>
        </div>
      </Section>

      <Section title="Form controls">
        <div className="grid gap-6 md:grid-cols-2">
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="kit-company">Company</Label>
              <Input id="kit-company" placeholder="e.g. Flipkart" />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="kit-invalid">Role</Label>
              <Input id="kit-invalid" aria-invalid defaultValue="" placeholder="Required" />
              <p className="text-xs text-destructive">Company and role are required.</p>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="kit-jd">Job description</Label>
              <Textarea id="kit-jd" placeholder="Paste the posting." />
            </div>
          </div>
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Label>Experience</Label>
              <Select defaultValue="fresher">
                <SelectTrigger className="w-56">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectItem value="fresher">Fresher</SelectItem>
                    <SelectItem value="0-1">0–1 years</SelectItem>
                    <SelectItem value="1-3">1–3 years</SelectItem>
                  </SelectGroup>
                </SelectContent>
              </Select>
            </div>
            <RadioGroup defaultValue="b" aria-label="Answer">
              {["24 days", "30 days", "32 days"].map((o, i) => (
                <div key={o} className="flex items-center gap-2">
                  <RadioGroupItem value={"abc"[i]} id={`kit-r${i}`} />
                  <Label htmlFor={`kit-r${i}`} className="font-normal">
                    {o}
                  </Label>
                </div>
              ))}
            </RadioGroup>
            <div className="flex flex-col gap-2">
              <Label>Voice speed</Label>
              <Slider defaultValue={[1]} min={0.85} max={1.15} step={0.05} className="w-56" />
            </div>
            <div className="flex gap-1">
              <Toggle variant="outline" defaultPressed size="sm">
                Python
              </Toggle>
              <Toggle variant="outline" size="sm">
                JavaScript
              </Toggle>
            </div>
          </div>
        </div>
      </Section>

      <Section title="Card, tabs, progress">
        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Technical Interview</CardTitle>
              <CardDescription>Round 4 of 5 · 20 min</CardDescription>
              <CardAction>
                <Badge variant="accent">Current</Badge>
              </CardAction>
            </CardHeader>
            <CardContent className="flex flex-col gap-2">
              <div className="flex justify-between text-[13px]">
                <span className="text-muted-foreground">Questions</span>
                <span className="font-mono tabular-nums">2 / 4</span>
              </div>
              <Progress value={50} aria-label="Questions asked" />
            </CardContent>
            <CardFooter className="justify-end">
              <Button size="sm">Continue</Button>
            </CardFooter>
          </Card>
          <Tabs defaultValue="problem">
            <TabsList>
              <TabsTrigger value="problem">Problem</TabsTrigger>
              <TabsTrigger value="results">Results</TabsTrigger>
            </TabsList>
            <TabsContent value="problem" className="text-muted-foreground">
              Default tabs: a segmented control.
            </TabsContent>
            <TabsContent value="results">Run your code to see results.</TabsContent>
            <Tabs defaultValue="a" className="mt-4">
              <TabsList variant="line">
                <TabsTrigger value="a">Transcript</TabsTrigger>
                <TabsTrigger value="b">Notes</TabsTrigger>
              </TabsList>
              <TabsContent value="a" className="text-muted-foreground">
                Line tabs: blue underline on the active tab.
              </TabsContent>
              <TabsContent value="b">Notes</TabsContent>
            </Tabs>
          </Tabs>
        </div>
      </Section>

      <Section title="Table, accordion, skeleton">
        <div className="grid gap-6 md:grid-cols-2">
          <Card size="sm" className="py-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Criterion</TableHead>
                  <TableHead className="text-right">Weight</TableHead>
                  <TableHead className="text-right">Score</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow>
                  <TableCell>Correctness of answers</TableCell>
                  <TableCell className="text-right font-mono tabular-nums">40%</TableCell>
                  <TableCell className="text-right font-mono tabular-nums">10/10</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>Depth and reasoning</TableCell>
                  <TableCell className="text-right font-mono tabular-nums">30%</TableCell>
                  <TableCell className="text-right font-mono tabular-nums">9/10</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </Card>
          <div className="flex flex-col gap-4">
            <Accordion type="single" collapsible>
              <AccordionItem value="model">
                <AccordionTrigger>Model answer</AccordionTrigger>
                <AccordionContent>Two passes: count characters, then return the first with count 1.</AccordionContent>
              </AccordionItem>
              <AccordionItem value="sources">
                <AccordionTrigger>Sources</AccordionTrigger>
                <AccordionContent>FACE Prep, GeeksforGeeks, Jobrise.</AccordionContent>
              </AccordionItem>
            </Accordion>
            <div className="flex flex-col gap-2">
              <Skeleton className="h-4 w-2/3" />
              <Skeleton className="h-4 w-1/2" />
            </div>
          </div>
        </div>
      </Section>

      <Section title="Overlays and toasts">
        <div className="flex flex-wrap items-center gap-2">
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive-outline">End interview</Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>End the interview now?</AlertDialogTitle>
                <AlertDialogDescription>
                  The interviewer will stop here and write up a report from what you've done so far.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Keep going</AlertDialogCancel>
                <AlertDialogAction variant="destructive">End interview</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline">Voice settings</Button>
            </PopoverTrigger>
            <PopoverContent>
              <p className="text-[13px] font-medium">Interviewer voice</p>
              <p className="text-muted-foreground">Popover surface with border and shadow-md.</p>
            </PopoverContent>
          </Popover>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" aria-label="Replay question">
                <RotateCcw />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Replay question</TooltipContent>
          </Tooltip>
          <Button variant="outline" onClick={() => toast.success("Answer submitted", { description: "The interviewer is reading it." })}>
            Success toast
          </Button>
          <Button variant="outline" onClick={() => toast.error("Couldn't reach the interview server.")}>
            Error toast
          </Button>
        </div>
      </Section>

      <Section title="Motion">
        <div className="grid gap-6 md:grid-cols-3">
          <Card size="sm">
            <CardHeader>
              <CardTitle>CountUp</CardTitle>
              <CardAction>
                <Button size="xs" variant="outline" onClick={() => setScore((s) => (s === 82 ? 91 : 82))}>
                  Change
                </Button>
              </CardAction>
            </CardHeader>
            <CardContent>
              <CountUp value={score} className="font-mono text-4xl font-semibold" />
              <span className="ml-1 text-muted-foreground">/ 100</span>
            </CardContent>
          </Card>
          <Card size="sm">
            <CardHeader>
              <CardTitle>SpeakingBars</CardTitle>
              <CardAction>
                <Button size="xs" variant="outline" onClick={() => setSpeaking((s) => !s)}>
                  {speaking ? "Stop" : "Speak"}
                </Button>
              </CardAction>
            </CardHeader>
            <CardContent className="flex items-center gap-3">
              <SpeakingBars active={speaking} label={speaking ? "Interviewer speaking" : "Interviewer silent"} />
              <span className="text-muted-foreground">{speaking ? "Speaking" : "Silent"}</span>
            </CardContent>
          </Card>
          <Card size="sm">
            <CardHeader>
              <CardTitle>StepTransition</CardTitle>
              <CardAction>
                <Button size="xs" variant="outline" onClick={() => setStep((s) => (s + 1) % STEPS.length)}>
                  Next
                </Button>
              </CardAction>
            </CardHeader>
            <CardContent>
              <StepTransition stepKey={step}>
                <p className="font-medium">{STEPS[step]}</p>
              </StepTransition>
            </CardContent>
          </Card>
        </div>
        <div className="flex items-center gap-3">
          <Button size="sm" variant="outline" onClick={() => setReplay((r) => r + 1)}>
            Replay FadeIn and Stagger
          </Button>
        </div>
        <div key={replay} className="grid gap-6 md:grid-cols-2">
          <FadeIn className="rounded-lg border bg-card p-4 shadow-xs">FadeIn: 200 ms, 6 px slide.</FadeIn>
          <Stagger as="ul" className="flex flex-col gap-2">
            {["Aptitude", "Group discussion", "Coding", "Technical", "HR"].map((r) => (
              <StaggerItem as="li" key={r} className="rounded-md border bg-card px-3 py-2 shadow-xs">
                {r}
              </StaggerItem>
            ))}
          </Stagger>
        </div>
      </Section>
      <Separator />
      <p className="pb-4 text-xs text-muted-foreground">Dev only. Not shipped in production builds.</p>
    </main>
  );
}
