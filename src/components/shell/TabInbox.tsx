import { useState } from "react";
import { File as FileIcon, Mic, Type } from "lucide-react";
import { Card, SectionTitle } from "@/components/ui/primitives";
import { cn } from "@/lib/utils";
import { formatShortDay } from "@/spine/format";
import { TAB_LABELS, type ExchangeChannel, type TabId } from "@/spine/types";
import { useAppStore } from "@/spine/store";

function ChannelIcon({ channel }: { channel: ExchangeChannel }) {
  const Icon = channel === "voice" ? Mic : channel === "file" ? FileIcon : Type;
  return <Icon className="size-3" />;
}

export function TabInbox({ tab }: { tab: TabId }) {
  const exchanges = useAppStore((s) => s.exchanges ?? []);
  const files = useAppStore((s) => s.files ?? []);
  const setTab = useAppStore((s) => s.setTab);
  const [openId, setOpenId] = useState<string | null>(null);

  const rows = (tab === "home" ? exchanges : exchanges.filter((e) => e.tab === tab)).slice(0, tab === "home" ? 4 : 3);

  if (rows.length === 0) {
    if (tab !== "home") return null;
    return (
      <p className="text-xs text-subtle">
        Ask or command below — text, voice, or a file. Commands run as soon as they transcribe.
      </p>
    );
  }

  return (
    <section>
      <SectionTitle>{tab === "home" ? "From the bar" : "Filed here"}</SectionTitle>
      <div className="space-y-2">
        {rows.map((e) => {
          const attached = files.filter((f) => e.fileIds.includes(f.id));
          const expanded = openId === e.id;
          return (
            <Card key={e.id} className="space-y-1.5">
              <button
                type="button"
                onClick={() => setOpenId(expanded ? null : e.id)}
                className="flex w-full items-start gap-2 text-left"
              >
                <span className="mt-0.5 text-subtle">
                  <ChannelIcon channel={e.channel} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex flex-wrap items-baseline gap-x-2">
                    <span className="text-sm font-medium">{e.title}</span>
                    {tab === "home" ? (
                      <span className="text-xs uppercase tracking-[0.14em] text-subtle">{TAB_LABELS[e.tab]}</span>
                    ) : null}
                    <span className="text-xs text-subtle">{formatShortDay(e.timestamp)}</span>
                  </span>
                  <span className="mt-0.5 block text-xs text-muted">{e.query || attached[0]?.name}</span>
                </span>
              </button>
              <p className={cn("text-sm text-muted", expanded ? "" : "line-clamp-2")}>{e.response}</p>
              {attached.length > 0 && (
                <p className="text-xs text-subtle">{attached.map((f) => f.name).join(" · ")}</p>
              )}
              {tab === "home" && e.tab !== "home" && (
                <button type="button" className="text-xs text-muted" onClick={() => setTab(e.tab)}>
                  Open {TAB_LABELS[e.tab]}
                </button>
              )}
            </Card>
          );
        })}
      </div>
    </section>
  );
}
