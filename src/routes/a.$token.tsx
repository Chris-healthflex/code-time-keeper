import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { openAssignment, type CandidateView } from "@/lib/candidate.functions";
import logoWhite from "@/assets/logo-white.png";

export const Route = createFileRoute("/a/$token")({
  head: () => ({
    meta: [{ title: "Your Assignment — Stance Health" }],
  }),
  component: CandidatePage,
});

function formatRemaining(ms: number): string {
  if (ms <= 0) return "00:00:00";
  const totalSec = Math.floor(ms / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  return [h, m, s].map((n) => String(n).padStart(2, "0")).join(":");
}

function CandidatePage() {
  const { token } = Route.useParams();
  const [view, setView] = useState<CandidateView | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [now, setNow] = useState(() => Date.now());

  const refresh = useCallback(async () => {
    try {
      const data = await openAssignment({ data: { token } });
      setView(data);
      if (!data.ok) {
        setError(
          data.reason === "closed"
            ? "Submission window has closed."
            : data.reason === "revoked"
              ? "This link has been revoked."
              : "This link is invalid or expired.",
        );
      } else {
        setError(null);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load assignment");
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    refresh();
    const poll = setInterval(refresh, 30_000);
    return () => clearInterval(poll);
  }, [refresh]);

  useEffect(() => {
    const tick = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(tick);
  }, []);

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-background">
        <p className="text-sm text-muted-foreground">Starting your assignment…</p>
      </main>
    );
  }

  if (error || !view?.ok) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center bg-background px-6 text-center">
        <div className="max-w-md">
          <h1 className="text-xl font-medium tracking-tight text-foreground">Access closed</h1>
          <p className="mt-3 text-[14px] leading-relaxed text-muted-foreground">
            {error ?? "This assignment link is no longer available."}
          </p>
        </div>
      </main>
    );
  }

  const targetIso = view.status === "grace" ? view.graceEndsAt : view.endsAt;
  const targetMs = targetIso ? new Date(targetIso).getTime() : 0;
  // Align client clock using serverNow offset
  const serverOffset = view.serverNow ? new Date(view.serverNow).getTime() - Date.now() : 0;
  const remaining = targetMs - (now + serverOffset);
  const isGrace = view.status === "grace";
  const isSubmitted = view.status === "submitted";

  return (
    <main className="min-h-screen bg-background">
      <header className="border-b border-border/70 px-6 py-4">
        <div className="mx-auto flex max-w-3xl items-center justify-between">
          <div className="flex items-center gap-2 text-sm font-medium">
            <img src={logoWhite} alt="Stance Health" className="h-6 w-auto" />
          </div>
          <div className="text-[12px] text-muted-foreground">{view.email}</div>
        </div>
      </header>

      <div className="mx-auto max-w-3xl px-6 py-10">
        {/* Timer bar */}
        <div
          className={`mb-10 rounded-xl border px-6 py-5 ${
            isSubmitted
              ? "border-border bg-secondary/40"
              : isGrace
                ? "border-amber-500/40 bg-amber-500/5"
                : "border-border bg-card"
          }`}
        >
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                {isSubmitted ? "Status" : isGrace ? "Grace period remaining" : "Time remaining"}
              </p>
              <p className="mt-1 font-mono text-3xl font-medium tracking-tight tabular-nums text-foreground sm:text-4xl">
                {isSubmitted ? "Submitted" : formatRemaining(remaining)}
              </p>
            </div>
            <div className="text-right text-[13px] text-muted-foreground">
              {isGrace && (
                <p className="font-medium text-amber-700 dark:text-amber-400">
                  Push your final code now
                </p>
              )}
              {!isSubmitted && targetIso && (
                <p className="mt-0.5">
                  Ends {new Date(targetIso).toLocaleString(undefined, { timeZoneName: "short" })}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Title + repo */}
        <h1 className="text-2xl font-medium tracking-tight text-foreground sm:text-3xl">
          {view.title}
        </h1>

        <div className="mt-4 flex flex-wrap items-center gap-3 text-[13px]">
          <span className="text-muted-foreground">Submit to:</span>
          <a
            href={view.githubRepo}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-md border border-border bg-secondary/50 px-2.5 py-1 font-mono text-[12px] text-foreground transition-colors hover:bg-secondary"
          >
            {view.githubRepo?.replace(/^https?:\/\//, "")}
          </a>
        </div>

        {/* Problem statement */}
        <section className="panel mt-10 p-6 sm:p-8">
          <h2 className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
            Problem statement
          </h2>
          <div className="prose-sm mt-4 max-w-none whitespace-pre-wrap text-[14px] leading-relaxed text-foreground">
            {view.problemStatement}
          </div>
        </section>

        <p className="mt-8 text-center text-[12px] text-muted-foreground">
          Timer is controlled server-side. Do not close this page until you have pushed your code.
          {isGrace && " You are in the final 10-minute submission window."}
        </p>
      </div>
    </main>
  );
}
