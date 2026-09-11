import { useEffect, useState } from "react";
import {
  Bell,
  Cable,
  Briefcase,
  Building2,
  Clapperboard,
  FolderOpen,
  HeartPulse,
  House,
  Plane,
  ShoppingBag,
  Sprout,
  StickyNote,
  Wallet,
  Smartphone,
  Contrast,
} from "lucide-react";
import { Link } from "@tanstack/react-router";
import { Toaster, toast } from "sonner";
import { cn } from "@/lib/utils";
import { Avatar, Button } from "@/components/ui/primitives";
import { WorkTab } from "@/components/tabs/WorkTab";
import { GrowthTab } from "@/components/tabs/GrowthTab";
import { TravelTab } from "@/components/tabs/TravelTab";
import { HealthTab } from "@/components/tabs/HealthTab";
import { EntertainmentTab } from "@/components/tabs/EntertainmentTab";
import { ShoppingTab } from "@/components/tabs/ShoppingTab";
import { NotesTab } from "@/components/tabs/NotesTab";
import { FilesTab } from "@/components/tabs/FilesTab";
import { FinanceTab } from "@/components/tabs/FinanceTab";
import { BusinessesTab } from "@/components/tabs/BusinessesTab";
import { TabInbox } from "@/components/shell/TabInbox";
import { UniversalChatBar } from "@/components/shell/UniversalChatBar";
import { HomePager, ShelfBack, isShelfTab } from "@/components/shell/HomePager";
import { BoardHome } from "@/components/shell/HomeLayouts";
import { InvitePanel } from "@/components/shell/InvitePanel";
import { ConnectorsPanel } from "@/components/shell/ConnectorsPanel";
import { GetAppPanel } from "@/components/shell/GetAppPanel";
import { useDayPeriod } from "@/components/shell/DayBackdrop";
import { useContrast } from "@/lib/contrast";
import { AuthActions } from "@/components/auth/AuthScreen";
import { SignedIn, SignedOut, UserButton } from "@/lib/auth/gates";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { useAppStore } from "@/spine/store";
import { formatDay } from "@/spine/format";
import { scopesFor, tabAccess, visibleTabs } from "@/spine/permissions";
import { describeScopes } from "@/spine/rbac";
import { CIRCLE_GROUP, circleGroup } from "@/spine/invite";
import { PRIMARY_TABS, SELF_ID, type TabId } from "@/spine/types";

const TAB_META: { id: TabId; label: string; short: string; icon: typeof House }[] = [
  { id: "home", label: "Home", short: "Home", icon: House },
  { id: "work", label: "Work", short: "Work", icon: Briefcase },
  { id: "growth", label: "Growth", short: "Growth", icon: Sprout },
  { id: "travel", label: "Travel", short: "Travel", icon: Plane },
  { id: "health", label: "Health", short: "Health", icon: HeartPulse },
  { id: "entertainment", label: "Entertainment", short: "Watch", icon: Clapperboard },
  { id: "shopping", label: "Shopping", short: "Shop", icon: ShoppingBag },
  { id: "notes", label: "Notes", short: "Notes", icon: StickyNote },
  { id: "files", label: "Files", short: "Files", icon: FolderOpen },
  { id: "finance", label: "Finance", short: "Money", icon: Wallet },
  { id: "businesses", label: "Businesses", short: "Biz", icon: Building2 },
];

