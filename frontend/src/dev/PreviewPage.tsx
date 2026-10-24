/**
 * Dev-only design preview: /__preview?screen=<name>[&busy=1][&error=1][&speaking=1]
 * Renders the real page components with fixture state. Every network action is stubbed: the api methods are
 * swapped for local fakes while this page is mounted, and any non-GET request to /api is blocked as a backstop.
 */
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Toggle } from "@/components/ui/toggle";
import { ApiError, api } from "../api";
import type { SpeakItem, SpeechEngine, Tts } from "../hooks/useSpeech";
import { HomePage } from "../pages/HomePage";
import { InterviewView } from "../pages/InterviewView";
import type { CodeRunRequest, CodeRunResult, InterviewEvent, TtsStatus } from "../types";
import {
  buildFixtures,
  PREVIEW_HEALTH,
  PREVIEW_KOKORO_VOICES,
  previewInterviewList,
  SCREEN_GROUPS,
  type PreviewScreen,
} from "./fixtures";
import { DesignKit } from "./DesignKit";

type Screen = PreviewScreen;

const DEFAULT_SCREEN: Screen = "ask_question";
const ACTION_ERROR = "The interviewer is still working on the previous step — try again in a moment.";
const ALL_SCREENS = new Set<string>(SCREEN_GROUPS.flatMap((g) => g.screens.map((s) => s.name)));

const delay = (ms: number) => new Promise<void>((resolve) => window.setTimeout(resolve, ms));

/* ---------------------------------------------------------------------------------------------- */
/* Network stubs                                                                                   */
/* ---------------------------------------------------------------------------------------------- */

function fakeRun(body: CodeRunRequest): CodeRunResult {
  const results = body.tests.map((t, i) => {
    const passed = i < body.tests.length - 1;
    return {
      input: t.input,
      expected_output: t.expected_output,
      actual_output: passed ? t.expected_output : "3",
      passed,
      stderr: "",
      time_ms: 41 + i * 9,
      timed_out: false,
    };
  });
  return {
    language: body.language,
    compile_error: null,
    results,
    passed_count: results.filter((r) => r.passed).length,
    total: results.length,
  };
}

const PREVIEW_TTS_STATUS: TtsStatus = PREVIEW_HEALTH.tts ?? {
  available: true,
  loaded: true,
  device: "cuda",
  error: null,
  voices: [],
};

const stubs = {
  health: async () => PREVIEW_HEALTH,
  listInterviews: async () => previewInterviewList(),
  createInterview: async (profile: { company: string; role: string }): Promise<{ id: string }> => {
    await delay(400);
    toast("Preview: interview not created", {
      description: `${profile.company || "Company"} · ${profile.role || "Role"}. Network actions are stubbed here.`,
    });
    throw new ApiError(0, "Preview mode: starting an interview is disabled.");
  },
  sendEvent: async (_id: string, event: InterviewEvent) => {
    await delay(400);
    toast(`Preview: "${event.type}" not sent`);
    return { status: "accepted" };
  },
  retry: async () => {
    await delay(400);
    return null;
  },
  runCode: async (body: CodeRunRequest) => {
    await delay(700);
    return fakeRun(body);
  },
  ttsVoices: async () => PREVIEW_KOKORO_VOICES,
  ttsWarmup: async () => PREVIEW_TTS_STATUS,
  synthesize: async (): Promise<Blob> => {
    throw new ApiError(0, "Preview mode: voice synthesis is disabled.");
  },
} satisfies Partial<typeof api>;

type StubKey = keyof typeof stubs;
const mutableApi = api as unknown as Record<StubKey, unknown>;
let saved: Partial<Record<StubKey, unknown>> | null = null;
let realFetch: typeof window.fetch | null = null;

