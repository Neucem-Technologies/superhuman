import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Button, Field, Input, Modal, Segmented } from "@/components/ui/primitives";
import { cn } from "@/lib/utils";
import { useAppStore } from "@/spine/store";
import { CIRCLE_SCOPES, type Scope } from "@/spine/permissions";
import {
  CIRCLE_GROUP,
  CIRCLE_META,
  channelUrl,
  circleGroup,
  inviteBody,
} from "@/spine/invite";
import {
  RBAC_TABS,
  TAB_SHORT,
  accessMark,
  cycleAccess,
  describeScopes,
  grantsFromScopes,
  roleScopes,
  scopesFromGrants,
} from "@/spine/rbac";
import { SELF_ID, type Access, type CircleId, type InviteChannel, type Person, type TabId } from "@/spine/types";

type GroupId = keyof typeof CIRCLE_GROUP;
type Pane = "people" | "matrix" | "invite";

export function InvitePanel({ open, onClose }: { open: boolean; onClose: () => void }) {
  const people = useAppStore((s) => s.people);
  const act = useAppStore((s) => s.act);
  const setActor = useAppStore((s) => s.setActor);
  const [pane, setPane] = useState<Pane>("matrix");
  const [group, setGroup] = useState<GroupId>("advisors");
  const [circle, setCircle] = useState<CircleId>("trainers");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [channel, setChannel] = useState<InviteChannel>("whatsapp");
  const [grants, setGrants] = useState<Partial<Record<TabId, Access>>>(grantsFromScopes(CIRCLE_SCOPES.trainers));
  const [lastLink, setLastLink] = useState<{ url: string; channel: InviteChannel; name: string } | null>(null);

  const meta = CIRCLE_META[circle as Exclude<CircleId, "self">] ?? CIRCLE_META.trainers;

  function pickGroup(g: GroupId) {
    setGroup(g);
    const next = CIRCLE_GROUP[g].circles[0]!;
    setCircle(next);
    setGrants(grantsFromScopes(roleScopes(next)));
  }
  function pickCircle(c: CircleId) {
    setCircle(c);
    setGrants(grantsFromScopes(roleScopes(c)));
  }
  function cycleGrant(t: TabId) {
    setGrants((cur) => {
      const next = cycleAccess(cur[t] ?? null);
      const copy = { ...cur };
      if (!next) delete copy[t];
      else copy[t] = next;
      return copy;
    });
  }

  const scopes: Scope[] = useMemo(() => scopesFromGrants(circle, grants), [circle, grants]);
  const origin = typeof window === "undefined" ? "" : window.location.origin;
  const accepted = people.filter((p) => p.id !== SELF_ID && p.inviteStatus !== "pending");
  const pending = people.filter((p) => p.inviteStatus === "pending");

  function send() {
    if (!name.trim()) {
      toast.error("Name is required");
      return;
    }
    if (channel === "email" && !email.trim()) {
      toast.error("Email is required for mail");
      return;
    }
    if (!scopes.length) {
      toast.error("Grant at least one tab");
      return;
    }
    const id = `p-${Math.random().toString(36).slice(2, 8)}`;
    const r = act("people.invite", {
      id,
      name: name.trim(),
      circle,
      title: meta.title,
      email: email.trim(),
      phone: phone.trim(),
      channel,
      scopes,
    });
    if (!r.ok) {
      toast.error(r.error);
      return;
    }
    const body = inviteBody({ name: name.trim(), title: meta.title }, scopes, origin || window.location.origin, id);
    const url = channelUrl(channel, channel === "whatsapp" ? phone : email, `LivinSync · ${meta.title}`, body);
    try {
      void navigator.clipboard.writeText(body);
    } catch {
      /* ignore */
    }
    setLastLink({ url, channel, name: name.trim() });
    toast(channel === "whatsapp" ? "Message copied · open WhatsApp below" : "Message copied · open mail below");
    setName("");
    setEmail("");
    setPhone("");
  }

  function setPersonScopes(person: Person, next: Scope[]) {
    const r = act("people.access", { id: person.id, scopes: next });
    if (!r.ok) toast.error(r.error);
  }

  return (
    <Modal open={open} onClose={onClose} title="Contributors">
      <Segmented
        value={pane}
        onChange={setPane}
        options={[
          { id: "matrix", label: "Roles" },
          { id: "people", label: "People" },
          { id: "invite", label: "Invite" },
        ]}
      />
      <div className="max-h-[65dvh] space-y-4 overflow-y-auto pr-0.5">
        {pane === "matrix" && (
          <AccessMatrix
            people={accepted}
            onCycle={(person, tab) => {
              const current = person.scopes ?? roleScopes(person.circle);
              const grants = grantsFromScopes(current);
              const nextLevel = cycleAccess(grants[tab] ?? null);
              if (!nextLevel) delete grants[tab];
              else grants[tab] = nextLevel;
              setPersonScopes(person, scopesFromGrants(person.circle, grants));
            }}
            onReset={(person) => setPersonScopes(person, roleScopes(person.circle))}
          />
        )}

        {pane === "people" && (
          <>
            {(["family", "friends", "coworkers", "advisors"] as GroupId[]).map((g) => {
              const members = accepted.filter((p) => circleGroup(p.circle) === g);
              return (
                <section key={g}>
                  <p className="mb-1 text-xs uppercase tracking-wide text-subtle">{CIRCLE_GROUP[g].label}</p>
                  {members.length === 0 ? (
                    <p className="text-xs text-muted">None yet.</p>
                  ) : (
                    <ul className="space-y-1">
                      {members.map((p) => (
                        <PersonRow
                          key={p.id}
                          person={p}
                          onView={() => {
                            setActor(p.id);
                            onClose();
                          }}
                          onRevoke={() => {
                            const r = act("people.revoke", { id: p.id });
                            if (!r.ok) toast.error(r.error);
                          }}
                        />
                      ))}
                    </ul>
                  )}
                </section>
              );
            })}
            {pending.length > 0 && (
              <section>
                <p className="mb-1 text-xs uppercase tracking-wide text-subtle">Pending</p>
                <ul className="space-y-1">
                  {pending.map((p) => (
                    <li key={p.id} className="rounded-md bg-elevated p-2 shadow-border">
                      <p className="text-sm font-medium">{p.name}</p>
                      <p className="text-xs text-muted">
                        {p.title} · {p.inviteChannel} · {describeScopes(p.scopes ?? roleScopes(p.circle))}
                      </p>
                      <div className="mt-2 flex flex-wrap gap-2">
                        <Button
                          size="sm"
                          onClick={() => {
                            const r = act("people.accept", { id: p.id });
                            if (r.ok) toast(`${p.shortName} can switch in`);
                            else toast.error(r.error);
                          }}
                        >
                          Mark accepted
                        </Button>
                        {(p.phone || p.email) && (
                          <a
                            href={channelUrl(
                              p.inviteChannel ?? "whatsapp",
                              (p.inviteChannel === "email" ? p.email : p.phone) || p.email || p.phone || "",
                              `LivinSync · ${p.title}`,
                              inviteBody(p, p.scopes ?? roleScopes(p.circle), origin, p.id),
                            )}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex h-8 items-center rounded-sm px-2.5 text-xs text-muted"
                          >
                            Resend
                          </a>
                        )}
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            const r = act("people.revoke", { id: p.id });
                            if (!r.ok) toast.error(r.error);
                          }}
                        >
                          Revoke
                        </Button>
                      </div>
                    </li>
                  ))}
                </ul>
              </section>
            )}
          </>
        )}

        {pane === "invite" && (
          <section className="space-y-3">
            <Segmented
              value={group}
              onChange={pickGroup}
              options={[
                { id: "family", label: "Family" },
                { id: "friends", label: "Friends" },
                { id: "coworkers", label: "Work" },
                { id: "advisors", label: "Advisors" },
              ]}
            />
            {group === "advisors" && (
              <div className="flex flex-wrap gap-1">
                {CIRCLE_GROUP.advisors.circles.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => pickCircle(c)}
                    className={cn(
                      "h-8 rounded-sm px-2 text-xs",
                      circle === c ? "bg-elevated text-foreground shadow-border" : "text-muted",
                    )}
                  >
                    {CIRCLE_META[c].label}
                  </button>
                ))}
              </div>
            )}
            <p className="text-xs text-muted">{meta.blurb}</p>
            <Field label="Name">
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Full name" />
            </Field>
            <div className="grid grid-cols-2 gap-2">
              <Field label="WhatsApp">
                <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="98xxxxxxxx" inputMode="tel" />
              </Field>
              <Field label="Email">
                <Input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name@mail" inputMode="email" />
              </Field>
            </div>
            <Segmented
              value={channel}
              onChange={setChannel}
              options={[
                { id: "whatsapp", label: "WhatsApp" },
                { id: "email", label: "Email" },
              ]}
            />
            <div>
              <p className="mb-1.5 text-xs font-medium text-muted">Access · tap to cycle — / V / E / A</p>
              <div className="flex flex-wrap gap-1">
                {RBAC_TABS.map((t) => (
                  <GrantChip key={t} tab={t} access={grants[t] ?? null} onClick={() => cycleGrant(t)} />
                ))}
              </div>
            </div>
            <Button onClick={send} className="w-full">
              Send {channel === "whatsapp" ? "WhatsApp" : "email"}
            </Button>
            {lastLink && (
              <a
                href={lastLink.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex h-10 items-center justify-center rounded-md bg-elevated text-sm shadow-border"
              >
                Open {lastLink.channel === "whatsapp" ? "WhatsApp" : "mail"} for {lastLink.name}
              </a>
            )}
          </section>
        )}
      </div>
    </Modal>
  );
}

