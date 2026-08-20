import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { getCandidateBranch } from "@/lib/utils";
import logoWhite from "@/assets/logo-white.png";
import {
  getMe,
  listAssignments,
  createAssignment,
  deleteAssignment,
  listCandidates,
  inviteCandidates,
  checkSubmission,
  toggleUnblurCandidate,
  listAuditLogs,
} from "@/lib/admin.functions";

interface Template {
  name: string;
  title: string;
  duration_hours: number;
  github_repo: string;
  problem_statement: string;
}

const TEMPLATES: Template[] = [
  {
    name: "Voice/Note → Structured Clinical Assessment Form Filler",
    title: "Voice/Note → Structured Clinical Assessment Form Filler",
    duration_hours: 10,
    github_repo: "https://github.com/Stance-Health/structured-assessment-filler",
    problem_statement: `Assignment: Voice/Note → Structured Clinical Assessment Form Filler
Duration: ~10 hours
Stack (must use): Python + FastAPI, Pydantic for structured output, LangChain or LangGraph for the agent flow, MongoDB for storage, Git.

Problem Statement
Clinicians at Stance Health currently dictate or type free-text notes after assessments. These notes are messy, incomplete, use inconsistent terminology, and mix objective numbers with subjective observations. Your task is to build a production-style backend service that turns raw clinician notes (or simulated voice transcripts) into a strictly structured assessment form that can be directly saved into MongoDB and used by downstream clinical tools.

Core Requirements

Input
A free-text string (clinician note or voice transcript).
Optional: patient_id and session metadata.

Agent Pipeline (LangGraph preferred, LangChain acceptable)
Parse the note.
Map content into a multi-section structured schema.
Detect missing or ambiguous fields and flag them with confidence scores.
Never invent numbers or clinical facts that are not present in the input.
Produce a short human-readable summary of what was extracted + what is still missing.

Structured Output Schema (must be enforced with Pydantic)
You must define and strictly validate a schema that covers at least these sections:
- Patient identifiers / session metadata
- Subjective: chief complaint, pain history (location, intensity VAS, aggravating/relieving factors, onset)
- Objective: ROM values, strength grades or force numbers, gait/movement quality observations, special tests
- Assessment / clinical impression
- Plan: exercises prescribed, load/sets/reps if mentioned, follow-up recommendations, red flags
- Extraction metadata: confidence per section, list of unresolved ambiguities, source spans (optional but valued)

API
- POST /assessments/parse → accepts note + optional patient_id → returns the fully validated structured object + summary + flags.
- POST /assessments → saves the structured result to MongoDB.
- GET /assessments/{id} and a simple list endpoint by patient_id.
- Proper error handling, status codes, and input validation.

MongoDB
- Design a sensible collection schema for the structured assessments.
- Support basic querying (by patient, by date range).

Robustness
- Handle incomplete notes, contradictory statements, unit variations (degrees vs %, kg vs N), and noisy language.
- Graceful degradation when the LLM fails or returns invalid JSON (retry or clear error).
- No hallucinated clinical data.

Deliverables (what the intern must submit)
- Working FastAPI service with the endpoints above.
- LangGraph / LangChain agent code.
- Pydantic models for the full structured form.
- MongoDB models / connection code.
- At least 6–8 synthetic test notes (good, incomplete, contradictory, noisy) + a simple evaluation script or notebook showing schema compliance and extraction quality.
- Short design document (1–2 pages) covering:
  * Agent graph design decisions
  * How you prevent hallucination of numbers
  * Failure modes you observed and how you handled them
  * What you would improve with more time

Constraints & Evaluation Focus
- Time box is strict (~10 hours). Prioritize correctness and reliability over polish.
- You may use any LLM API, embeddings, or tools.
- We will evaluate:
  * Schema strictness and reliability under noisy input
  * Quality of agent design and structured output handling
  * Mongo modeling and API cleanliness
  * Engineering judgment (error handling, validation, documentation)
  * Clinical safety awareness (never invent data)

This system mirrors the real internal tooling used for clinical assessments and multi-agent summarization at Stance Health. A strong solution will be something we could actually iterate on for production.`
  }
];

export const Route = createFileRoute("/admin/dashboard")({
  head: () => ({
    meta: [{ title: "Admin Console — Stance Health Assignments" }],
  }),
  component: AdminPage,
});

