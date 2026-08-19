import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useState, type ComponentType } from "react";
import {
  peekAssignment,
  openAssignment,
  type AssignmentPreview,
  type CandidateView,
} from "@/lib/candidate.functions";
import { getCandidateBranch } from "@/lib/utils";
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
  const hours = Math.floor(totalSec / 3600);
  const minutes = Math.floor((totalSec % 3600) / 60);
  const seconds = totalSec % 60;

  const hh = String(hours).padStart(2, "0");
  const mm = String(minutes).padStart(2, "0");
  const ss = String(seconds).padStart(2, "0");

  return `${hh}:${mm}:${ss}`;
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-8 border-t border-border/60 pt-6">
      <h3 className="text-[12px] font-semibold text-muted-foreground uppercase tracking-wider">{title}</h3>
      <div className="mt-3">{children}</div>
    </section>
  );
}

// ─── Shared Theme Toggle Button ───

function ThemeToggle({ theme, toggleTheme }: { theme: "light" | "dark"; toggleTheme: () => void }) {
  return (
    <button
      onClick={toggleTheme}
      className="p-2 rounded-full hover:bg-secondary/80 text-muted-foreground hover:text-foreground transition-colors cursor-pointer border border-border/40 bg-secondary/10"
      title="Toggle Light/Dark Mode"
      type="button"
    >
      {theme === "dark" ? (
        <svg width="16" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <circle cx="12" cy="12" r="5" />
          <line x1="12" y1="1" x2="12" y2="3" />
          <line x1="12" y1="21" x2="12" y2="23" />
          <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
          <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
          <line x1="1" y1="12" x2="3" y2="12" />
          <line x1="21" y1="12" x2="23" y2="12" />
          <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
          <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
        </svg>
      ) : (
        <svg width="16" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
        </svg>
      )}
    </button>
  );
}

// ─── Premium, Highly Attractive Problem Statement Canvas ───

function ProblemStatement({ text }: { text: string }) {
  const lines = text.split("\n");
  const items: React.ReactNode[] = [];
  let listBuf: string[] = [];

  const flushList = (key: string) => {
    if (listBuf.length === 0) return;
    items.push(
      <ul key={`ul-${key}`} className="mt-3 space-y-2.5 pl-5">
        {listBuf.map((li, i) => (
          <li key={i} className="flex gap-3 text-[14px] leading-relaxed text-foreground/90 font-light">
            <span className="mt-[7px] h-2 w-2 flex-shrink-0 rounded-full bg-primary/45 ring-4 ring-primary/10" />
            <span>{li}</span>
          </li>
        ))}
      </ul>,
    );
    listBuf = [];
  };

  lines.forEach((line, i) => {
    const trimmed = line.trim();
    if (trimmed === "") {
      flushList(String(i));
      return;
    }
    // Bullet
    if (line.startsWith("- ") || line.startsWith("• ")) {
      listBuf.push(line.slice(2));
      return;
    }
    flushList(String(i));
    
    // Check if it is a main title
    if (line.startsWith("Assignment:") || line.startsWith("Problem Statement") || line.startsWith("Core Requirements") || line.startsWith("Deliverables") || line.startsWith("Constraints")) {
      items.push(
        <div key={i} className="mt-8 border-b border-border/70 pb-2">
          <p className="text-[15px] font-bold tracking-tight text-foreground uppercase">
            {line}
          </p>
        </div>,
      );
      return;
    }

    // Section heading (ends with colon, or ALL CAPS-ish short line)
    const isHeading =
      (line.endsWith(":") && line.length < 80 && !line.includes(".")) ||
      /^[A-Z][A-Za-z /()]+$/.test(line);

    if (isHeading) {
      items.push(
        <p key={i} className="mt-6 text-[13.5px] font-semibold text-foreground/80 tracking-wide">
          {line}
        </p>,
      );
    } else if (line.startsWith("POST ") || line.startsWith("GET ") || line.startsWith("git ") || line.startsWith("Duration:") || line.startsWith("Stack ")) {
      // Code style snippet
      items.push(
        <div key={i} className="mt-3 rounded-lg border border-border/80 bg-secondary/35 px-4 py-3 font-mono text-[13px] leading-relaxed text-foreground">
          {line}
        </div>,
      );
    } else {
      items.push(
        <p key={i} className="mt-3 text-[14px] leading-relaxed text-foreground/90 font-light">
          {line}
        </p>,
      );
    }
  });

  flushList("end");

  return <div className="space-y-1.5">{items}</div>;
}

