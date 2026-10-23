import { useEffect, useState, type Dispatch, type SetStateAction } from "react";
import { readLocal, writeLocal } from "../../lib/storage";

/** useState mirrored to localStorage (JSON). Falls back to `initial` when storage is unavailable or corrupt. */
export function useLocalState<T>(key: string, initial: T): [T, Dispatch<SetStateAction<T>>] {
  const [value, setValue] = useState<T>(() => {
    const raw = readLocal(key);
    if (raw == null) return initial;
    try {
      return JSON.parse(raw) as T;
    } catch {
      return initial;
    }
  });

  useEffect(() => {
    writeLocal(key, JSON.stringify(value));
  }, [key, value]);

  return [value, setValue];
}

/** Short, stable hash for building storage keys from report content. */
export function hashText(text: string): string {
  let h = 5381;
  for (let i = 0; i < text.length; i++) h = ((h << 5) + h + text.charCodeAt(i)) | 0;
  return (h >>> 0).toString(36);
}
