import type {
  CodeRunRequest,
  CodeRunResult,
  Health,
  InterviewEvent,
  InterviewProfile,
  InterviewState,
  InterviewSummary,
  KokoroVoice,
  TtsRequest,
  TtsStatus,
} from "./types";

export class ApiError extends Error {
  readonly status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

function detailText(body: unknown): string | null {
  if (!body || typeof body !== "object") return null;
  const detail = (body as { detail?: unknown }).detail;
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail)) {
    return detail
      .map((d) => (d && typeof d === "object" && "msg" in d ? String((d as { msg: unknown }).msg) : String(d)))
      .join("; ");
  }
  if (detail != null) return JSON.stringify(detail);
  return null;
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`/api${path}`, {
      ...init,
      headers: init.body
        ? { Accept: "application/json", "Content-Type": "application/json" }
        : { Accept: "application/json" },
    });
  } catch (e) {
    if (e instanceof DOMException && e.name === "AbortError") throw e;
    throw new ApiError(0, "Can't reach the interview server. Is the backend running on port 8000?");
  }

  const raw = await res.text();
  let body: unknown = null;
  if (raw) {
    try {
      body = JSON.parse(raw);
    } catch {
      body = null;
    }
  }

  if (!res.ok) {
    const detail = detailText(body);
    if (detail) throw new ApiError(res.status, detail);
    if (res.status >= 500) {
      throw new ApiError(res.status, `Server error (${res.status}). Check that the backend on port 8000 is running.`);
    }
    throw new ApiError(res.status, `Request failed (${res.status} ${res.statusText})`);
  }
  return body as T;
}

const post = (data?: unknown): RequestInit => ({
  method: "POST",
  body: data === undefined ? undefined : JSON.stringify(data),
});

const enc = encodeURIComponent;

export const api = {
  health: () => request<Health>("/health"),
  listInterviews: () => request<InterviewSummary[]>("/interviews"),
  createInterview: (profile: InterviewProfile) => request<{ id: string }>("/interviews", post(profile)),
  getInterview: (id: string, signal?: AbortSignal) => request<InterviewState>(`/interviews/${enc(id)}`, { signal }),
  sendEvent: (id: string, event: InterviewEvent) =>
    request<{ status: string }>(`/interviews/${enc(id)}/events`, post(event)),
  retry: (id: string) => request<unknown>(`/interviews/${enc(id)}/retry`, post()),
  runCode: (body: CodeRunRequest) => request<CodeRunResult>("/code/run", post(body)),
  parseResume: (filename: string, data_base64: string) =>
    request<{ text: string; chars: number }>("/resume/parse", post({ filename, data_base64 })),
  ttsVoices: (signal?: AbortSignal) => request<KokoroVoice[]>("/tts/voices", { signal }),
  ttsWarmup: () => request<TtsStatus>("/tts/warmup", post()),
  synthesize,
};

/** POST /api/tts and return the WAV audio. Rejects with AbortError when `signal` aborts. */
async function synthesize(body: TtsRequest, signal?: AbortSignal): Promise<Blob> {
  let res: Response;
  try {
    res = await fetch("/api/tts", {
      method: "POST",
      headers: { Accept: "audio/wav", "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal,
    });
  } catch (e) {
    if (e instanceof DOMException && e.name === "AbortError") throw e;
    throw new ApiError(0, "Can't reach the voice server.");
  }
  if (!res.ok) {
    let detail: string | null = null;
    try {
      detail = detailText(JSON.parse(await res.text()));
    } catch {
      detail = null;
    }
    throw new ApiError(res.status, detail ?? `Voice request failed (${res.status})`);
  }
  return res.blob();
}

export function errorMessage(e: unknown): string {
  if (e instanceof Error) return e.message;
  return String(e);
}
