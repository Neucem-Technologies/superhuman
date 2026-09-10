import { periodOfDay, type DayPeriod } from "@/spine/format";
import { Bubbles } from "@/components/shell/Bubbles";

const SRC: Record<DayPeriod, string> = {
  morning: "/today/morning.jpg?v=2",
  afternoon: "/today/afternoon.jpg?v=2",
  evening: "/today/evening.jpg?v=2",
  night: "/today/night.jpg?v=2",
};

export function TodaySky() {
  const period = periodOfDay();
  return (
    <div className="today-sky pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
      <img src={SRC[period]} alt="" className="size-full object-cover object-top" />
      <Bubbles variant="sky" />
      <div className="absolute inset-0 bg-linear-to-b from-background/75 via-background/35 to-background/80" />
    </div>
  );
}
