import { useEffect, useRef } from "react";
import { SpeakingBars } from "@/components/motion";
import { cn } from "@/lib/utils";
import { formatTime, ROLE_LABEL } from "../format";
import type { TranscriptRole } from "../types";
import { ParticipantAvatar } from "./room/ParticipantAvatar";
import { parsePerson } from "./room/people";

export interface TranscriptItem {
  role: TranscriptRole;
  speaker: string;
  text: string;
  at?: string | null;
  persona?: string;
  color?: string;
  active?: boolean;
}

interface Props {
  items: TranscriptItem[];
  label: string;
  emptyText?: string;
  /** Extra classes for the scroll container (e.g. a different max-height). */
  className?: string;
}

function speakerName(item: TranscriptItem): string {
  if (item.role === "candidate") return "You";
  if (item.role === "interviewer") return parsePerson(item.speaker, ROLE_LABEL.interviewer).name;
  return item.speaker.trim() || ROLE_LABEL[item.role];
}

/** Round transcript as a timeline: avatar rail, speaker, time, text. Scrolls to the newest entry. */
export function TranscriptList({ items, label, emptyText = "Nothing has been said yet.", className }: Props) {
  const listRef = useRef<HTMLOListElement>(null);

  useEffect(() => {
    const el = listRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [items.length]);

  if (!items.length) {
    return <p className="py-2 text-[13px] leading-5 text-muted-foreground">{emptyText}</p>;
  }

  return (
    <ol
      ref={listRef}
      aria-label={label}
      tabIndex={0}
      className={cn(
        "-mx-2 flex max-h-[60vh] flex-col overflow-y-auto overscroll-contain rounded-md px-2 outline-none focus-visible:ring-2 focus-visible:ring-ring",
        className,
      )}
    >
      {items.map((item, i) => {
        const name = speakerName(item);
        const last = i === items.length - 1;
        const candidate = item.role === "candidate";
        const system = item.role === "system";
        return (
          <li key={i} className="relative grid grid-cols-[1.75rem_minmax(0,1fr)] gap-x-3 pt-3 first:pt-1">
            {!last && (
              <span
                aria-hidden="true"
                className={cn("absolute -bottom-2 left-[13.5px] w-px bg-border", i === 0 ? "top-9" : "top-11")}
              />
            )}
            <ParticipantAvatar
              name={name}
              size="sm"
              text={candidate ? "You" : undefined}
              tone={
                candidate
                  ? "candidate"
                  : item.role === "interviewer"
                    ? "interviewer"
                    : item.color
                      ? "speaker"
                      : "neutral"
              }
              color={item.color}
              speaking={item.active}
              className={candidate ? "text-[9px]" : undefined}
            />
            <div
              className={cn(
                "min-w-0 rounded-md pb-1 transition-colors duration-200",
                item.active && "-mx-2 -mt-1 bg-muted/70 px-2 pt-1",
              )}
            >
              <p className="flex min-w-0 items-center gap-2 leading-7">
                <span
                  className={cn("truncate text-[13px] font-semibold", !item.color && "text-foreground")}
                  style={item.color ? { color: item.color } : undefined}
                >
                  {name}
                </span>
                {item.at && (
                  <time
                    dateTime={item.at}
                    className="shrink-0 font-mono text-[11px] text-muted-foreground tabular-nums"
                  >
                    {formatTime(item.at)}
                  </time>
                )}
                {item.active && (
                  <span className="flex items-center gap-1 text-[11px] font-medium" style={{ color: item.color }}>
                    <SpeakingBars active bars={3} className="h-3 text-current" />
                    <span className="sr-only">speaking</span>
                  </span>
                )}
              </p>
              <p
                className={cn(
                  "text-sm leading-6 break-words whitespace-pre-wrap",
                  system ? "text-muted-foreground italic" : "text-foreground",
                )}
              >
                {item.text}
              </p>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
