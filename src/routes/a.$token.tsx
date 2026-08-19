import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import {
  peekAssignment,
  openAssignment,
  type AssignmentPreview,
  type CandidateView,
} from "@/lib/candidate.functions";
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

// ─── Question preview (before timer starts) ───────────────────────────────────

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mt-8">
      <h3 className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
        {title}
      </h3>
      {children}
    </div>
  );
}

/** Renders the problem statement with light structure: bold headers, bullet lists */
function ProblemStatement({ text }: { text: string }) {
  const lines = text.split("\n");
  const items: React.ReactNode[] = [];
  let listBuf: string[] = [];

  const flushList = (key: string) => {
    if (listBuf.length === 0) return;
    items.push(
      <ul key={`ul-${key}`} className="mt-2 space-y-1.5 pl-4">
        {listBuf.map((li, i) => (
          <li key={i} className="flex gap-2 text-[13.5px] leading-relaxed text-foreground/90">
            <span className="mt-[5px] h-1.5 w-1.5 flex-shrink-0 rounded-full bg-muted-foreground/50" />
            <span>{li}</span>
          </li>
        ))}
      </ul>,
    );
    listBuf = [];
  };

  lines.forEach((raw, i) => {
    const line = raw.trim();
    if (!line) {
      flushList(String(i));
      return;
    }
    // Bullet
    if (line.startsWith("- ") || line.startsWith("• ")) {
      listBuf.push(line.slice(2));
      return;
    }
    flushList(String(i));
    // Section heading (ends with colon, or ALL CAPS-ish short line)
    const isHeading =
      (line.endsWith(":") && line.length < 80 && !line.includes(".")) ||
      /^[A-Z][A-Za-z /()]+$/.test(line);
    if (isHeading) {
      items.push(
        <p key={i} className="mt-6 text-[13px] font-semibold text-foreground">
          {line}
        </p>,
      );
    } else {
      items.push(
        <p key={i} className="mt-2 text-[13.5px] leading-relaxed text-foreground/90">
          {line}
        </p>,
      );
    }
  });
  flushList("end");

  return <div>{items}</div>;
}

function QuestionPage({
  preview,
  onStart,
  starting,
}: {
  preview: AssignmentPreview;
  onStart: () => void;
  starting: boolean;
}) {
  return (
    <main className="min-h-screen bg-background">
      <header className="border-b border-border/70 px-6 py-4">
        <div className="mx-auto flex max-w-3xl items-center justify-between">
          <img src={logoWhite} alt="Stance Health" className="h-7 w-auto" />
          <span className="text-[12px] text-muted-foreground">{preview.email}</span>
        </div>
      </header>

      <div className="mx-auto max-w-3xl px-6 py-10">
        {/* Callout */}
        <div className="mb-8 rounded-xl border border-amber-500/30 bg-amber-500/5 px-5 py-4">
          <p className="text-[13px] font-medium text-amber-700 dark:text-amber-400">
            ⏱ Your {preview.durationHours}-hour clock starts the moment you click{" "}
            <span className="font-semibold">Start Assignment</span>. Read the full brief first.
          </p>
        </div>

        {/* Title */}
        <h1 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
          {preview.title}
        </h1>

        <div className="mt-3 flex flex-wrap items-center gap-3 text-[13px]">
          <span className="rounded-full border border-border bg-secondary/60 px-2.5 py-0.5 text-[11px] font-medium text-muted-foreground">
            {preview.durationHours}h timed
          </span>
          <span className="text-muted-foreground">Submit to:</span>
          <a
            href={preview.githubRepo}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-md border border-border bg-secondary/50 px-2.5 py-1 font-mono text-[12px] text-foreground transition-colors hover:bg-secondary"
          >
            {preview.githubRepo?.replace(/^https?:\/\//, "")}
          </a>
        </div>

        {/* Problem statement */}
        <div className="panel mt-8 px-6 py-7 sm:px-8">
          <h2 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            Assignment brief
          </h2>
          <div className="mt-4">
            <ProblemStatement text={preview.problemStatement ?? ""} />
          </div>
        </div>

        {/* Deliverables reminder */}
        <Section title="Before you start">
          <ul className="space-y-2">
            {[
              "Read the full brief above carefully — the clock starts when you click the button below.",
              `You have ${preview.durationHours} hours from that moment. After time is up, you have a 10-minute grace window to push your final commit.`,
              "Push your code to the GitHub repository shown above. That is the only accepted submission method.",
              "Do not close this tab during the assignment — it polls the server and keeps your session alive.",
            ].map((t, i) => (
              <li key={i} className="flex gap-3 text-[13.5px] leading-relaxed text-foreground/90">
                <span className="mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full border border-border text-[10px] font-medium text-muted-foreground">
                  {i + 1}
                </span>
                {t}
              </li>
            ))}
          </ul>
        </Section>

        {/* CTA */}
        <div className="mt-10 flex flex-col items-center gap-3">
          <button
            onClick={onStart}
            disabled={starting}
            className="flex min-w-[260px] items-center justify-center gap-2 rounded-full bg-white px-8 py-3.5 text-[14px] font-semibold text-black shadow-sm transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {starting ? (
              <>
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-black/30 border-t-black" />
                Starting…
              </>
            ) : (
              <>Start my {preview.durationHours}-hour clock →</>
            )}
          </button>
          <p className="text-[11px] text-muted-foreground">
            Timer is server-side and cannot be paused or reset.
          </p>
        </div>
      </div>
    </main>
  );
}

