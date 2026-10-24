import type { CSSProperties } from "react";
import { cn } from "@/lib/utils";
import { initials } from "../../format";

type AvatarTone = "interviewer" | "candidate" | "speaker" | "neutral";
type AvatarSize = "xs" | "sm" | "md" | "lg";

const SIZE: Record<AvatarSize, string> = {
  xs: "size-6 text-[10px]",
  sm: "size-7 text-[11px]",
  md: "size-9 text-[13px]",
  lg: "size-10 text-sm",
};

const TONE: Record<AvatarTone, string> = {
  interviewer: "bg-muted font-heading text-foreground ring-1 ring-inset ring-border",
  candidate: "bg-accent-soft text-accent-soft-foreground ring-1 ring-inset ring-accent-soft-foreground/15",
  speaker:
    "bg-[color-mix(in_oklab,var(--speaker)_13%,var(--card))] text-(--speaker) ring-1 ring-inset ring-[color-mix(in_oklab,var(--speaker)_28%,transparent)]",
  neutral: "bg-muted text-muted-foreground",
};

interface Props {
  name: string;
  tone?: AvatarTone;
  size?: AvatarSize;
  /** Speaker colour (CSS colour or var()), used by the "speaker" tone and the speaking ring. */
  color?: string;
  /** Shows the live speaking ring (video-call style). */
  speaking?: boolean;
  /** Override the initials, e.g. "You". */
  text?: string;
  className?: string;
}

/** Rounded-square initials avatar for interviewers, panelists and the candidate. Decorative: names sit beside it. */
export function ParticipantAvatar({
  name,
  tone = "neutral",
  size = "md",
  color,
  speaking = false,
  text,
  className,
}: Props) {
  const ringColor = color ?? "var(--accent)";
  return (
    <span
      aria-hidden="true"
      data-speaking={speaking || undefined}
      style={{ "--speaker": ringColor } as CSSProperties}
      className={cn(
        "relative inline-flex shrink-0 items-center justify-center rounded-md font-semibold tracking-tight select-none",
        "outline-2 outline-offset-2 outline-transparent transition-[outline-color] duration-200 ease-out",
        "data-speaking:outline-(--speaker)",
        SIZE[size],
        TONE[tone],
        className,
      )}
    >
      {text ?? initials(name)}
    </span>
  );
}
