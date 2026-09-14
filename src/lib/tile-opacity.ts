import { useEffect, useState } from "react";

const FILL_KEY = "ls-tile-fill";
const BLUR_KEY = "ls-tile-blur";

export const TILE_FILL_STEPS = [20, 30, 40, 50, 70] as const;
export const TILE_BLUR_STEPS = [8, 12, 16, 24, 32] as const;
export type TileFill = (typeof TILE_FILL_STEPS)[number];
export type TileBlur = (typeof TILE_BLUR_STEPS)[number];

const DEFAULT_FILL: TileFill = 20;
const DEFAULT_BLUR: TileBlur = 16;

function clampFill(n: number): TileFill {
  return (TILE_FILL_STEPS as readonly number[]).includes(n) ? (n as TileFill) : DEFAULT_FILL;
}

function clampBlur(n: number): TileBlur {
  return (TILE_BLUR_STEPS as readonly number[]).includes(n) ? (n as TileBlur) : DEFAULT_BLUR;
}

function readStored(key: string): number | null {
  try {
    const n = Number(localStorage.getItem(key));
    return Number.isFinite(n) ? n : null;
  } catch {
    return null;
  }
}

export function readTileFill(): TileFill {
  const stored = readStored(FILL_KEY);
  return stored == null ? DEFAULT_FILL : clampFill(stored);
}

export function readTileBlur(): TileBlur {
  const stored = readStored(BLUR_KEY);
  return stored == null ? DEFAULT_BLUR : clampBlur(stored);
}

export function applyTileFill(pct: TileFill) {
  const n = clampFill(pct);
  const root = document.documentElement;
  root.style.setProperty("--tile-fill", String(n / 100));
  root.dataset.tileFill = String(n);
  try {
    localStorage.setItem(FILL_KEY, String(n));
  } catch {
    /* ignore */
  }
}

export function applyTileBlur(px: TileBlur) {
  const n = clampBlur(px);
  const root = document.documentElement;
  root.style.setProperty("--tile-blur", `${n}px`);
  root.dataset.tileBlur = String(n);
  try {
    localStorage.setItem(BLUR_KEY, String(n));
  } catch {
    /* ignore */
  }
}

export function useTileFill() {
  const [pct, setPct] = useState<TileFill>(DEFAULT_FILL);
  const [blur, setBlurState] = useState<TileBlur>(DEFAULT_BLUR);

  useEffect(() => {
    const nextFill = readTileFill();
    const nextBlur = readTileBlur();
    setPct(nextFill);
    setBlurState(nextBlur);
    applyTileFill(nextFill);
    applyTileBlur(nextBlur);
  }, []);

  function setFill(next: TileFill) {
    const n = clampFill(next);
    setPct(n);
    applyTileFill(n);
  }

  function setBlur(next: TileBlur) {
    const n = clampBlur(next);
    setBlurState(n);
    applyTileBlur(n);
  }

  return { pct, setFill, blur, setBlur };
}
