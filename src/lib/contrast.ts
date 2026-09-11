import { useEffect, useState } from "react";

const KEY = "sh-contrast";

export function contrastIsHigh(): boolean {
  try {
    const stored = localStorage.getItem(KEY);
    if (stored === "high") return true;
    if (stored === "normal") return false;
  } catch {
    /* ignore */
  }
  return false;
}

export function applyContrast(high: boolean) {
  const root = document.documentElement;
  root.dataset.contrast = high ? "high" : "normal";
  try {
    localStorage.setItem(KEY, high ? "high" : "normal");
  } catch {
    /* ignore */
  }
}

export function useContrast() {
  const [high, setHigh] = useState(false);

  useEffect(() => {
    const on = contrastIsHigh();
    setHigh(on);
    applyContrast(on);
  }, []);

  function toggle() {
    setHigh((prev) => {
      const next = !prev;
      applyContrast(next);
      return next;
    });
  }

  return { high, toggle };
}
