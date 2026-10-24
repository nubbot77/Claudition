import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";

/** Ink tile with a doorway: the "room" the candidate walks into. Follows the theme (ink on paper, paper on ink). */
export function BrandMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={cn("size-6 shrink-0 text-primary", className)}>
      <rect width="24" height="24" rx="5" fill="currentColor" />
      <path
        d="M8.5 18V7.25C8.5 6.56 9.06 6 9.75 6h4.5c.69 0 1.25.56 1.25 1.25V18"
        fill="none"
        stroke="var(--primary-foreground)"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      <path d="M6 18h12" stroke="var(--primary-foreground)" strokeWidth="1.6" strokeLinecap="round" />
      <circle cx="13.25" cy="12.5" r="0.95" fill="var(--primary-foreground)" />
    </svg>
  );
}

export function Brand({ className }: { className?: string }) {
  return (
    <Link
      to="/"
      data-slot="brand"
      className={cn(
        "group inline-flex shrink-0 items-center gap-2.5 rounded-md text-primary no-underline outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
        className,
      )}
    >
      <BrandMark className="transition-transform duration-300 ease-(--ease-out-soft) group-hover:-rotate-6" />
      <span className="font-heading text-[19px] leading-none font-medium tracking-tight">Claudition</span>
    </Link>
  );
}