function GrantChip({ tab, access, onClick }: { tab: TabId; access: Access | null; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "h-8 rounded-sm px-2 text-xs",
        access ? "bg-elevated text-foreground shadow-border" : "text-muted",
      )}
    >
      {TAB_SHORT[tab]} {accessMark(access)}
    </button>
  );
}

function AccessMatrix({
  people,
  onCycle,
  onReset,
}: {
  people: Person[];
  onCycle: (person: Person, tab: TabId) => void;
  onReset: (person: Person) => void;
}) {
  return (
    <div className="space-y-2">
      <p className="text-xs text-muted">Tap a cell: none → view → edit → admin → none. Files and Home stay yours.</p>
      <p className="text-xs text-subtle">V view · E edit · A admin. Health admin can write the chart; trainers stay workout on edit.</p>
      {people.length === 0 ? (
        <p className="text-sm text-muted">Invite someone first.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[36rem] border-collapse text-xs">
            <thead>
              <tr>
                <th className="sticky left-0 bg-surface py-1.5 pr-2 text-left font-medium text-muted">Role</th>
                {RBAC_TABS.map((t) => (
                  <th key={t} className="px-0.5 py-1.5 text-center font-medium text-muted">
                    {TAB_SHORT[t]}
                  </th>
                ))}
                <th className="w-10" />
              </tr>
            </thead>
            <tbody>
              {people.map((p) => {
                const grants = grantsFromScopes(p.scopes ?? roleScopes(p.circle));
                return (
                  <tr key={p.id} className="border-t border-border">
                    <td className="sticky left-0 bg-surface py-1 pr-2">
                      <p className="font-medium text-foreground">{p.shortName}</p>
                      <p className="text-subtle">{p.title}</p>
                    </td>
                    {RBAC_TABS.map((t) => {
                      const a = grants[t] ?? null;
                      return (
                        <td key={t} className="px-0.5 py-1 text-center">
                          <button
                            type="button"
                            onClick={() => onCycle(p, t)}
                            className={cn(
                              "mx-auto flex size-8 items-center justify-center rounded-sm font-mono",
                              a === "admin" ? "bg-elevated text-foreground shadow-border" : a ? "text-foreground" : "text-subtle",
                            )}
                            aria-label={`${p.shortName} ${t} ${accessMark(a)}`}
                          >
                            {accessMark(a)}
                          </button>
                        </td>
                      );
                    })}
                    <td className="py-1 pl-1">
                      <button type="button" className="text-subtle" onClick={() => onReset(p)}>
                        Reset
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function PersonRow({ person, onView, onRevoke }: { person: Person; onView: () => void; onRevoke: () => void }) {
  const scopes = person.scopes ?? roleScopes(person.circle);
  return (
    <li className="flex items-center gap-2 rounded-md px-1 py-1">
      <button type="button" onClick={onView} className="min-w-0 flex-1 text-left">
        <p className="text-sm font-medium">{person.shortName}</p>
        <p className="truncate text-xs text-muted">
          {person.title} · {describeScopes(scopes)}
        </p>
      </button>
      <button type="button" className="text-xs text-subtle" onClick={onRevoke}>
        Remove
      </button>
    </li>
  );
}
