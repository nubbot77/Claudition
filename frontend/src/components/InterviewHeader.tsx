import type { ReactNode } from "react";
import { LogOut, Volume2, VolumeX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { AppBarSlot } from "@/layout/AppShell";
import { useMediaQuery } from "../hooks/useMediaQuery";
import type { Tts } from "../hooks/useSpeech";
import type { BlueprintRound, QuestionKind, RoundProgress } from "../types";
import { RoundStrip } from "./room/RoundStrip";
import { VoicePicker } from "./VoicePicker";

interface Props {
  company: string | null;
  role: string | null;
  /** Current round name, or the phase ("Interview plan", "Final report"). */
  roundLabel: string | null;
  rounds: BlueprintRound[];
  currentRoundId: string | null;
  completedRoundIds: Set<string>;
  /** round_progress for the current round only. */
  progress: RoundProgress | null;
  questionKind?: QuestionKind | null;
  clock: ReactNode;
  tts: Tts;
  canEnd: boolean;
  onEnd: () => void;
  loading?: boolean;
}

/**
 * Session chrome: identity and round in the app bar's centre slot; round clock, voice controls and End interview
 * in its end slot; the round stepper and question counter in a strip directly under the app bar.
 */
export function InterviewHeader({
  company,
  role,
  roundLabel,
  rounds,
  currentRoundId,
  completedRoundIds,
  progress,
  questionKind,
  clock,
  tts,
  canEnd,
  onEnd,
  loading = false,
}: Props) {
  const hasControls = !!clock || tts.supported || canEnd;
  // Below md the centre slot stays empty (its divider collapses); the strip below carries the round instead.
  const wide = useMediaQuery("(min-width: 768px)");

  return (
    <>
      {wide && (
        <AppBarSlot side="center">
          <div className="flex min-w-0 flex-col justify-center">
            {loading ? (
              <>
                <Skeleton className="h-3.5 w-40" />
                <Skeleton className="mt-1.5 h-3 w-24" />
              </>
            ) : (
              <>
                <p className="flex min-w-0 items-baseline gap-2 text-sm leading-5">
                  <span className="truncate font-semibold text-foreground">{company}</span>
                  {role && <span className="truncate text-muted-foreground">{role}</span>}
                </p>
                {roundLabel && <p className="truncate text-xs leading-4 text-muted-foreground">{roundLabel}</p>}
              </>
            )}
          </div>
        </AppBarSlot>
      )}

      {hasControls && (
        <AppBarSlot side="end">
          <div className="flex items-center gap-1 sm:gap-1.5">
            {clock}
            {tts.supported && <VoicePicker tts={tts} />}
            {tts.supported && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    aria-pressed={tts.muted}
                    aria-label="Mute interviewer voice"
                    className="aria-pressed:bg-muted aria-pressed:text-muted-foreground"
                    onClick={() => tts.setMuted(!tts.muted)}
                  >
                    {tts.muted ? <VolumeX /> : <Volume2 />}
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom" sideOffset={6}>
                  {tts.muted ? "Voice muted. Click to unmute" : "Mute voice"}
                </TooltipContent>
              </Tooltip>
            )}
            {canEnd && (
              <>
                <Separator orientation="vertical" className="mx-1 hidden h-5 sm:block" />
                <Button
                  type="button"
                  variant="destructive-outline"
                  size="sm"
                  className="hidden sm:inline-flex"
                  onClick={onEnd}
                >
                  End interview
                </Button>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      type="button"
                      variant="destructive-outline"
                      size="icon-sm"
                      className="sm:hidden"
                      aria-label="End interview"
                      onClick={onEnd}
                    >
                      <LogOut />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" sideOffset={6}>
                    End interview
                  </TooltipContent>
                </Tooltip>
              </>
            )}
          </div>
        </AppBarSlot>
      )}

      <RoundStrip
        rounds={rounds}
        currentRoundId={currentRoundId}
        completedRoundIds={completedRoundIds}
        progress={progress}
        questionKind={questionKind}
        statusLabel={roundLabel}
      />
    </>
  );
}
