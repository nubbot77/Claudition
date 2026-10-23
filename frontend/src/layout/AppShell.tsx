import { createContext, useContext, useMemo, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { Brand } from "@/components/Brand";

interface AppBarSlots {
  center: HTMLElement | null;
  end: HTMLElement | null;
}

const AppBarContext = createContext<AppBarSlots>({ center: null, end: null });

/**
 * Global layout: a 56px top app bar (brand left, two slots) above the routed page.
 * Pages render their own <main id="main">; use the `page-container` utility for the 1280px column.
 */
export function AppShell({ children }: { children: ReactNode }) {
  const [center, setCenter] = useState<HTMLElement | null>(null);
  const [end, setEnd] = useState<HTMLElement | null>(null);
  const slots = useMemo(() => ({ center, end }), [center, end]);

  return (
    <AppBarContext.Provider value={slots}>
      <div className="flex min-h-dvh flex-col bg-background text-foreground">
        <a
          href="#main"
          className="sr-only rounded-md bg-accent px-3 py-2 text-sm font-medium text-accent-foreground focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50"
        >
          Skip to content
        </a>
        <header className="sticky top-0 z-40 border-b border-border bg-card print:hidden">
          <div className="page-container flex h-14 items-center gap-4">
            <Brand />
            <div
              ref={setCenter}
              className="flex min-w-0 flex-1 items-center gap-3 border-l border-border pl-4 empty:border-0 empty:pl-0"
            />
            <div ref={setEnd} className="flex shrink-0 items-center gap-2" />
          </div>
        </header>
        <div className="flex flex-1 flex-col">{children}</div>
      </div>
    </AppBarContext.Provider>
  );
}

/**
 * Renders children into the global app bar. `center` sits after the brand (session title, round label);
 * `end` is right-aligned (timer, voice controls, End interview).
 */
export function AppBarSlot({ side = "end", children }: { side?: "center" | "end"; children: ReactNode }) {
  const target = useContext(AppBarContext)[side];
  return target ? createPortal(children, target) : null;
}
