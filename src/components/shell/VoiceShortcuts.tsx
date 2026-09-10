import { useMemo, useState } from "react";
import { Command, Plus, X } from "lucide-react";
import { toast } from "sonner";
import { Button, Input, Modal } from "@/components/ui/primitives";
import { cn } from "@/lib/utils";
import { BUILTIN_SHORTCUTS, visibleShortcuts } from "@/spine/commands";
import { useAppStore } from "@/spine/store";

export function VoiceShortcuts({
  disabled,
  onRun,
}: {
  disabled: boolean;
  onRun: (phrase: string) => void;
}) {
  const adherence = useAppStore((s) => s.adherence);
  const suggestions = useAppStore((s) => s.suggestions);
  const bills = useAppStore((s) => s.bills);
  const custom = useAppStore((s) => s.shortcuts ?? []);
  const act = useAppStore((s) => s.act);
  const chips = useMemo(
    () => visibleShortcuts(useAppStore.getState()),
    [adherence, suggestions, bills, custom],
  );
  const [open, setOpen] = useState(false);
  const [phrase, setPhrase] = useState("");
  const [command, setCommand] = useState("");

  function save() {
    const r = act("shortcut.save", { phrase: phrase.trim(), command: command.trim() });
    if (!r.ok) {
      toast.error(r.error);
      return;
    }
    setPhrase("");
    setCommand("");
    toast(`Shortcut “${phrase.trim()}” saved`);
  }

  return (
    <>
      <div className="mb-1.5 flex items-center gap-1 overflow-x-auto px-1 no-scrollbar">
        {chips.map((c) => (
          <button
            key={c.phrase}
            type="button"
            title={c.hint}
            disabled={disabled}
            onClick={() => onRun(c.phrase)}
            className={cn(
              "pressable relative h-8 shrink-0 rounded-sm bg-surface px-2 text-xs text-muted shadow-border hover:text-foreground disabled:opacity-40",
              "after:absolute after:top-1/2 after:left-1/2 after:h-10 after:min-w-10 after:-translate-x-1/2 after:-translate-y-1/2",
            )}
          >
            {c.phrase}
          </button>
        ))}
        <button
          type="button"
          aria-label="Manage voice shortcuts"
          disabled={disabled}
          onClick={() => setOpen(true)}
          className="relative flex size-8 shrink-0 items-center justify-center rounded-sm text-muted hover:text-foreground after:absolute after:top-1/2 after:left-1/2 after:size-10 after:-translate-x-1/2 after:-translate-y-1/2"
        >
          <Command className="size-3.5" />
        </button>
      </div>
      <Modal open={open} onClose={() => setOpen(false)} title="Voice shortcuts">
        <p className="text-xs text-muted">
          Say the phrase into the mic, or tap a chip. Custom ones persist on this device.
        </p>
        <ul className="max-h-40 space-y-1 overflow-y-auto">
          {BUILTIN_SHORTCUTS.map((s) => (
            <li key={s.phrase} className="flex items-baseline justify-between gap-2 py-1 text-xs">
              <span className="font-medium">{s.phrase}</span>
              <span className="truncate text-subtle">{s.hint}</span>
            </li>
          ))}
        </ul>
        {custom.length > 0 && (
          <ul className="space-y-1">
            {custom.map((s) => (
              <li key={s.id} className="flex items-center gap-2 text-xs">
                <span className="font-medium">{s.phrase}</span>
                <span className="min-w-0 flex-1 truncate text-subtle">{s.command}</span>
                <button
                  type="button"
                  aria-label={`Remove ${s.phrase}`}
                  className="relative size-8 text-muted after:absolute after:inset-0"
                  onClick={() => {
                    const r = act("shortcut.delete", { id: s.id });
                    if (!r.ok) toast.error(r.error);
                  }}
                >
                  <X className="mx-auto size-3" />
                </button>
              </li>
            ))}
          </ul>
        )}
        <div className="grid grid-cols-2 gap-2">
          <Input value={phrase} onChange={(e) => setPhrase(e.target.value)} placeholder="Phrase · gym" />
          <Input value={command} onChange={(e) => setCommand(e.target.value)} placeholder="Runs · Go to health" />
        </div>
        <Button
          type="button"
          size="sm"
          variant="secondary"
          disabled={!phrase.trim() || !command.trim()}
          onClick={save}
        >
          <Plus className="size-3" />
          Save shortcut
        </Button>
      </Modal>
    </>
  );
}
