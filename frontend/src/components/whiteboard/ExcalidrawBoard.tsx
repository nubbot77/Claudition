import { useEffect, useMemo, useRef } from "react";
import { Excalidraw } from "@excalidraw/excalidraw";
import "@excalidraw/excalidraw/index.css";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import { boardSignature, type BoardElement } from "./board";

export interface BoardProps {
  /** sessionStorage key: the drawing survives reloads for the rest of the round */
  storageKey: string;
  onChange: (elements: readonly BoardElement[], signature: string) => void;
}

const SAVE_DELAY_MS = 400;

function load(key: string): BoardElement[] {
  try {
    const raw = window.sessionStorage.getItem(key);
    return raw ? (JSON.parse(raw) as BoardElement[]) : [];
  } catch {
    return [];
  }
}

function save(key: string, elements: readonly BoardElement[]): void {
  try {
    window.sessionStorage.setItem(key, JSON.stringify(elements));
  } catch {
    return; // quota or privacy mode: the board still works, it just won't survive a reload
  }
}

/** Excalidraw canvas (MIT). Loaded lazily: the library is large and only system design rounds need it. */
export default function ExcalidrawBoard({ storageKey, onChange }: BoardProps) {
  const dark = useMediaQuery("(prefers-color-scheme: dark)");
  const initial = useMemo(() => load(storageKey), [storageKey]);
  const saveTimer = useRef<number | undefined>(undefined);
  const lastSignature = useRef(boardSignature(initial));

  useEffect(() => {
    onChange(initial, lastSignature.current);
    return () => window.clearTimeout(saveTimer.current);
  }, [initial, onChange]);

  return (
    <Excalidraw
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Excalidraw's element types aren't exported from a stable path
      initialData={{ elements: initial as any, scrollToContent: initial.length > 0 }}
      theme={dark ? "dark" : "light"}
      onChange={(elements: readonly unknown[]) => {
        const list = elements as readonly BoardElement[];
        const signature = boardSignature(list);
        if (signature === lastSignature.current) return; // selection, scroll and zoom changes
        lastSignature.current = signature;
        onChange(list, signature);
        window.clearTimeout(saveTimer.current);
        saveTimer.current = window.setTimeout(() => save(storageKey, list), SAVE_DELAY_MS);
      }}
      UIOptions={{
        canvasActions: {
          loadScene: false,
          saveToActiveFile: false,
          export: false,
          toggleTheme: false,
          changeViewBackgroundColor: false,
        },
      }}
    />
  );
}
