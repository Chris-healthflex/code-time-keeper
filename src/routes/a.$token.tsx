import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useState, useMemo, type ComponentType } from "react";
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
    if (line.startsWith("Assignment:") || line.startsWith("Problem Statement") || line.startsWith("Core Requirements") || line.startsWith("Deliverables") || line.startsWith("Constraints") || line.startsWith("STACK REQUIREMENTS:") || line.startsWith("AGENT PIPELINE") || line.startsWith("STRUCTURED OUTPUT SCHEMA") || line.startsWith("API ENDPOINTS:") || line.startsWith("MONGODB COLLECTIONS:") || line.startsWith("DELIVERABLES:")) {
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

// ─── How It Works 9: Two-column step switcher with sliding indicator ───

const HIW_STEPS = [
  {
    id: "overview",
    num: "01",
    label: "Overview & Stack",
    icon: "📋",
    badge: "~10 s read",
    title: "Assessment Overview & Requirements",
    bullets: [
      "Python + FastAPI backend",
      "Pydantic for structured output validation",
      "LangChain or LangGraph for the agent flow",
      "MongoDB for persistent storage",
      "Git for version control & submission",
    ],
    content: `Clinicians at Stance Health currently dictate or type free-text notes after assessments. These notes are messy, incomplete, use inconsistent terminology, and mix objective numbers with subjective observations.

Your task is to build a production-style backend service that turns raw clinician notes (or simulated voice transcripts) into a strictly structured assessment form — directly saveable into MongoDB and usable by downstream clinical tools.`,
  },
  {
    id: "pipeline",
    num: "02",
    label: "Core Pipeline & Schema",
    icon: "⚙️",
    badge: "2–4 min",
    title: "Agent Pipeline & Pydantic Schema",
    bullets: [
      "Parse the raw note",
      "Map into a multi-section Pydantic schema",
      "Flag missing / ambiguous fields with confidence scores",
      "Never hallucinate numbers or clinical facts",
      "Produce a human-readable extraction summary",
    ],
    content: `AGENT PIPELINE (LangGraph preferred, LangChain acceptable):

STRUCTURED OUTPUT SCHEMA — covers at least:
1. Patient identifiers / session metadata
2. Subjective: chief complaint, pain history (location, VAS, aggravating/relieving factors, onset)
3. Objective: ROM values, strength grades, gait observations, special tests
4. Assessment / clinical impression
5. Plan: exercises, load/sets/reps, follow-up, red flags
6. Extraction metadata: confidence per section, unresolved ambiguities, source spans`,
  },
  {
    id: "api",
    num: "03",
    label: "API Endpoints & DB",
    icon: "🗄️",
    badge: "Instant",
    title: "FastAPI Endpoints & MongoDB",
    bullets: [
      "POST /assessments/parse — returns structured object + summary",
      "POST /assessments — saves result to MongoDB",
      "GET /assessments/{id} — retrieve by ID",
      "List endpoint filterable by patient_id",
      "Proper error handling, status codes, input validation",
    ],
    content: `MONGODB COLLECTIONS:
Design a sensible collection schema for the structured assessments. Support basic querying by patient and by date range.

Proper REST conventions, HTTP status codes, and Pydantic request/response models are expected throughout.`,
  },
  {
    id: "deliverables",
    num: "04",
    label: "Intern Deliverables",
    icon: "📦",
    badge: "Guarded",
    title: "What you must submit",
    bullets: [
      "Working FastAPI service with all endpoints",
      "LangGraph / LangChain agent code",
      "Pydantic models for the full structured form",
      "MongoDB models & connection code",
      "6–8 synthetic test notes + evaluation script",
      "1–2 page design document",
    ],
    content: `Design document must cover:
• Agent graph design decisions
• How you prevent hallucination of numbers
• Failure modes observed and how you handled them
• What you would improve with more time`,
  },
];

function InteractiveBrief({ text }: { text: string }) {
  const [active, setActive] = useState(0);

  const isStanceHealth =
    text.toLowerCase().includes("clinical assessment") ||
    text.toLowerCase().includes("stance health");

  if (!isStanceHealth) return <ProblemStatement text={text} />;

  const step = HIW_STEPS[active]!;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-6 lg:gap-8 items-start">

      {/* ── Left column: step navigator ── */}
      <div className="flex flex-col gap-5">
        <div>
          <p className="text-[11px] font-semibold tracking-[0.12em] uppercase text-sky-500 dark:text-sky-400 mb-2">
            Four sections
          </p>
          <h2 className="text-[22px] font-bold tracking-tight text-foreground leading-tight">
            Build a clinical AI pipeline, step by step.
          </h2>
          <p className="mt-2.5 text-[12.5px] leading-relaxed text-muted-foreground">
            Read each section before the clock runs out.
          </p>
        </div>

        <ol className="flex flex-col gap-0.5 mt-1">
          {HIW_STEPS.map((s, idx) => {
            const isActive = idx === active;
            return (
              <li key={s.id}>
                <button
                  type="button"
                  onClick={() => setActive(idx)}
                  className={`w-full text-left rounded-lg px-3.5 py-3 transition-all duration-150 cursor-pointer group flex items-center justify-between gap-2
                    ${isActive
                      ? "bg-sky-500/10 dark:bg-sky-500/10 border border-sky-500/20 shadow-sm"
                      : "hover:bg-secondary/40 border border-transparent"
                    }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className={`text-[10px] font-bold tabular-nums shrink-0 w-5 transition-colors ${isActive ? "text-sky-500 dark:text-sky-400" : "text-muted-foreground/40"}`}>
                      {s.num}
                    </span>
                    <span className={`text-[13px] font-semibold truncate transition-colors ${isActive ? "text-foreground" : "text-muted-foreground group-hover:text-foreground/80"}`}>
                      {s.icon} {s.label}
                    </span>
                  </div>
                  <span className={`text-[10.5px] font-medium shrink-0 transition-colors ${isActive ? "text-sky-500/70 dark:text-sky-400/70" : "text-muted-foreground/35"}`}>
                    {s.badge}
                  </span>
                </button>
              </li>
            );
          })}
        </ol>

        {/* Progress dots */}
        <div className="flex items-center gap-1.5 px-1">
          {HIW_STEPS.map((_, i) => (
            <button
              key={i}
              type="button"
              onClick={() => setActive(i)}
              className={`h-1 rounded-full transition-all duration-200 cursor-pointer ${
                i === active ? "w-6 bg-sky-500" : "w-1.5 bg-border/60 hover:bg-muted-foreground/30"
              }`}
            />
          ))}
          <span className="ml-auto text-[10.5px] text-muted-foreground/50 font-medium">
            {active + 1} / {HIW_STEPS.length}
          </span>
        </div>
      </div>

      {/* ── Right column: animated detail panel ── */}
      <div
        key={active}
        className="rounded-xl border border-border/70 bg-card/60 dark:bg-card/40 backdrop-blur-sm shadow-md overflow-hidden animate-in fade-in slide-in-from-right-2 duration-250"
      >
        {/* Step header bar */}
        <div className="flex items-center gap-3 border-b border-border/50 px-5 py-3.5 bg-secondary/15">
          <span className="text-lg leading-none">{step.icon}</span>
          <span className="text-[13px] font-semibold text-foreground tracking-tight">{step.title}</span>
          <span className="ml-auto text-[10.5px] font-medium text-muted-foreground/60 shrink-0">
            Step {active + 1} of {HIW_STEPS.length}
          </span>
        </div>

        {/* Key bullets + full content */}
        <div className="p-5 sm:p-6 space-y-5">
          <ul className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2">
            {step.bullets.map((b, i) => (
              <li key={i} className="flex items-start gap-2 text-[12.5px] leading-snug text-foreground/80">
                <span className="mt-[5px] h-1.5 w-1.5 shrink-0 rounded-full bg-sky-500/70 ring-[3px] ring-sky-500/10" />
                <span>{b}</span>
              </li>
            ))}
          </ul>

          <div className="border-t border-border/40 pt-4">
            <ProblemStatement text={step.content} />
          </div>
        </div>
      </div>
    </div>
  );
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

// ─── Multi-step Onboarding vertical stepper (after "let's dive in" is clicked) ──────────────────────

interface StepItem {
  id: number;
  label: string;
  desc: string;
}

const ONBOARDING_STEPS: StepItem[] = [
  { id: 1, label: "Welcome", desc: "Overview of your assignment" },
  { id: 2, label: "Rules & Timing", desc: "Duration & expectations" },
  { id: 3, label: "Terms & Agreement", desc: "Agree to start" },
];

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
  const [activeStep, setActiveStep] = useState(1);
  const [acceptedTerms, setAcceptedTerms] = useState(false);

  const nextStep = () => setActiveStep((prev) => Math.min(ONBOARDING_STEPS.length, prev + 1));
  const prevStep = () => setActiveStep((prev) => Math.max(1, prev - 1));

  return (
    <main className="min-h-screen bg-background flex flex-col">
      <header className="border-b border-border/70 px-6 py-4 bg-card/10 backdrop-blur-md sticky top-0 z-40">
        <div className="mx-auto flex max-w-5xl items-center justify-between">
          <img src={logoWhite} alt="Stance Health" className="h-7 w-auto" />
          <div className="flex items-center gap-4">
            <span className="text-[12px] text-muted-foreground">{preview.email}</span>
            <ThemeToggle theme={theme} toggleTheme={toggleTheme} />
          </div>
        </div>
      </header>

      {/* Onboarding 2: Two-column layout with vertical rail and form body */}
      <div className="flex-1 max-w-5xl w-full mx-auto grid grid-cols-1 md:grid-cols-[280px_1fr] gap-10 px-6 py-10 overflow-hidden">
        
        {/* Left Side Labelled Rail */}
        <aside className="space-y-6 flex flex-col justify-start">
          <div>
            <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Setup Checklist</h2>
            <p className="text-[12px] text-muted-foreground mt-1">Complete each step below to unlock and reveal the assignment question.</p>
          </div>

          <nav className="relative flex flex-col gap-6 pl-2 mt-4">
            {/* Connecting Line */}
            <div className="absolute left-[17px] top-2 bottom-8 w-0.5 bg-border/70" />

            {ONBOARDING_STEPS.map((s) => {
              const isCompleted = activeStep > s.id;
              const isActive = activeStep === s.id;
              return (
                <div key={s.id} className="relative flex items-start gap-4">
                  {/* Step bubble */}
                  <div
                    className={`relative z-10 flex h-8 w-8 items-center justify-center rounded-full border text-[11px] font-bold transition-all duration-300 ${
                      isCompleted
                        ? "bg-emerald-500 border-emerald-500 text-white shadow-[0_0_10px_rgba(16,185,129,0.2)]"
                        : isActive
                          ? "bg-primary border-primary text-primary-foreground shadow-[0_0_15px_rgba(var(--color-ring),0.3)] ring-4 ring-primary/10"
                          : "bg-background border-border text-muted-foreground"
                    }`}
                  >
                    {isCompleted ? (
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    ) : (
                      s.id
                    )}
                  </div>

                  {/* Step label */}
                  <div className="flex flex-col">
                    <span className={`text-[13px] font-semibold transition-colors ${isActive ? "text-foreground" : "text-muted-foreground"}`}>
                      {s.label}
                    </span>
                    <span className="text-[11px] text-muted-foreground leading-normal mt-0.5">{s.desc}</span>
                  </div>
                </div>
              );
            })}
          </nav>
        </aside>

        {/* Right Side Form Body Panel */}
        <div className="flex-1 flex flex-col min-h-[420px] panel p-6 sm:p-8 border border-border/80 bg-card/40 backdrop-blur-sm rounded-2xl shadow-md overflow-y-auto">
          <div className="flex-1">
            
            {/* STEP 1: Overview */}
            {activeStep === 1 && (
              <div className="space-y-4 animate-in fade-in duration-200">
                <h3 className="text-xl font-bold tracking-tight text-foreground">Welcome to the Stance Health Hiring Assessment</h3>
                <p className="text-[14px] leading-relaxed text-foreground/80 font-light">
                  You have been invited to complete a secure engineering assignment. Before revealing the full problem statement and starting your clock, please complete this step-by-step checklist.
                </p>
                
                <div className="p-5 rounded-xl border border-border/70 bg-secondary/35 mt-6 space-y-3">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Assessment details:</h4>
                  <div className="grid grid-cols-2 gap-4 text-[13.5px]">
                    <div>
                      <span className="text-muted-foreground block text-[11px]">TOPIC</span>
                      <strong className="font-semibold text-foreground">{preview.title}</strong>
                    </div>
                    <div>
                      <span className="text-muted-foreground block text-[11px]">TIMED LIMIT</span>
                      <strong className="font-semibold text-foreground">{preview.durationHours} hours</strong>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* STEP 2: Rules & Instructions */}
            {activeStep === 2 && (
              <div className="space-y-5 animate-in fade-in duration-200">
                <h3 className="text-xl font-bold tracking-tight text-foreground">Guidelines & Rules</h3>
                <p className="text-[14px] leading-relaxed text-foreground/80 font-light">
                  Please review the rules carefully. This is a rigorous assessment, and all metrics are monitored server-side.
                </p>

                <ul className="space-y-4 mt-6">
                  {[
                    `The clock starts as soon as you complete the final step and click "Accept & Start Timer".`,
                    `You have exactly ${preview.durationHours} hours to finish. You have a 10-minute grace window afterwards to push your final code.`,
                    `Pushes made after the 10-minute grace window cannot be evaluated. No extensions are possible.`,
                    "Do not close this browser tab during the assignment. It maintains a secure sync with our timing servers.",
                  ].map((rule, idx) => (
                    <li key={idx} className="flex gap-3 text-[13.5px] leading-relaxed text-foreground/90 font-light">
                      <span className="mt-[2px] flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-secondary text-[10px] font-bold text-muted-foreground border border-border">
                        {idx + 1}
                      </span>
                      <span>{rule}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* STEP 3: Terms and Conditions */}
            {activeStep === 3 && (
              <div className="space-y-4 animate-in fade-in duration-200">
                <h3 className="text-xl font-bold tracking-tight text-foreground">Accept Terms & Start</h3>
                <p className="text-[14px] leading-relaxed text-foreground/80 font-light">
                  You are ready! Read and accept the final timing terms below to immediately reveal the assignment brief and start your timer.
                </p>

                <div className="mt-6 rounded-xl bg-amber-500/10 p-5 border border-amber-500/30">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-amber-700 dark:text-amber-400">🚨 Critical Warning</h4>
                  <p className="text-[13px] leading-relaxed text-amber-700 dark:text-amber-400 font-medium mt-1">
                    Once you click "Accept & Start Timer", your {preview.durationHours}-hour timer will begin immediately. The timer is server-authoritative and **cannot be paused or reset** under any circumstances.
                  </p>
                </div>

                <div className="mt-8 flex items-start gap-3">
                  <input
                    type="checkbox"
                    id="accept"
                    checked={acceptedTerms}
                    onChange={(e) => setAcceptedTerms(e.target.checked)}
                    className="mt-1 h-5 w-5 rounded border-border bg-background text-primary focus:ring-ring cursor-pointer"
                  />
                  <label htmlFor="accept" className="text-[13.5px] leading-relaxed text-foreground select-none cursor-pointer font-light">
                    I understand that this is a timed assignment. The timer will start immediately and cannot be paused.
                  </label>
                </div>
              </div>
            )}

          </div>

          {/* Stepper Footer Action Buttons */}
          <div className="mt-8 border-t border-border/40 pt-4 flex items-center justify-between">
            <button
              onClick={prevStep}
              disabled={activeStep === 1 || starting}
              className="px-4 py-2.5 rounded-lg border border-border text-sm font-medium hover:bg-secondary transition-colors disabled:opacity-40 cursor-pointer"
              type="button"
            >
              ← Back
            </button>

            {activeStep < ONBOARDING_STEPS.length ? (
              <button
                onClick={nextStep}
                className="cta-glow px-6 py-2.5 rounded-lg text-sm font-semibold cursor-pointer"
                type="button"
              >
                Continue →
              </button>
            ) : (
              <button
                onClick={onStart}
                disabled={!acceptedTerms || starting}
                className="cta-glow px-6 py-2.5 rounded-lg text-sm font-bold disabled:opacity-50 cursor-pointer"
                type="button"
              >
                {starting ? "Revealing..." : "Accept & Start Timer"}
              </button>
            )}
          </div>

        </div>
      </div>
    </main>
  );
}

// ─── Timed assignment view (after timer starts - with sliding steps!) ───────────────────────────────

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
  const serverOffset = useMemo(() => {
    if (!view.serverNow) return 0;
    return new Date(view.serverNow).getTime() - Date.now();
  }, [view.serverNow]);

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
      <header className="border-b border-border/70 px-6 py-4 bg-card/10 backdrop-blur-md sticky top-0 z-40">
        <div className="mx-auto flex max-w-3xl items-center justify-between">
          <img src={logoWhite} alt="Stance Health" className="h-6 w-auto" />
          <div className="flex items-center gap-4">
            <div className="text-[12px] text-muted-foreground">{view.email}</div>
            <ThemeToggle theme={theme} toggleTheme={toggleTheme} />
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-5xl px-6 py-10">
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

        {/* How It Works 9: Interactive Problem Statement Switcher */}
        <section className="panel mt-10 p-6 sm:p-8 border border-border bg-card/40 backdrop-blur-sm shadow-md rounded-2xl">
          <h2 className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground border-b border-border/40 pb-2.5 mb-6">
            Problem statement
          </h2>
          <InteractiveBrief text={view.problemStatement ?? ""} />
        </section>

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
