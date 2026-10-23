import { useId, useState, type ChangeEvent, type ReactNode } from "react";
import { AudioLines, ChevronDown, Play, Square } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { SPEED_MAX, SPEED_MIN, type SpeechEngine, type Tts } from "../hooks/useSpeech";

interface Props {
  tts: Tts;
}

function shortVoiceName(voice: SpeechSynthesisVoice): string {
  const name = voice.name
    .replace(/^Microsoft\s+/i, "")
    .replace(/^Google\s+/i, "Google ")
    .replace(/\s+-\s+English.*$/i, "")
    .replace(/\s*\(Natural\)/i, " (natural)");
  return `${name} · ${voice.lang}`;
}

function engineNote(tts: Tts): string {
  if (tts.engine === "kokoro" && !tts.kokoroAvailable) {
    return "The neural voice isn't available on the server right now, so the browser voice is used.";
  }
  if (tts.activeEngine === "kokoro") return "Neural voice generated on this computer by the interview server.";
  if (tts.engine === "auto" && tts.englishVoices.some((v) => /natural|neural|online/i.test(v.name))) {
    return "Using your browser's natural voice.";
  }
  return "Using a voice built into your browser.";
}

const SELECT_CLASS =
  "h-9 w-full min-w-0 appearance-none rounded-md border border-input bg-card py-0 pr-8 pl-3 text-sm text-foreground shadow-xs transition-[border-color,box-shadow] duration-150 outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/20 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-background/40";

function SelectShell({ children }: { children: ReactNode }) {
  return (
    <div className="relative">
      {children}
      <ChevronDown
        aria-hidden="true"
        className="pointer-events-none absolute top-1/2 right-2.5 size-4 -translate-y-1/2 text-muted-foreground"
      />
    </div>
  );
}

function FieldLabel({ htmlFor, children }: { htmlFor: string; children: ReactNode }) {
  return (
    <label htmlFor={htmlFor} className="text-[13px] leading-4 font-medium text-foreground">
      {children}
    </label>
  );
}

export function VoicePicker({ tts }: Props) {
  const [open, setOpen] = useState(false);
  const id = useId();
  const titleId = `${id}-title`;

  const usingKokoro = tts.activeEngine === "kokoro";
  const onEngine = (e: ChangeEvent<HTMLSelectElement>) => tts.setEngine(e.target.value as SpeechEngine);
  const onVoice = (e: ChangeEvent<HTMLSelectElement>) =>
    usingKokoro ? tts.setKokoroVoice(e.target.value) : tts.setBrowserVoice(e.target.value);
  const browserVoiceValue = tts.englishVoices.some((v) => v.name === tts.browserVoice) ? tts.browserVoice : "";
  const noVoices = usingKokoro ? !tts.kokoroVoices.length : !tts.englishVoices.length;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <Tooltip>
        <TooltipTrigger asChild>
          <PopoverTrigger asChild>
            <Button type="button" variant="ghost" size="icon-sm" aria-label="Voice settings">
              <AudioLines />
            </Button>
          </PopoverTrigger>
        </TooltipTrigger>
        <TooltipContent side="bottom" sideOffset={6}>
          Voice settings
        </TooltipContent>
      </Tooltip>

      <PopoverContent
        align="end"
        sideOffset={8}
        aria-labelledby={titleId}
        className="w-[min(20rem,calc(100vw-2rem))] gap-4 p-4"
      >
        <div className="flex items-start gap-3">
          <span className="flex size-8 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
            <AudioLines aria-hidden="true" className="size-4" />
          </span>
          <div className="min-w-0">
            <p id={titleId} className="text-sm leading-5 font-semibold text-foreground">
              Interviewer voice
            </p>
            <p className="text-[13px] leading-5 text-muted-foreground" aria-live="polite">
              {engineNote(tts)}
            </p>
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <FieldLabel htmlFor={`${id}-engine`}>Engine</FieldLabel>
          <SelectShell>
            <select id={`${id}-engine`} className={SELECT_CLASS} value={tts.engine} onChange={onEngine}>
              <option value="auto">Automatic (most natural)</option>
              <option value="browser">Browser voice</option>
              <option value="kokoro" disabled={!tts.kokoroAvailable && tts.engine !== "kokoro"}>
                Neural (Kokoro){tts.kokoroAvailable ? "" : " — unavailable"}
              </option>
            </select>
          </SelectShell>
        </div>

        <div className="flex flex-col gap-1.5">
          <FieldLabel htmlFor={`${id}-voice`}>Voice</FieldLabel>
          <SelectShell>
            <select
              id={`${id}-voice`}
              className={SELECT_CLASS}
              value={usingKokoro ? tts.kokoroVoice : browserVoiceValue}
              onChange={onVoice}
              disabled={noVoices}
            >
              {usingKokoro ? (
                tts.kokoroVoices.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.label}
                  </option>
                ))
              ) : (
                <>
                  <option value="">{noVoices ? "No voices found" : "Best available"}</option>
                  {tts.englishVoices.map((v) => (
                    <option key={v.voiceURI || v.name} value={v.name}>
                      {shortVoiceName(v)}
                    </option>
                  ))}
                </>
              )}
            </select>
          </SelectShell>
        </div>

        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between gap-3">
            <FieldLabel htmlFor={`${id}-speed`}>Speed</FieldLabel>
            <output
              htmlFor={`${id}-speed`}
              className="font-mono text-[13px] leading-4 font-medium text-muted-foreground tabular-nums"
            >
              {tts.speed.toFixed(2)}×
            </output>
          </div>
          <input
            id={`${id}-speed`}
            className="h-5 w-full cursor-pointer rounded-full accent-accent outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-popover"
            type="range"
            min={SPEED_MIN}
            max={SPEED_MAX}
            step={0.05}
            value={tts.speed}
            aria-valuetext={`${tts.speed.toFixed(2)} times normal speed`}
            onChange={(e) => tts.setSpeed(Number(e.target.value))}
          />
          <div aria-hidden="true" className="flex justify-between font-mono text-[11px] text-muted-foreground tabular-nums">
            <span>{SPEED_MIN.toFixed(2)}×</span>
            <span>{SPEED_MAX.toFixed(2)}×</span>
          </div>
        </div>

        <div className="-mx-4 -mb-4 flex flex-wrap items-center gap-x-3 gap-y-2 rounded-b-lg border-t border-border bg-muted/40 px-4 py-3">
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => (tts.speaking ? tts.cancel() : tts.preview())}
          >
            {tts.speaking ? <Square className="fill-current" /> : <Play />}
            {tts.speaking ? "Stop" : "Preview"}
          </Button>
          <span className={cn("min-w-0 flex-1 text-xs text-muted-foreground", !tts.muted && "sr-only")}>
            {tts.muted ? "Voice is muted; preview still plays." : ""}
          </span>
        </div>
      </PopoverContent>
    </Popover>
  );
}