// ─── Timed assignment view (after timer starts) ───────────────────────────────

function TimedPage({ view }: { view: CandidateView }) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const tick = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(tick);
  }, []);

  const targetIso = view.status === "grace" ? view.graceEndsAt : view.endsAt;
  const targetMs = targetIso ? new Date(targetIso).getTime() : 0;
  const serverOffset = view.serverNow ? new Date(view.serverNow).getTime() - Date.now() : 0;
  const remaining = targetMs - (now + serverOffset);
  const isGrace = view.status === "grace";
  const isSubmitted = view.status === "submitted";

  return (
    <main className="min-h-screen bg-background">
      <header className="border-b border-border/70 px-6 py-4">
        <div className="mx-auto flex max-w-3xl items-center justify-between">
          <img src={logoWhite} alt="Stance Health" className="h-6 w-auto" />
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

        <section className="panel mt-10 p-6 sm:p-8">
          <h2 className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
            Problem statement
          </h2>
          <div className="mt-4">
            <ProblemStatement text={view.problemStatement ?? ""} />
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

// ─── Root component — orchestrates the two phases ─────────────────────────────

function CandidatePage() {
  const { token } = Route.useParams();

  // Phase: "peek" | "question" | "timed" | "error"
  const [phase, setPhase] = useState<"loading" | "question" | "timed" | "error">("loading");
  const [preview, setPreview] = useState<AssignmentPreview | null>(null);
  const [view, setView] = useState<CandidateView | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [starting, setStarting] = useState(false);

  const toError = (reason?: string) => {
    setErrorMsg(
      reason === "closed"
        ? "Submission window has closed."
        : reason === "revoked"
          ? "This link has been revoked."
          : "This link is invalid or expired.",
    );
    setPhase("error");
  };

  // Initial load: peek (no timer start)
  useEffect(() => {
    peekAssignment({ data: { token } })
      .then((p) => {
        if (!p.ok) return toError(p.reason);
        setPreview(p);
        if (p.alreadyStarted) {
          // Jump straight to timed view
          openAssignment({ data: { token } })
            .then((cv) => {
              if (!cv.ok) return toError(cv.reason);
              setView(cv);
              setPhase("timed");
            })
            .catch(() => toError());
        } else {
          setPhase("question");
        }
      })
      .catch(() => toError());
  }, [token]);

  // Polling while in timed phase
  useEffect(() => {
    if (phase !== "timed") return;
    const poll = setInterval(async () => {
      try {
        const cv = await openAssignment({ data: { token } });
        if (!cv.ok) return toError(cv.reason);
        setView(cv);
      } catch {
        // silent — keep showing last known state
      }
    }, 30_000);
    return () => clearInterval(poll);
  }, [phase, token]);

  const handleStart = useCallback(async () => {
    setStarting(true);
    try {
      const cv = await openAssignment({ data: { token } });
      if (!cv.ok) return toError(cv.reason);
      setView(cv);
      setPhase("timed");
    } catch {
      toError();
    } finally {
      setStarting(false);
    }
  }, [token]);

  if (phase === "loading") {
    return (
      <main className="flex min-h-screen items-center justify-center bg-background">
        <p className="text-sm text-muted-foreground">Loading your assignment…</p>
      </main>
    );
  }

  if (phase === "error" || !preview) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center bg-background px-6 text-center">
        <div className="max-w-md">
          <h1 className="text-xl font-medium tracking-tight text-foreground">Access closed</h1>
          <p className="mt-3 text-[14px] leading-relaxed text-muted-foreground">
            {errorMsg ?? "This assignment link is no longer available."}
          </p>
        </div>
      </main>
    );
  }

  if (phase === "question") {
    return <QuestionPage preview={preview} onStart={handleStart} starting={starting} />;
  }

  if (!view) return null;
  return <TimedPage view={view} />;
}