function installStubs(): void {
  if (saved) return;
  const backup: Partial<Record<StubKey, unknown>> = {};
  for (const key of Object.keys(stubs) as StubKey[]) {
    backup[key] = mutableApi[key];
    mutableApi[key] = stubs[key];
  }
  saved = backup;

  const original = window.fetch;
  realFetch = original;
  window.fetch = (input: RequestInfo | URL, init?: RequestInit) => {
    const method = (init?.method ?? (input instanceof Request ? input.method : "GET")).toUpperCase();
    const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
    if (method !== "GET" && method !== "HEAD" && url.includes("/api/")) {
      console.warn(`[preview] blocked ${method} ${url}`);
      return Promise.reject(new TypeError(`Preview mode blocked ${method} ${url}`));
    }
    return original(input, init);
  };
}

function removeStubs(): void {
  if (!saved) return;
  Object.assign(mutableApi, saved);
  saved = null;
  if (realFetch) window.fetch = realFetch;
  realFetch = null;
}

/* ---------------------------------------------------------------------------------------------- */
/* Simulated voice                                                                                 */
/* ---------------------------------------------------------------------------------------------- */

/** A Tts that never touches audio or the network; "speaking" lasts roughly as long as the text would. */
function usePreviewTts(forceSpeaking: boolean): Tts {
  const [muted, setMutedState] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [engine, setEngine] = useState<SpeechEngine>("auto");
  const [kokoroVoice, setKokoroVoice] = useState(PREVIEW_KOKORO_VOICES[0].id);
  const [browserVoice, setBrowserVoice] = useState("");
  const [speed, setSpeed] = useState(1);
  const mutedRef = useRef(muted);
  const timers = useRef<number[]>([]);

  useEffect(() => {
    mutedRef.current = muted;
  }, [muted]);

  const cancel = useCallback(() => {
    timers.current.forEach((t) => window.clearTimeout(t));
    timers.current = [];
    setSpeaking(false);
  }, []);

  const speakQueue = useCallback(
    (items: SpeakItem[]) => {
      cancel();
      const queue = items.filter((item) => item.text.trim());
      if (!queue.length || mutedRef.current) return;
      setSpeaking(true);
      let at = 0;
      queue.forEach((item) => {
        const ms = Math.min(4500, 600 + item.text.length * 30);
        timers.current.push(window.setTimeout(() => item.onStart?.(), at));
        at += ms;
        timers.current.push(window.setTimeout(() => item.onEnd?.(), at));
      });
      timers.current.push(window.setTimeout(() => setSpeaking(false), at));
    },
    [cancel],
  );

  const speak = useCallback((text: string) => speakQueue([{ text }]), [speakQueue]);
  const preview = useCallback(
    () => speakQueue([{ text: "Hi, thanks for making the time today. Let's start with a quick introduction." }]),
    [speakQueue],
  );
  const setMuted = useCallback(
    (next: boolean) => {
      setMutedState(next);
      if (next) cancel();
    },
    [cancel],
  );

  useEffect(() => cancel, [cancel]);

  return {
    supported: true,
    ready: true,
    muted,
    speaking: speaking || forceSpeaking,
    englishVoices: [],
    setMuted,
    speak,
    speakQueue,
    cancel,
    engine,
    activeEngine: engine === "browser" ? "browser" : "kokoro",
    setEngine,
    kokoroAvailable: true,
    kokoroVoices: PREVIEW_KOKORO_VOICES,
    browserVoice,
    setBrowserVoice,
    kokoroVoice,
    setKokoroVoice,
    speed,
    setSpeed,
    preview,
  };
}

/* ---------------------------------------------------------------------------------------------- */
/* Page                                                                                            */
/* ---------------------------------------------------------------------------------------------- */

