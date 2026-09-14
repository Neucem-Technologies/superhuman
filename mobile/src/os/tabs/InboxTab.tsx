import { useAppStore } from "@/spine/store";
import { formatDay } from "@/spine/format";
import { Body, Btn, Label, Muted, Screen, Tile } from "../ui";

export function InboxTab() {
  const notifications = useAppStore((s) => s.notifications);
  const markRead = useAppStore((s) => s.markRead);
  const markAllRead = useAppStore((s) => s.markAllRead);
  const setTab = useAppStore((s) => s.setTab);
  return (
    <Screen title="Inbox" subtitle="Nudges from the rules engine.">
      <Btn label="Mark all read" dim onPress={markAllRead} />
      {notifications.map((n) => (
        <Tile
          key={n.id}
          onPress={() => {
            markRead(n.id);
            if (n.tab) setTab(n.tab);
          }}
        >
          <Label>{n.read ? "Read" : "New"}</Label>
          <Body>{n.title}</Body>
          <Muted>
            {n.body} · {formatDay(n.timestamp)}
          </Muted>
        </Tile>
      ))}
      {notifications.length === 0 ? <Muted>Quiet.</Muted> : null}
    </Screen>
  );
}