type Assignment = {
  id: string;
  title: string;
  problem_statement: string;
  duration_hours: number;
  github_repo: string;
  created_at: string;
};

type CandidateRow = {
  id: string;
  email: string;
  status: string;
  started_at: string | null;
  ends_at: string | null;
  grace_ends_at: string | null;
  submitted_at: string | null;
  revoked: boolean;
  unblurred?: boolean;
  invite_sent_at: string | null;
  assignments?: { title: string; github_repo: string; duration_hours: number } | null;
};

function getRemainingText(c: CandidateRow, serverNowStr: string) {
  if (!c.started_at || !c.ends_at) return "—";
  if (c.submitted_at) return "Submitted";
  if (c.revoked) return "Revoked";
  
  const endsAtMs = new Date(c.ends_at).getTime();
  const serverNowMs = serverNowStr ? new Date(serverNowStr).getTime() : Date.now();
  const diffMs = endsAtMs - serverNowMs;
  
  if (diffMs <= 0) return "Expired";
  
  const hours = Math.floor(diffMs / 3600_000);
  const mins = Math.floor((diffMs % 3600_000) / 60_000);
  return `${hours}h ${mins}m left`;
}

function ThemeToggle({ theme, toggleTheme }: { theme: "light" | "dark"; toggleTheme: () => void }) {
  return (
    <button
      onClick={toggleTheme}
      className="p-1.5 rounded-lg hover:bg-secondary/80 text-muted-foreground hover:text-foreground transition-colors cursor-pointer border border-border bg-muted"
      title="Toggle Light/Dark Mode"
      type="button"
    >
      {theme === "dark" ? (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
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
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
        </svg>
      )}
    </button>
  );
}

// ─── Beautiful Calendar Component for Right Panel (August 2026) ───

