import { useTheme } from "@/lib/theme";
import { useFontScale } from "@/lib/font-scale";
import { useTileFill } from "@/lib/tile-opacity";
import { useTilePalette } from "@/lib/tile-palette";

export function useDayPeriod() {
  return useTheme().period;
}

/** Fixed CSS background stack. First paint in `background-image` sits on top. */
export function DayStack() {
  useTheme();
  useFontScale();
  useTileFill();
  useTilePalette();
  return <div className="day-stack" aria-hidden />;
}
