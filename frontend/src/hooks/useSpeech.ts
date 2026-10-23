import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { readLocal, writeLocal } from "../lib/storage";

/** A Kokoro voice offered by GET /api/tts/voices. */
export interface KokoroVoice {
  id: string;
  label: string;
}

// The voice endpoints are called from here (not ../api) so this hook has no other frontend dependency.
async function getJson<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`/api${path}`, { ...init, headers: { Accept: "application/json" } });
  if (!res.ok) throw new Error(`${path} failed (${res.status})`);
  return (await res.json()) as T;
}

const voiceApi = {
  health: () => getJson<{ tts?: { available?: boolean } }>("/health"),
  voices: () => getJson<KokoroVoice[]>("/tts/voices"),
  warmup: () => getJson<unknown>("/tts/warmup", { method: "POST" }),
  /** POST /api/tts -> WAV. Rejects with an AbortError when `signal` aborts. */
  synthesize: async (body: { text: string; voice: string; speed: number }, signal: AbortSignal): Promise<Blob> => {
    const res = await fetch("/api/tts", {
      method: "POST",
      headers: { Accept: "audio/wav", "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal,
    });
    if (!res.ok) throw new Error(`Voice request failed (${res.status})`);
    return res.blob();
  },
};

const MUTE_KEY = "interview-room:tts-muted";
const ENGINE_KEY = "interview-room:tts-engine";
const BROWSER_VOICE_KEY = "interview-room:tts-browser-voice";
const KOKORO_VOICE_KEY = "interview-room:tts-kokoro-voice";
const SPEED_KEY = "interview-room:tts-speed";
const VOICE_WAIT_MS = 1200;
const KOKORO_WAIT_MS = 4000;
const CHUNK_CHARS = 220;
const KOKORO_CHUNK_CHARS = 280;
const KOKORO_SHORT_CHARS = 32;
const NATURAL_VOICE = /natural|neural|online/i;

export const SPEED_MIN = 0.85;
export const SPEED_MAX = 1.15;
export const DEFAULT_KOKORO_VOICE = "af_heart";
export const PREVIEW_LINE = "Hi, thanks for making the time today. Let's start with a quick introduction about yourself.";

/** `auto`: an Edge "Natural" voice if the browser has one, else Kokoro if the server has it, else the best browser voice. */
export type SpeechEngine = "auto" | "browser" | "kokoro";
export type ActiveEngine = "browser" | "kokoro";

export interface SpeakItem {
  text: string;
  voice?: SpeechSynthesisVoice | null;
  pitch?: number;
  rate?: number;
  /** Who is talking. Distinct speakers get distinct Kokoro voices. */
  speaker?: string;
  onStart?: () => void;
  onEnd?: () => void;
}

export interface SpeakOptions {
  force?: boolean;
}

export interface Tts {
  supported: boolean;
  ready: boolean;
  muted: boolean;
  speaking: boolean;
  englishVoices: SpeechSynthesisVoice[];
  setMuted: (muted: boolean) => void;
  speak: (text: string, options?: SpeakOptions) => void;
  speakQueue: (items: SpeakItem[], options?: SpeakOptions) => void;
  cancel: () => void;
  /** The engine the user picked. */
  engine: SpeechEngine;
  /** The engine actually used right now (auto and unavailable Kokoro resolve to one of these). */
  activeEngine: ActiveEngine;
  setEngine: (engine: SpeechEngine) => void;
  kokoroAvailable: boolean;
  kokoroVoices: KokoroVoice[];
  /** Picked browser voice name; "" means automatic. */
  browserVoice: string;
  setBrowserVoice: (name: string) => void;
  kokoroVoice: string;
  setKokoroVoice: (id: string) => void;
  speed: number;
  setSpeed: (speed: number) => void;
  preview: () => void;
}

interface Chunk {
  item: SpeakItem;
  text: string;
  first: boolean;
  last: boolean;
}

interface KokoroInfo {
  available: boolean;
  voices: KokoroVoice[];
}

function voiceScore(voice: SpeechSynthesisVoice): number {
  const lang = voice.lang.toLowerCase().replace("_", "-");
  let score = 0;
  if (lang === "en-in") score += 4;
  else if (lang === "en-gb" || lang === "en-us") score += 2;
  if (NATURAL_VOICE.test(voice.name)) score += 3;
  if (/google/i.test(voice.name)) score += 1;
  return score;
}

function rankEnglishVoices(voices: SpeechSynthesisVoice[]): SpeechSynthesisVoice[] {
  return voices
    .filter((v) => v.lang.toLowerCase().startsWith("en"))
    .sort((a, b) => voiceScore(b) - voiceScore(a));
}

export function splitForSpeech(text: string): string[] {
  const clean = text.replace(/\s+/g, " ").trim();
  if (!clean) return [];
  const sentences = clean.match(/[^.!?]+[.!?]*\s*/g) ?? [clean];
  const chunks: string[] = [];
  let current = "";
  for (const sentence of sentences) {
    if (current && (current + sentence).length > CHUNK_CHARS) {
      chunks.push(current.trim());
      current = "";
    }
    current += sentence;
  }
  if (current.trim()) chunks.push(current.trim());
  return chunks;
}

function splitLong(sentence: string, maxChars: number): string[] {
  const parts: string[] = [];
  let rest = sentence;
  while (rest.length > maxChars) {
    const window = rest.slice(0, maxChars);
    let cut = Math.max(window.lastIndexOf(", "), window.lastIndexOf("; "), window.lastIndexOf(": "));
    if (cut < maxChars / 3) cut = window.lastIndexOf(" ");
    const end = cut > 0 ? cut + 1 : maxChars;
    parts.push(rest.slice(0, end).trim());
    rest = rest.slice(end).trim();
  }
  if (rest) parts.push(rest);
  return parts;
}

/** Sentence-sized pieces for the neural voice: short first chunk (fast start), tiny sentences merged. */
export function splitSentences(text: string, maxChars = KOKORO_CHUNK_CHARS): string[] {
  const clean = text.replace(/\s+/g, " ").trim();
  if (!clean) return [];
  const sentences = clean.split(/(?<=[.!?…]["'”’)\]]*)\s+(?=["'“‘(\[]?[A-Z0-9])/);
  const pieces = sentences.flatMap((s) => (s.length > maxChars ? splitLong(s, maxChars) : [s]));
  const out: string[] = [];
  for (const piece of pieces) {
    const prev = out[out.length - 1];
    if (prev !== undefined && prev.length < KOKORO_SHORT_CHARS && prev.length + 1 + piece.length <= maxChars) {
      out[out.length - 1] = `${prev} ${piece}`;
    } else {
      out.push(piece);
    }
  }
  return out;
}

function hashString(value: string): number {
  let h = 2166136261;
  for (let i = 0; i < value.length; i++) {
    h ^= value.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** Stable identity for a non-default speaker; null means "the interviewer" (the picked voice). */
function speakerKey(item: SpeakItem): string | null {
  if (item.speaker) return `s:${item.speaker}`;
  if (item.voice) return `v:${item.voice.name}|${item.pitch ?? 1}|${item.rate ?? 1}`;
  if (item.pitch !== undefined || item.rate !== undefined) return `p:${item.pitch ?? 1}|${item.rate ?? 1}`;
  return null;
}

function clampSpeed(value: number): number {
  if (!Number.isFinite(value)) return 1;
  return Math.round(Math.min(SPEED_MAX, Math.max(SPEED_MIN, value)) * 100) / 100;
}

function parseEngine(raw: string | null): SpeechEngine {
  return raw === "browser" || raw === "kokoro" ? raw : "auto";
}

function isAbort(e: unknown): boolean {
  return e instanceof DOMException && e.name === "AbortError";
}

let kokoroInfoPromise: Promise<KokoroInfo> | null = null;

/** Ask the backend once per page load whether Kokoro is usable, and which voices it has. */
function loadKokoroInfo(): Promise<KokoroInfo> {
  if (!kokoroInfoPromise) {
    kokoroInfoPromise = Promise.all([voiceApi.health(), voiceApi.voices().catch(() => [] as KokoroVoice[])])
      .then(([health, voices]) => ({ available: Boolean(health.tts?.available) && voices.length > 0, voices }))
      .catch(() => {
        kokoroInfoPromise = null;
        return { available: false, voices: [] };
      });
  }
  return kokoroInfoPromise;
}

let warmupRequested = false;

function warmKokoro(): void {
  if (warmupRequested) return;
  warmupRequested = true;
  voiceApi.warmup().catch(() => {
    warmupRequested = false;
  });
}

function resolveEngine(engine: SpeechEngine, kokoroAvailable: boolean, hasNatural: boolean): ActiveEngine {
  if (engine === "browser") return "browser";
  if (engine === "kokoro") return kokoroAvailable ? "kokoro" : "browser";
  if (hasNatural) return "browser";
  return kokoroAvailable ? "kokoro" : "browser";
}

function getSynth(): SpeechSynthesis | null {
  return typeof window !== "undefined" && "speechSynthesis" in window ? window.speechSynthesis : null;
}

export function useTts(): Tts {
  const synth = useMemo(getSynth, []);
  const [muted, setMutedState] = useState(() => readLocal(MUTE_KEY) === "1");
  const [speaking, setSpeaking] = useState(false);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [waited, setWaited] = useState(false);
  const [engine, setEngineState] = useState<SpeechEngine>(() => parseEngine(readLocal(ENGINE_KEY)));
  const [browserVoice, setBrowserVoiceState] = useState(() => readLocal(BROWSER_VOICE_KEY) ?? "");
  const [kokoroVoicePick, setKokoroVoicePick] = useState(() => readLocal(KOKORO_VOICE_KEY) || DEFAULT_KOKORO_VOICE);
  const [speed, setSpeedState] = useState(() => clampSpeed(Number(readLocal(SPEED_KEY) ?? "1")));
  const [kokoro, setKokoro] = useState<KokoroInfo | null>(null);
  const [kokoroWaited, setKokoroWaited] = useState(false);
  const [ready, setReady] = useState(false);

  const mutedRef = useRef(muted);
  const tokenRef = useRef(0);
  const englishVoices = useMemo(() => rankEnglishVoices(voices), [voices]);
  const defaultVoiceRef = useRef<SpeechSynthesisVoice | null>(null);
  const activeEngineRef = useRef<ActiveEngine>("browser");
  const kokoroVoiceRef = useRef(DEFAULT_KOKORO_VOICE);
  const kokoroVoicesRef = useRef<KokoroVoice[]>([]);
  const speedRef = useRef(speed);
  const speakerVoicesRef = useRef(new Map<string, string>());
  const abortRef = useRef<AbortController | null>(null);
  const stopAudioRef = useRef<(() => void) | null>(null);

  const kokoroAvailable = kokoro?.available ?? false;
  const kokoroVoices = useMemo(() => kokoro?.voices ?? [], [kokoro]);
  const kokoroVoice = kokoroVoices.some((v) => v.id === kokoroVoicePick)
    ? kokoroVoicePick
    : kokoroVoices.some((v) => v.id === DEFAULT_KOKORO_VOICE) || !kokoroVoices.length
      ? DEFAULT_KOKORO_VOICE
      : kokoroVoices[0].id;
  const hasNatural = englishVoices.some((v) => NATURAL_VOICE.test(v.name));
  const activeEngine = resolveEngine(engine, kokoroAvailable, hasNatural);

  useEffect(() => {
    defaultVoiceRef.current = englishVoices.find((v) => v.name === browserVoice) ?? englishVoices[0] ?? null;
  }, [englishVoices, browserVoice]);

  useEffect(() => {
    activeEngineRef.current = activeEngine;
    kokoroVoiceRef.current = kokoroVoice;
    kokoroVoicesRef.current = kokoroVoices;
  }, [activeEngine, kokoroVoice, kokoroVoices]);

  // Load the neural voice on the server as soon as it is the one we'll use, not on the first line.
  useEffect(() => {
    if (activeEngine === "kokoro") warmKokoro();
  }, [activeEngine]);

  useEffect(() => {
    if (!synth) return;
    const load = () => setVoices(synth.getVoices());
    load();
    synth.addEventListener("voiceschanged", load);
    const timer = window.setTimeout(() => setWaited(true), VOICE_WAIT_MS);
    return () => {
      synth.removeEventListener("voiceschanged", load);
      window.clearTimeout(timer);
      tokenRef.current += 1;
      synth.cancel();
    };
  }, [synth]);

  useEffect(() => {
    let alive = true;
    void loadKokoroInfo().then((info) => {
      if (alive) setKokoro(info);
    });
    const timer = window.setTimeout(() => setKokoroWaited(true), KOKORO_WAIT_MS);
    return () => {
      alive = false;
      window.clearTimeout(timer);
    };
  }, []);

  // Wait for the browser's voice list and, when Kokoro might be picked, for the server's answer
  // (bounded by KOKORO_WAIT_MS). Once ready, stay ready so mount-time speech never replays.
  const browserReady = !synth || voices.length > 0 || waited;
  const engineSettled = engine === "browser" || (engine === "auto" && hasNatural) || kokoro !== null || kokoroWaited;
  useEffect(() => {
    if (browserReady && engineSettled) setReady(true);
  }, [browserReady, engineSettled]);

  const stopKokoro = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    stopAudioRef.current?.();
  }, []);

  useEffect(
    () => () => {
      tokenRef.current += 1;
      stopKokoro();
    },
    [stopKokoro],
  );

  const speakBrowser = useCallback(
    (chunks: Chunk[], token: number) => {
      if (!synth) {
        setSpeaking(false);
        return;
      }
      const isCurrent = () => tokenRef.current === token;
      chunks.forEach((chunk, index) => {
        const utterance = new SpeechSynthesisUtterance(chunk.text);
        const voice = chunk.item.voice === undefined ? defaultVoiceRef.current : chunk.item.voice;
        if (voice) {
          utterance.voice = voice;
          utterance.lang = voice.lang;
        } else {
          utterance.lang = "en-IN";
        }
        utterance.rate = (chunk.item.rate ?? 1) * speedRef.current;
        utterance.pitch = chunk.item.pitch ?? 1;
        const onStart = chunk.item.onStart;
        if (chunk.first && onStart) {
          utterance.onstart = () => {
            if (isCurrent()) onStart();
          };
        }
        const finish = () => {
          if (!isCurrent()) return;
          if (chunk.last) chunk.item.onEnd?.();
          if (index === chunks.length - 1) setSpeaking(false);
        };
        utterance.onend = finish;
        utterance.onerror = finish;
        synth.speak(utterance);
      });
    },
    [synth],
  );

  const kokoroVoiceFor = useCallback((item: SpeakItem): string => {
    const main = kokoroVoiceRef.current;
    const key = speakerKey(item);
    if (!key) return main;
    const assigned = speakerVoicesRef.current;
    const known = assigned.get(key);
    if (known) return known;
    const pool = kokoroVoicesRef.current.map((v) => v.id).filter((id) => id !== main);
    if (!pool.length) return main;
    const used = new Set(assigned.values());
    const start = hashString(key) % pool.length;
    let pick = pool[start];
    for (let i = 0; i < pool.length; i++) {
      const candidate = pool[(start + i) % pool.length];
      if (!used.has(candidate)) {
        pick = candidate;
        break;
      }
    }
    assigned.set(key, pick);
    return pick;
  }, []);

  const playBlob = useCallback((blob: Blob, onStart: () => void): Promise<void> => {
    return new Promise((resolve) => {
      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);
      let started = false;
      let done = false;
      const finish = () => {
        if (done) return;
        done = true;
        audio.onplaying = null;
        audio.onended = null;
        audio.onerror = null;
        audio.pause();
        audio.removeAttribute("src");
        audio.load();
        URL.revokeObjectURL(url);
        if (stopAudioRef.current === finish) stopAudioRef.current = null;
        resolve();
      };
      stopAudioRef.current = finish;
      audio.onplaying = () => {
        if (started || done) return;
        started = true;
        onStart();
      };
      audio.onended = finish;
      audio.onerror = finish;
      audio.play().catch(finish);
    });
  }, []);

  const speakKokoro = useCallback(
    (chunks: Chunk[], token: number) => {
      const controller = new AbortController();
      abortRef.current = controller;
      const isCurrent = () => tokenRef.current === token;
      const fetchChunk = (chunk: Chunk) => {
        const speedFactor = Math.min(2, Math.max(0.5, (chunk.item.rate ?? 1) * speedRef.current));
        return voiceApi.synthesize(
          { text: chunk.text, voice: kokoroVoiceFor(chunk.item), speed: Math.round(speedFactor * 100) / 100 },
          controller.signal,
        );
      };

      void (async () => {
        let pending: Promise<Blob> | null = fetchChunk(chunks[0]);
        for (let i = 0; i < chunks.length; i++) {
          const chunk = chunks[i];
          let blob: Blob;
          try {
            blob = await (pending as Promise<Blob>);
          } catch (e) {
            if (!isCurrent() || isAbort(e)) return;
            // The voice server failed (busy, unloaded, unreachable): finish this queue in the browser voice.
            controller.abort();
            if (abortRef.current === controller) abortRef.current = null;
            speakBrowser(chunks.slice(i), token);
            return;
          }
          if (!isCurrent()) return;
          // Prefetch the next sentence while this one plays.
          pending = i + 1 < chunks.length ? fetchChunk(chunks[i + 1]) : null;
          pending?.catch(() => undefined);
          await playBlob(blob, () => {
            if (isCurrent() && chunk.first) chunk.item.onStart?.();
          });
          if (!isCurrent()) return;
          if (chunk.last) chunk.item.onEnd?.();
        }
        if (isCurrent()) {
          if (abortRef.current === controller) abortRef.current = null;
          setSpeaking(false);
        }
      })();
    },
    [kokoroVoiceFor, playBlob, speakBrowser],
  );

  const cancel = useCallback(() => {
    tokenRef.current += 1;
    synth?.cancel();
    stopKokoro();
    setSpeaking(false);
  }, [synth, stopKokoro]);

  const speakQueue = useCallback(
    (items: SpeakItem[], options: SpeakOptions = {}) => {
      if (mutedRef.current && !options.force) return;
      const useKokoro = activeEngineRef.current === "kokoro";
      if (!useKokoro && !synth) return;
      const token = ++tokenRef.current;
      synth?.cancel();
      stopKokoro();

      const split = useKokoro ? splitSentences : splitForSpeech;
      const chunks: Chunk[] = items.flatMap((item) =>
        split(item.text).map((text, i, all) => ({ item, text, first: i === 0, last: i === all.length - 1 })),
      );
      if (!chunks.length) {
        setSpeaking(false);
        return;
      }

      setSpeaking(true);
      if (useKokoro) speakKokoro(chunks, token);
      else speakBrowser(chunks, token);
    },
    [synth, stopKokoro, speakKokoro, speakBrowser],
  );

  const speak = useCallback(
    (text: string, options?: SpeakOptions) => speakQueue([{ text }], options),
    [speakQueue],
  );

  const preview = useCallback(() => speakQueue([{ text: PREVIEW_LINE }], { force: true }), [speakQueue]);

  const setMuted = useCallback(
    (next: boolean) => {
      mutedRef.current = next;
      setMutedState(next);
      writeLocal(MUTE_KEY, next ? "1" : "0");
      if (next) cancel();
    },
    [cancel],
  );

  const setEngine = useCallback(
    (next: SpeechEngine) => {
      cancel();
      setEngineState(next);
      writeLocal(ENGINE_KEY, next);
    },
    [cancel],
  );

  const setBrowserVoice = useCallback(
    (name: string) => {
      setBrowserVoiceState(name);
      writeLocal(BROWSER_VOICE_KEY, name);
      const list = rankEnglishVoices(synth?.getVoices() ?? []);
      defaultVoiceRef.current = list.find((v) => v.name === name) ?? list[0] ?? null;
    },
    [synth],
  );

  const setKokoroVoice = useCallback((id: string) => {
    setKokoroVoicePick(id);
    writeLocal(KOKORO_VOICE_KEY, id);
    kokoroVoiceRef.current = id;
    speakerVoicesRef.current.clear();
  }, []);

  const setSpeed = useCallback((value: number) => {
    const next = clampSpeed(value);
    speedRef.current = next;
    setSpeedState(next);
    writeLocal(SPEED_KEY, String(next));
  }, []);

  return {
    supported: synth !== null || kokoroAvailable,
    ready,
    muted,
    speaking,
    englishVoices,
    setMuted,
    speak,
    speakQueue,
    cancel,
    engine,
    activeEngine,
    setEngine,
    kokoroAvailable,
    kokoroVoices,
    browserVoice,
    setBrowserVoice,
    kokoroVoice,
    setKokoroVoice,
    speed,
    setSpeed,
    preview,
  };
}

export function useSpeakOnMount(tts: Tts, build: () => SpeakItem[]): void {
  const buildRef = useRef(build);
  const { ready, speakQueue, cancel } = tts;

  useEffect(() => {
    buildRef.current = build;
  });

  useEffect(() => {
    if (!ready) return;
    const items = buildRef.current().filter((item) => item.text.trim());
    if (!items.length) return;
    speakQueue(items);
    return cancel;
  }, [ready, speakQueue, cancel]);
}

interface RecognitionAlternative {
  transcript: string;
}

interface RecognitionResult {
  readonly isFinal: boolean;
  readonly length: number;
  [index: number]: RecognitionAlternative;
}

interface RecognitionEvent {
  resultIndex: number;
  results: { readonly length: number; [index: number]: RecognitionResult };
}

interface RecognitionErrorEvent {
  error: string;
}

interface Recognition {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: ((event: RecognitionEvent) => void) | null;
  onerror: ((event: RecognitionErrorEvent) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
  abort: () => void;
}

type RecognitionConstructor = new () => Recognition;

function getRecognitionConstructor(): RecognitionConstructor | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as {
    SpeechRecognition?: RecognitionConstructor;
    webkitSpeechRecognition?: RecognitionConstructor;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

function recognitionErrorMessage(code: string): string {
  switch (code) {
    case "not-allowed":
    case "service-not-allowed":
      return "Microphone access is blocked. Allow it in the browser's site settings, or type your answer.";
    case "audio-capture":
      return "No microphone was found. Check your input device, or type your answer.";
    case "network":
      return "Voice recognition needs a network connection. Type your answer instead.";
    default:
      return `Voice input stopped (${code}). You can start it again or type.`;
  }
}

export interface SpeechInput {
  supported: boolean;
  listening: boolean;
  interim: string;
  error: string | null;
  start: () => void;
  stop: () => void;
}

export function useSpeechRecognition(onFinal: (text: string) => void, lang = "en-IN"): SpeechInput {
  const Ctor = useMemo(getRecognitionConstructor, []);
  const [listening, setListening] = useState(false);
  const [interim, setInterim] = useState("");
  const [error, setError] = useState<string | null>(null);
  const recRef = useRef<Recognition | null>(null);
  const wantRef = useRef(false);
  const onFinalRef = useRef(onFinal);

  useEffect(() => {
    onFinalRef.current = onFinal;
  });

  const stop = useCallback(() => {
    wantRef.current = false;
    recRef.current?.stop();
    setListening(false);
    setInterim("");
  }, []);

  const start = useCallback(() => {
    if (!Ctor || wantRef.current) return;
    setError(null);
    const rec = new Ctor();
    rec.continuous = true;
    rec.interimResults = true;
    rec.lang = lang;

    rec.onresult = (event) => {
      let finalText = "";
      let interimText = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        const transcript = result[0]?.transcript ?? "";
        if (result.isFinal) finalText += transcript;
        else interimText += transcript;
      }
      if (finalText.trim()) onFinalRef.current(finalText.trim());
      setInterim(interimText);
    };

    rec.onerror = (event) => {
      if (event.error === "no-speech" || event.error === "aborted") return;
      wantRef.current = false;
      setError(recognitionErrorMessage(event.error));
    };

    rec.onend = () => {
      if (recRef.current !== rec) return;
      if (wantRef.current) {
        try {
          rec.start();
          return;
        } catch {
          wantRef.current = false;
        }
      }
      recRef.current = null;
      setListening(false);
      setInterim("");
    };

    recRef.current = rec;
    wantRef.current = true;
    try {
      rec.start();
      setListening(true);
    } catch {
      wantRef.current = false;
      recRef.current = null;
      setError("Couldn't start the microphone. Type your answer instead.");
    }
  }, [Ctor, lang]);

  useEffect(
    () => () => {
      wantRef.current = false;
      const rec = recRef.current;
      recRef.current = null;
      if (rec) {
        rec.onresult = null;
        rec.onerror = null;
        rec.onend = null;
        rec.abort();
      }
    },
    [],
  );

  return { supported: Ctor !== null, listening, interim, error, start, stop };
}
