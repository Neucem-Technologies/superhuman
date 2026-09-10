import { useEffect, useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { Bubbles } from "@/components/shell/Bubbles";
import type { TabId } from "@/spine/types";

type Look = { src: string; label: string };

const LOOKS: Record<string, Look[]> = {
  work: [
    { src: "/slides/work.jpg", label: "Desk" },
    { src: "/slides/work-2.jpg", label: "Monitors" },
  ],
  health: [
    { src: "/slides/health.jpg", label: "Floor" },
    { src: "/slides/health-2.jpg", label: "Recover" },
  ],
  finance: [
    { src: "/slides/finance.jpg", label: "Ledgers" },
    { src: "/slides/finance-2.jpg", label: "Cash desk" },
  ],
  businesses: [
    { src: "/slides/businesses.jpg", label: "Workshop" },
    { src: "/slides/businesses-2.jpg", label: "Shutter" },
  ],
  growth: [
    { src: "/slides/growth.jpg", label: "Path" },
    { src: "/slides/growth-2.jpg", label: "Sit" },
  ],
  travel: [
    { src: "/slides/travel.jpg", label: "Window" },
    { src: "/slides/travel-2.jpg", label: "Bag" },
  ],
  entertainment: [
    { src: "/slides/entertainment.jpg", label: "Cinema" },
    { src: "/slides/entertainment-2.jpg", label: "Vinyl" },
  ],
  shopping: [
    { src: "/slides/shopping.jpg", label: "Spice" },
    { src: "/slides/shopping-2.jpg", label: "Kirana" },
  ],
  notes: [
    { src: "/slides/notes.jpg", label: "Lamp" },
    { src: "/slides/notes-2.jpg", label: "Wall" },
  ],
  files: [
    { src: "/slides/files.jpg", label: "Stacks" },
    { src: "/slides/files-2.jpg", label: "Folders" },
  ],
  shelf: [
    { src: "/slides/files.jpg", label: "Stacks" },
    { src: "/slides/files-2.jpg", label: "Folders" },
  ],
};

const KEY = "sh-slide-look";

function readLooks(): Record<string, number> {
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? "{}") as Record<string, number>;
  } catch {
    return {};
  }
}

function writeLook(slide: string, i: number) {
  try {
    const cur = readLooks();
    cur[slide] = i;
    localStorage.setItem(KEY, JSON.stringify(cur));
  } catch {
    /* ignore */
  }
}

export function SlideHero({
  slide,
  children,
  aside,
}: {
  slide: TabId | "shelf";
  children: ReactNode;
  aside?: ReactNode;
}) {
  const looks = LOOKS[slide] ?? LOOKS.notes;
  const [i, setI] = useState(0);
  useEffect(() => {
    const saved = readLooks()[slide];
    if (typeof saved === "number" && saved >= 0 && saved < looks.length) setI(saved);
  }, [slide, looks.length]);
  const look = looks[i] ?? looks[0];

  function pick(next: number) {
    setI(next);
    writeLook(slide, next);
  }

  return (
    <header className="slide-hero relative -mx-6 -mt-1 overflow-hidden md:-mx-12">
      <img src={look.src} alt="" className="absolute inset-0 size-full object-cover" />
      <Bubbles variant="hero" />
      <div className="absolute inset-0 bg-linear-to-r from-background/80 via-background/45 to-background/20" />
      <div className="absolute inset-0 bg-linear-to-t from-background/70 to-transparent" />
      <div className="today-hero relative flex items-end justify-between gap-3 px-6 pt-10 pb-3 md:px-12">
        <div className="min-w-0">{children}</div>
        {aside ? <div className="shrink-0">{aside}</div> : null}
      </div>
      <div className="relative flex flex-wrap gap-1 px-6 pb-3 md:px-12">
        {looks.map((l, idx) => (
          <button
            key={l.label}
            type="button"
            onClick={() => pick(idx)}
            className={cn(
              "h-7 rounded-sm px-2 text-xs",
              idx === i ? "bg-foreground text-background" : "bg-background/45 text-foreground/85",
            )}
          >
            {l.label}
          </button>
        ))}
      </div>
    </header>
  );
}