export function AppShell() {
  const [notifOpen, setNotifOpen] = useState(false);
  const [switchOpen, setSwitchOpen] = useState(false);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [connectorsOpen, setConnectorsOpen] = useState(false);
  const [getAppOpen, setGetAppOpen] = useState(false);
  const [shelfOpen, setShelfOpen] = useState(false);
  const [homeTick, setHomeTick] = useState(0);
  const { high: highContrast, toggle: toggleContrast } = useContrast();
  const dayPeriod = useDayPeriod();

  useEffect(() => {
    void useAppStore.persist.rehydrate();
    const params = new URLSearchParams(window.location.search);
    const tab = params.get("tab") as TabId | null;
    if (tab) useAppStore.getState().setTab(tab);
    const invite = params.get("invite");
    if (invite) {
      const r = useAppStore.getState().act("people.accept", { id: invite });
      if (r.ok) useAppStore.getState().setActor(SELF_ID);
    }
    if ("serviceWorker" in navigator) {
      void navigator.serviceWorker.register("/sw.js");
    }
  }, []);

  const actorId = useAppStore((s) => s.actorId);
  const activeTab = useAppStore((s) => s.activeTab);
  const people = useAppStore((s) => s.people);
  const notifications = useAppStore((s) => s.notifications);
  const { isPending: authPending } = useCurrentUserState();
  const setTab = useAppStore((s) => s.setTab);
  const setActor = useAppStore((s) => s.setActor);
  const act = useAppStore((s) => s.act);
  const markRead = useAppStore((s) => s.markRead);
  const markAllRead = useAppStore((s) => s.markAllRead);
  const vis = visibleTabs(useAppStore.getState(), actorId);
  const actor = people.find((p) => p.id === actorId);
  const actorScopes = actorId === SELF_ID ? [] : scopesFor(useAppStore.getState(), actorId);
  const currentAccess = actorId === SELF_ID ? "admin" : tabAccess(useAppStore.getState(), actorId, activeTab);
  const primary = TAB_META.filter((t) => PRIMARY_TABS.includes(t.id) && vis.includes(t.id));
  const shelf = TAB_META.filter((t) => !PRIMARY_TABS.includes(t.id) && vis.includes(t.id));
  const tabs = [...primary, ...shelf];
  const barTabs = primary.length ? primary : tabs;
  const unread = notifications.filter((n) => !n.read).length;
  const onHome = activeTab === "home";
  const onShelf = isShelfTab(activeTab);

  function goTab(id: TabId) {
    setSwitchOpen(false);
    setNotifOpen(false);
    if (id === "home") {
      setShelfOpen(false);
      setHomeTick((n) => n + 1);
    }
    setTab(id);
  }

  const pane =
    activeTab === "home" ? (
      <BoardHome />
    ) : activeTab === "work" ? (
      <WorkTab />
    ) : activeTab === "growth" ? (
      <GrowthTab />
    ) : activeTab === "travel" ? (
      <TravelTab />
    ) : activeTab === "health" ? (
      <HealthTab />
    ) : activeTab === "entertainment" ? (
      <EntertainmentTab />
    ) : activeTab === "shopping" ? (
      <ShoppingTab />
    ) : activeTab === "notes" ? (
      <NotesTab />
    ) : activeTab === "files" ? (
      <FilesTab />
    ) : activeTab === "finance" ? (
      <FinanceTab />
    ) : (
      <BusinessesTab />
    );

  return (
    <div className="app-pattern relative flex h-dvh flex-col text-foreground md:flex-row" data-period={dayPeriod}>
      <Toaster
        theme="dark"
        position="top-center"
        toastOptions={{
          style: {
            background: "var(--color-elevated)",
            color: "var(--color-foreground)",
            border: "1px solid color-mix(in oklab, var(--color-foreground) 12%, transparent)",
          },
        }}
      />
      <aside className="glass relative z-30 hidden w-52 shrink-0 flex-col md:flex">
        <div className="px-4 py-4">
          <p className="text-xs uppercase tracking-wide text-subtle">LivinSync</p>
          <p className="mt-1 text-xs text-muted">{formatDay(Date.now())}</p>
        </div>
        <nav className="flex-1 space-y-0.5 px-2">
          {primary.map((t) => {
            const Icon = t.icon;
            const on = activeTab === t.id || (t.id === "home" && onShelf);
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => goTab(t.id)}
                className={cn(
                  "flex h-10 w-full items-center gap-2 rounded-md px-2 text-sm",
                  on ? "bg-elevated text-foreground" : "text-muted hover:text-foreground",
                )}
              >
                <Icon className="size-4" />
                {t.label}
              </button>
            );
          })}
          {shelf.length > 0 && (
            <>
              <p className="px-2 pt-4 pb-1 text-xs uppercase tracking-wide text-subtle">Shelf</p>
              {shelf.map((t) => {
                const Icon = t.icon;
                const on = activeTab === t.id;
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => goTab(t.id)}
                    className={cn(
                      "flex h-10 w-full items-center gap-2 rounded-md px-2 text-sm",
                      on ? "bg-elevated text-foreground" : "text-muted hover:text-foreground",
                    )}
                  >
                    <Icon className="size-4" />
                    {t.label}
                  </button>
                );
              })}
            </>
          )}
        </nav>
        <div className="px-4 py-3">
          <Link to="/privacy" className="text-xs text-subtle hover:text-muted">
            Privacy
          </Link>
        </div>
      </aside>

      <div className="relative z-10 flex min-h-0 min-w-0 flex-1 flex-col">
        <header className="glass relative z-30 flex items-center gap-2 px-6 py-2 md:px-12">
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">LivinSync</p>
            {actorId !== SELF_ID && (
              <p className="truncate text-xs text-warn">
                Viewing as {actor?.name} · {actor?.title} · {describeScopes(actorScopes)}
                {currentAccess === "view" ? " · this tab is view-only" : ""}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={() => {
              setSwitchOpen(false);
              setNotifOpen(false);
              setConnectorsOpen(true);
            }}
            className="flex size-10 items-center justify-center rounded-md"
            aria-label="Connectors"
          >
            <Cable className="size-4" />
          </button>
          <button
            type="button"
            onClick={() => {
              setSwitchOpen(false);
              setConnectorsOpen(false);
              setNotifOpen(true);
            }}
            className="relative flex size-10 items-center justify-center rounded-md"
            aria-label="Notifications"
          >
            <Bell className="size-4" />
            {unread > 0 && <span className="absolute top-1.5 right-1.5 size-1.5 rounded-full bg-accent" />}
          </button>
          <div className="relative">
            <button
              type="button"
              onClick={() => setSwitchOpen((v) => !v)}
              className="flex items-center gap-2 rounded-md py-1 pl-1 pr-2"
              aria-label="Profile"
            >
              <Avatar initials={actor?.initials ?? "?"} />
              <span className="hidden text-xs text-muted sm:inline">{actor?.shortName}</span>
            </button>
            {switchOpen && (
              <div className="glass absolute right-0 z-30 mt-1 max-h-[min(70vh,calc(100dvh-8rem))] w-64 overflow-y-auto rounded-md p-1">
                <p className="px-2 py-1.5 text-xs uppercase tracking-wide text-subtle">Profile</p>
                <div className="px-1 pb-1">
                  {authPending ? (
                    <div className="h-10 animate-pulse rounded-sm bg-surface" />
                  ) : (
                    <>
                      <SignedIn>
                        <div className="rounded-sm px-1 py-1">
                          <UserButton />
                        </div>
                      </SignedIn>
                      <SignedOut>
                        <AuthActions compact />
                      </SignedOut>
                    </>
                  )}
                </div>
                <Link
                  to="/profile"
                  onClick={() => setSwitchOpen(false)}
                  className="flex h-10 w-full items-center rounded-sm px-2 text-sm text-muted"
                >
                  Open profile
                </Link>
                <button
                  type="button"
                  onClick={() => {
                    setSwitchOpen(false);
                    setGetAppOpen(true);
                  }}
                  className="flex h-10 w-full items-center gap-2 rounded-sm px-2 text-sm text-muted"
                >
                  <Smartphone className="size-3.5" />
                  Get iPhone & Android
                </button>
                <button
                  type="button"
                  aria-pressed={highContrast}
                  onClick={() => toggleContrast()}
                  className={cn(
                    "flex h-10 w-full items-center gap-2 rounded-sm px-2 text-sm",
                    highContrast ? "bg-surface text-foreground" : "text-muted",
                  )}
                >
                  <Contrast className="size-3.5" />
                  High contrast {highContrast ? "on" : "off"}
                </button>
                <p className="mt-1 px-2 py-1 text-xs uppercase tracking-wide text-subtle">Preview as</p>
                <button
                  type="button"
                  onClick={() => {
                    setActor(SELF_ID);
                    setSwitchOpen(false);
                  }}
                  className={cn("flex h-10 w-full items-center gap-2 rounded-sm px-2 text-sm", actorId === SELF_ID ? "bg-surface" : "")}
                >
                  <Avatar initials="RM" />
                  <span className="flex-1 text-left">You</span>
                </button>
                {(["family", "friends", "coworkers", "advisors"] as const).map((g) => {
                  const members = people.filter(
                    (p) => p.id !== SELF_ID && p.inviteStatus !== "pending" && circleGroup(p.circle) === g,
                  );
                  if (!members.length) return null;
                  return (
                    <div key={g} className="mb-1">
                      <p className="px-2 py-1 text-xs uppercase tracking-wide text-subtle">{CIRCLE_GROUP[g].label}</p>
                      {members.map((p) => (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => {
                            setActor(p.id);
                            setSwitchOpen(false);
                          }}
                          className={cn(
                            "flex h-10 w-full items-center gap-2 rounded-sm px-2 text-sm",
                            p.id === actorId ? "bg-surface" : "",
                          )}
                        >
                          <Avatar initials={p.initials} />
                          <span className="flex-1 truncate text-left">{p.shortName}</span>
                          <span className="text-xs text-subtle">{p.title}</span>
                        </button>
                      ))}
                    </div>
                  );
                })}
                {actorId === SELF_ID && (
                  <button
                    type="button"
                    onClick={() => {
                      setSwitchOpen(false);
                      setInviteOpen(true);
                    }}
                    className="mt-1 flex h-10 w-full items-center rounded-sm px-2 text-sm text-muted"
                  >
                    Invite contributor
                  </button>
                )}
              </div>
            )}
          </div>
        </header>

        <main className={cn("relative z-0 flex min-h-0 flex-1 flex-col", onHome ? "overflow-hidden" : "overflow-y-auto")}>
          {onHome ? (
            <HomePager openShelf={shelfOpen} tick={homeTick} />
          ) : (
            <div className="mx-auto w-full max-w-3xl space-y-5 px-6 py-4 md:px-12">
              {onShelf && (
                <ShelfBack
                  onBack={() => {
                    setShelfOpen(true);
                    setTab("home");
                  }}
                />
              )}
              <TabInbox tab={activeTab} />
              {pane}
            </div>
          )}
        </main>
        <UniversalChatBar />
        <nav className="glass relative z-30 shrink-0 pb-[env(safe-area-inset-bottom)] md:hidden">
          <div className="flex">
            {barTabs.map((t) => {
              const Icon = t.icon;
              const on = activeTab === t.id || (t.id === "home" && onShelf);
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => goTab(t.id)}
                  className={cn(
                    "relative z-30 flex h-14 min-w-0 flex-1 flex-col items-center justify-center gap-0.5 px-1 transition-colors duration-150",
                    on ? "text-foreground" : "text-muted",
                  )}
                >
                  {on && <span className="absolute top-0 h-0.5 w-6 rounded-full bg-accent" />}
                  <Icon className="size-4" />
                  <span className="text-xs leading-none">{t.short}</span>
                </button>
              );
            })}
          </div>
        </nav>
      </div>

      {switchOpen && (
        <button
          type="button"
          aria-label="Dismiss profile"
          className="fixed inset-0 z-20"
          onClick={() => setSwitchOpen(false)}
        />
      )}
      {notifOpen && (
        <div className="fixed inset-0 z-40 flex justify-end">
          <button type="button" aria-label="Close" className="absolute inset-0 bg-background/70" onClick={() => setNotifOpen(false)} />
          <div className="glass relative z-10 flex h-full w-full max-w-sm flex-col">
            <div className="flex items-center justify-between px-4 py-3">
              <h2 className="text-sm font-medium">Notifications</h2>
              <div className="flex gap-2">
                <button type="button" className="text-xs text-muted" onClick={markAllRead}>
                  Read all
                </button>
                <button type="button" className="text-xs text-muted" onClick={() => setNotifOpen(false)}>
                  Close
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto px-3 pb-6">
              {notifications.map((n) => (
                <div
                  key={n.id}
                  className={cn("mb-2 w-full rounded-md p-3 text-left shadow-border pressable", n.read ? "bg-background" : "bg-elevated")}
                >
                  <button
                    type="button"
                    className="w-full text-left"
                    onClick={() => {
                      markRead(n.id);
                      setTab(n.tab);
                      setNotifOpen(false);
                    }}
                  >
                    <p className="text-xs uppercase tracking-wide text-subtle">{n.kind}</p>
                    <p className="text-sm font-medium">{n.title}</p>
                    <p className="text-xs text-muted">{n.body}</p>
                  </button>
                  <div className="mt-2 flex gap-2">
                    {n.action ? (
                      <Button
                        size="sm"
                        onClick={() => {
                          markRead(n.id);
                          const r = act(n.action!.eventType, n.action!.payload);
                          if (!r.ok) toast.error(r.error);
                          setNotifOpen(false);
                        }}
                      >
                        {n.action.label}
                      </Button>
                    ) : null}
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        markRead(n.id);
                        setTab(n.tab);
                        setNotifOpen(false);
                      }}
                    >
                      Open
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
      <InvitePanel open={inviteOpen} onClose={() => setInviteOpen(false)} />
      <ConnectorsPanel open={connectorsOpen} onClose={() => setConnectorsOpen(false)} />
      <GetAppPanel open={getAppOpen} onClose={() => setGetAppOpen(false)} />
    </div>
  );
}
