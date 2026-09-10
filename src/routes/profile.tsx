import { Link, createFileRoute } from "@tanstack/react-router";
import { SignedIn, SignedOut, UserButton } from "@/lib/auth/gates";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { AuthActions } from "@/components/auth/AuthScreen";

export const Route = createFileRoute("/profile")({ component: Profile });

function Profile() {
  const { isPending } = useCurrentUserState();
  return (
    <main className="min-h-dvh bg-background px-6 py-8 text-foreground md:px-12">
      <div className="mx-auto w-full max-w-sm space-y-6">
        <div>
          <p className="text-xs uppercase tracking-[0.16em] text-subtle">Account</p>
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
        <Link to="/" className="inline-block text-sm text-muted">
          Back to app
        </Link>
      </div>
    </main>
  );
}
