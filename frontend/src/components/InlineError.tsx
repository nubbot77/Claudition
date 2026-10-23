import { useRef } from "react";
import { AnimatePresence, motion } from "motion/react";
import { CircleAlert } from "lucide-react";
import { DURATION, EASE_OUT, baseTransition } from "@/components/motion";
import { cn } from "@/lib/utils";

interface InlineErrorProps {
  message: string | null | undefined;
  /** Optional bold first line, e.g. "Couldn't start the interview". */
  title?: string;
  className?: string;
}

/** Compact destructive alert for form and action errors. Fades in and out; renders nothing without a message. */
export function InlineError({ message, title, className }: InlineErrorProps) {
  // Keep the last message so the exit fade still shows its text.
  const last = useRef(message);
  if (message) last.current = message;
  const text = message || last.current;

  return (
    <AnimatePresence initial={false}>
      {message && (
        <motion.div
          key="inline-error"
          role="alert"
          data-slot="inline-error"
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0, transition: baseTransition }}
          exit={{ opacity: 0, transition: { duration: DURATION.fast, ease: EASE_OUT } }}
          className={cn(
            "flex w-full min-w-0 items-start gap-2 rounded-md border border-destructive/25 bg-destructive-soft px-3 py-2 text-[13px] leading-5 text-destructive-soft-foreground",
            className,
          )}
        >
          <CircleAlert aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
          <div className="min-w-0 break-words">
            {title && <p className="font-medium">{title}</p>}
            <p className="whitespace-pre-wrap">{text}</p>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
