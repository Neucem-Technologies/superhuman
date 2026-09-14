import { createContext, useContext, useMemo, useState, type ReactNode } from "react";

const FONT_STEPS = [90, 100, 115, 130] as const;
const FILL_STEPS = [20, 30, 40, 50, 70] as const;

type Display = {
  fontPct: number;
  fillPct: number;
  high: boolean;
  setFont: (n: number) => void;
  setFill: (n: number) => void;
  toggleHigh: () => void;
};

const Ctx = createContext<Display | null>(null);

function readNum(key: string, fallback: number, steps: readonly number[]) {
  try {
    const n = Number(localStorage.getItem(key));
    if (steps.includes(n)) return n;
  } catch {
    /* ignore */
  }
  return fallback;
}

export function DisplayProvider({ children }: { children: ReactNode }) {
  const [fontPct, setFontPct] = useState(() => readNum("ls-font-scale", 100, FONT_STEPS));
  const [fillPct, setFillPct] = useState(() => readNum("ls-tile-fill", 30, FILL_STEPS));
  const [high, setHigh] = useState(() => {
    try {
      return localStorage.getItem("ls-contrast") === "1";
    } catch {
      return false;
    }
  });
  const value = useMemo<Display>(
    () => ({
      fontPct,
      fillPct,
      high,
      setFont: (n) => {
        setFontPct(n);
        try {
          localStorage.setItem("ls-font-scale", String(n));
        } catch {
          /* ignore */
        }
      },
      setFill: (n) => {
        setFillPct(n);
        try {
          localStorage.setItem("ls-tile-fill", String(n));
        } catch {
          /* ignore */
        }
      },
      toggleHigh: () => {
        setHigh((h) => {
          const next = !h;
          try {
            localStorage.setItem("ls-contrast", next ? "1" : "0");
          } catch {
            /* ignore */
          }
          return next;
        });
      },
    }),
    [fontPct, fillPct, high],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useDisplay() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("DisplayProvider missing");
  return ctx;
}

export { FONT_STEPS, FILL_STEPS };
