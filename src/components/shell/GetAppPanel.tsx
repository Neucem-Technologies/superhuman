import { type ReactNode } from "react";
import { Share, SquarePlus, MoreVertical } from "lucide-react";
import { toast } from "sonner";
import { Button, Modal } from "@/components/ui/primitives";
import { cn } from "@/lib/utils";
import { useInstall } from "@/lib/install";

export function GetAppPanel({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { deferred, standalone, platform, install } = useInstall();

  async function onAndroidInstall() {
    const ok = await install();
    if (ok) toast("LivinSync is on your home screen.");
    else if (!deferred) toast("Use Chrome’s menu → Install app.");
  }

  return (
    <Modal open={open} onClose={onClose} title="Get the app">
      <p className="text-xs text-muted">
        {standalone
          ? "You’re already in the installed app."
          : "iPhone and Android — same OS on the home screen, full screen, no browser chrome."}
      </p>

      <div className="grid grid-cols-2 gap-2">
        <OsCard
          title="iPhone"
          src="/install/ios-home.jpg"
          alt="LivinSync on iOS home screen"
          highlight={platform === "ios"}
        >
          <ol className="space-y-1.5 text-xs text-muted">
            <li className="flex items-start gap-2">
              <span className="mt-0.5 font-mono text-subtle">1</span>
              Open LivinSync in Safari.
            </li>
            <li className="flex items-start gap-2">
              <Share className="mt-0.5 size-3.5 shrink-0 text-foreground" />
              Tap Share.
            </li>
            <li className="flex items-start gap-2">
              <SquarePlus className="mt-0.5 size-3.5 shrink-0 text-foreground" />
              Add to Home Screen, then Add.
            </li>
          </ol>
        </OsCard>

        <OsCard
          title="Android"
          src="/install/android-home.jpg"
          alt="LivinSync on Android home screen"
          highlight={platform === "android"}
        >
          {deferred ? (
            <Button size="sm" onClick={() => void onAndroidInstall()}>
              Install LivinSync
            </Button>
          ) : (
            <ol className="space-y-1.5 text-xs text-muted">
              <li className="flex items-start gap-2">
                <span className="mt-0.5 font-mono text-subtle">1</span>
                Open LivinSync in Chrome.
              </li>
              <li className="flex items-start gap-2">
                <MoreVertical className="mt-0.5 size-3.5 shrink-0 text-foreground" />
                Menu → Install app.
              </li>
            </ol>
          )}
        </OsCard>
      </div>
    </Modal>
  );
}

function OsCard({
  title,
  src,
  alt,
  highlight,
  children,
}: {
  title: string;
  src: string;
  alt: string;
  highlight: boolean;
  children: ReactNode;
}) {
  return (
    <div className={cn("rounded-md bg-elevated p-3 shadow-border", highlight && "ring-1 ring-accent/40")}>
      <p className="text-xs font-medium uppercase tracking-wide text-subtle">{title}</p>
      <div className="mx-auto mt-2 w-full max-w-[9.5rem] overflow-hidden rounded-[1.15rem] bg-background shadow-border">
        <img src={src} alt={alt} className="block aspect-[9/16] w-full object-cover object-top" />
      </div>
      <div className="mt-3 space-y-2">{children}</div>
    </div>
  );
}
