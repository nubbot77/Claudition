import { useCallback, useEffect, useMemo, useState, type CSSProperties } from "react";
import { ArrowRight, Flag, Users } from "@/lib/icons";
import { SpeakingBars } from "@/components/motion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { normalizeText, wordCount } from "../format";
import { useSpeakOnMount, type SpeakItem, type Tts } from "../hooks/useSpeech";
import { useSessionState } from "../lib/storage";
import type { GdState, PublicStep, RoundProgress, TranscriptEntry } from "../types";
import { AnswerComposer } from "./AnswerComposer";
import { InterviewerBubble } from "./InterviewerBubble";
import { ParticipantAvatar } from "./room/ParticipantAvatar";
import { parsePerson } from "./room/people";
import { SidePanel } from "./room/SidePanel";
import { TranscriptList, type TranscriptItem } from "./TranscriptList";

const SPEAKER_COLORS = ["var(--gd-1)", "var(--gd-2)", "var(--gd-3)", "var(--gd-4)", "var(--gd-5)"];
const PITCHES = [1, 0.86, 1.14, 0.94, 1.07];
const RATES = [1, 0.96, 1.04, 1.0, 0.98];

interface Props {
  step: PublicStep;
  gd: GdState;
  entries: TranscriptEntry[];
  tts: Tts;
  stepKey: string;
  roundKey: string;
  busy: boolean;
  error: string | null;
  /** round_progress for this round (contribution budget), if the server sent it. */
  progress?: RoundProgress | null;
  onSpeak: (text: string) => void;
  onContinue: () => void;
}

function sameLine(a: { speaker: string; text: string }, b: { speaker: string; text: string }): boolean {
  return a.speaker === b.speaker && normalizeText(a.text) === normalizeText(b.text);
}

interface TileProps {
  name: string;
  detail: string;
  tooltip?: string;
  color?: string;
  tone: "interviewer" | "speaker" | "candidate";
  speaking: boolean;
}

function ParticipantTile({ name, detail, tooltip, color, tone, speaking }: TileProps) {
  const tile = (
    <div
      style={color ? ({ "--speaker": color } as CSSProperties) : undefined}
      className={cn(
        "flex h-full min-w-[9.5rem] items-center gap-2.5 rounded-lg border bg-card px-3 py-2.5 text-left transition-[border-color,background-color] duration-200",
        speaking ? "border-(--speaker) bg-[color-mix(in_oklab,var(--speaker)_5%,var(--card))]" : "border-border",
      )}
    >
      <ParticipantAvatar
        name={name}
        tone={tone}
        size="md"
        color={color}
        speaking={speaking}
        text={tone === "candidate" ? "You" : undefined}
        className={tone === "candidate" ? "text-[11px]" : undefined}
      />
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-1.5">
          <span className="truncate text-[13px] leading-5 font-semibold text-foreground">{name}</span>
          {speaking && <SpeakingBars active bars={3} className="h-3 shrink-0 text-(--speaker)" />}
        </span>
        <span className="block truncate text-xs leading-4 text-muted-foreground">{detail}</span>
      </span>
      {speaking && <span className="sr-only">, speaking</span>}
    </div>
  );

  if (!tooltip) return <li className="shrink-0 sm:shrink">{tile}</li>;
  return (
    <li className="shrink-0 sm:shrink">
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            className="block h-full w-full cursor-default rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            aria-label={`${name}: ${tooltip}`}
          >
            {tile}
          </button>
        </TooltipTrigger>
        <TooltipContent side="bottom" sideOffset={6} className="max-w-64">
          {tooltip}
        </TooltipContent>
      </Tooltip>
    </li>
  );
}

