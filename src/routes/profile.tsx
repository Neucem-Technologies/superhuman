import { useState } from "react";
import { Link, createFileRoute } from "@tanstack/react-router";
import { SignedIn, SignedOut, UserButton } from "@/lib/auth/gates";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { AuthActions } from "@/components/auth/AuthScreen";
import { GetAppPanel } from "@/components/shell/GetAppPanel";
import { Button } from "@/components/ui/primitives";

export const Route = createFileRoute("/profile")({ component: Profile });

function Profile() {
  const { isPending } = useCurrentUserState();
  const [getApp, setGetApp] = useState(false);
  return (
    <main className="min-h-dvh px-6 py-8 text-foreground md:px-12">
      <div className="mx-auto w-full max-w-sm space-y-6">
        <div>
          <p className="text-xs uppercase tracking-wide text-subtle">Account</p>
          <h1 className="mt-1 text-2xl font-medium tracking-tight">Profile</h1>
          <p className="mt-1 text-sm text-muted">Sign in to keep this identity. The OS still lives on this device.</p>
        </div>
        <div className="rounded-md bg-elevated p-4 shadow-border">
          {isPending ? (
            <div className="h-10 animate-pulse rounded-sm bg-surface" />
          ) : (
            <>
              <SignedIn>
                <UserButton />
              </SignedIn>
              <SignedOut>
                <p className="mb-2 text-sm text-muted">You’re signed out.</p>
                <AuthActions />
              </SignedOut>
            </>
          )}
        </div>
        <div className="rounded-md bg-elevated p-4 shadow-border">
          <p className="text-xs uppercase tracking-wide text-subtle">Settings</p>
          <p className="mt-1 text-sm text-muted">Theme, text size, glass, and tile colour.</p>
          <Link
            to="/settings"
            className="mt-3 inline-flex h-8 items-center rounded-sm bg-elevated px-2.5 text-xs font-medium shadow-border"
          >
            Open settings
          </Link>
        </div>
        <div className="rounded-md bg-elevated p-4 shadow-border">
          <p className="text-xs uppercase tracking-wide text-subtle">Phones</p>
          <p className="mt-1 text-sm text-muted">Install LivinSync on iPhone or Android. Same OS, home screen icon.</p>
          <Button className="mt-3" size="sm" onClick={() => setGetApp(true)}>
            Get iPhone & Android
          </Button>
        </div>
        <div className="flex flex-wrap gap-4">
          <Link to="/" className="inline-block text-sm text-muted">
            Back to app
          </Link>
          <Link to="/privacy" className="inline-block text-sm text-muted">
            Privacy policy
          </Link>
        </div>
      </div>
      <GetAppPanel open={getApp} onClose={() => setGetApp(false)} />
    </main>
  );
}
