import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useState, useMemo, type ComponentType } from "react";
import {
  peekAssignment,
  openAssignment,
  requestGithubAccess,
  type AssignmentPreview,
  type CandidateView,
} from "@/lib/candidate.functions";
import { getCandidateBranch } from "@/lib/utils";
import logoWhite from "@/assets/logo-white.png";
import { FlipDiskMatrix } from "@/components/ui/flip-disk-matrix";
import { supabase } from "@/integrations/supabase/client";

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
      <h3 className="text-[12px] font-semibold text-foreground/75 uppercase tracking-wider">{title}</h3>
      <div className="mt-3">{children}</div>
    </section>
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
    badge: "~1 min",
    title: "Assessment Brief",
    tag: "v2.0",
    meta: "Python · FastAPI · Whisper · LangGraph · MongoDB · Git",
    desc: "Transcribe a real clinician-patient audio session and extract a fully structured clinical assessment — saved to MongoDB in the exact format our production frontend expects.",
    rows: [
      { hash: "py3.x", label: "Python 3.10+ with FastAPI", chip: "lang" },
      { hash: "wsp",   label: "OpenAI Whisper for audio transcription", chip: "ai" },
      { hash: "lg1",   label: "LangChain or LangGraph agent for extraction", chip: "ai" },
      { hash: "pyd2",  label: "Pydantic v2 for strict structured output", chip: "lib" },
      { hash: "mdb6",  label: "MongoDB for persistent storage", chip: "db" },
      { hash: "git",   label: "Git — push to your candidate branch", chip: "vcs" },
    ],
    extra: null,
  },
  {
    id: "pipeline",
    num: "02",
    label: "Audio → JSON Pipeline",
    badge: "Core task",
    title: "The Pipeline",
    tag: "pipeline/v2",
    meta: "WAV input · Whisper · LangGraph · Strict schema",
    desc: "You are given a WAV file of a real clinician session. Your pipeline must transcribe it, then extract structured clinical data that exactly matches our FirstAssessment schema.",
    rows: [
      { hash: "s1", label: "Accept WAV file upload via POST /assessments/parse", chip: "step" },
      { hash: "s2", label: "Transcribe audio using Whisper (local or API)", chip: "step" },
      { hash: "s3", label: "Run LangGraph agent to extract clinical entities", chip: "step" },
      { hash: "s4", label: "Map extracted data into the FirstAssessment schema", chip: "step" },
      { hash: "s5", label: "Flag any fields that could not be confidently extracted", chip: "step" },
      { hash: "s6", label: "Never hallucinate clinical values, scores, or dates", chip: "critical" },
    ],
    extra: "The output JSON must exactly match the FirstAssessment schema — no extra fields, no renamed keys.",
  },
  {
    id: "schema",
    num: "03",
    label: "Output Schema",
    badge: "Exact match",
    title: "FirstAssessment Schema",
    tag: "schema/v1",
    meta: "7 sections · Pydantic · Production format",
    desc: "Your agent output must conform exactly to this schema. This is the live format consumed by Stance Health's clinician frontend.",
    rows: [
      { hash: "cd",  label: "clinicalDetails → clinicalHistory, chiefComplaint, duration", chip: "obj" },
      { hash: "sa",  label: "subjectiveAssessments[] → testName, conclusion", chip: "arr" },
      { hash: "oa",  label: "objectiveAssessment.tests[] → testName, unitName, value, left, right, comments", chip: "arr" },
      { hash: "sg",  label: "subjectiveGoals[] → goalDetails, targetDate", chip: "arr" },
      { hash: "og",  label: "objectiveGoals[] → goalName, goalCategory, unitName, value, targetDate", chip: "arr" },
      { hash: "rec", label: "recommendation[] → sessionType, sessionFrequency", chip: "arr" },
      { hash: "pa",  label: "patientAdvice → adviceDetails", chip: "obj" },
    ],
    extra: "All array fields must be arrays even if only one item is present. All string fields must be strings, not null.",
  },
  {
    id: "api",
    num: "04",
    label: "API Endpoints & DB",
    badge: "3 endpoints",
    title: "FastAPI + MongoDB",
    tag: "api/v1",
    meta: "POST · GET · WAV upload · Error handling",
    desc: "Three REST endpoints. The parse endpoint accepts a WAV file and returns the structured JSON. Results are persisted to MongoDB.",
    rows: [
      { hash: "EP1", label: "POST /assessments/parse — multipart WAV → FirstAssessment JSON", chip: "main" },
      { hash: "EP2", label: "POST /assessments — save parsed result to MongoDB", chip: "write" },
      { hash: "EP3", label: "GET /assessments/{id} — retrieve saved assessment by ID", chip: "read" },
      { hash: "EP4", label: "GET /assessments — list all, filterable by date", chip: "read" },
    ],
    extra: "Return HTTP 422 with field-level error detail if extraction confidence is below threshold.",
  },
  {
    id: "deliverables",
    num: "05",
    label: "Deliverables",
    badge: "Guarded",
    title: "What to Submit",
    tag: "submit",
    meta: "Code · Tests · README · 6 items",
    desc: "Push everything to your candidate branch on the ai-assignments repo before the timer expires.",
    rows: [
      { hash: "D1", label: "FastAPI service — all 4 endpoints working", chip: "code" },
      { hash: "D2", label: "Whisper transcription module (WAV → text)", chip: "code" },
      { hash: "D3", label: "LangGraph agent with FirstAssessment Pydantic output", chip: "code" },
      { hash: "D4", label: "MongoDB models + connection + save/retrieve logic", chip: "code" },
      { hash: "D5", label: "Test script: run pipeline on provided WAV, print JSON", chip: "tests" },
      { hash: "D6", label: "README — setup instructions + design decisions", chip: "docs" },
    ],
    extra: "Repo: github.com/Stance-Health/ai-assignments — push to branch named after your email.",
  },
];