export function GdRound({
  step,
  gd,
  entries,
  tts,
  stepKey,
  roundKey,
  busy,
  error,
  progress,
  onSpeak,
  onContinue,
}: Props) {
  const [draft, setDraft] = useSessionState(`${stepKey}:draft`, "");
  const [personaCache, setPersonaCache] = useSessionState<Record<string, string>>(`${roundKey}:personas`, {});
  const [activeUtterance, setActiveUtterance] = useState<number | null>(null);
  const noop = useCallback(() => undefined, []);

  useEffect(() => {
    setPersonaCache((prev) => {
      const fresh = gd.utterances.filter((u) => u.persona && prev[u.speaker] !== u.persona);
      if (!fresh.length) return prev;
      const next = { ...prev };
      fresh.forEach((u) => {
        next[u.speaker] = u.persona;
      });
      return next;
    });
  }, [gd.utterances, setPersonaCache]);

  const personas = useMemo(() => {
    const merged = { ...personaCache };
    gd.utterances.forEach((u) => {
      if (u.persona) merged[u.speaker] = u.persona;
    });
    return merged;
  }, [personaCache, gd.utterances]);

  const lines = useMemo(() => {
    const said = entries.filter((e) => e.role === "panelist" || e.role === "candidate");
    const pending = gd.utterances.filter((u) => !said.some((e) => e.role === "panelist" && sameLine(e, u)));
    return [
      ...said.map((e) => ({ role: e.role, speaker: e.speaker, text: e.text, at: e.at })),
      ...pending.map((u) => ({ role: "panelist" as const, speaker: u.speaker, text: u.text, at: null })),
    ];
  }, [entries, gd.utterances]);

  const speakers = useMemo(() => {
    const order: string[] = [];
    const add = (name: string) => {
      if (name && !order.includes(name)) order.push(name);
    };
    lines.filter((l) => l.role === "panelist").forEach((l) => add(l.speaker));
    Object.keys(personas).forEach(add);
    return order;
  }, [lines, personas]);

  const colorFor = (speaker: string) => SPEAKER_COLORS[Math.max(0, speakers.indexOf(speaker)) % SPEAKER_COLORS.length];

  const activeLine = useMemo(() => {
    if (activeUtterance == null) return -1;
    const u = gd.utterances[activeUtterance];
    if (!u) return -1;
    for (let i = lines.length - 1; i >= 0; i--) {
      if (lines[i].role === "panelist" && sameLine(lines[i], u)) return i;
    }
    return -1;
  }, [activeUtterance, gd.utterances, lines]);

  const items: TranscriptItem[] = lines.map((l, i) => ({
    ...l,
    persona: l.role === "panelist" ? personas[l.speaker] : undefined,
    color: l.role === "panelist" ? colorFor(l.speaker) : undefined,
    active: i === activeLine,
  }));

  const userWords = lines.filter((l) => l.role === "candidate").reduce((n, l) => n + wordCount(l.text), 0);
  const totalWords = lines.reduce((n, l) => n + wordCount(l.text), 0);
  const airtime = totalWords ? Math.round((userWords / totalWords) * 100) : 0;
  const fairShare = Math.round(100 / (speakers.length + 1));
  const contributions = lines.filter((l) => l.role === "candidate").length;
  const budget =
    progress && (progress.unit === "contribution" || progress.round_type === "group_discussion") && progress.budget > 0
      ? progress.budget
      : null;

  const activeSpeaker = activeUtterance != null ? (gd.utterances[activeUtterance]?.speaker ?? null) : null;
  const moderatorSpeaking = tts.speaking && activeUtterance == null;
  const moderator = parsePerson(step.interviewer_name, "Moderator");

  useSpeakOnMount(tts, () => {
    const pool = tts.englishVoices;
    const queue: SpeakItem[] = [{ text: step.speech_text }];
    gd.utterances.forEach((u, i) => {
      const idx = Math.max(0, speakers.indexOf(u.speaker));
      queue.push({
        text: u.text,
        speaker: u.speaker,
        voice: pool.length ? pool[(idx + 1) % pool.length] : undefined,
        pitch: PITCHES[idx % PITCHES.length],
        rate: RATES[idx % RATES.length],
        onStart: () => setActiveUtterance(i),
        onEnd: () => setActiveUtterance((cur) => (cur === i ? null : cur)),
      });
    });
    return queue;
  });

  const submitDraft = () => onSpeak(draft.trim());

  return (
    <div className="flex flex-col gap-4">
      {/* Topic */}
      <section
        aria-labelledby="gd-topic"
        className="rounded-lg border border-border bg-card px-4 py-4 shadow-xs sm:px-5"
      >
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[13px] font-medium text-muted-foreground">Discussion topic</span>
          {gd.concluded ? (
            <Badge variant="secondary">Closed</Badge>
          ) : (
            <Badge variant="success" className="gap-1.5">
              <span className="size-1.5 rounded-full bg-current" aria-hidden="true" />
              In progress
            </Badge>
          )}
        </div>
        <h2
          id="gd-topic"
          className="mt-1.5 max-w-[72ch] text-lg leading-7 font-semibold tracking-tight text-pretty text-primary"
        >
          {gd.topic}
        </h2>
      </section>

      {/* Participants */}
      <section aria-labelledby="gd-people-title">
        <h2 id="gd-people-title" className="sr-only">
          Participants
        </h2>
        <ul className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:grid sm:grid-cols-[repeat(auto-fit,minmax(11rem,1fr))] sm:overflow-visible sm:px-0 sm:pb-0">
          <ParticipantTile
            name={moderator.name}
            detail="Moderator"
            tooltip={moderator.title ?? undefined}
            tone="interviewer"
            color="var(--accent)"
            speaking={moderatorSpeaking}
          />
          {speakers.map((s) => (
            <ParticipantTile
              key={s}
              name={s}
              detail={personas[s] || "Panelist"}
              tooltip={personas[s] || undefined}
              tone="speaker"
              color={colorFor(s)}
              speaking={activeSpeaker === s}
            />
          ))}
          <ParticipantTile name="You" detail="Candidate" tone="candidate" color="var(--accent)" speaking={false} />
        </ul>
      </section>

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="flex min-w-0 flex-col gap-4">
          <InterviewerBubble
            name={step.interviewer_name}
            text={step.speech_text}
            tts={tts}
            role="Moderator"
            compact
            speaking={moderatorSpeaking}
          />

          <SidePanel
            title="Discussion"
            titleId="gd-log-title"
            meta={lines.length ? `${lines.length} ${lines.length === 1 ? "point" : "points"}` : undefined}
          >
            <TranscriptList
              items={items}
              label="Group discussion transcript"
              emptyText="The discussion is about to begin."
              className="max-h-[28rem] min-h-40"
            />
          </SidePanel>

          {gd.concluded ? (
            <>
              <div
                role="status"
                className="flex items-start gap-3 rounded-lg border border-accent/25 bg-accent-soft px-4 py-3 text-[13px] leading-5 text-accent-soft-foreground"
              >
                <Flag aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
                <p>
                  <span className="font-semibold">The moderator has closed the discussion.</span> Give a short closing
                  summary, or skip straight to feedback.
                </p>
              </div>
              <AnswerComposer
                id="gd-summary"
                label="Your closing summary"
                placeholder="Summarise each side's main points and where the group ended up…"
                hint="About 30 seconds: cover every participant's view, then the conclusion."
                value={draft}
                setValue={setDraft}
                onVoiceUsed={noop}
                onListenStart={tts.cancel}
                onSubmit={submitDraft}
                submitLabel="Give summary"
                micLabel="Speak"
                busy={busy}
                error={error}
                rows={4}
                secondaryAction={
                  <Button type="button" variant="ghost" onClick={onContinue} disabled={busy}>
                    Skip summary
                    <ArrowRight />
                  </Button>
                }
              />
            </>
          ) : (
            <AnswerComposer
              id="gd-input"
              label="Your point"
              placeholder="Build on a point, challenge it, or bring in a new angle…"
              hint="Speak up when you have something to add."
              value={draft}
              setValue={setDraft}
              onVoiceUsed={noop}
              onListenStart={tts.cancel}
              onSubmit={submitDraft}
              submitLabel="Say it"
              micLabel="Speak"
              busy={busy}
              error={error}
              rows={4}
            />
          )}
        </div>

        <aside aria-label="Your participation" className="flex min-w-0 flex-col gap-4">
          <SidePanel title="Your participation" titleId="gd-participation-title">
            <dl className="grid grid-cols-2 gap-3">
              <div className="rounded-md bg-muted/60 px-3 py-2.5">
                <dt className="text-xs text-muted-foreground">Contributions</dt>
                <dd className="mt-0.5 font-mono text-lg leading-6 font-semibold text-foreground tabular-nums">
                  {budget ? (
                    <>
                      {Math.min(progress?.used ?? contributions, budget)}
                      <span className="text-sm font-normal text-muted-foreground"> / {budget}</span>
                    </>
                  ) : (
                    contributions
                  )}
                </dd>
              </div>
              <div className="rounded-md bg-muted/60 px-3 py-2.5">
                <dt className="text-xs text-muted-foreground">Airtime</dt>
                <dd className="mt-0.5 font-mono text-lg leading-6 font-semibold text-foreground tabular-nums">
                  {airtime}
                  <span className="text-sm font-normal text-muted-foreground">%</span>
                </dd>
              </div>
            </dl>

            <div className="mt-4">
              <div className="mb-1.5 flex items-center justify-between text-xs text-muted-foreground">
                <span id="airtime-label">Share of words spoken</span>
                <span className="font-mono tabular-nums">fair share ~{fairShare}%</span>
              </div>
              <div className="relative">
                <Progress
                  value={airtime}
                  aria-labelledby="airtime-label"
                  getValueLabel={(value) => `${value}% of words spoken; fair share about ${fairShare}%`}
                  className="h-2"
                  indicatorClassName={airtime >= fairShare * 0.6 ? "bg-accent" : "bg-warning"}
                />
                <span
                  aria-hidden="true"
                  className="absolute -top-1 -bottom-1 w-0.5 rounded-full bg-foreground/60"
                  style={{ left: `calc(${fairShare}% - 1px)` }}
                />
              </div>
              <p className="mt-2.5 flex items-start gap-1.5 text-xs leading-5 text-muted-foreground">
                <Users aria-hidden="true" className="mt-0.5 size-3.5 shrink-0" />
                The marker shows an even split across {speakers.length + 1} people. Quality beats volume, but stay in
                the conversation.
              </p>
            </div>
          </SidePanel>
        </aside>
      </div>
    </div>
  );
}
