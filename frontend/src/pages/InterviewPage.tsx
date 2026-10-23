import { useCallback, useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { ApiError, api, errorMessage } from "../api";
import { useHealth } from "../hooks/useHealth";
import { useTts } from "../hooks/useSpeech";
import type { InterviewEvent, InterviewState } from "../types";
import { InterviewView } from "./InterviewView";

const POLL_MS = 1500;
const RETRY_MS = 3000;

/** Data container: polls the interview, sends events, and hands everything to the presentational InterviewView. */
export function InterviewPage() {
  const { id = "" } = useParams<{ id: string }>();
  const tts = useTts();
  const { health } = useHealth();
  const [state, setState] = useState<InterviewState | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [pollNonce, setPollNonce] = useState(0);
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const busyRef = useRef(false);

  useEffect(() => {
    let cancelled = false;
    let timer: number | undefined;
    const controller = new AbortController();

    const tick = async () => {
      try {
        const next = await api.getInterview(id, controller.signal);
        if (cancelled) return;
        setState(next);
        setLoadError(null);
        if (next.status === "thinking") timer = window.setTimeout(tick, POLL_MS);
      } catch (e) {
        if (cancelled) return;
        if (e instanceof ApiError && e.status === 404) {
          setNotFound(true);
          return;
        }
        setLoadError(errorMessage(e));
        timer = window.setTimeout(tick, RETRY_MS);
      }
    };

    void tick();
    return () => {
      cancelled = true;
      controller.abort();
      window.clearTimeout(timer);
    };
  }, [id, pollNonce]);

  const resumePolling = useCallback(() => {
    setState((s) =>
      s ? { ...s, status: "thinking", error: null, progress: [], thinking_since: new Date().toISOString() } : s,
    );
    setPollNonce((n) => n + 1);
  }, []);

  const run = useCallback(
    async (action: () => Promise<unknown>): Promise<boolean> => {
      if (busyRef.current) return false;
      busyRef.current = true;
      setBusy(true);
      setActionError(null);
      try {
        await action();
        resumePolling();
        return true;
      } catch (e) {
        if (e instanceof ApiError && e.status === 409) {
          setActionError("The interviewer is still working on the previous step — try again in a moment.");
          setPollNonce((n) => n + 1);
        } else {
          setActionError(errorMessage(e));
        }
        return false;
      } finally {
        busyRef.current = false;
        setBusy(false);
      }
    },
    [resumePolling],
  );

  const send = useCallback((event: InterviewEvent) => run(() => api.sendEvent(id, event)), [id, run]);
  const retry = useCallback(() => void run(() => api.retry(id)), [id, run]);
  const clearActionError = useCallback(() => setActionError(null), []);

  const stepIdentity = state ? `${state.status}:${state.transcript.length}:${state.step?.action ?? ""}` : "";
  useEffect(() => {
    setActionError(null);
  }, [stepIdentity]);

  return (
    <InterviewView
      id={id}
      state={state}
      loadError={loadError}
      notFound={notFound}
      health={health}
      tts={tts}
      busy={busy}
      actionError={actionError}
      send={send}
      onRetry={retry}
      onClearActionError={clearActionError}
    />
  );
}
