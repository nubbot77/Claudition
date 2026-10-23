import type { InterviewStatus, RoundType, TranscriptRole, Verdict } from "./types";

export const ROUND_TYPE_LABEL: Record<RoundType, string> = {
  aptitude_mcq: "Aptitude",
  coding: "Coding",
  technical: "Technical",
  system_design: "System design",
  behavioral: "Behavioural",
  hr: "HR",
  managerial: "Managerial",
  group_discussion: "Group discussion",
};

export const VERDICT_LABEL: Record<Verdict, string> = {
  strong_hire: "Strong hire",
  hire: "Hire",
  lean_hire: "Lean hire",
  lean_no_hire: "Lean no hire",
  no_hire: "No hire",
};

export const STATUS_LABEL: Record<InterviewStatus, string> = {
  thinking: "In progress",
  ready: "In progress",
  error: "Needs attention",
  finished: "Completed",
};

export const ROLE_LABEL: Record<TranscriptRole, string> = {
  interviewer: "Interviewer",
  candidate: "You",
  panelist: "Panelist",
  system: "Note",
};

export function capitalize(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

export function roundTypeLabel(type: string | null | undefined): string {
  if (!type) return "";
  return ROUND_TYPE_LABEL[type as RoundType] ?? type;
}

export function verdictLabel(verdict: string): string {
  return VERDICT_LABEL[verdict as Verdict] ?? verdict;
}

export function formatClock(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const mm = String(m).padStart(2, "0");
  const ss = String(sec).padStart(2, "0");
  return h ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
}

export function formatMinutes(total: number): string {
  if (total < 60) return `${total} min`;
  const h = Math.floor(total / 60);
  const m = total % 60;
  return m ? `${h} h ${m} min` : `${h} h`;
}

const HAS_ZONE = /(?:[zZ]|[+-]\d{2}:?\d{2})$/;

export function parseServerTime(value: string | null | undefined): number | null {
  if (!value) return null;
  if (HAS_ZONE.test(value)) {
    const t = Date.parse(value);
    return Number.isNaN(t) ? null : t;
  }
  const local = Date.parse(value);
  const utc = Date.parse(`${value}Z`);
  if (Number.isNaN(local)) return Number.isNaN(utc) ? null : utc;
  if (Number.isNaN(utc)) return local;
  const now = Date.now();
  return Math.abs(now - utc) < Math.abs(now - local) ? utc : local;
}

export function formatDateTime(value: string): string {
  const t = parseServerTime(value);
  if (t == null) return value;
  return new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(t);
}

export function formatTime(value: string): string {
  const t = parseServerTime(value);
  if (t == null) return "";
  return new Intl.DateTimeFormat(undefined, { hour: "2-digit", minute: "2-digit" }).format(t);
}

export function wordCount(text: string): number {
  const words = text.trim().match(/\S+/g);
  return words ? words.length : 0;
}

export function joinText(previous: string, chunk: string): string {
  if (!previous.trim()) return chunk;
  return /\s$/.test(previous) ? previous + chunk : `${previous} ${chunk}`;
}

export function normalizeText(text: string): string {
  return text.replace(/\s+/g, " ").trim();
}

export function safeHref(url: string | null | undefined): string | null {
  if (!url) return null;
  try {
    const parsed = new URL(url);
    return parsed.protocol === "http:" || parsed.protocol === "https:" ? parsed.href : null;
  } catch {
    return null;
  }
}

export function hostOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
}

export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "?";
  const first = parts[0][0] ?? "";
  const last = parts.length > 1 ? parts[parts.length - 1][0] ?? "" : "";
  return (first + last).toUpperCase();
}

export type ScoreTone = "good" | "mid" | "low";

export function scoreTone(score: number): ScoreTone {
  if (score >= 70) return "good";
  if (score >= 50) return "mid";
  return "low";
}

export function clampScore(score: number, max = 100): number {
  if (!Number.isFinite(score)) return 0;
  return Math.max(0, Math.min(max, Math.round(score)));
}
