import Editor, { loader, type BeforeMount, type OnMount } from "@monaco-editor/react";
import { TriangleAlert } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useMediaQuery } from "../hooks/useMediaQuery";

type LoadState = "loading" | "slow" | "ready" | "failed";

interface Props {
  language: string;
  value: string;
  label: string;
  onChange: (value: string) => void;
  wordWrap?: boolean;
  /** Ctrl/Cmd+Enter inside the editor. */
  onRun?: () => void;
}

const SLOW_MS = 10000;
const MONO = "'JetBrains Mono Variable', 'JetBrains Mono', ui-monospace, 'Cascadia Code', Consolas, monospace";

/** Monaco themes that sit on the app's card surface (white / slate-900) with slate gutters and a blue caret. */
const defineThemes: BeforeMount = (monaco) => {
  monaco.editor.defineTheme("assess-light", {
    base: "vs",
    inherit: true,
    rules: [],
    colors: {
      "editor.background": "#ffffff",
      "editorGutter.background": "#ffffff",
      "editor.lineHighlightBackground": "#f8fafc",
      "editor.lineHighlightBorder": "#00000000",
      "editorLineNumber.foreground": "#94a3b8",
      "editorLineNumber.activeForeground": "#0f172a",
      "editorCursor.foreground": "#2563eb",
      "editor.selectionBackground": "#2563eb2e",
      "editor.inactiveSelectionBackground": "#2563eb1a",
      "editorIndentGuide.background1": "#e2e8f0",
      "editorIndentGuide.activeBackground1": "#cbd5e1",
      "editorWidget.background": "#ffffff",
      "editorWidget.border": "#e2e8f0",
      "editorSuggestWidget.selectedBackground": "#eff6ff",
      "scrollbarSlider.background": "#94a3b833",
      "scrollbarSlider.hoverBackground": "#94a3b855",
      "focusBorder": "#00000000",
    },
  });
  monaco.editor.defineTheme("assess-dark", {
    base: "vs-dark",
    inherit: true,
    rules: [],
    colors: {
      "editor.background": "#0f172a",
      "editorGutter.background": "#0f172a",
      "editor.lineHighlightBackground": "#1e293b80",
      "editor.lineHighlightBorder": "#00000000",
      "editorLineNumber.foreground": "#475569",
      "editorLineNumber.activeForeground": "#e2e8f0",
      "editorCursor.foreground": "#60a5fa",
      "editor.selectionBackground": "#3b82f640",
      "editor.inactiveSelectionBackground": "#3b82f626",
      "editorIndentGuide.background1": "#1e293b",
      "editorIndentGuide.activeBackground1": "#334155",
      "editorWidget.background": "#0f172a",
      "editorWidget.border": "#1e293b",
      "editorSuggestWidget.selectedBackground": "#172554",
      "scrollbarSlider.background": "#64748b33",
      "scrollbarSlider.hoverBackground": "#64748b55",
      "focusBorder": "#00000000",
    },
  });
};

function EditorSkeleton({ slow, onPlain }: { slow: boolean; onPlain: () => void }) {
  return (
    <div className="flex size-full flex-col gap-3 bg-card p-4" role="status">
      <span className="sr-only">Loading editor</span>
      {[62, 48, 75, 30, 56, 40].map((w, i) => (
        <Skeleton key={i} className="h-3.5" style={{ width: `${w}%` }} />
      ))}
      {slow && (
        <div className="mt-2 flex flex-wrap items-center gap-3 text-[13px] text-muted-foreground">
          The editor is taking a while to load.
          <Button size="xs" variant="outline" onClick={onPlain}>
            Use a plain editor
          </Button>
        </div>
      )}
    </div>
  );
}

export function CodeEditor({ language, value, label, onChange, wordWrap = false, onRun }: Props) {
  const dark = useMediaQuery("(prefers-color-scheme: dark)");
  const narrow = useMediaQuery("(max-width: 639px)");
  const [load, setLoad] = useState<LoadState>("loading");
  const [plain, setPlain] = useState(false);
  const onRunRef = useRef(onRun);

  useEffect(() => {
    onRunRef.current = onRun;
  });

  useEffect(() => {
    const init = loader.init();
    init
      .then(() => setLoad("ready"))
      .catch((e: unknown) => {
        if ((e as { type?: string } | null)?.type !== "cancelation") setLoad("failed");
      });
    const timer = window.setTimeout(() => setLoad((s) => (s === "loading" ? "slow" : s)), SLOW_MS);
    return () => {
      init.cancel();
      window.clearTimeout(timer);
    };
  }, []);

  const handleMount: OnMount = (editor, monaco) => {
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter, () => onRunRef.current?.());
    // JetBrains Mono is a web font: re-measure once it's ready so the caret lines up with the glyphs.
    document.fonts?.ready.then(() => monaco.editor.remeasureFonts()).catch(() => undefined);
  };

  if (plain || load === "failed") {
    return (
      <div className="flex size-full min-w-0 flex-col bg-card">
        {load === "failed" && (
          <p className="flex items-center gap-2 border-b border-warning/30 bg-warning-soft px-3 py-2 text-[13px] text-warning-soft-foreground">
            <TriangleAlert className="size-3.5 shrink-0" aria-hidden="true" />
            The code editor couldn't load (offline?). You're using a plain editor.
          </p>
        )}
        <textarea
          className="block min-h-0 w-full flex-1 resize-none bg-card p-4 font-mono text-[13px] leading-[22px] text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset"
          value={value}
          spellCheck={false}
          autoCapitalize="off"
          autoCorrect="off"
          wrap={wordWrap ? "soft" : "off"}
          aria-label={label}
          onChange={(e) => onChange(e.target.value)}
        />
      </div>
    );
  }

  return (
    <Editor
      height="100%"
      width="100%"
      language={language}
      value={value}
      theme={dark ? "assess-dark" : "assess-light"}
      beforeMount={defineThemes}
      onMount={handleMount}
      onChange={(v) => onChange(v ?? "")}
      loading={<EditorSkeleton slow={load === "slow"} onPlain={() => setPlain(true)} />}
      options={{
        minimap: { enabled: false },
        fontSize: narrow ? 13 : 14,
        lineHeight: narrow ? 20 : 22,
        fontFamily: MONO,
        fontLigatures: false,
        wordWrap: wordWrap ? "on" : "off",
        scrollBeyondLastLine: false,
        automaticLayout: true,
        tabSize: 4,
        padding: { top: 12, bottom: 12 },
        lineNumbersMinChars: narrow ? 2 : 3,
        lineDecorationsWidth: narrow ? 6 : 10,
        glyphMargin: false,
        folding: !narrow,
        renderLineHighlight: "line",
        overviewRulerLanes: 0,
        overviewRulerBorder: false,
        hideCursorInOverviewRuler: true,
        bracketPairColorization: { enabled: false },
        guides: { indentation: true, bracketPairs: false },
        stickyScroll: { enabled: false },
        scrollbar: { verticalScrollbarSize: 10, horizontalScrollbarSize: 10, useShadows: false },
        fixedOverflowWidgets: true,
        ariaLabel: label,
      }}
    />
  );
}
