import { useState, type FormEvent, type ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { GROK_PROVIDERS, authClient, authEnabled, signIn } from "@/lib/auth/client";
import { Button, Input } from "@/components/ui/primitives";

export function AuthScreen({
  mode,
}: {
  mode: "login" | "signup";
}) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const signup = mode === "signup";

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!authEnabled) return;
    setBusy(true);
    setError(null);
    const r = signup
      ? await authClient.signUp.email({ name: name.trim() || email.split("@")[0], email, password, callbackURL: "/" })
      : await authClient.signIn.email({ email, password, callbackURL: "/" });
    setBusy(false);
    if (r.error) {
      setError(r.error.message || "Could not continue.");
      return;
    }
    window.location.assign("/");
  }

  return (
    <main className="grid min-h-dvh place-items-center bg-background px-6 py-10 text-foreground">
      <div className="w-full max-w-sm space-y-6">
        <div>
          <p className="text-xs uppercase tracking-wide text-subtle">LivinSync</p>
          <h1 className="mt-1 text-2xl font-medium tracking-tight">{signup ? "Create account" : "Sign in"}</h1>
          <p className="mt-1 text-sm text-muted">
            {signup ? "Email, or Google / X. Local data stays on this device." : "Welcome back. Same account on this device."}
          </p>
        </div>
        {authEnabled ? (
          <>
            <form onSubmit={onSubmit} className="space-y-3">
              {signup && (
                <label className="block space-y-1">
                  <span className="text-xs uppercase tracking-wide text-subtle">Name</span>
                  <Input value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" placeholder="Rajan" />
                </label>
              )}
              <label className="block space-y-1">
                <span className="text-xs uppercase tracking-wide text-subtle">Email</span>
                <Input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                  placeholder="you@example.com"
                />
              </label>
              <label className="block space-y-1">
                <span className="text-xs uppercase tracking-wide text-subtle">Password</span>
                <Input
                  type="password"
                  required
                  minLength={8}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete={signup ? "new-password" : "current-password"}
                  placeholder="At least 8 characters"
                />
              </label>
              {error && <p className="text-sm text-bad">{error}</p>}
              <Button type="submit" className="w-full" disabled={busy}>
                {busy ? "Working…" : signup ? "Sign up" : "Sign in"}
              </Button>
            </form>
            <div className="flex items-center gap-3 text-xs uppercase tracking-wide text-subtle">
              <span className="h-px flex-1 bg-border" />
              or
              <span className="h-px flex-1 bg-border" />
            </div>
            <div className="space-y-2">
              {GROK_PROVIDERS.map((p) => (
                <Button
                  key={p.providerId}
                  type="button"
                  variant="secondary"
                  className="w-full"
                  onClick={() => signIn(p.providerId, { callbackURL: "/" })}
                >
                  Continue with {p.label}
                </Button>
              ))}
            </div>
            <p className="text-sm text-muted">
              {signup ? (
                <>
                  Already have an account?{" "}
                  <Link to="/login" className="text-foreground">
                    Sign in
                  </Link>
                </>
              ) : (
                <>
                  New here?{" "}
                  <Link to="/signup" className="text-foreground">
                    Sign up
                  </Link>
                </>
              )}
            </p>
          </>
        ) : (
          <p className="text-sm text-muted">Sign-in is disabled.</p>
        )}
        <div className="flex flex-wrap gap-4">
          <Link to="/" className="inline-block text-sm text-muted">
            Back to app
          </Link>
          <Link to="/privacy" className="inline-block text-sm text-muted">
            Privacy
          </Link>
        </div>
      </div>
    </main>
  );
}

export function AuthActions({ compact = false }: { compact?: boolean }) {
  return (
    <div className={compact ? "flex flex-col gap-1" : "flex flex-col gap-2"}>
      <Link
        to="/login"
        className="flex h-10 items-center rounded-sm px-2 text-sm text-foreground hover:bg-surface"
      >
        Sign in
      </Link>
      <Link
        to="/signup"
        className="flex h-10 items-center rounded-sm px-2 text-sm text-foreground hover:bg-surface"
      >
        Sign up
      </Link>
    </div>
  );
}

export function AuthShell({ children }: { children: ReactNode }) {
  return (
    <main className="min-h-dvh bg-background px-6 py-8 text-foreground md:px-12">
      {children}
    </main>
  );
}