function InteractiveBrief({ text }: { text: string }) {
  const [active, setActive] = useState(0);

  const isStanceHealth =
    text.toLowerCase().includes("clinical") ||
    text.toLowerCase().includes("stance health") ||
    text.toLowerCase().includes("audio") ||
    text.toLowerCase().includes("wav") ||
    text.length < 20; // short placeholder = use interactive brief

  if (!isStanceHealth) return <ProblemStatement text={text} />;

  const step = HIW_STEPS[active]!;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[400px_1fr] gap-10 lg:gap-14 items-start">

      {/* ── Left: massive title + step list ── */}
      <div>
        <h2 style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 800, fontSize: "clamp(28px, 4vw, 48px)", lineHeight: 1.05, letterSpacing: "-0.04em", color: "var(--foreground)" }}>
          Turn a clinical audio session into a structured assessment report.
        </h2>
        <p style={{ marginTop: 20, fontSize: 15, color: "var(--foreground)", lineHeight: 1.65, fontWeight: 400 }}>
          You are given a WAV recording of a real clinician-patient session. Build the pipeline that transcribes it, extracts the clinical data, and outputs it in the exact JSON schema our production frontend consumes.
        </p>

        {/* WAV download card */}
        <a
          href="https://jmdkwtfuagwjloemfthj.supabase.co/storage/v1/object/public/assignment-assets/clinical_assessment.wav"
          download="clinical_assessment.wav"
          style={{
            marginTop: 24,
            display: "flex",
            alignItems: "center",
            gap: 14,
            padding: "14px 18px",
            borderRadius: 12,
            border: "1px solid var(--border)",
            background: "var(--secondary)",
            textDecoration: "none",
            transition: "opacity 0.15s",
          }}
          onMouseEnter={e => (e.currentTarget.style.opacity = "0.8")}
          onMouseLeave={e => (e.currentTarget.style.opacity = "1")}
        >
          <div style={{ flexShrink: 0, width: 36, height: 36, borderRadius: 8, background: "var(--background)", border: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: "var(--foreground)" }}>
              <path d="M12 2v13M5 15l7 7 7-7"/><path d="M2 20h20"/>
            </svg>
          </div>
          <div style={{ minWidth: 0 }}>
            <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: "var(--foreground)", letterSpacing: "-0.01em" }}>clinical_assessment.wav</p>
            <p style={{ margin: 0, fontSize: 11, color: "var(--foreground)", marginTop: 2 }}>Your input file · 8.9 MB · WAV audio</p>
          </div>
          <span style={{ marginLeft: "auto", fontSize: 11, fontWeight: 600, color: "var(--foreground)", flexShrink: 0, textTransform: "uppercase", letterSpacing: "0.08em" }}>Download</span>
        </a>

        <ol style={{ marginTop: 28, display: "flex", flexDirection: "column", gap: 2 }}>
          {HIW_STEPS.map((s, idx) => {
            const isActive = idx === active;
            return (
              <li key={s.id}>
                <button
                  type="button"
                  onClick={() => setActive(idx)}
                  style={{
                    width: "100%",
                    textAlign: "left",
                    padding: "14px 16px",
                    borderRadius: 12,
                    border: isActive ? "1px solid var(--border)" : "1px solid transparent",
                    background: isActive ? "var(--secondary)" : "transparent",
                    cursor: "pointer",
                    transition: "all 0.15s ease",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 16, minWidth: 0 }}>
                      <span style={{ fontSize: 12, fontWeight: 700, fontVariantNumeric: "tabular-nums", flexShrink: 0, color: isActive ? "var(--foreground)" : "var(--foreground)", fontFamily: "monospace", opacity: isActive ? 1 : 0.45 }}>
                        {s.num}
                      </span>
                      <span style={{ fontSize: 15, fontWeight: 700, color: isActive ? "var(--foreground)" : "var(--foreground)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {s.label}
                      </span>
                    </div>
                    <span style={{ fontSize: 12, color: "var(--foreground)", flexShrink: 0, opacity: isActive ? 1 : 0.5 }}>
                      {s.badge}
                    </span>
                  </div>
                  {isActive && (
                    <p style={{ marginTop: 8, marginLeft: 32, fontSize: 13, color: "var(--foreground)", lineHeight: 1.6 }}>
                      {s.desc}
                    </p>
                  )}
                </button>
              </li>
            );
          })}
        </ol>

        <button
          type="button"
          onClick={() => setActive((active + 1) % HIW_STEPS.length)}
          style={{ marginTop: 28, display: "flex", alignItems: "center", gap: 6, fontSize: 14, color: "var(--foreground)", fontWeight: 500, background: "none", border: "none", cursor: "pointer", padding: 0 }}
        >
          Next section <span style={{ fontSize: 16 }}>→</span>
        </button>
      </div>

      {/* ── Right: commit-row panel ── */}
      <div
        key={active}
        style={{
          borderRadius: 14,
          border: "1px solid var(--border)",
          background: "var(--card)",
          overflow: "hidden",
          animation: "fadeSlideIn 0.25s ease",
        }}
      >
        <style>{`@keyframes fadeSlideIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }`}</style>

        {/* Panel header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 20px", borderBottom: "1px solid var(--border)" }}>
          <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--foreground)" }}>
            Problem Brief
          </span>
          <span style={{ fontSize: 12, color: "var(--foreground)" }}>Step {active + 1} of {HIW_STEPS.length}</span>
        </div>

        {/* Panel body */}
        <div style={{ padding: "20px 20px 4px" }}>
          {/* Title row */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
            <span style={{ fontSize: 22, fontWeight: 700, color: "var(--foreground)", letterSpacing: "-0.02em" }}>{step.title}</span>
            <span style={{ fontSize: 11, background: "var(--secondary)", border: "1px solid var(--border)", color: "var(--foreground)", padding: "3px 10px", borderRadius: 6, fontFamily: "monospace", flexShrink: 0 }}>
              {step.tag}
            </span>
          </div>
          <p style={{ fontSize: 12, color: "var(--foreground)", marginBottom: 18 }}>{step.meta}</p>

          {/* Rows */}
          <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 20 }}>
            {step.rows.map((row, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 12, background: "var(--secondary)", border: "1px solid var(--border)", borderRadius: 10, padding: "11px 16px" }}>
                <span style={{ fontSize: 11, color: "var(--foreground)", fontFamily: "monospace", flexShrink: 0, width: 38 }}>{row.hash}</span>
                <span style={{ fontSize: 13.5, color: "var(--foreground)", flex: 1, opacity: 0.88 }}>{row.label}</span>
                <span style={{ fontSize: 11, background: "var(--secondary)", border: "1px solid var(--border)", color: "var(--foreground)", padding: "2px 8px", borderRadius: 5, fontWeight: 500, flexShrink: 0 }}>
                  {row.chip}
                </span>
              </div>
            ))}
          </div>

          {step.extra && (
            <p style={{ fontSize: 12, color: "var(--foreground)", paddingBottom: 16 }}>+ {step.extra}</p>
          )}
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
}: {
  preview: AssignmentPreview;
  onStart: () => void;
  starting: boolean;
}) {
  const [activeStep, setActiveStep] = useState(1);
  const [acceptedTerms, setAcceptedTerms] = useState(false);

  const nextStep = () => setActiveStep((prev) => Math.min(ONBOARDING_STEPS.length, prev + 1));
  const prevStep = () => setActiveStep((prev) => Math.max(1, prev - 1));

  return (
    <main className="min-h-screen bg-background flex flex-col">
      <header className="border-b border-border/70 px-6 py-4 bg-card/10 backdrop-blur-md sticky top-0 z-40">
        <div className="mx-auto flex max-w-5xl items-center justify-between">
          <img src={logoWhite} alt="Stance Health" className="h-7 w-auto invert dark:invert-0" />
          <div className="flex items-center gap-4">
            <span className="text-[12px] text-foreground/75">{preview.email}</span>
          </div>
        </div>
      </header>

      {/* Onboarding 2: Two-column layout with vertical rail and form body */}
      <div className="flex-1 max-w-5xl w-full mx-auto grid grid-cols-1 md:grid-cols-[280px_1fr] gap-10 px-6 py-10 overflow-hidden">
        
        {/* Left Side Labelled Rail */}
        <aside className="space-y-6 flex flex-col justify-start">
          <div>
            <h2 className="text-sm font-bold uppercase tracking-wider text-foreground/75">Setup Checklist</h2>
            <p className="text-[12px] text-foreground/75 mt-1">Complete each step below to unlock and reveal the assignment question.</p>
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
                          : "bg-background border-border text-foreground/75"
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
                    <span className={`text-[13px] font-semibold transition-colors ${isActive ? "text-foreground" : "text-foreground/75"}`}>
                      {s.label}
                    </span>
                    <span className="text-[11px] text-foreground/75 leading-normal mt-0.5">{s.desc}</span>
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
                  <h4 className="text-xs font-bold uppercase tracking-wider text-foreground/75">Assessment details:</h4>
                  <div className="grid grid-cols-2 gap-4 text-[13.5px]">
                    <div>
                      <span className="text-foreground/75 block text-[11px]">TOPIC</span>
                      <strong className="font-semibold text-foreground">{preview.title}</strong>
                    </div>
                    <div>
                      <span className="text-foreground/75 block text-[11px]">TIMED LIMIT</span>
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
                      <span className="mt-[2px] flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-secondary text-[10px] font-bold text-foreground/75 border border-border">
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

                <div className="mt-6 rounded-xl bg-secondary border border-border p-5">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-foreground">Important</h4>
                  <p className="text-[13px] leading-relaxed text-foreground/75 mt-1">
                    Once you click "Accept & Start Timer", your {preview.durationHours}-hour timer will begin immediately. The timer is server-authoritative and cannot be paused or reset under any circumstances.
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

function TimedPage({ view, token }: { view: CandidateView; token: string }) {
  const [now, setNow] = useState(() => Date.now());
  const [ghUsername, setGhUsername] = useState("");
  const [ghStatus, setGhStatus] = useState<"idle" | "loading" | "invited" | "already" | "error">("idle");
  const [ghError, setGhError] = useState<string | null>(null);
  const [bannerDismissed, setBannerDismissed] = useState(false);

  const showBanner = !bannerDismissed && ghStatus !== "invited" && ghStatus !== "already";

  async function handleGithubAccess() {
    if (!ghUsername.trim()) return;
    setGhStatus("loading");
    setGhError(null);
    try {
      const res = await requestGithubAccess({ data: { token, githubUsername: ghUsername.trim() } });
      setGhStatus(res.alreadyCollaborator ? "already" : "invited");
    } catch (err) {
      setGhStatus("error");
      setGhError(err instanceof Error ? err.message : "Failed. Try again.");
    }
  }

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
      <header className="border-b border-border px-6 py-4 bg-card sticky top-0 z-40">
        <div className="mx-auto flex max-w-5xl items-center justify-between">
          <img src={logoWhite} alt="Stance Health" className="h-6 w-auto invert dark:invert-0" />
          <div className="flex items-center gap-4">
            <span className="text-[12px] text-foreground/75">{view.email}</span>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-5xl px-6 py-10">

        {/* Timer HUD — flip disk display */}
        <div className="mb-10 rounded-2xl border border-border bg-card px-6 py-5">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
            <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-foreground/75">
              {isSubmitted ? "Status" : isGrace ? "Grace period remaining" : "Time remaining"}
            </p>
            <div className="flex items-center gap-4 text-right">
              {isGrace && (
                <p className="text-[13px] font-semibold text-foreground animate-pulse">
                  Push your final code now
                </p>
              )}
              {!isSubmitted && targetIso && (
                <p className="text-[13px] text-foreground/75">
                  Ends {new Date(targetIso).toLocaleString(undefined, { timeZoneName: "short" })}
                </p>
              )}
              {isSubmitted && (
                <p className="text-[13px] font-semibold text-foreground">Submitted ✓</p>
              )}
            </div>
          </div>

          {/* Flip disk matrix timer */}
          <div className="mx-auto max-w-xs sm:max-w-sm">
            <FlipDiskMatrix display={(() => {
              if (isSubmitted) return "DONE";
              if (remaining <= 0) return "00:00:00";
              const totalSec = Math.floor(remaining / 1000);
              const hours = Math.floor(totalSec / 3600);
              const mins = Math.floor((totalSec % 3600) / 60);
              const secs = totalSec % 60;
              return `${String(hours).padStart(2, "0")}:${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
            })()} />
          </div>

          {!isSubmitted && (
            <div className="mt-5 h-2 w-full rounded-full bg-secondary overflow-hidden">
              <div
                className="h-full rounded-full bg-foreground transition-all duration-1000"
                style={{ width: `${percentage}%` }}
              />
            </div>
          )}
        </div>

        {/* Title */}
        <h1 style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 800, fontSize: "clamp(28px, 3.5vw, 44px)", letterSpacing: "-0.035em", lineHeight: 1.1, color: "inherit" }}>
          {view.title}
        </h1>

        <div className="mt-3 flex flex-wrap items-center gap-2 text-[13px]">
          <span className="text-foreground/75">Submit to:</span>
          <a href={view.githubRepo} target="_blank" rel="noopener noreferrer"
            className="rounded border border-border bg-secondary px-2.5 py-0.5 font-mono text-[12px] text-foreground hover:bg-secondary/80 transition-colors">
            {repoName}
          </a>
        </div>

        {/* Problem Statement */}
        <section className="mt-10 rounded-2xl border border-border bg-card p-6 sm:p-8">
          <p className="text-[10.5px] font-bold uppercase tracking-[0.14em] text-foreground/75 border-b border-border pb-3 mb-7">
            Problem statement
          </p>
          <InteractiveBrief text={view.problemStatement ?? ""} />
        </section>

        {/* Branch & Git */}
        {view.email && view.candidateId && (
          <div className="mt-8 rounded-xl border border-border bg-card px-6 py-6 sm:px-8">
            <h3 className="text-[11px] font-bold tracking-[0.12em] text-foreground/75 uppercase">
              Your Dedicated Candidate Branch
            </h3>
            <p className="mt-2 text-[13.5px] leading-relaxed text-foreground/80 font-light">
              Push your code to your unique candidate branch. Pushes to other branches cannot be evaluated:
            </p>

            {/* GitHub access request */}
            <div className="mt-4 rounded-lg border border-border bg-secondary/40 p-4">
              <p className="text-[12px] font-semibold text-foreground/90 mb-1">Grant yourself push access</p>
              <p className="text-[11.5px] text-foreground/60 mb-3">
                Enter your GitHub username below. Without this, your <code className="bg-background px-1 rounded text-[11px]">git push</code> will be rejected.
              </p>
              {ghStatus === "invited" ? (
                <p className="text-[12.5px] text-emerald-400 font-medium">
                  ✓ Invite sent to <strong>@{ghUsername}</strong> — check your GitHub email and accept it, then you can push.
                </p>
              ) : ghStatus === "already" ? (
                <p className="text-[12.5px] text-emerald-400 font-medium">
                  ✓ <strong>@{ghUsername}</strong> already has access — you can push right away.
                </p>
              ) : (
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={ghUsername}
                    onChange={(e) => { setGhUsername(e.target.value); setGhStatus("idle"); setGhError(null); }}
                    onKeyDown={(e) => e.key === "Enter" && handleGithubAccess()}
                    placeholder="your-github-username"
                    className="flex-1 bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-foreground/30 focus:outline-none focus:ring-1 focus:ring-border font-mono"
                  />
                  <button
                    type="button"
                    disabled={!ghUsername.trim() || ghStatus === "loading"}
                    onClick={handleGithubAccess}
                    className="px-4 py-2 bg-foreground text-background text-xs font-bold rounded-lg disabled:opacity-40 hover:bg-foreground/90 transition-colors whitespace-nowrap cursor-pointer"
                  >
                    {ghStatus === "loading" ? "Requesting…" : "Get Access"}
                  </button>
                </div>
              )}
              {ghStatus === "error" && (
                <p className="mt-2 text-[11.5px] text-red-400">{ghError}</p>
              )}
            </div>

            <div className="mt-3 rounded-lg border border-border bg-background p-4 font-mono text-[12.5px] text-foreground/80 space-y-1.5 overflow-x-auto">
              <p><span className="text-foreground/75"># 1. Clone the repo (first time only)</span></p>
              <p className="text-foreground/75">git clone {view.githubRepo} && cd {view.githubRepo?.split("/").pop()?.replace(/\.git$/, "")}</p>
              <p className="mt-1"><span className="text-foreground/75"># 2. Your unique branch:</span> <strong className="text-foreground">{branchName}</strong></p>
              <p className="text-foreground/75">git checkout -b {branchName}</p>
              <p className="mt-1 text-foreground/75"># 3. Push your work</p>
              <p className="text-foreground/75">git add .</p>
              <p className="text-foreground/75">git commit -m "feat: complete assignment"</p>
              <p className="text-foreground/75">git push -u origin {branchName}</p>
            </div>
            <p className="mt-3 text-[12px] text-foreground/75">
              Once pushed, the system will sync automatically.
            </p>
          </div>
        )}

        <p className="mt-8 text-center text-[11.5px] text-foreground/75">
          Timer is controlled server-side. Do not close this page until you have pushed your code.
          {isGrace && " You are in the final 10-minute submission window."}
        </p>
      </div>

      {/* GitHub username reminder banner — bottom left */}
      {showBanner && (
        <div
          style={{
            position: "fixed",
            bottom: 24,
            left: 24,
            zIndex: 50,
            maxWidth: 340,
            borderRadius: 14,
            border: "1px solid var(--border)",
            background: "var(--card)",
            boxShadow: "0 8px 32px rgba(0,0,0,0.35)",
            padding: "14px 16px",
            animation: "fadeSlideInBanner 0.3s ease",
          }}
        >
          <style>{`@keyframes fadeSlideInBanner { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } }`}</style>
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 10 }}>
            <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
              <span style={{ fontSize: 16, flexShrink: 0, marginTop: 1 }}>⚠️</span>
              <div>
                <p style={{ margin: 0, fontSize: 12.5, fontWeight: 700, color: "var(--foreground)", letterSpacing: "-0.01em" }}>
                  Fill in your GitHub username
                </p>
                <p style={{ margin: "5px 0 0", fontSize: 11.5, color: "var(--foreground)", lineHeight: 1.5, opacity: 0.7 }}>
                  Without it your <code style={{ background: "var(--secondary)", padding: "0 4px", borderRadius: 4, fontSize: 11 }}>git push</code> will be rejected.
                  {ghStatus === "error" && " Already tried? Try again — it should work now."}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setBannerDismissed(true)}
              style={{ background: "none", border: "none", cursor: "pointer", color: "var(--foreground)", opacity: 0.4, fontSize: 16, lineHeight: 1, padding: "0 2px", flexShrink: 0 }}
              aria-label="Dismiss"
            >
              ✕
            </button>
          </div>
        </div>
      )}
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

  // Polling fallback while in timed phase (every 30s)
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

  // Realtime subscription — push admin changes instantly to candidate
  useEffect(() => {
    if (phase !== "timed" || !view?.candidateId) return;
    const channel = supabase
      .channel(`candidate-${view.candidateId}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "candidates", filter: `id=eq.${view.candidateId}` },
        async () => {
          try {
            const cv = await openAssignment({ data: { token } });
            if (!cv.ok) return toError(cv.reason);
            setView(cv);
          } catch {
            // silent
          }
        },
      )
      .on(
        "postgres_changes",
        { event: "DELETE", schema: "public", table: "candidates", filter: `id=eq.${view.candidateId}` },
        () => {
          toError("Your access has been revoked. Please contact the admin.");
        },
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [phase, view?.candidateId, token]);

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
        <p className="text-sm text-foreground/75">Loading your assignment…</p>
      </main>
    );
  }

  if (phase === "error" || !preview) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center bg-background px-6 text-center">
        <div className="max-w-md">
          <h1 className="text-xl font-medium tracking-tight text-foreground">Access closed</h1>
          <p className="mt-3 text-[14px] leading-relaxed text-foreground/75">
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
    return <QuestionPage preview={preview} onStart={handleStart} starting={starting} />;
  }

  if (!view) return null;
  return <TimedPage view={view} token={token} />;
}
