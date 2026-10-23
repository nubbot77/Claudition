import { useEffect, useMemo, useState, type Dispatch, type SetStateAction } from "react";

export function readLocal(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

export function writeLocal(key: string, value: string): void {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    return;
  }
}

export function removeLocal(key: string): void {
  try {
    window.localStorage.removeItem(key);
  } catch {
    return;
  }
}

function readSession(key: string): string | null {
  try {
    return window.sessionStorage.getItem(key);
  } catch {
    return null;
  }
}

function writeSession(key: string, value: string): void {
  try {
    window.sessionStorage.setItem(key, value);
  } catch {
    return;
  }
}

export function useSessionState<T>(key: string, initial: T | (() => T)): [T, Dispatch<SetStateAction<T>>] {
  const [value, setValue] = useState<T>(() => {
    const raw = readSession(key);
    if (raw != null) {
      try {
        return JSON.parse(raw) as T;
      } catch {
        return typeof initial === "function" ? (initial as () => T)() : initial;
      }
    }
    return typeof initial === "function" ? (initial as () => T)() : initial;
  });

  useEffect(() => {
    writeSession(key, JSON.stringify(value));
  }, [key, value]);

  return [value, setValue];
}

export function useStartTime(key: string): number {
  return useMemo(() => {
    const stored = Number(readSession(key));
    if (Number.isFinite(stored) && stored > 0) return stored;
    const now = Date.now();
    writeSession(key, String(now));
    return now;
  }, [key]);
}
