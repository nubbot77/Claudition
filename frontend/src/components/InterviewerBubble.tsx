import type { ReactNode } from "react";
import { RotateCcw, Square } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SpeakingBars } from "@/components/motion";
import { cn } from "@/lib/utils";
import { initials } from "../format";
import type { Tts } from "../hooks/useSpeech";
import { ParticipantAvatar } from "./room/ParticipantAvatar";
import { parsePerson } from "./room/people";

interface Props {
  /** "Name, Title" as sent by the interviewer. */
  name: string | null;
  text: string;
  tts: Tts;
  /** Role shown when the label has no title, and as a badge when it isn't "Interviewer" (e.g. "Moderator"). */
  role?: string;
  compact?: boolean;
  /** Overrides tts.speaking, e.g. when a queue also contains other speakers. */
  speaking?: boolean;
  /** Small context line above the text, e.g. "Follow-up question". */
  kicker?: ReactNode;
  className?: string;
}

/**
 * The interviewer as a call participant: a camera-style tile with initials and a live speaking ring, name and
 * title, Replay/Stop, and the spoken text. `compact` drops the tile for a 32px avatar (secondary screens).
 */
export function InterviewerBubble({
  name,
  text,
  tts,
  role = "Interviewer",
  compact = false,
  speaking,
  kicker,
  className,
}: Props) {
  if (!text.trim()) return null;
  const person = parsePerson(name, role);
  const subtitle = person.title ?? (person.name !== role ? role : null);
  const live = speaking ?? tts.speaking;
  const showRole = role !== "Interviewer";

  const replay = tts.supported ? (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      className="shrink-0 text-muted-foreground hover:text-foreground"
      onClick={() => (tts.speaking ? tts.cancel() : tts.speak(text, { force: true }))}
    >
      {tts.speaking ? <Square className="fill-current" /> : <RotateCcw />}
      {tts.speaking ? "Stop" : "Replay"}
    </Button>
  ) : null;

  const identity = (
    <div className="min-w-0 flex-1">
      <p className="flex min-w-0 items-center gap-2">
        <span className={cn("truncate font-semibold text-foreground", compact ? "text-sm" : "text-[15px]")}>
          {person.name}
        </span>
        {showRole && (
          <Badge variant="secondary" className="shrink-0">
            {role}
          </Badge>
        )}
      </p>
      {subtitle && subtitle !== role && (
        <p className="truncate text-[13px] leading-5 text-muted-foreground">{subtitle}</p>
      )}
    </div>
  );

  const status = (
    <span className="flex shrink-0 items-center gap-1.5 text-xs font-medium text-accent" aria-hidden="true">
      <SpeakingBars active={live} bars={4} className="h-3.5" />
      <span className={cn("transition-opacity duration-200", live ? "opacity-100" : "opacity-0")}>Speaking</span>
    </span>
  );

  if (compact) {
    return (
      <section
        aria-label={`${person.name}, ${person.title ?? role}`}
        className={cn(
          "rounded-lg border bg-card shadow-xs transition-[border-color] duration-200",
          live ? "border-accent/45" : "border-border",
          className,
        )}
      >
        <header className="flex items-center gap-3 px-4 pt-3">
          <ParticipantAvatar name={person.name} tone="interviewer" size="sm" speaking={live} />
          {identity}
          <span className="hidden sm:flex">{status}</span>
          {replay}
        </header>
        <div className="px-4 pt-2 pb-4">
          {kicker && <div className="mb-1.5 text-[13px] font-medium text-muted-foreground">{kicker}</div>}
          <p className="max-w-[72ch] text-[15px] leading-7 text-pretty whitespace-pre-line text-foreground">{text}</p>
        </div>
      </section>
    );
  }

  return (
    <section
      aria-label={`${person.name}, ${person.title ?? role}`}
      className={cn(
        "grid overflow-hidden rounded-lg border bg-card shadow-xs transition-[border-color] duration-200 sm:grid-cols-[9.5rem_minmax(0,1fr)]",
        live ? "border-accent/45" : "border-border",
        className,
      )}
    >
      {/* Camera-style participant tile (sm and up). */}
      <div className="hidden p-3 pr-0 sm:block">
        <div
          aria-hidden="true"
          data-speaking={live || undefined}
          className="relative flex aspect-[4/3] w-full items-center justify-center rounded-md bg-brand-navy outline-2 outline-offset-2 outline-transparent transition-[outline-color] duration-200 data-speaking:outline-accent"
        >
          <span className="text-2xl font-semibold tracking-tight text-brand-navy-foreground select-none">
            {initials(person.name)}
          </span>
          <span className="absolute bottom-2 left-2 flex h-5 items-center rounded-sm bg-black/25 px-1.5 text-white">
            <SpeakingBars active={live} bars={4} className="h-3 text-white" />
          </span>
        </div>
      </div>

      <div className="flex min-w-0 flex-col">
        <header className="flex items-center gap-3 px-4 pt-3 sm:pt-3.5 sm:pl-5">
          <ParticipantAvatar
            name={person.name}
            tone="interviewer"
            size="md"
            speaking={live}
            className="sm:hidden"
          />
          {identity}
          <span className="hidden sm:flex">{status}</span>
          {replay}
        </header>
        <div className="px-4 pt-2.5 pb-5 sm:pl-5">
          {kicker && <div className="mb-2 text-[13px] font-medium text-muted-foreground">{kicker}</div>}
          <p className="max-w-[68ch] text-base leading-7 text-pretty whitespace-pre-line text-foreground">{text}</p>
        </div>
      </div>
    </section>
  );
}
