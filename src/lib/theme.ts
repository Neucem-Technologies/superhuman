import { useEffect, useState } from "react";
import { periodOfDay, type DayPeriod } from "@/spine/format";

const KEY = "ls-theme";

export type ThemeMode = "auto" | DayPeriod;

export const THEME_MODES: { id: ThemeMode; label: string }[] = [
  { id: "auto", label: "Auto" },
  { id: "morning", label: "Morning" },
  { id: "afternoon", label: "Afternoon" },
  { id: "evening", label: "Evening" },
  { id: "night", label: "Night" },
];

const DEFAULT: ThemeMode = "auto";
const listeners = new Set<() => void>();

function clamp(id: string | null): ThemeMode {
  return THEME_MODES.some((m) => m.id === id) ? (id as ThemeMode) : DEFAULT;
}

export function readTheme(): ThemeMode {
  try {
    return clamp(localStorage.getItem(KEY));
  } catch {
    return DEFAULT;
  }
}

export function resolvePeriod(mode: ThemeMode): DayPeriod {
  return mode === "auto" ? periodOfDay() : mode;
}

export function applyTheme(mode: ThemeMode) {
  const n = clamp(mode);
  const root = document.documentElement;
  const period = resolvePeriod(n);
  root.dataset.theme = n;
  root.dataset.period = period;
  try {
    localStorage.setItem(KEY, n);
  } catch {
    /* ignore */
  }
  listeners.forEach((fn) => fn());
  return period;
}

export function useTheme() {
  const [mode, setMode] = useState<ThemeMode>(DEFAULT);
  const [period, setPeriod] = useState<DayPeriod>(periodOfDay);

  useEffect(() => {
    const sync = () => {
      const next = readTheme();
      setMode(next);
      setPeriod(resolvePeriod(next));
    };
    sync();
    applyTheme(readTheme());
    listeners.add(sync);
    const id = window.setInterval(() => {
      if (readTheme() === "auto") applyTheme("auto");
    }, 30_000);
    return () => {
      listeners.delete(sync);
      window.clearInterval(id);
    };
  }, []);

  function setTheme(next: ThemeMode) {
    applyTheme(next);
  }

  return { mode, period, setTheme };
}
