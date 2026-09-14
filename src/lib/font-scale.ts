import { useEffect, useState } from "react";

const KEY = "ls-font-scale";

export const FONT_SCALE_STEPS = [90, 100, 115, 130] as const;
export type FontScale = (typeof FONT_SCALE_STEPS)[number];
const DEFAULT: FontScale = 100;
const listeners = new Set<() => void>();

function clamp(n: number): FontScale {
  return (FONT_SCALE_STEPS as readonly number[]).includes(n) ? (n as FontScale) : DEFAULT;
}

export function readFontScale(): FontScale {
  try {
    const stored = Number(localStorage.getItem(KEY));
    if (Number.isFinite(stored)) return clamp(stored);
  } catch {
    /* ignore */
  }
  return DEFAULT;
}

export function applyFontScale(pct: FontScale) {
  const n = clamp(pct);
  const root = document.documentElement;
  root.style.setProperty("--font-scale", String(n / 100));
  root.dataset.fontScale = String(n);
  try {
    localStorage.setItem(KEY, String(n));
  } catch {
    /* ignore */
  }
  listeners.forEach((fn) => fn());
}

export function useFontScale() {
  const [pct, setPct] = useState<FontScale>(DEFAULT);

  useEffect(() => {
    const sync = () => setPct(readFontScale());
    sync();
    applyFontScale(readFontScale());
    listeners.add(sync);
    return () => {
      listeners.delete(sync);
    };
  }, []);

  function setScale(next: FontScale) {
    applyFontScale(next);
  }

  return { pct, setScale };
}
