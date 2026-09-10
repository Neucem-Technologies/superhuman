import { SHELF_TABS, type TabId, type WidgetPref, type WidgetSize } from "./types";

export function defaultWidgets(): WidgetPref[] {
  return SHELF_TABS.map((id) => ({
    id,
    visible: true,
    size: id === "growth" || id === "travel" ? "m" : "s",
    pinned: id === "growth",
    density: "story",
  }));
}

export function mergeWidgets(saved?: WidgetPref[] | null): WidgetPref[] {
  const base = defaultWidgets();
  if (!saved?.length) return base;
  const seen = new Set<TabId>();
  const out: WidgetPref[] = [];
  for (const w of saved) {
    if (!SHELF_TABS.includes(w.id) || seen.has(w.id)) continue;
    seen.add(w.id);
    out.push({
      id: w.id,
      visible: w.visible !== false,
      size: w.size === "l" || w.size === "m" ? w.size : "s",
      pinned: !!w.pinned,
      density: w.density === "stat" ? "stat" : "story",
    });
  }
  for (const d of base) {
    if (!seen.has(d.id)) out.push(d);
  }
  return out;
}

export function railWidth(size: WidgetSize) {
  if (size === "l") return "min-w-[88%] w-[88%]";
  if (size === "m") return "min-w-[70%] w-[70%]";
  return "min-w-[46%] w-[46%]";
}
