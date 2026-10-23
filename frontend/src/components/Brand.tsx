import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";

/** Navy tile with a doorway: the "room" the candidate walks into. */
export function BrandMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={cn("size-6 shrink-0 text-brand-navy", className)}>
      <rect width="24" height="24" rx="5" fill="currentColor" />
      <path
        d="M8.5 18V7.25C8.5 6.56 9.06 6 9.75 6h4.5c.69 0 1.25.56 1.25 1.25V18"
        fill="none"
        stroke="#fff"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      <path d="M6 18h12" stroke="#fff" strokeWidth="1.6" strokeLinecap="round" />
      <circle cx="13.25" cy="12.5" r="0.95" fill="#fff" />
    </svg>
  );
}

export function Brand({ className }: { className?: string }) {
  return (
    <Link
      to="/"
      data-slot="brand"
      className={cn(
        "inline-flex shrink-0 items-center gap-2.5 rounded-md text-primary no-underline outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
        className,
      )}
    >
      <BrandMark />
      <span className="text-[15px] leading-none font-semibold tracking-tight">Claudition</span>
    </Link>
  );
}
