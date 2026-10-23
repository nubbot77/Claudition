/**
 * Motion helpers (motion.dev, "motion/react"). Keep motion subtle and purposeful:
 * 150-250 ms ease-out, 6-8 px slides, list stagger of 30 ms or less.
 * The app is wrapped in <MotionConfig reducedMotion="user">, so transforms are dropped for users who ask for
 * reduced motion; opacity changes remain.
 */
import { useEffect, type ReactNode } from "react";
import {
  AnimatePresence,
  animate,
  motion,
  useMotionValue,
  useReducedMotion,
  useTransform,
  type HTMLMotionProps,
  type Transition,
  type Variants,
} from "motion/react";
import { cn } from "@/lib/utils";

export const EASE_OUT: [number, number, number, number] = [0.22, 1, 0.36, 1];
export const DURATION = { fast: 0.15, base: 0.2, slow: 0.25 } as const;
export const MAX_STAGGER = 0.03;

/** Default transition: 200 ms ease-out. */
export const baseTransition: Transition = { duration: DURATION.base, ease: EASE_OUT };

/** Reusable variants for custom motion elements: initial="hidden" animate="show" exit="exit". */
export const fadeSlide: Variants = {
  hidden: { opacity: 0, y: 6 },
  show: { opacity: 1, y: 0, transition: baseTransition },
  exit: { opacity: 0, y: -4, transition: { duration: DURATION.fast, ease: EASE_OUT } },
};

/* ---------------------------------------------------------------------------------------------- */

type FadeInProps = HTMLMotionProps<"div"> & {
  /** Seconds before the fade starts. */
  delay?: number;
  /** Vertical offset in px to slide up from (0 for a pure fade). */
  y?: number;
};

/** Fades and slides its content in once, on mount. */
export function FadeIn({ delay = 0, y = 6, transition, ...props }: FadeInProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ ...baseTransition, delay, ...transition }}
      {...props}
    />
  );
}

/* ---------------------------------------------------------------------------------------------- */

interface StepTransitionProps {
  /** Changing this key swaps the content: the old step fades out, the new one fades and slides in. */
  stepKey: string | number;
  children: ReactNode;
  className?: string;
  /** Slide distance in px. */
  y?: number;
  /** Animate the very first step too (default true). */
  animateOnMount?: boolean;
}

