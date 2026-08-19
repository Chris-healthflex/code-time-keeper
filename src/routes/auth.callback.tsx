import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { resolveAuthDestination } from "@/lib/auth.functions";
import logoWhite from "@/assets/logo-white.png";

export const Route = createFileRoute("/auth/callback")({
  head: () => ({ meta: [{ title: "Signing you in… — Stance Health" }] }),
  component: AuthCallbackPage,
});

function AuthCallbackPage() {
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let done = false;

    const timeout = setTimeout(() => {
      if (!done) {
        done = true;
        setError("Sign-in link expired or already used. Please try signing in again.");
      }
    }, 10000); // 10 seconds timeout

    async function redirect() {
      if (done) return;
      done = true;
      clearTimeout(timeout);
      try {
        const result = await resolveAuthDestination();
        if (!result.path) {
          setError(
            `The email ${result.email ?? "used"} has not been invited. Contact the admin.`,
          );
          return;
        }
        // Hard-navigate for candidate paths (token in URL, needs full page load)
        if (result.destination === "candidate") {
          window.location.href = result.path;
        } else {
          navigate({ to: result.path as "/" });
        }
      } catch {
        setError("Authentication failed. Please try again.");
      }
    }

    // Handle PKCE code exchange + implicit hash tokens
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if ((event === "SIGNED_IN" || event === "INITIAL_SESSION") && session) {
        redirect();
      }
    });

    // Also check if a session is already present (e.g. page refreshed)
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) redirect();
    });

    return () => {
      clearTimeout(timeout);
      sub.subscription.unsubscribe();
    };
  }, [navigate]);

  if (error) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center bg-background px-6 text-center">
        <img src={logoWhite} alt="Stance Health" className="mx-auto mb-8 h-7 w-auto" />
        <div className="max-w-sm rounded-xl border border-destructive/30 bg-destructive/5 px-6 py-5">
          <p className="text-[13px] font-medium text-destructive">Not authorised</p>
          <p className="mt-1 text-[13px] text-muted-foreground">{error}</p>
        </div>
        <a
          href="/auth"
          className="mt-6 text-[13px] text-muted-foreground underline-offset-4 hover:underline"
        >
          ← Back to sign in
        </a>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-background">
      <img src={logoWhite} alt="Stance Health" className="mx-auto mb-8 h-7 w-auto" />
      <div className="flex items-center gap-3 text-[13px] text-muted-foreground">
        <span className="h-4 w-4 animate-spin rounded-full border-2 border-muted-foreground/30 border-t-muted-foreground" />
        Signing you in…
      </div>
    </main>
  );
}
