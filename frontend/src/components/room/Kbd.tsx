import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/** Keyboard key cap. Sets every property explicitly so the legacy `kbd` element rule never leaks through. */
export function Kbd({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <kbd
      className={cn(
        "inline-flex h-5 min-w-5 items-center justify-center rounded-sm border border-border bg-muted px-1 font-sans text-[11px] leading-none font-medium text-muted-foreground",
        className,
      )}
    >
      {children}
    </kbd>
  );
}