function CalendarWidget() {
  const daysInAugust = 31;
  const startDayOffset = 6; // Aug 1, 2026 is a Saturday (offset 6)
  
  const days: (number | null)[] = [];
  for (let i = 0; i < startDayOffset; i++) days.push(null);
  for (let i = 1; i <= daysInAugust; i++) days.push(i);

  // We will highlight "19" (Wednesday, Aug 19, 2026) exactly matching the user date!
  const todayDate = 19;
  
  // Custom mock active candidate deadlines on some days (dots underneath)
  const candidateDeadlineDays = [12, 13, 14, 17, 19, 21, 24];

  return (
    <div className="bg-card rounded-xl p-4 border border-border/80">
      <div className="flex items-center justify-between mb-3.5">
        <h4 className="text-[13px] font-bold text-white">August 2026</h4>
        <div className="flex gap-1.5">
          <button className="p-1 rounded hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors text-xs">◀</button>
          <button className="p-1 rounded hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors text-xs">▶</button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-y-2 text-center text-[11px] font-medium text-muted-foreground">
        {["S", "M", "T", "W", "T", "F", "S"].map((d, idx) => (
          <span key={idx} className="h-6 flex items-center justify-center font-semibold text-[10px] tracking-wider">{d}</span>
        ))}
        {days.map((day, idx) => {
          if (day === null) return <span key={idx} className="h-7" />;
          
          const isToday = day === todayDate;
          const hasDeadline = candidateDeadlineDays.includes(day);

          return (
            <div key={idx} className="relative flex flex-col items-center justify-center h-7">
              <span
                className={`flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-semibold transition-all ${
                  isToday
                    ? "bg-card text-foreground shadow-sm scale-110 font-bold"
                    : "text-foreground/80 hover:bg-secondary hover:text-foreground cursor-pointer"
                }`}
              >
                {day}
              </span>
              {hasDeadline && !isToday && (
                <span className="absolute bottom-[2px] h-1 w-1 rounded-full bg-neutral-500" />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function AdminPage() {
  const navigate = useNavigate();
  const [ready, setReady] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [candidates, setCandidates] = useState<CandidateRow[]>([]);
  const [serverNow, setServerNow] = useState<string>("");
  const [selectedAssignmentId, setSelectedAssignmentId] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // Active filter tab: "all" | "in_progress" | "submitted" | "expired"
  const [activeTab, setActiveTab] = useState<"all" | "in_progress" | "submitted" | "expired">("all");

  // Real-time activity/audit logs
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [showActivity, setShowActivity] = useState(true);

  // Overlay modal for creating assignments
  const [showCreateModal, setShowCreateModal] = useState(false);

  // Selected candidate for detail view overlay
  const [selectedCandidate, setSelectedCandidate] = useState<CandidateRow | null>(null);

  // Create form state
  const [title, setTitle] = useState("");
  const [problem, setProblem] = useState("");
  const [hours, setHours] = useState(10);
  const [repo, setRepo] = useState("");

  // Invite form state
  const [inviteEmails, setInviteEmails] = useState("");

  // Global theme switcher state
  const [theme, setTheme] = useState<"dark">("dark");

  const toggleTheme = () => {
    // Force dark mode to replicate the high-end dark screenshot layout exactly!
    setTheme("dark");
    document.documentElement.classList.add("dark");
  };

  const load = useCallback(async () => {
    try {
      const me = await getMe();
      if (!me.isAdmin) {
        setIsAdmin(false);
        setReady(true);
        return;
      }
      setIsAdmin(true);
      const [asgs, cand, logs] = await Promise.all([
        listAssignments(),
        listCandidates({ data: selectedAssignmentId ? { assignmentId: selectedAssignmentId } : {} }),
        listAuditLogs(),
      ]);
      setAssignments(asgs as Assignment[]);
      setCandidates((cand as { serverNow: string; rows: CandidateRow[] }).rows);
      setServerNow((cand as { serverNow: string }).serverNow);
      setAuditLogs(logs as any[]);
      setReady(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load");
      setReady(true);
    }
  }, [selectedAssignmentId]);

  useEffect(() => {
    // Ensure dark mode is active immediately
    document.documentElement.classList.add("dark");
    
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session) {
        navigate({ to: "/admin" }); // Redirect to admin login
        return;
      }
      load();
    });
  }, [load, navigate]);

  useEffect(() => {
    if (!isAdmin) return;
    const id = setInterval(load, 20_000);
    return () => clearInterval(id);
  }, [isAdmin, load]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await createAssignment({
        data: {
          title,
          problemStatement: problem,
          durationHours: hours,
          githubRepo: repo,
        },
      });
      setTitle("");
      setProblem("");
      setHours(10);
      setRepo("");
      setShowCreateModal(false);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Create failed");
    } finally {
      setBusy(false);
    }
  }

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedAssignmentId) {
      setError("Select an assignment first");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const emails = inviteEmails
        .split(/[\n,;]+/)
        .map((s) => s.trim())
        .filter(Boolean);
      await inviteCandidates({ data: { assignmentId: selectedAssignmentId, emails } });
      setInviteEmails("");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Invite failed");
    } finally {
      setBusy(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this assignment and all its candidates?")) return;
    setBusy(true);
    try {
      await deleteAssignment({ data: { id } });
      if (selectedAssignmentId === id) setSelectedAssignmentId("");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Delete failed");
    } finally {
      setBusy(false);
    }
  }

  async function handleCheckSubmission(candidateId: string) {
    setBusy(true);
    try {
      await checkSubmission({ data: { candidateId } });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Check failed");
    } finally {
      setBusy(false);
    }
  }

  async function handleToggleUnblur(candidateId: string, unblurred: boolean) {
    setBusy(true);
    setError(null);
    try {
      await toggleUnblurCandidate({ data: { candidateId, unblurred } });
      await load();
      if (selectedCandidate && selectedCandidate.id === candidateId) {
        setSelectedCandidate((prev) => prev ? { ...prev, unblurred } : null);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Toggle unblur failed");
    } finally {
      setBusy(false);
    }
  }

  async function signOut() {
    await supabase.auth.signOut();
    navigate({ to: "/admin" }); // Redirect to admin login
  }

  // Filtered candidate list based on active tab
  const filteredCandidates = useMemo(() => {
    return candidates.filter((c) => {
      if (activeTab === "all") return true;
      if (activeTab === "in_progress") return c.status !== "submitted" && c.status !== "expired" && c.started_at;
      if (activeTab === "submitted") return c.submitted_at;
      if (activeTab === "expired") return c.status === "expired" || c.status === "closed";
      return true;
    });
  }, [candidates, activeTab]);

  // Counts for each tab
  const counts = useMemo(() => {
    return {
      all: candidates.length,
      in_progress: candidates.filter((c) => c.status !== "submitted" && c.status !== "expired" && c.started_at).length,
      submitted: candidates.filter((c) => c.submitted_at).length,
      expired: candidates.filter((c) => c.status === "expired" || c.status === "closed").length,
    };
  }, [candidates]);

  // Find currently selected assignment details
  const selectedAssignment = useMemo(() => {
    return assignments.find((a) => a.id === selectedAssignmentId) || null;
  }, [assignments, selectedAssignmentId]);

  function statusBadge(c: CandidateRow) {
    if (c.revoked) return "Revoked";
    if (c.submitted_at) return "Submitted";
    if (c.status === "expired" || c.status === "closed") return "Expired";
    if (c.status === "grace") return "Grace";
    if (c.started_at) return "In progress";
    return "Not started";
  }

  if (!ready) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-background">
        <p className="text-sm text-muted-foreground">Loading…</p>
      </main>
    );
  }

  if (!isAdmin) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center bg-background px-6 text-center">
        <h1 className="text-xl font-medium text-white">Admin access required</h1>
        <p className="mt-2 max-w-sm text-[14px] text-muted-foreground">
          Your account does not have the admin role. Ask an existing admin to invite you.
        </p>
        <button onClick={signOut} className="mt-6 text-sm underline text-foreground/80 hover:text-foreground cursor-pointer">
          Sign out
        </button>
      </main>
    );
  }

  return (
    <main className="h-screen bg-background text-foreground font-sans flex overflow-hidden">
      
      {/* ========================================================
          COLUMN 1: Left Navigation Sidebar (Replicating Screenshot Left Panel)
         ======================================================== */}
      <aside className="w-[240px] bg-card border-r border-border/80 flex flex-col flex-shrink-0 justify-between select-none">
        
        {/* Header Block */}
        <div className="flex flex-col">
          <div className="flex items-center gap-3 px-4 py-4.5 border-b border-border/60">
            <span className="flex h-7 w-7 items-center justify-center rounded bg-secondary text-white font-bold text-[13px] border border-border/60">S</span>
            <div className="flex flex-col min-w-0">
              <span className="text-[12.5px] font-bold text-white truncate leading-tight">Stance Health</span>
              <span className="text-[10px] text-muted-foreground tracking-wide font-medium mt-0.5">Hiring Desk</span>
            </div>
          </div>

          {/* Section: HIRING */}
          <div className="px-3 py-4 space-y-1">
            <h4 className="px-2 text-[9px] font-bold uppercase tracking-wider text-muted-foreground mb-2">Hiring</h4>
            
            <button
              onClick={() => { setActiveTab("all"); setSelectedAssignmentId(""); }}
              className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-[12.5px] transition-colors cursor-pointer ${
                selectedAssignmentId === "" ? "bg-secondary/90 text-white font-semibold" : "text-muted-foreground hover:bg-secondary/35 hover:text-foreground"
              }`}
            >
              <div className="flex items-center gap-2">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                  <circle cx="9" cy="7" r="4" />
                  <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                  <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                </svg>
                <span>Active Candidates</span>
              </div>
              <span className="text-[10.5px] font-bold text-muted-foreground">{counts.all}</span>
            </button>

            <button
              onClick={() => { setShowCreateModal(true); }}
              className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-[12.5px] text-muted-foreground hover:bg-secondary/35 hover:text-foreground transition-colors cursor-pointer"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
              <span>New Assignment</span>
            </button>
          </div>

          {/* Section: ASSIGNMENT TEMPLATES (replaces DESKS section) */}
          <div className="px-3 py-2 space-y-1">
            <h4 className="px-2 text-[9px] font-bold uppercase tracking-wider text-muted-foreground mb-2">Assignments</h4>
            
            {assignments.map((a) => (
              <div
                key={a.id}
                className={`group w-full flex items-center justify-between px-2.5 py-1 rounded-lg text-[12.5px] transition-colors ${
                  selectedAssignmentId === a.id
                    ? "bg-secondary/90 text-white font-semibold"
                    : "text-muted-foreground hover:bg-secondary/35 hover:text-foreground"
                }`}
              >
                <button
                  onClick={() => setSelectedAssignmentId(a.id)}
                  className="flex items-center gap-2 min-w-0 text-left cursor-pointer flex-1 py-1"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="flex-shrink-0">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                    <polyline points="14 2 14 8 20 8" />
                  </svg>
                  <span className="truncate">{a.title}</span>
                </button>
                
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDelete(a.id);
                  }}
                  className="p-1 rounded opacity-0 group-hover:opacity-100 hover:bg-accent text-muted-foreground hover:text-red-400 transition-all cursor-pointer flex-shrink-0 ml-1.5"
                  title="Delete Assignment"
                  type="button"
                >
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <polyline points="3 6 5 6 21 6" />
                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                  </svg>
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom Profile card */}
        <div className="p-3 border-t border-border/60 bg-muted/10">
          <div className="flex items-center justify-between gap-2.5">
            <div className="flex items-center gap-2.5 min-w-0">
              <span className="flex h-7 w-7 items-center justify-center rounded bg-foreground text-background font-bold text-[11px]">CT</span>
              <div className="flex flex-col min-w-0">
                <span className="text-[11.5px] font-bold text-white truncate leading-tight">Chris Thomas</span>
                <span className="text-[9.5px] text-muted-foreground truncate leading-none mt-0.5">Hiring Admin</span>
              </div>
            </div>
            <ThemeToggle theme="dark" toggleTheme={toggleTheme} />
          </div>
        </div>
      </aside>

      {/* ========================================================
          COLUMN 2: Center Queue Content (Replicating Screenshot Queue Panel)
         ======================================================== */}
      <section className="flex-1 bg-background flex flex-col overflow-hidden">
        
        {/* Header Breadcrumbs Bar */}
        <header className="px-6 py-4.5 border-b border-border/80 flex items-center justify-between bg-background">
          <div className="flex items-center gap-1.5 text-[12.5px] font-medium text-muted-foreground">
            <span>Hiring</span>
            <span className="text-neutral-600 text-[11px]">▶</span>
            <span className="text-white font-semibold">Candidate queue</span>
          </div>

          <div className="flex items-center gap-3">
            {/* Real-time Activity Logs Toggle */}
            <button
              onClick={() => setShowActivity(!showActivity)}
              className={`p-1.5 rounded-lg border transition-colors cursor-pointer hover:bg-secondary ${
                showActivity ? "bg-secondary border-border text-white" : "border-border text-muted-foreground"
              }`}
              title="Toggle Calendar & Activity Panel"
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                <line x1="9" y1="3" x2="9" y2="21" />
              </svg>
            </button>
            
            <button
              onClick={() => setShowCreateModal(true)}
              className="bg-foreground hover:bg-foreground/90 text-background px-3.5 py-1.5 text-[12.5px] font-bold rounded-lg transition-transform hover:scale-102 cursor-pointer shadow-sm"
            >
              New assignment
            </button>
          </div>
        </header>

        {/* Tab switchers + Form */}
        <div className="px-6 py-4 border-b border-border/80 bg-background flex flex-wrap items-center justify-between gap-4">
          <div className="flex rounded-lg bg-muted/50 p-0.5 border border-border/60 text-[12px] font-medium">
            {[
              { id: "all", label: "All candidates" },
              { id: "in_progress", label: "In progress" },
              { id: "submitted", label: "Submitted" },
              { id: "expired", label: "Expired" },
            ].map((t) => (
              <button
                key={t.id}
                onClick={() => setActiveTab(t.id as any)}
                className={`px-3 py-1 rounded-md transition-colors cursor-pointer ${
                  activeTab === t.id ? "bg-card text-foreground font-semibold shadow-sm" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          {/* Quick Invite Form (inline with tab selector) */}
          {selectedAssignmentId && (
            <form
              onSubmit={handleInvite}
              className="flex items-center gap-2 max-w-sm w-full"
            >
              <input
                required
                type="email"
                value={inviteEmails}
                onChange={(e) => setInviteEmails(e.target.value)}
                placeholder="Enter candidate email..."
                className="w-full rounded-lg border border-border bg-background px-3 py-1.5 text-xs text-white outline-none focus:border-border font-medium"
              />
              <button
                type="submit"
                disabled={busy}
                className="bg-secondary hover:bg-accent border border-border px-3 py-1.5 text-xs font-semibold rounded-lg text-white flex-shrink-0 cursor-pointer"
              >
                Invite
              </button>
            </form>
          )}
        </div>

        {/* Candidate Grid Queue */}
        <div className="flex-1 overflow-y-auto p-6 scrollbar-thin">
          {error && (
            <div className="rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-[13px] text-destructive mb-6">
              {error}
            </div>
          )}

          {/* Selected Assignment Context Header */}
          {selectedAssignment && (
            <div className="mb-6 bg-muted/35 border border-border/80 p-4 rounded-xl flex items-center justify-between">
              <div>
                <span className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground">Active Filter Template:</span>
                <h3 className="text-[14px] font-bold text-white mt-0.5">{selectedAssignment.title}</h3>
              </div>
              <button
                onClick={() => setSelectedAssignmentId("")}
                className="text-xs text-muted-foreground hover:text-foreground underline cursor-pointer"
              >
                Show All Assignments
              </button>
            </div>
          )}

          {/* Table Container */}
          <div className="overflow-hidden rounded-xl border border-border/60 bg-card/30 shadow-md">
            <table className="w-full text-left text-[12.5px] border-collapse">
              <thead className="border-b border-border/80 bg-muted/40 text-[10.5px] uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="px-4 py-3.5 font-bold">Candidate</th>
                  <th className="px-4 py-3.5 font-bold">Status</th>
                  <th className="px-4 py-3.5 font-bold">Time / Ends</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-800/40">
                {filteredCandidates.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="px-4 py-12 text-center text-muted-foreground font-light bg-background/20">
                      No candidates in this queue list.
                    </td>
                  </tr>
                ) : (
                  filteredCandidates.map((c) => {
                    // Check if selected
                    const isSelected = selectedCandidate && selectedCandidate.id === c.id;
                    const statusDotColor =
                      c.revoked
                        ? "bg-neutral-500"
                        : c.submitted_at
                          ? "bg-emerald-500"
                          : c.status === "expired" || c.status === "closed"
                            ? "bg-neutral-600"
                            : c.status === "grace"
                              ? "bg-amber-500"
                              : "bg-sky-500";

                    return (
                      <tr
                        key={c.id}
                        onClick={() => setSelectedCandidate(c)}
                        className={`hover:bg-secondary/35 cursor-pointer transition-colors ${
                          isSelected ? "bg-secondary/60" : ""
                        }`}
                      >
                        <td className="px-4 py-4">
                          <div className="flex flex-col">
                            <span className="font-bold text-white">{c.email}</span>
                            <span className="text-[11px] text-muted-foreground truncate mt-0.5 max-w-[280px]">
                              {c.assignments?.title ?? "—"}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-4">
                          <div className="flex items-center gap-2 text-foreground/80">
                            <span className={`h-1.5 w-1.5 rounded-full ${statusDotColor} ${c.status === "grace" ? "animate-pulse" : ""}`} />
                            <span className="text-[12px] font-semibold">{statusBadge(c)}</span>
                          </div>
                        </td>
                        <td className="px-4 py-4 text-muted-foreground font-medium">
                          {c.started_at ? (
                            <div className="flex flex-col">
                              <span>{getRemainingText(c, serverNow)}</span>
                              <span className="text-[10px] text-muted-foreground mt-0.5">Ends {new Date(c.ends_at!).toLocaleDateString()}</span>
                            </div>
                          ) : (
                            <span className="text-muted-foreground">Not started yet</span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* ========================================================
          COLUMN 3: Context Panel (Replicating Screenshot Schedule & Up Next)
         ======================================================== */}
      {showActivity && (
        <aside className="w-[300px] bg-card border-l border-border/80 flex flex-col flex-shrink-0 select-none animate-in slide-in-from-right duration-200 overflow-hidden">
          {/* Header */}
          <div className="p-4 border-b border-border/60 flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-wider text-white">Schedule</h3>
            <button
              onClick={() => setShowActivity(false)}
              className="text-muted-foreground hover:text-foreground cursor-pointer transition-colors text-xs"
            >
              ✕
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-6 scrollbar-thin">
            {/* Calendar widget showing August 2026 */}
            <CalendarWidget />

            {/* UP NEXT Activities */}
            <div className="space-y-4">
              <h4 className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground">Activity Log</h4>
              
              <div className="space-y-3.5">
                {auditLogs.length === 0 ? (
                  <p className="text-[11.5px] text-muted-foreground font-light">No activity recorded yet.</p>
                ) : (
                  auditLogs.slice(0, 8).map((log, idx) => {
                    // Extract candidate email
                    const candEmail = log.candidates?.email || log.actor || "hiring-desk";
                    const isSubmission = log.event === "submission_detected";
                    
                    return (
                      <div
                        key={log.id}
                        className="pl-3.5 border-l-2 border-border text-[12px] flex flex-col gap-1 transition-all hover:border-neutral-500"
                      >
                        <span className="text-[10px] font-semibold text-muted-foreground font-mono">
                          {new Date(log.created_at).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}
                        </span>
                        <span className="font-bold text-white line-clamp-1 leading-tight">
                          {log.event.replace(/_/g, " ").toUpperCase()}
                        </span>
                        <span className="text-[11px] text-muted-foreground font-light leading-normal truncate">
                          {candEmail}
                        </span>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        </aside>
      )}

      {/* ========================================================
          OVERLAY SIDE DRAWER: Selected Candidate Details & Git Branch unblurs
         ======================================================== */}
      {selectedCandidate && (
        <div className="fixed inset-0 z-50 flex items-center justify-end bg-black/85 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="relative w-full max-w-md h-full bg-card border-l border-border/80 p-6 flex flex-col justify-between shadow-2xl animate-in slide-in-from-right duration-200">
            <div className="flex-1 overflow-y-auto scrollbar-thin space-y-6 pr-2">
              <div className="flex items-center justify-between border-b border-border/60 pb-4">
                <div>
                  <span className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground">Candidate Info</span>
                  <h2 className="text-base font-bold text-white mt-1 break-all">{selectedCandidate.email}</h2>
                </div>
                <button
                  onClick={() => setSelectedCandidate(null)}
                  className="text-muted-foreground hover:text-foreground cursor-pointer text-sm font-semibold"
                >
                  ✕ Close
                </button>
              </div>

              {/* Status block */}
              <div className="panel p-4 bg-background/40 border border-border/60 rounded-xl space-y-2">
                <div className="flex justify-between items-center text-[12.5px]">
                  <span className="text-muted-foreground font-medium">Test Status:</span>
                  <span className="font-bold text-white">{statusBadge(selectedCandidate)}</span>
                </div>
                {selectedCandidate.started_at && (
                  <>
                    <div className="flex justify-between items-center text-[12.5px] border-t border-border/40 pt-2">
                      <span className="text-muted-foreground font-medium">Timer Status:</span>
                      <span className="font-bold text-white">{getRemainingText(selectedCandidate, serverNow)}</span>
                    </div>
                    <div className="flex justify-between items-center text-[12.5px]">
                      <span className="text-muted-foreground font-medium">Started At:</span>
                      <span className="text-muted-foreground font-semibold">{new Date(selectedCandidate.started_at).toLocaleString()}</span>
                    </div>
                  </>
                )}
              </div>

              {/* Unique branch details */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Git branch details</h4>
                
                <div className="rounded-xl border border-border bg-background p-4 font-mono text-[12px] text-foreground/90 space-y-3 overflow-x-auto">
                  <p>
                    <span className="text-muted-foreground"># Repository URL:</span>
                    <br />
                    <span className="text-foreground/80 font-semibold">{selectedCandidate.assignments?.github_repo || "—"}</span>
                  </p>
                  <p className="border-t border-neutral-900 pt-3">
                    <span className="text-muted-foreground"># Candidate Branch:</span>
                    <br />
                    <strong className="text-sky-400 font-bold">{getCandidateBranch(selectedCandidate.email, selectedCandidate.id)}</strong>
                  </p>
                  
                  {selectedCandidate.assignments?.github_repo && (
                    <div className="pt-2 border-t border-neutral-900">
                      <a
                        href={`${selectedCandidate.assignments.github_repo.replace(/\.git$/, "")}/tree/${getCandidateBranch(selectedCandidate.email, selectedCandidate.id)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[11px] bg-secondary hover:bg-accent text-white font-sans font-bold px-3 py-1.5 rounded-lg inline-flex items-center gap-1 cursor-pointer transition-colors"
                      >
                        <span>Open branch on GitHub</span>
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                          <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                          <polyline points="15 3 21 3 21 9" />
                          <line x1="10" y1="14" x2="21" y2="3" />
                        </svg>
                      </a>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Bottom Actions inside overlay */}
            <div className="mt-8 border-t border-border/60 pt-4 flex flex-col gap-3">
              {selectedCandidate.started_at && (
                <button
                  type="button"
                  onClick={() => handleToggleUnblur(selectedCandidate.id, !selectedCandidate.unblurred)}
                  className={`w-full py-2.5 rounded-xl text-sm font-bold border transition-colors cursor-pointer text-center ${
                    selectedCandidate.unblurred
                      ? "bg-amber-500/10 border-amber-500/30 text-amber-500 hover:bg-amber-500/20"
                      : "bg-secondary border-border text-foreground/80 hover:bg-accent"
                  }`}
                >
                  {selectedCandidate.unblurred ? "🔒 Lock GitHub Details (Blur)" : "🔓 Manually Unblur GitHub details"}
                </button>
              )}

              {selectedCandidate.started_at && !selectedCandidate.submitted_at && (
                <button
                  type="button"
                  onClick={() => handleCheckSubmission(selectedCandidate.id)}
                  className="w-full bg-foreground hover:bg-foreground/90 text-background py-2.5 rounded-xl text-sm font-bold text-center cursor-pointer transition-colors"
                >
                  Check Branch Push Status
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================
          OVERLAY MODAL: Create Assignment Dialog Form
         ======================================================== */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm">
          <div className="relative w-full max-w-xl rounded-2xl border border-border/80 bg-card p-6 shadow-2xl animate-in fade-in zoom-in duration-150 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-border/60 pb-3.5 mb-5">
              <h2 className="text-[15px] font-bold text-white uppercase tracking-wider">Create Assignment</h2>
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="text-muted-foreground hover:text-foreground cursor-pointer text-sm font-semibold"
              >
                ✕ Close
              </button>
            </div>

            {/* Template Selector Inside Modal */}
            <div className="mb-6 rounded-xl border border-border bg-[#0c0c0c]/60 p-4">
              <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                Quick Load from Template
              </label>
              <select
                onChange={(e) => {
                  const idx = Number(e.target.value);
                  if (isNaN(idx)) return;
                  const t = TEMPLATES[idx];
                  if (t) {
                    setTitle(t.title);
                    setHours(t.duration_hours);
                    setRepo(t.github_repo);
                    setProblem(t.problem_statement);
                  }
                }}
                defaultValue=""
                className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-[12.5px] text-white outline-none focus:border-border cursor-pointer"
              >
                <option value="" disabled>-- Select a pre-defined Stance Health template --</option>
                {TEMPLATES.map((t, i) => (
                  <option key={i} value={i}>{t.name}</option>
                ))}
              </select>
            </div>

            <form onSubmit={handleCreate} className="grid gap-4 md:grid-cols-2">
              <div className="md:col-span-2">
                <label className="mb-1 block text-[11px] font-semibold text-muted-foreground">Title</label>
                <input
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-white outline-none focus:border-border"
                  placeholder="Structured Assessment Form Filler"
                />
              </div>
              <div>
                <label className="mb-1 block text-[11px] font-semibold text-muted-foreground">
                  Duration (hours)
                </label>
                <input
                  type="number"
                  required
                  min={0.25}
                  max={168}
                  step={0.25}
                  value={hours}
                  onChange={(e) => setHours(Number(e.target.value))}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-white outline-none focus:border-border"
                />
              </div>
              <div>
                <label className="mb-1 block text-[11px] font-semibold text-muted-foreground">
                  GitHub repo URL
                </label>
                <input
                  required
                  type="url"
                  value={repo}
                  onChange={(e) => setRepo(e.target.value)}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-white outline-none focus:border-border"
                  placeholder="https://github.com/Chris-healthflex/ai-intern.git"
                />
              </div>
              <div className="md:col-span-2">
                <label className="mb-1 block text-[11px] font-semibold text-muted-foreground">
                  Problem statement
                </label>
                <textarea
                  required
                  rows={8}
                  value={problem}
                  onChange={(e) => setProblem(e.target.value)}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 font-mono text-[12.5px] text-white outline-none focus:border-border"
                  placeholder="Paste the full assignment brief here…"
                />
              </div>
              <div className="md:col-span-2 flex items-center justify-end gap-3 mt-4 border-t border-border/60 pt-4">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="rounded-lg px-4 py-2.5 text-sm font-medium text-muted-foreground hover:text-foreground cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={busy}
                  className="bg-foreground hover:bg-foreground/90 text-background px-5 py-2.5 text-sm font-bold rounded-lg cursor-pointer transition-colors"
                >
                  Create Assignment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}