export default function PreviewPage() {
  // Layout effects run before children's passive effects (where the pages call the api), on mount and on
  // StrictMode's simulated remount alike.
  useLayoutEffect(() => {
    installStubs();
    return removeStubs;
  }, []);

  const [params, setParams] = useSearchParams();
  const requested = params.get("screen") ?? DEFAULT_SCREEN;
  const screen: Screen = ALL_SCREENS.has(requested) ? (requested as Screen) : DEFAULT_SCREEN;
  const busyFlag = params.get("busy") === "1";
  const errorFlag = params.get("error") === "1";
  const speakingFlag = params.get("speaking") === "1";
  const shotMode = params.get("shot") === "1"; // hide this toolbar, e.g. for README screenshots

  const setParam = useCallback(
    (key: string, value: string | null) => {
      setParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          if (value == null) next.delete(key);
          else next.set(key, value);
          return next;
        },
        { replace: true },
      );
    },
    [setParams],
  );
  const setFlag = useCallback((key: string, on: boolean) => setParam(key, on ? "1" : null), [setParam]);

  const tts = usePreviewTts(speakingFlag);
  const [simBusy, setSimBusy] = useState(false);
  const errorRef = useRef(errorFlag);
  useEffect(() => {
    errorRef.current = errorFlag;
  }, [errorFlag]);

  // Rebuilt per screen so clocks and "elapsed" timers start from believable values.
  const fixtures = useMemo(() => buildFixtures(), [screen]);
  const fixture = screen === "home" || screen === "kit" ? null : fixtures[screen];

  const send = useCallback(async (event: InterviewEvent) => {
    setSimBusy(true);
    await delay(600);
    setSimBusy(false);
    if (errorRef.current) return false;
    toast(`Preview: "${event.type}" not sent`, {
      description: "Fixtures don't advance. Pick another screen in the preview bar.",
    });
    return true;
  }, []);

  const retry = useCallback(() => {
    setSimBusy(true);
    window.setTimeout(() => {
      setSimBusy(false);
      toast("Preview: retry not sent");
    }, 600);
  }, []);

  const description =
    screen === "home"
      ? "Real HomePage. Health and past interviews are fixtures; Start research is stubbed."
      : screen === "kit"
        ? "Tokens, type scale, tuned shadcn components and the motion helpers."
        : (fixture?.description ?? "");

  return (
    <>
      <div className="border-b border-dashed border-border bg-muted/50" data-preview-bar="" hidden={shotMode}>
        <div className="page-container flex min-h-11 flex-wrap items-center gap-x-3 gap-y-2 py-1.5">
          <Badge variant="warning">Dev preview</Badge>
          <Select value={screen} onValueChange={(value) => setParam("screen", value)}>
            <SelectTrigger size="sm" className="w-64" aria-label="Screen">
              <SelectValue />
            </SelectTrigger>
            <SelectContent position="popper">
              {SCREEN_GROUPS.map((group) => (
                <SelectGroup key={group.label}>
                  <SelectLabel>{group.label}</SelectLabel>
                  {group.screens.map((s) => (
                    <SelectItem key={s.name} value={s.name}>
                      {s.label}
                    </SelectItem>
                  ))}
                </SelectGroup>
              ))}
            </SelectContent>
          </Select>
          <code className="hidden font-mono text-xs text-muted-foreground lg:inline">?screen={screen}</code>
          <p className="min-w-0 flex-1 truncate text-[13px] text-muted-foreground">{description}</p>
          <div className="flex items-center gap-1">
            <Toggle size="sm" variant="outline" pressed={busyFlag} onPressedChange={(on) => setFlag("busy", on)}>
              Busy
            </Toggle>
            <Toggle size="sm" variant="outline" pressed={errorFlag} onPressedChange={(on) => setFlag("error", on)}>
              Action error
            </Toggle>
            <Toggle
              size="sm"
              variant="outline"
              pressed={speakingFlag}
              onPressedChange={(on) => setFlag("speaking", on)}
            >
              Speaking
            </Toggle>
          </div>
        </div>
      </div>

      {screen === "kit" ? (
        <DesignKit />
      ) : screen === "home" || !fixture ? (
        <HomePage key="home" />
      ) : (
        <InterviewView
          key={screen}
          id={`preview-${screen}`}
          state={fixture.state}
          loadError={fixture.loadError ?? null}
          notFound={fixture.notFound ?? false}
          health={PREVIEW_HEALTH}
          tts={tts}
          busy={busyFlag || simBusy}
          actionError={errorFlag ? ACTION_ERROR : null}
          send={send}
          onRetry={retry}
          onClearActionError={() => setFlag("error", false)}
        />
      )}
    </>
  );
}
