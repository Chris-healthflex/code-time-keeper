import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useEffect, type ComponentType } from "react";
import { supabase } from "@/integrations/supabase/client";
import logoWhite from "@/assets/logo-white.png";

export const Route = createFileRoute("/auth/")({
  head: () => ({
    meta: [{ title: "Sign in — Stance Health Assignments" }],
  }),
  component: AuthPage,
});

function ClientOnlyBackground() {
  const [Bg, setBg] = useState<ComponentType | null>(null);

  useEffect(() => {
    import("@/components/ui/neon-dither").then((m) => {
      setBg(() => m.PaperDesignBackground as ComponentType);
    });
  }, []);

  if (!Bg) return null;
  return <Bg />;
}

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

function AuthPage() {
  const [otpEmail, setOtpEmail] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [otpLoading, setOtpLoading] = useState(false);
  const [otpError, setOtpError] = useState<string | null>(null);
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
  }

  return (
    <div className="relative min-h-screen flex">
      {/* Full-viewport neon-dither background */}
      <ClientOnlyBackground />

      {/* Left panel — branding, transparent to show background */}
      <div className="hidden lg:flex flex-col justify-between w-1/2 p-12 relative z-10">
        <Link to="/">
          <img
            src={logoWhite}
            alt="Stance Health"
            className="h-7 w-auto invert dark:invert-0"
          />
        </Link>

        <div className="max-w-sm">
          <h2
            className="text-4xl xl:text-5xl font-extrabold uppercase tracking-tight text-neutral-900 dark:text-white leading-tight"
          >
            Timed assignments.
            <br />
            Zero tampering.
          </h2>
          <p className="mt-4 text-[14px] leading-relaxed text-neutral-700 dark:text-white/60">
            One encrypted link per candidate. The clock starts server-side the moment they open it.
          </p>
        </div>

        <p className="text-[11px] text-neutral-500 dark:text-white/30">
          © {new Date().getFullYear()} Stance Health
        </p>
      </div>

      {/* Right panel — solid card, always on top of background */}
      <div className="flex flex-1 lg:w-1/2 items-center justify-center relative z-10 p-6">
        <div className="w-full max-w-sm rounded-2xl border border-border bg-card/90 backdrop-blur-xl px-8 py-10 shadow-xl">
          {/* Logo — visible only on mobile */}
          <div className="mb-8 lg:hidden text-center">
            <Link to="/">
              <img src={logoWhite} alt="Stance Health" className="mx-auto h-7 w-auto invert dark:invert-0" />
            </Link>
          </div>

          <h1 className="text-xl font-semibold tracking-tight text-foreground">Sign in</h1>
          <p className="mt-1 text-[13px] text-muted-foreground">
            Sign in with the email your assignment was sent to.
          </p>

          <div className="mt-6 space-y-4">
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
              <p className="rounded-md bg-amber-500/10 px-3 py-2 text-[12px] text-amber-700 dark:text-amber-400">
                {googleError}
              </p>
            )}

            {/* Divider */}
            <div className="flex items-center gap-3">
              <div className="h-px flex-1 bg-border" />
              <span className="text-[11px] text-muted-foreground">or</span>
              <div className="h-px flex-1 bg-border" />
            </div>

            {/* Magic link */}
            <div className="rounded-xl border border-border bg-background/60 p-5">
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
                      Email link
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

            <p className="text-center text-[11px] text-muted-foreground">
              Use the same email address your assignment invitation was sent to.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
