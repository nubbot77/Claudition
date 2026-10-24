import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { readLocal, writeLocal } from "./storage";

export type ThemePreference = "light" | "dark" | "system";
export const THEME_KEY = "claudition-theme";

const MEDIA = "(prefers-color-scheme: dark)";

interface ThemeState {
  preference: ThemePreference;
  /** what is on screen right now */
  resolved: "light" | "dark";
  setPreference: (preference: ThemePreference) => void;
}

const ThemeContext = createContext<ThemeState>({ preference: "system", resolved: "light", setPreference: () => {} });

function stored(): ThemePreference {
  // ?theme=light|dark forces a theme for this page load only (screenshots, sharing a link); not saved
  const forced = new URLSearchParams(window.location.search).get("theme");
  if (forced === "light" || forced === "dark") return forced;
  const value = readLocal(THEME_KEY);
  return value === "light" || value === "dark" ? value : "system";
}

function systemDark(): boolean {
  return window.matchMedia(MEDIA).matches;
}

/** Applies the `.dark` class on <html>. index.html runs the same logic before first paint, so there is no flash. */
export function ThemeProvider({ children }: { children: ReactNode }) {
  const [preference, setPref] = useState<ThemePreference>(stored);
  const [osDark, setOsDark] = useState(systemDark);

  useEffect(() => {
    const mql = window.matchMedia(MEDIA);
    const update = () => setOsDark(mql.matches);
    mql.addEventListener("change", update);
    return () => mql.removeEventListener("change", update);
  }, []);

  const resolved = preference === "system" ? (osDark ? "dark" : "light") : preference;

  useEffect(() => {
    const root = document.documentElement;
    // suppress transitions for the one frame the palette swaps, so borders and backgrounds don't animate
    root.classList.add("theme-switching");
    root.classList.toggle("dark", resolved === "dark");
    root.style.colorScheme = resolved;
    const id = window.setTimeout(() => root.classList.remove("theme-switching"), 50);
    return () => window.clearTimeout(id);
  }, [resolved]);

  const setPreference = useCallback((next: ThemePreference) => {
    setPref(next);
    writeLocal(THEME_KEY, next);
  }, []);

  const value = useMemo(() => ({ preference, resolved, setPreference }), [preference, resolved, setPreference]);
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeState {
  return useContext(ThemeContext);
}