/** Keyed screen/step transition (AnimatePresence, mode="wait"). */
export function StepTransition({ stepKey, children, className, y = 8, animateOnMount = true }: StepTransitionProps) {
  return (
    <AnimatePresence mode="wait" initial={animateOnMount}>
      <motion.div
        key={stepKey}
        className={className}
        initial={{ opacity: 0, y }}
        animate={{ opacity: 1, y: 0, transition: { duration: DURATION.slow, ease: EASE_OUT } }}
        exit={{ opacity: 0, y: -y / 2, transition: { duration: DURATION.fast, ease: EASE_OUT } }}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}

/* ---------------------------------------------------------------------------------------------- */

interface FadePresenceProps {
  show: boolean;
  children: ReactNode;
  className?: string;
  y?: number;
}

/** Mounts/unmounts conditional content (inline errors, banners, hints) with a short fade. */
export function FadePresence({ show, children, className, y = -4 }: FadePresenceProps) {
  return (
    <AnimatePresence initial={false}>
      {show && (
        <motion.div
          key="presence"
          className={className}
          initial={{ opacity: 0, y }}
          animate={{ opacity: 1, y: 0, transition: baseTransition }}
          exit={{ opacity: 0, y, transition: { duration: DURATION.fast, ease: EASE_OUT } }}
        >
          {children}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/* ---------------------------------------------------------------------------------------------- */

const containerTags = {
  div: motion.div,
  ul: motion.ul,
  ol: motion.ol,
  section: motion.section,
  dl: motion.dl,
} as const;

const itemTags = {
  div: motion.div,
  li: motion.li,
  article: motion.article,
  section: motion.section,
} as const;

type StaggerProps = Omit<HTMLMotionProps<"div">, "variants" | "initial" | "animate"> & {
  as?: keyof typeof containerTags;
  /** Seconds between children; capped at 30 ms. */
  gap?: number;
  /** Seconds before the first child starts. */
  delay?: number;
};

/** Staggers its <StaggerItem> descendants in on mount. */
export function Stagger({ as = "div", gap = MAX_STAGGER, delay = 0, ...props }: StaggerProps) {
  const Comp = containerTags[as] as typeof motion.div;
  return (
    <Comp
      initial="hidden"
      animate="show"
      variants={{
        hidden: {},
        show: { transition: { staggerChildren: Math.min(gap, MAX_STAGGER), delayChildren: delay } },
      }}
      {...props}
    />
  );
}

type StaggerItemProps = Omit<HTMLMotionProps<"div">, "variants"> & {
  as?: keyof typeof itemTags;
};

/** A child of <Stagger>. Use as="li" inside <Stagger as="ul|ol">. */
export function StaggerItem({ as = "div", ...props }: StaggerItemProps) {
  const Comp = itemTags[as] as typeof motion.div;
  return <Comp variants={fadeSlide} {...props} />;
}

/* ---------------------------------------------------------------------------------------------- */

interface CountUpProps {
  value: number;
  from?: number;
  /** Seconds. */
  duration?: number;
  decimals?: number;
  className?: string;
  /** Custom formatting, e.g. (n) => `${Math.round(n)}%`. */
  format?: (n: number) => string;
}

/** Counts a number up to `value` (tabular figures). Screen readers get the final value only. */
export function CountUp({ value, from = 0, duration = 0.6, decimals = 0, className, format }: CountUpProps) {
  const reduce = useReducedMotion();
  const mv = useMotionValue(reduce ? value : from);
  const text = useTransform(mv, (n) => (format ? format(n) : n.toFixed(decimals)));

  useEffect(() => {
    if (reduce) {
      mv.set(value);
      return;
    }
    const controls = animate(mv, value, { duration, ease: EASE_OUT });
    return () => controls.stop();
  }, [value, duration, reduce, mv]);

  return (
    <span className={cn("tabular-nums", className)}>
      <motion.span aria-hidden="true">{text}</motion.span>
      <span className="sr-only">{format ? format(value) : value.toFixed(decimals)}</span>
    </span>
  );
}

/* ---------------------------------------------------------------------------------------------- */

const BAR_PATTERNS = [
  [0.35, 1, 0.5, 0.85, 0.35],
  [0.6, 0.3, 1, 0.45, 0.6],
  [0.45, 0.9, 0.35, 1, 0.45],
  [0.7, 0.4, 0.8, 0.3, 0.7],
  [0.3, 0.75, 0.55, 0.95, 0.3],
];

interface SpeakingBarsProps {
  /** True while the interviewer's voice is playing. */
  active: boolean;
  /** Number of bars (3-5 reads best). */
  bars?: number;
  /** Colour comes from `currentColor`; default text-accent. Height via h-*. */
  className?: string;
  /** Accessible label; omit to hide the bars from assistive tech. */
  label?: string;
}

/** Animated equaliser bars for the speaking interviewer. Rests as short, dimmed bars when inactive. */
export function SpeakingBars({ active, bars = 4, className, label }: SpeakingBarsProps) {
  return (
    <span
      role={label ? "img" : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      className={cn("inline-flex h-4 items-center gap-[3px] text-accent", className)}
    >
      {Array.from({ length: bars }, (_, i) => (
        <motion.span
          key={i}
          className="block h-full w-[3px] origin-center rounded-full bg-current"
          initial={false}
          animate={active ? { scaleY: BAR_PATTERNS[i % BAR_PATTERNS.length], opacity: 1 } : { scaleY: 0.25, opacity: 0.5 }}
          transition={
            active
              ? { duration: 1.1 + i * 0.12, repeat: Infinity, ease: "easeInOut", delay: i * 0.08 }
              : { duration: DURATION.base, ease: EASE_OUT }
          }
        />
      ))}
    </span>
  );
}