// ─── Beautiful customized landing page (matching index landing styles) ───

function ClientOnlyHero({ email, onStart }: { email: string | undefined; onStart: () => void }) {
  const [Hero, setHero] = useState<ComponentType<any> | null>(null);

  useEffect(() => {
    import("@/components/ui/hero-futuristic").then((m) => {
      setHero(() => m.HeroFuturistic);
    });
  }, []);

  if (!Hero) return <div className="h-svh bg-black" />;

  const emailPrefix = email ? email.split("@")[0] : "there";
  const titleWords = ["Hey,", emailPrefix || "there", "welcome", "to", "stance", "hiring"];

  return (
    <Hero
      titleWords={titleWords}
      subtitle="We are excited to have you join our team. Click below to enter your secure candidate assignments dashboard and preview your timed task."
      ctaText="Let's dive in →"
      onCtaClick={onStart}
    />
  );
}

// ─── Pre-start assignment instructions panel (with Terms Popup) ──────────────────────

function QuestionPage({
  preview,
  onStart,
  starting,
  theme,
  toggleTheme,
}: {
  preview: AssignmentPreview;
  onStart: () => void;
  starting: boolean;
  theme: "light" | "dark";
  toggleTheme: () => void;
}) {
  const [showTerms, setShowTerms] = useState(false);
  const [accepted, setAccepted] = useState(false);

  return (
    <main className="min-h-screen bg-background">
      <header className="border-b border-border/70 px-6 py-4 bg-card/10 backdrop-blur-md">
        <div className="mx-auto flex max-w-3xl items-center justify-between">
          <img src={logoWhite} alt="Stance Health" className="h-7 w-auto" />
          <div className="flex items-center gap-4">
            <span className="text-[12px] text-muted-foreground">{preview.email}</span>
            <ThemeToggle theme={theme} toggleTheme={toggleTheme} />
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-3xl px-6 py-10">
        {/* Callout */}
        <div className="mb-8 rounded-xl border border-amber-500/30 bg-amber-500/5 px-5 py-4 shadow-sm animate-pulse">
          <p className="text-[13px] font-medium text-amber-700 dark:text-amber-400">
            ⏱ Your {preview.durationHours}-hour clock starts only after clicking{" "}
            <span className="font-semibold">Reveal Question</span> and accepting terms. Read the instructions first.
          </p>
        </div>

        {/* Title */}
        <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
          {preview.title}
        </h1>

        <div className="mt-4 flex flex-wrap items-center gap-3 text-[13px]">
          <span className="rounded-full border border-border bg-secondary/60 px-3 py-1 text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">
            {preview.durationHours}h timed
          </span>
          <span className="text-muted-foreground font-medium">Submit to:</span>
          <span className="rounded-md border border-border bg-secondary/50 px-2.5 py-1 font-mono text-[12px] text-muted-foreground select-none filter blur-[3.5px]">
            github.com/Chris-healthflex/ai-intern
          </span>
        </div>

        {/* Unique Branch Blurring Instructions */}
        {preview.email && preview.candidateId && (
          <div className="panel mt-8 border-l-4 border-l-sky-500 bg-sky-500/5 px-6 py-5 sm:px-8 shadow-sm">
            <h3 className="text-[13px] font-semibold tracking-wider text-sky-700 dark:text-sky-400 uppercase">
              Your Unique Branch
            </h3>
            <p className="mt-2 text-[13.5px] leading-relaxed text-foreground">
              Your dedicated candidate branch is currently locked:
            </p>
            <div className="mt-3 select-none filter blur-[4px] rounded-lg border border-border bg-background p-3.5 font-mono text-[12.5px] text-foreground/90 space-y-2 overflow-x-auto">
              <p># Your unique branch: candidate/chris-thomas-healthflex-in-e419</p>
              <p># How to push to your branch:</p>
              <p>git checkout -b candidate/chris-thomas-healthflex-in-e419</p>
            </div>
            <p className="mt-3 text-[12px] text-muted-foreground">
              🔒 GitHub repository and branch details are blurred. They will unlock when your assignment timer is complete or when your admin manually unblurs them.
            </p>
          </div>
        )}

        {/* Problem statement */}
        <div className="panel mt-8 px-6 py-8 sm:px-10 border border-border bg-card/40 backdrop-blur-sm shadow-md rounded-2xl">
          <h2 className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground border-b border-border/40 pb-2.5">
            Assignment brief
          </h2>
          <div className="mt-5">
            <ProblemStatement text={preview.problemStatement ?? ""} />
          </div>
        </div>

        {/* Deliverables reminder */}
        <Section title="Before you start">
          <ul className="space-y-3.5 mt-4">
            {[
              "Read the full brief above carefully — the clock starts when you reveal the question.",
              `You have ${preview.durationHours} hours from that moment. After time is up, you have a 10-minute grace window to push your final commit.`,
              `Push your code to your unique branch. Pushes to main or other branches will not be recognized.`,
              "Do not close this tab during the assignment — it polls the server and keeps your session alive.",
            ].map((t, i) => (
              <li key={i} className="flex gap-3 text-[14px] leading-relaxed text-foreground/90 font-light">
                <span className="mt-0.5 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full border border-border bg-secondary/40 text-[10px] font-bold text-muted-foreground">
                  {i + 1}
                </span>
                <span>{t}</span>
              </li>
            ))}
          </ul>
        </Section>

        {/* CTA */}
        <div className="mt-12 flex flex-col items-center gap-3">
          <button
            onClick={() => setShowTerms(true)}
            className="cta-glow flex min-w-[280px] items-center justify-center gap-2 rounded-full py-3.5 text-[14px] font-bold tracking-wide transition-opacity hover:opacity-90 cursor-pointer"
          >
            Reveal Question →
          </button>
          <p className="text-[11px] text-muted-foreground font-medium">
            Timer is server-side and cannot be paused or reset.
          </p>
        </div>
      </div>

      {/* Terms Dialog Popup */}
      {showTerms && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm">
          <div className="relative w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-xl animate-in fade-in zoom-in duration-200">
            <h3 className="text-xl font-semibold text-foreground tracking-tight">Terms and Conditions</h3>
            <p className="mt-3 text-[14px] leading-relaxed text-muted-foreground">
              Before revealing the question and starting your countdown timer, please read and agree to our terms.
            </p>
            
            <div className="mt-4 rounded-lg bg-amber-500/10 p-4 border border-amber-500/30">
              <p className="text-[12.5px] leading-relaxed text-amber-700 dark:text-amber-400 font-semibold">
                ⚠️ Warning: As soon as you accept, the timer will begin, and there is no pausing or resetting the timer.
              </p>
            </div>
            
            <div className="mt-6 flex items-start gap-3">
              <input
                type="checkbox"
                id="terms"
                checked={accepted}
                onChange={(e) => setAccepted(e.target.checked)}
                className="mt-1 h-5 w-5 rounded border-border bg-background text-primary focus:ring-ring cursor-pointer"
              />
              <label htmlFor="terms" className="text-[13px] leading-relaxed text-foreground select-none cursor-pointer">
                I understand and agree that this is a timed assignment. The timer will start immediately and cannot be paused.
              </label>
            </div>
            
            <div className="mt-6 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowTerms(false)}
                className="rounded-lg px-4 py-2.5 text-sm font-medium text-muted-foreground hover:bg-secondary transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={!accepted || starting}
                onClick={() => {
                  setShowTerms(false);
                  onStart();
                }}
                className="cta-glow rounded-lg px-5 py-2.5 text-sm font-semibold disabled:opacity-50 cursor-pointer"
              >
                {starting ? "Starting..." : "Accept & Start Timer"}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

// ─── Timed assignment view (after timer starts) ───────────────────────────────

function TimedPage({
  view,
  theme,
  toggleTheme,
}: {
  view: CandidateView;
  theme: "light" | "dark";
  toggleTheme: () => void;
}) {
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

  // GitHub details are blurred unless view.unblurred is true, or status is grace/submitted
  const isUnblurred = view.unblurred || isGrace || isSubmitted;

  const branchName = view.email && view.candidateId 
    ? getCandidateBranch(view.email, view.candidateId) 
    : "candidate/your-branch";
  const repoName = view.githubRepo?.replace(/^https?:\/\//, "") || "github.com/Chris-healthflex/ai-intern";

  // Calculate percentage of timer remaining
  const totalDurationMs = view.endsAt && view.startedAt 
    ? new Date(view.endsAt).getTime() - new Date(view.startedAt).getTime() 
    : 0;
  const percentage = totalDurationMs > 0 
    ? Math.max(0, Math.min(100, (remaining / totalDurationMs) * 100)) 
    : 0;

  return (
    <main className="min-h-screen bg-background animate-fade-in">
      <header className="border-b border-border/70 px-6 py-4 bg-card/10 backdrop-blur-md">
        <div className="mx-auto flex max-w-3xl items-center justify-between">
          <img src={logoWhite} alt="Stance Health" className="h-6 w-auto" />
          <div className="flex items-center gap-4">
            <div className="text-[12px] text-muted-foreground">{view.email}</div>
            <ThemeToggle theme={theme} toggleTheme={toggleTheme} />
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-3xl px-6 py-10">
        {/* Glowing Dashboard Timer HUD */}
        <div
          className={`mb-10 rounded-2xl border px-6 py-5 shadow-lg transition-all duration-500 ${
            isSubmitted
              ? "border-emerald-500/20 bg-emerald-500/5 shadow-emerald-500/5"
              : isGrace
                ? "border-amber-500/40 bg-amber-500/5 shadow-[0_0_20px_-3px_oklch(0.78_0.16_85_/_10%)] animate-pulse"
                : remaining < 1800000 // Less than 30 mins
                  ? "border-rose-500/40 bg-rose-500/5 shadow-[0_0_20px_-3px_oklch(0.55_0.2_27_/_15%)]"
                  : "border-border/80 bg-card/60 shadow-[0_0_20px_-3px_var(--color-ring)]"
          }`}
        >
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                {isSubmitted ? "Status" : isGrace ? "Grace period remaining" : "Time remaining"}
              </p>
              <p className={`mt-1 font-mono text-4xl font-semibold tracking-tight tabular-nums sm:text-5xl bg-gradient-to-r bg-clip-text text-transparent ${
                isSubmitted 
                  ? "from-emerald-500 to-emerald-400" 
                  : isGrace 
                    ? "from-amber-500 to-amber-400" 
                    : remaining < 1800000 
                      ? "from-rose-500 to-rose-400" 
                      : "from-sky-500 to-sky-400"
              }`}>
                {isSubmitted ? "Submitted" : formatRemaining(remaining)}
              </p>
            </div>
            <div className="text-right text-[13px] text-muted-foreground font-medium">
              {isGrace && (
                <p className="font-semibold text-amber-700 dark:text-amber-400 animate-pulse">
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

          {/* Glowing Minimal Progress Bar */}
          {!isSubmitted && (
            <div className="mt-4 h-2 w-full overflow-hidden rounded-full bg-secondary/50 border border-border/40">
              <div 
                className={`h-full rounded-full transition-all duration-1000 ${
                  isGrace 
                    ? "bg-amber-500 shadow-[0_0_10px_oklch(0.78_0.16_85)]" 
                    : remaining < 1800000
                      ? "bg-rose-500 shadow-[0_0_10px_oklch(0.55_0.2_27)] animate-pulse"
                      : "bg-sky-500 shadow-[0_0_10px_oklch(0.7_0.15_250)]"
                }`}
                style={{ width: `${percentage}%` }}
              />
            </div>
          )}
        </div>

        <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl bg-gradient-to-r from-primary to-primary/80 bg-clip-text text-transparent">
          {view.title}
        </h1>

        <div className="mt-4 flex flex-wrap items-center gap-3 text-[13px]">
          <span className="text-muted-foreground font-medium">Submit to:</span>
          {isUnblurred ? (
            <a
              href={view.githubRepo}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-md border border-border bg-secondary/50 px-2.5 py-1 font-mono text-[12px] text-foreground transition-colors hover:bg-secondary animate-in fade-in"
            >
              {repoName}
            </a>
          ) : (
            <span className="rounded-md border border-border bg-secondary/50 px-2.5 py-1 font-mono text-[12px] text-muted-foreground select-none filter blur-[3.5px]">
              {repoName}
            </span>
          )}
        </div>

        {/* Unique Branch and Git Instructions */}
        {view.email && view.candidateId && (
          <div className="panel mt-8 border-l-4 border-l-sky-500 bg-sky-500/5 px-6 py-6 sm:px-8 shadow-md rounded-xl">
            <h3 className="text-[13px] font-bold tracking-wider text-sky-700 dark:text-sky-400 uppercase">
              Your Dedicated Candidate Branch
            </h3>
            <p className="mt-2 text-[13.5px] leading-relaxed text-foreground font-light">
              Push your code to your unique candidate branch. Pushes to other branches cannot be evaluated:
            </p>
            {isUnblurred ? (
              <div className="mt-3 rounded-lg border border-border bg-background p-3.5 font-mono text-[12.5px] text-foreground/90 space-y-2 overflow-x-auto animate-in fade-in">
                <p><span className="text-muted-foreground"># Your unique branch:</span> <strong className="text-sky-700 dark:text-sky-400 font-semibold">{branchName}</strong></p>
                <p><span className="text-muted-foreground"># How to push to your branch:</span></p>
                <p className="text-muted-foreground">git checkout -b {branchName}</p>
                <p className="text-muted-foreground">git add .</p>
                <p className="text-muted-foreground">git commit -m "feat: complete assignment"</p>
                <p className="text-muted-foreground">git push -u origin {branchName}</p>
              </div>
            ) : (
              <div className="mt-3 select-none filter blur-[4.5px] rounded-lg border border-border bg-background p-3.5 font-mono text-[12.5px] text-foreground/90 space-y-2 overflow-x-auto">
                <p># Your unique branch: {branchName}</p>
                <p># How to push to your branch:</p>
                <p>git checkout -b {branchName}</p>
                <p>git add .</p>
                <p>git commit -m "feat: complete assignment"</p>
                <p>git push -u origin {branchName}</p>
              </div>
            )}
            
            {!isUnblurred ? (
              <p className="mt-3 text-[12.5px] text-amber-700 dark:text-amber-400 bg-amber-500/5 border border-amber-500/10 p-2.5 rounded-md font-medium">
                🔒 GitHub details are blurred. They will unlock when your assignment timer is complete (during the 10-minute submission window) or when your admin manually unblurs them.
              </p>
            ) : (
              <p className="mt-3 text-[12.5px] text-muted-foreground font-medium">
                Once pushed, the system will automatically sync. You can close this tab safely once your status shows "Submitted".
              </p>
            )}
          </div>
        )}

        <section className="panel mt-10 p-6 sm:p-8 border border-border bg-card/40 backdrop-blur-sm shadow-md rounded-2xl">
          <h2 className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground border-b border-border/40 pb-2.5">
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

// ─── Root component — orchestrates the phases ─────────────────────────────

function CandidatePage() {
  const { token } = Route.useParams();

  // Phase: "loading" | "peek" | "question" | "timed" | "error"
  const [phase, setPhase] = useState<"loading" | "peek" | "question" | "timed" | "error">("loading");
  const [preview, setPreview] = useState<AssignmentPreview | null>(null);
  const [view, setView] = useState<CandidateView | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [starting, setStarting] = useState(false);

  // Global theme switcher state
  const [theme, setTheme] = useState<"light" | "dark">("dark");

  useEffect(() => {
    const saved = localStorage.getItem("theme") as "light" | "dark" | null;
    const initial = saved || (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
    setTheme(initial);
    if (initial === "dark") {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, []);

  const toggleTheme = () => {
    const next = theme === "light" ? "dark" : "light";
    setTheme(next);
    localStorage.setItem("theme", next);
    if (next === "dark") {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  };

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
          setPhase("peek"); // Set to "peek" (beautiful landing page) first!
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

  if (phase === "peek") {
    return <ClientOnlyHero email={preview.email} onStart={() => setPhase("question")} />;
  }

  if (phase === "question") {
    return <QuestionPage preview={preview} onStart={handleStart} starting={starting} theme={theme} toggleTheme={toggleTheme} />;
  }

  if (!view) return null;
  return <TimedPage view={view} theme={theme} toggleTheme={toggleTheme} />;
}
