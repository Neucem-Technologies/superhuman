import { useEffect, useRef, useState, type ReactNode } from "react";
import { ChevronLeft } from "lucide-react";
import { cn } from "@/lib/utils";
import { AgendaHome, BoardHome, Coach, LayoutSwitch, WidgetGrid } from "@/components/shell/HomeLayouts";
import { TodaySky } from "@/components/shell/TodaySky";
import { SlideHero } from "@/components/shell/SlideHero";
import { useAppStore } from "@/spine/store";
import type { TabId } from "@/spine/types";

export { isShelfTab } from "@/components/shell/HomeLayouts";

export function HomePager({ openShelf, tick }: { openShelf: boolean; tick: number }) {
  const layout = useAppStore((s) => s.homeLayout ?? "board");
  if (layout === "board") {
    return (
      <ScrollHome>
        <BoardHome />
      </ScrollHome>
    );
  }
  if (layout === "agenda") {
    return (
      <ScrollHome>
        <AgendaHome />
      </ScrollHome>
    );
  }
  return <StackPager openShelf={openShelf} tick={tick} />;
}

function ScrollHome({ children }: { children: ReactNode }) {
  return (
    <div className="home-atmosphere relative flex min-h-0 flex-1 flex-col overflow-hidden">
      <TodaySky />
      <div className="relative z-1 min-h-0 flex-1 overflow-y-auto overscroll-contain px-6 py-3 md:px-12">
        <div className="mx-auto w-full max-w-3xl space-y-4">
          <LayoutSwitch />
          <Coach />
          {children}
        </div>
      </div>
    </div>
  );
}

function StackPager({ openShelf, tick }: { openShelf: boolean; tick: number }) {
  const scroller = useRef<HTMLDivElement>(null);
  const [page, setPage] = useState(openShelf ? 1 : 0);
  const setTab = useAppStore((s) => s.setTab);

  useEffect(() => {
    const el = scroller.current;
    if (!el) return;
    el.scrollTo({ left: openShelf ? el.clientWidth : 0, behavior: "auto" });
    setPage(openShelf ? 1 : 0);
  }, [openShelf, tick]);

  function go(to: 0 | 1) {
    const el = scroller.current;
    if (!el) return;
    el.scrollTo({ left: to * el.clientWidth, behavior: "smooth" });
    setPage(to);
  }

  return (
    <div className="home-atmosphere relative flex min-h-0 flex-1 flex-col overflow-hidden">
      {page === 0 ? <TodaySky /> : null}
      <div className="relative z-1 flex shrink-0 items-center justify-center gap-2 py-1.5">
        <button
          type="button"
          aria-label="Briefing"
          aria-current={page === 0}
          onClick={() => go(0)}
          className={cn("h-1.5 rounded-full transition-[width,background-color] duration-150", page === 0 ? "w-4 bg-foreground" : "w-1.5 bg-subtle")}
        />
        <button
          type="button"
          aria-label="Shelf"
          aria-current={page === 1}
          onClick={() => go(1)}
          className={cn("h-1.5 rounded-full transition-[width,background-color] duration-150", page === 1 ? "w-4 bg-foreground" : "w-1.5 bg-subtle")}
        />
      </div>
      <div
        ref={scroller}
        onScroll={(e) => {
          const el = e.currentTarget;
          setPage(el.scrollLeft > el.clientWidth * 0.45 ? 1 : 0);
        }}
        className="relative z-1 flex min-h-0 flex-1 snap-x snap-mandatory overflow-x-auto overflow-y-hidden no-scrollbar"
      >
        <section className="h-full w-full min-w-full shrink-0 snap-start overflow-y-auto px-6 py-3 md:px-12">
          <div className="mx-auto w-full max-w-3xl space-y-5">
            <LayoutSwitch />
            <Coach />
            <BoardHome />
            <button
              type="button"
              onClick={() => go(1)}
              className="flex h-12 w-full items-center justify-between rounded-md bg-elevated px-3 text-sm shadow-border"
            >
              <span className="text-muted">Growth · Travel · Enjoy · Shop · Notes · Files</span>
              <span className="text-xs text-subtle">Swipe left</span>
            </button>
          </div>
        </section>
        <section className="h-full w-full min-w-full shrink-0 snap-start overflow-y-auto px-6 py-3 md:px-12">
          <div className="mx-auto w-full max-w-3xl space-y-3">
            <SlideHero
              slide="shelf"
              aside={
                <button
                  type="button"
                  aria-label="Back to briefing"
                  onClick={() => go(0)}
                  className="flex size-10 items-center justify-center rounded-md bg-elevated/80"
                >
                  <ChevronLeft className="size-4" />
                </button>
              }
            >
              <p className="text-xs uppercase tracking-wide text-muted">Shelf</p>
              <h1 className="text-lg font-medium tracking-tight text-foreground">Widgets</h1>
            </SlideHero>
            <WidgetGrid
              variant="grid"
              onOpen={(tab: TabId) => {
                setTab(tab);
              }}
            />
          </div>
        </section>
      </div>
    </div>
  );
}

export function ShelfBack({ onBack }: { onBack: () => void }) {
  return (
    <button type="button" onClick={onBack} className="flex h-10 items-center gap-1 text-sm text-muted">
      <ChevronLeft className="size-4" />
      Shelf
    </button>
  );
}
