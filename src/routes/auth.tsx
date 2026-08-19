import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import logoWhite from "@/assets/logo-white.png";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [{ title: "Sign in — Stance Health Assignments" }],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);

    try {
      if (mode === "signin") {
        const { error: err } = await supabase.auth.signInWithPassword({ email, password });
        if (err) throw err;
        navigate({ to: "/admin" });
      } else {
        const { error: err } = await supabase.auth.signUp({ email, password });
        if (err) throw err;
        setMessage("Account created. If this is the first admin (or you were invited), you can now sign in.");
        setMode("signin");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Authentication failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="relative flex min-h-screen flex-col items-center justify-center bg-background px-6">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,oklch(0.97_0_0)_0%,transparent_70%)]" />

      <div className="relative z-10 w-full max-w-sm">
        <div className="mb-10 text-center">
          <Link to="/" className="inline-flex items-center gap-2 text-sm font-medium text-foreground">
            <img src={logoWhite} alt="Stance Health" className="h-6 w-auto mx-auto" />
          </Link>
          <h1 className="mt-6 text-2xl font-medium tracking-tight text-foreground">
            {mode === "signin" ? "Sign in" : "Create admin account"}
          </h1>
          <p className="mt-2 text-[13px] text-muted-foreground">
            Admin access only. Candidates use their unique email link.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="panel space-y-4 p-6">
          <div>
            <label className="mb-1.5 block text-[12px] font-medium text-muted-foreground">Email</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none ring-offset-background focus:ring-2 focus:ring-ring"
              placeholder="you@stance.health"
              autoComplete="email"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-[12px] font-medium text-muted-foreground">Password</label>
            <input
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none ring-offset-background focus:ring-2 focus:ring-ring"
              placeholder="••••••••"
              autoComplete={mode === "signin" ? "current-password" : "new-password"}
            />
          </div>

          {error && (
            <p className="rounded-md bg-destructive/10 px-3 py-2 text-[13px] text-destructive">{error}</p>
          )}
          {message && (
            <p className="rounded-md bg-secondary px-3 py-2 text-[13px] text-secondary-foreground">{message}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="cta-glow w-full py-2.5 text-sm font-medium disabled:opacity-60"
          >
            {loading ? "Please wait…" : mode === "signin" ? "Sign in" : "Create account"}
          </button>
        </form>

        <p className="mt-6 text-center text-[13px] text-muted-foreground">
          {mode === "signin" ? (
            <>
              First admin?{" "}
              <button
                type="button"
                onClick={() => setMode("signup")}
                className="font-medium text-foreground underline-offset-4 hover:underline"
              >
                Create account
              </button>
            </>
          ) : (
            <>
              Already have an account?{" "}
              <button
                type="button"
                onClick={() => setMode("signin")}
                className="font-medium text-foreground underline-offset-4 hover:underline"
              >
                Sign in
              </button>
            </>
          )}
        </p>
      </div>
    </main>
  );
}
