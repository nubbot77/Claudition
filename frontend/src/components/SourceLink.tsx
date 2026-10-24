import type { ReactNode } from "react";
import { ExternalLink as ExternalLinkIcon, Link2 } from "@/lib/icons";
import { cn } from "@/lib/utils";
import { hostOf, safeHref } from "../format";
import type { Source } from "../types";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** "2026-05" -> "May 2026", "2026-05-14" -> "14 May 2026", "2024" -> "2024"; anything else is shown as given. */
export function formatSourceDate(value: string | null | undefined): string {
  const raw = value?.trim();
  if (!raw) return "";
  const m = /^(\d{4})(?:-(\d{1,2}))?(?:-(\d{1,2}))?/.exec(raw);
  if (!m) return raw;
  const [, year, month, day] = m;
  const monthName = month ? MONTHS[Number(month) - 1] : undefined;
  if (!monthName) return year;
  return day ? `${Number(day)} ${monthName} ${year}` : `${monthName} ${year}`;
}

interface ExternalLinkProps {
  url: string;
  children: ReactNode;
  className?: string;
  /** Hide the trailing external-link icon. */
  bare?: boolean;
}

/**
 * Opens http(s) links in a new tab with rel="noopener noreferrer". Anything else (javascript:, data:, relative
 * paths, malformed URLs) is rendered as plain text.
 */
export function ExternalLink({ url, children, className, bare = false }: ExternalLinkProps) {
  const href = safeHref(url);
  if (!href) return <span className={cn("min-w-0", className)}>{children}</span>;
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={cn(
        "group/ext inline-flex min-w-0 items-baseline gap-1 rounded-sm text-accent no-underline underline-offset-3 outline-none hover:text-accent-hover hover:underline focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:ring-offset-background",
        className,
      )}
    >
      <span className="min-w-0">{children}</span>
      {!bare && (
        <ExternalLinkIcon aria-hidden="true" className="size-3 shrink-0 translate-y-px self-center opacity-70" />
      )}
      <span className="sr-only"> (opens in a new tab)</span>
    </a>
  );
}

/** One citation row: title (link), then domain and date. */
export function SourceLink({ source, className }: { source: Source; className?: string }) {
  const host = hostOf(source.url);
  const title = source.title?.trim() || host || source.url;
  const date = formatSourceDate(source.date);
  const linked = safeHref(source.url) != null;

  return (
    <div className={cn("flex min-w-0 items-start gap-2.5", className)}>
      <Link2 aria-hidden="true" className="mt-0.5 size-3.5 shrink-0 text-muted-foreground" />
      <div className="flex min-w-0 flex-1 flex-col gap-0.5 sm:flex-row sm:items-baseline sm:gap-3">
        <ExternalLink
          url={source.url}
          className={cn("text-[13px] leading-5 font-medium sm:min-w-0 sm:flex-1", !linked && "text-foreground")}
        >
          <span className="line-clamp-2 break-words sm:line-clamp-1">{title}</span>
        </ExternalLink>
        {(host || date) && (
          <span className="flex shrink-0 items-center gap-2 text-xs leading-5 text-muted-foreground">
            {host && <span className="max-w-[16rem] truncate">{host}</span>}
            {host && date && (
              <span aria-hidden="true" className="h-3 w-px bg-muted-foreground/35" />
            )}
            {date && (
              <time dateTime={source.date ?? undefined} className="tabular-nums">
                {date}
              </time>
            )}
          </span>
        )}
      </div>
    </div>
  );
}
