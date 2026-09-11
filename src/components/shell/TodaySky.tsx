import { Hud } from "@/components/shell/Hud";

export function TodaySky() {
  return (
    <div className="today-sky pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
      <Hud variant="sky" />
      <div className="absolute inset-0 bg-linear-to-b from-transparent via-background/10 to-background/35" />
    </div>
  );
}
