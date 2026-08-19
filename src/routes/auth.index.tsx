import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import logoWhite from "@/assets/logo-white.png";

export const Route = createFileRoute("/auth/")({
  head: () => ({
    meta: [{ title: "Sign in — Stance Health Assignments" }],
  }),
  component: AuthPage,
});

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
      <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4" />
      <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z" fill="#34A853" />
      <path d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05" />
      <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335" />
    </svg>
  );
}

type Mode = "magic" | "password";

function AuthPage() {
  const [mode, setMode] = useState<Mode>("magic");

  // Magic link state
  const [otpEmail, setOtpEmail] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [otpLoading, setOtpLoading] = useState(false);
  const [otpError, setOtpError] = useState<string | null>(null);

  // Password state
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [pwLoading, setPwLoading] = useState(false);
  const [pwError, setPwError] = useState<string | null>(null);

  // Google state
  const [googleLoading, setGoogleLoading] = useState(false);
  const [googleError, setGoogleError] = useState<string | null>(null);

  async function handleMagicLink(e: React.FormEvent) {
    e.preventDefault();
    setOtpLoading(true);
    setOtpError(null);
    const { error } = await supabase.auth.signInWithOtp({
      email: otpEmail,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
        shouldCreateUser: false,
      },
    });
    setOtpLoading(false);
    if (error) {
      if (error.message.toLowerCase().includes("not found") || error.status === 400) {
        setOtpError("This email hasn't been invited. Contact the admin.");
      } else {
        setOtpError(error.message);
      }
    } else {
      setOtpSent(true);
    }
  }

  async function handlePassword(e: React.FormEvent) {
    e.preventDefault();
    setPwLoading(true);
    setPwError(null);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setPwLoading(false);
    if (error) {
      setPwError(error.message);
    } else {
      window.location.href = "/auth/callback";
    }
  }

  async function handleGoogle() {
    setGoogleLoading(true);
    setGoogleError(null);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
        queryParams: { prompt: "select_account" },
      },
    });
    if (error) {
      setGoogleError(error.message);
      setGoogleLoading(false);
    }
    // on success the browser navigates away — no cleanup needed
  }

  return (
    <main className="relative flex min-h-screen flex-col items-center justify-center bg-background px-6">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,oklch(0.97_0_0)_0%,transparent_70%)]" />

      <div className="relative z-10 w-full max-w-sm">
        <div className="mb-10 text-center">
          <Link to="/">
            <img src={logoWhite} alt="Stance Health" className="mx-auto h-7 w-auto" />
          </Link>
          <h1 className="mt-6 text-2xl font-medium tracking-tight text-foreground">Sign in</h1>
          <p className="mt-2 text-[13px] text-muted-foreground">
            Admin access or your assigned assessment.
          </p>
        </div>

        {/* Google */}
        <button
          type="button"
          onClick={handleGoogle}
          disabled={googleLoading}
          className="flex w-full items-center justify-center gap-3 rounded-lg border border-border bg-background px-4 py-2.5 text-[13px] font-medium text-foreground shadow-sm transition-colors hover:bg-secondary disabled:opacity-60"
        >
          {googleLoading ? (
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-muted-foreground/30 border-t-muted-foreground" />
          ) : (
            <GoogleIcon />
          )}
          {googleLoading ? "Redirecting…" : "Continue with Google"}
        </button>
        {googleError && (
          <p className="mt-2 rounded-md bg-amber-500/10 px-3 py-2 text-[12px] text-amber-700 dark:text-amber-400">
            {googleError}
          </p>
        )}

        {/* Divider */}
        <div className="my-5 flex items-center gap-3">
          <div className="h-px flex-1 bg-border" />
          <span className="text-[11px] text-muted-foreground">or</span>
          <div className="h-px flex-1 bg-border" />
        </div>

        {/* Tab switcher */}
        <div className="mb-4 flex rounded-lg border border-border bg-secondary/40 p-0.5 text-[13px]">
          <button
            type="button"
            onClick={() => setMode("magic")}
            className={`flex-1 rounded-md py-1.5 font-medium transition-colors ${mode === "magic" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
          >
            Email link
          </button>
          <button
            type="button"
            onClick={() => setMode("password")}
            className={`flex-1 rounded-md py-1.5 font-medium transition-colors ${mode === "password" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
          >
            Password
          </button>
        </div>

        {/* Magic link panel */}
        {mode === "magic" && (
          <div className="panel p-6">
            {otpSent ? (
              <div className="text-center">
                <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-secondary">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-foreground">
                    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                    <polyline points="22,6 12,13 2,6" />
                  </svg>
                </div>
                <p className="text-[14px] font-medium text-foreground">Check your inbox</p>
                <p className="mt-1 text-[13px] text-muted-foreground">
                  We sent a sign-in link to <strong>{otpEmail}</strong>
                </p>
                <button
                  type="button"
                  onClick={() => { setOtpSent(false); setOtpError(null); }}
                  className="mt-4 text-[12px] text-muted-foreground underline-offset-4 hover:underline"
                >
                  Use a different email
                </button>
              </div>
            ) : (
              <form onSubmit={handleMagicLink} className="space-y-4">
                <div>
                  <label className="mb-1.5 block text-[12px] font-medium text-muted-foreground">
                    Email
                  </label>
                  <input
                    type="email"
                    required
                    value={otpEmail}
                    onChange={(e) => setOtpEmail(e.target.value)}
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none ring-offset-background focus:ring-2 focus:ring-ring"
                    placeholder="you@example.com"
                    autoComplete="email"
                  />
                </div>
                {otpError && (
                  <p className="rounded-md bg-destructive/10 px-3 py-2 text-[13px] text-destructive">
                    {otpError}
                  </p>
                )}
                <button
                  type="submit"
                  disabled={otpLoading}
                  className="cta-glow w-full py-2.5 text-sm font-medium disabled:opacity-60"
                >
                  {otpLoading ? "Sending…" : "Send sign-in link"}
                </button>
              </form>
            )}
          </div>
        )}

        {/* Password panel */}
        {mode === "password" && (
          <form onSubmit={handlePassword} className="panel space-y-4 p-6">
            <div>
              <label className="mb-1.5 block text-[12px] font-medium text-muted-foreground">Email</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none ring-offset-background focus:ring-2 focus:ring-ring"
                placeholder="admin@stance.health"
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
                autoComplete="current-password"
              />
            </div>
            {pwError && (
              <p className="rounded-md bg-destructive/10 px-3 py-2 text-[13px] text-destructive">{pwError}</p>
            )}
            <button
              type="submit"
              disabled={pwLoading}
              className="cta-glow w-full py-2.5 text-sm font-medium disabled:opacity-60"
            >
              {pwLoading ? "Signing in…" : "Sign in"}
            </button>
          </form>
        )}

        <p className="mt-6 text-center text-[11px] text-muted-foreground">
          Candidates: use the link sent to your email, or sign in above with the same address.
        </p>
      </div>
    </main>
  );
}
