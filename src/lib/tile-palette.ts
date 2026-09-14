import { useEffect, useState } from "react";

const KEY = "ls-tile-palette";

export type TilePaletteId = "midnight" | "ocean" | "forest" | "dusk" | "sand";

export type TilePalette = {
  id: TilePaletteId;
  label: string;
  rgb: string;
  swatch: string;
  tints: {
    work: string;
    health: string;
    money: string;
    grow: string;
    move: string;
    play: string;
    shop: string;
    ink: string;
  };
};

export const TILE_PALETTES: TilePalette[] = [
  {
    id: "midnight",
    label: "Midnight",
    rgb: "12 14 22",
    swatch: "#12141c",
    tints: {
      work: "#8e96a4",
      health: "#8fad96",
      money: "#c4a574",
      grow: "#7d9e94",
      move: "#7d8eaa",
      play: "#a8929a",
      shop: "#b09a7c",
      ink: "#8c8c94",
    },
  },
  {
    id: "ocean",
    label: "Ocean",
    rgb: "8 18 36",
    swatch: "#0c2848",
    tints: {
      work: "#7aa0c4",
      health: "#7eb8b0",
      money: "#c4b07a",
      grow: "#6aa8a0",
      move: "#6a90c8",
      play: "#8aa0c8",
      shop: "#9ab0c0",
      ink: "#8aa0b4",
    },
  },
  {
    id: "forest",
    label: "Forest",
    rgb: "8 22 16",
    swatch: "#0c2c18",
    tints: {
      work: "#8aa494",
      health: "#7db892",
      money: "#c4b07a",
      grow: "#6eae90",
      move: "#7d9eaa",
      play: "#9aaa92",
      shop: "#b09a7c",
      ink: "#8c9c94",
    },
  },
  {
    id: "dusk",
    label: "Dusk",
    rgb: "24 12 28",
    swatch: "#2a1434",
    tints: {
      work: "#a090b0",
      health: "#8fad96",
      money: "#c4a574",
      grow: "#8e9e94",
      move: "#8d8eb8",
      play: "#c090a8",
      shop: "#b09a7c",
      ink: "#a090a8",
    },
  },
  {
    id: "sand",
    label: "Sand",
    rgb: "24 18 12",
    swatch: "#2c2418",
    tints: {
      work: "#a89a88",
      health: "#8fad96",
      money: "#d0b07a",
      grow: "#9eae90",
      move: "#8d9eaa",
      play: "#c0a090",
      shop: "#c4a878",
      ink: "#b0a494",
    },
  },
];

const DEFAULT: TilePaletteId = "midnight";

function clamp(id: string | null): TilePaletteId {
  return TILE_PALETTES.some((p) => p.id === id) ? (id as TilePaletteId) : DEFAULT;
}

export function readTilePalette(): TilePaletteId {
  try {
    return clamp(localStorage.getItem(KEY));
  } catch {
    return DEFAULT;
  }
}

export function applyTilePalette(id: TilePaletteId) {
  const pal = TILE_PALETTES.find((p) => p.id === clamp(id)) ?? TILE_PALETTES[0];
  const root = document.documentElement;
  root.style.setProperty("--tile-rgb", pal.rgb);
  root.style.setProperty("--color-tint-work", pal.tints.work);
  root.style.setProperty("--color-tint-health", pal.tints.health);
  root.style.setProperty("--color-tint-money", pal.tints.money);
  root.style.setProperty("--color-tint-grow", pal.tints.grow);
  root.style.setProperty("--color-tint-move", pal.tints.move);
  root.style.setProperty("--color-tint-play", pal.tints.play);
  root.style.setProperty("--color-tint-shop", pal.tints.shop);
  root.style.setProperty("--color-tint-ink", pal.tints.ink);
  root.dataset.tilePalette = pal.id;
  try {
    localStorage.setItem(KEY, pal.id);
  } catch {
    /* ignore */
  }
}

export function useTilePalette() {
  const [id, setId] = useState<TilePaletteId>(DEFAULT);

  useEffect(() => {
    const next = readTilePalette();
    setId(next);
    applyTilePalette(next);
  }, []);

  function setPalette(next: TilePaletteId) {
    const n = clamp(next);
    setId(n);
    applyTilePalette(n);
  }

  return { id, setPalette };
}
