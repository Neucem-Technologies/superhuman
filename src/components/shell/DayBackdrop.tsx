import { useEffect, useState } from "react";
import { periodOfDay, type DayPeriod } from "@/spine/format";

export function useDayPeriod(): DayPeriod {
  const [period, setPeriod] = useState<DayPeriod>(periodOfDay);
  useEffect(() => {
    const sync = () => {
      const next = periodOfDay();
      setPeriod(next);
      document.documentElement.dataset.period = next;
    };
    sync();
    const id = window.setInterval(sync, 30_000);
    return () => window.clearInterval(id);
  }, []);
  return period;
}

/** Fixed CSS background stack. First paint in `background-image` sits on top. */
export function DayStack() {
  useDayPeriod();
  return <div className="day-stack" aria-hidden />;
}
