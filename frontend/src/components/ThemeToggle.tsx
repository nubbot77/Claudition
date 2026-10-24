import { motion } from "motion/react";
import { Monitor, Moon, Sun } from "@/lib/icons";
import { useTheme, type ThemePreference } from "@/lib/theme";
import { cn } from "@/lib/utils";

const OPTIONS: { value: ThemePreference; label: string; Icon: typeof Sun }[] = [
  { value: "light", label: "Light theme", Icon: Sun },
  { value: "dark", label: "Dark theme", Icon: Moon },
  { value: "system", label: "Match system theme", Icon: Monitor },
];

/** Three-way segmented switch; the active marker slides between options. */
export function ThemeToggle({ className }: { className?: string }) {
  const { preference, setPreference } = useTheme();

  return (
    <div
      role="radiogroup"
      aria-label="Colour theme"
      className={cn("inline-flex items-center gap-0.5 rounded-md border border-border bg-muted/60 p-0.5", className)}
    >
      {OPTIONS.map(({ value, label, Icon }) => {
        const active = preference === value;
        return (
          <button
            key={value}
            type="button"
            role="radio"
            aria-checked={active}
            aria-label={label}
            title={label}
            onClick={() => setPreference(value)}
            className={cn(
              "relative grid size-7 place-items-center rounded-[5px] outline-none focus-visible:ring-2 focus-visible:ring-ring",
              active ? "text-foreground" : "text-muted-foreground hover:text-foreground",
            )}
          >
            {active && (
              <motion.span
                layoutId="theme-toggle-marker"
                className="absolute inset-0 rounded-[5px] border border-border bg-card"
                transition={{ type: "spring", stiffness: 500, damping: 38 }}
              />
            )}
            <Icon className="relative size-3.5" aria-hidden="true" />
          </button>
        );
      })}
    </div>
  );
}
