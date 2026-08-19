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
  
  if (diffMs <= 0) return "Time is up";
  
  const hours = Math.floor(diffMs / 3600_000);
  const mins = Math.floor((diffMs % 3600_000) / 60_000);
  return `${hours}h ${mins}m remaining`;
}

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

  // Real-time activity/audit logs
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [showActivity, setShowActivity] = useState(true);

  // Overlay modal for creating assignments
  const [showCreateModal, setShowCreateModal] = useState(false);

  // Create form state
  const [title, setTitle] = useState("");
  const [problem, setProblem] = useState("");
  const [hours, setHours] = useState(10);
  const [repo, setRepo] = useState("");

  // Invite form state
  const [inviteEmails, setInviteEmails] = useState("");

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

  // Find currently selected assignment details
  const selectedAssignment = useMemo(() => {
    return assignments.find((a) => a.id === selectedAssignmentId) || null;
  }, [assignments, selectedAssignmentId]);

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
        <h1 className="text-xl font-medium">Admin access required</h1>
        <p className="mt-2 max-w-sm text-[14px] text-muted-foreground">
          Your account does not have the admin role. Ask an existing admin to invite you, or create
          the first admin account if the system is empty.
        </p>
        <button onClick={signOut} className="mt-6 text-sm underline">
          Sign out
        </button>
      </main>
    );
  }

  function statusBadge(c: CandidateRow) {
    if (c.revoked) return <span className="rounded-full bg-muted px-2 py-0.5 text-[11px]">Revoked</span>;
    if (c.submitted_at)
      return <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-[11px] text-emerald-700 font-semibold">Submitted</span>;
    if (c.status === "expired" || c.status === "closed")
      return <span className="rounded-full bg-muted px-2 py-0.5 text-[11px]">Expired</span>;
    if (c.status === "grace")
      return <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-[11px] text-amber-700 font-semibold animate-pulse">Grace</span>;
    if (c.started_at)
      return <span className="rounded-full bg-sky-500/15 px-2 py-0.5 text-[11px] text-sky-700 font-semibold">In progress</span>;
    return <span className="rounded-full bg-muted px-2 py-0.5 text-[11px]">Not started</span>;
  }

  return (
    <main className="min-h-screen bg-background flex flex-col">
      {/* Universal Top Header */}
      <header className="border-b border-border/70 px-6 py-4 bg-card/10 backdrop-blur-md sticky top-0 z-40 flex-shrink-0">
        <div className="mx-auto flex max-w-7xl items-center justify-between">
          <div className="flex items-center gap-6">
            <Link to="/" className="flex items-center gap-2 text-sm font-medium">
              <img src={logoWhite} alt="Stance Health" className="h-6 w-auto" />
            </Link>
            <span className="text-[13px] text-muted-foreground font-medium">Admin console</span>
          </div>
          
          <div className="flex items-center gap-4">
            {/* Real-time Activity Feed Toggle */}
            <button
              onClick={() => setShowActivity(!showActivity)}
              className={`p-2 rounded-full border transition-colors cursor-pointer text-muted-foreground hover:text-foreground ${
                showActivity ? "bg-primary/10 border-primary/20 text-primary" : "bg-secondary/10 border-border/40"
              }`}
              title="Toggle Candidate Activity Feed"
              type="button"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
              </svg>
            </button>

            <ThemeToggle theme={theme} toggleTheme={toggleTheme} />
            
            <button
              onClick={signOut}
              className="text-[13px] text-muted-foreground transition-colors hover:text-foreground cursor-pointer font-medium"
            >
              Sign out
            </button>
          </div>
        </div>
      </header>

      {/* Modern Three-Column Framework Grid */}
      <div className="flex-1 flex overflow-hidden max-w-7xl w-full mx-auto">
        
        {/* ========================================================
            COLUMN 1: Assignments Navigation (Left Sidebar) 
           ======================================================== */}
        <aside className="w-[300px] border-r border-border/70 flex flex-col bg-card/10 flex-shrink-0">
          <div className="p-4 border-b border-border/70 flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Assignments</h3>
            <button
              onClick={() => setShowCreateModal(true)}
              className="cta-glow px-2.5 py-1 text-[11px] font-bold rounded-lg transition-transform hover:scale-102 cursor-pointer"
            >
              + Create
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-3 space-y-1.5 scrollbar-thin">
            {assignments.length === 0 ? (
              <div className="p-4 text-center text-[12.5px] text-muted-foreground">
                No assignments yet. Click Create to add your first template.
              </div>
            ) : (
              assignments.map((a) => (
                <button
                  key={a.id}
                  onClick={() => setSelectedAssignmentId(a.id)}
                  className={`w-full text-left p-3 rounded-xl border text-[13px] transition-all flex flex-col gap-1 cursor-pointer ${
                    selectedAssignmentId === a.id
                      ? "bg-secondary/70 border-primary/30 shadow-sm"
                      : "bg-transparent border-transparent hover:bg-secondary/30"
                  }`}
                >
                  <span className="font-semibold text-foreground line-clamp-2">{a.title}</span>
                  <div className="flex items-center justify-between text-[11px] text-muted-foreground mt-1">
                    <span>{a.duration_hours}h duration</span>
                    <span onClick={(e) => { e.stopPropagation(); handleDelete(a.id); }} className="hover:text-destructive text-[11px] underline">Delete</span>
                  </div>
                </button>
              ))
            )}
          </div>
        </aside>

        {/* ========================================================
            COLUMN 2: Main Content Workspace (Center Canvas)
           ======================================================== */}
        <section className="flex-1 overflow-y-auto p-6 space-y-8 scrollbar-thin">
          {error && (
            <div className="rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-[13px] text-destructive shadow-sm">
              {error}
            </div>
          )}

          {!selectedAssignmentId ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-8">
              <div className="w-16 h-16 rounded-full bg-secondary/50 flex items-center justify-center mb-4 text-muted-foreground">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                  <polyline points="14 2 14 8 20 8" />
                </svg>
              </div>
              <h3 className="text-base font-semibold text-foreground">No Assignment Selected</h3>
              <p className="text-[13px] text-muted-foreground mt-1 max-w-xs">
                Select an assignment from the left side panel to view details, invite candidates, and track active timers.
              </p>
            </div>
          ) : (
            <>
              {/* Selected Assignment Details Panel */}
              {selectedAssignment && (
                <div className="panel p-6 border border-border/80 bg-card/40 backdrop-blur-sm rounded-2xl shadow-sm">
                  <div className="flex justify-between items-start gap-4">
                    <div>
                      <h2 className="text-xl font-bold tracking-tight text-foreground">{selectedAssignment.title}</h2>
                      <div className="flex items-center gap-3 mt-1.5 text-[12px] text-muted-foreground font-medium">
                        <span className="rounded-full bg-secondary/70 border border-border px-2.5 py-0.5 text-[11px] uppercase tracking-wide font-semibold">{selectedAssignment.duration_hours}h duration</span>
                        <span>Repo: <a href={selectedAssignment.github_repo} target="_blank" rel="noopener noreferrer" className="underline hover:text-foreground font-mono">{selectedAssignment.github_repo.replace(/^https?:\/\//, "")}</a></span>
                      </div>
                    </div>
                  </div>
                  <div className="mt-4 border-t border-border/40 pt-4">
                    <h4 className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-2">Problem Description Brief</h4>
                    <pre className="text-[12.5px] font-mono leading-relaxed bg-secondary/35 border border-border/60 p-4 rounded-xl text-foreground max-h-[220px] overflow-y-auto whitespace-pre-wrap">
                      {selectedAssignment.problem_statement}
                    </pre>
                  </div>
                </div>
              )}

              {/* Invite Candidates Block */}
              <div className="panel p-6 border border-border/80 bg-card/40 backdrop-blur-sm rounded-2xl shadow-sm">
                <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground mb-3">Invite candidates</h3>
                <form onSubmit={handleInvite} className="space-y-3.5">
                  <textarea
                    rows={3}
                    value={inviteEmails}
                    onChange={(e) => setInviteEmails(e.target.value)}
                    className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
                    placeholder={"candidate1@email.com\ncandidate2@email.com"}
                  />
                  <div className="flex justify-end">
                    <button
                      type="submit"
                      disabled={busy}
                      className="cta-glow px-5 py-2 text-sm font-semibold rounded-full disabled:opacity-60 cursor-pointer"
                    >
                      Send invites
                    </button>
                  </div>
                </form>
              </div>

              {/* Candidates Table (Enriched with detailed columns) */}
              <div className="space-y-3.5">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Active Candidates</h3>
                </div>
                
                <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm overflow-x-auto">
                  <table className="w-full text-left text-[13px] min-w-[700px]">
                    <thead className="border-b border-border bg-secondary/45 text-[11px] uppercase tracking-wider text-muted-foreground">
                      <tr>
                        <th className="px-4 py-3.5 font-bold">Email</th>
                        <th className="px-4 py-3.5 font-bold">Status</th>
                        <th className="px-4 py-3.5 font-bold">Ends At</th>
                        <th className="px-4 py-3.5 font-bold">Remaining</th>
                        <th className="px-4 py-3.5 font-bold">Branch Link</th>
                        <th className="px-4 py-3.5 font-bold" />
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/60">
                      {candidates.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="px-4 py-12 text-center text-muted-foreground font-light">
                            No candidates invited to this assignment yet.
                          </td>
                        </tr>
                      ) : (
                        candidates.map((c) => {
                          const branchName = getCandidateBranch(c.email, c.id);
                          const repoUrl = c.assignments?.github_repo ?? "";
                          const branchUrl = repoUrl ? `${repoUrl.replace(/\.git$/, "")}/tree/${branchName}` : "";

                          return (
                            <tr key={c.id} className="hover:bg-secondary/15 transition-colors">
                              <td className="px-4 py-3.5 font-semibold text-foreground">{c.email}</td>
                              <td className="px-4 py-3.5">{statusBadge(c)}</td>
                              <td className="px-4 py-3.5 text-[12px] text-muted-foreground">
                                {c.ends_at ? new Date(c.ends_at).toLocaleString() : "—"}
                              </td>
                              <td className="px-4 py-3.5 text-[12px] font-semibold text-foreground">
                                {getRemainingText(c, serverNow)}
                              </td>
                              <td className="px-4 py-3.5 font-mono text-[11.5px]">
                                {branchUrl ? (
                                  <a
                                    href={branchUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-sky-600 dark:text-sky-400 hover:underline inline-flex items-center gap-1 font-semibold"
                                  >
                                    <span>{branchName}</span>
                                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                                      <polyline points="15 3 21 3 21 9" />
                                      <line x1="10" y1="14" x2="21" y2="3" />
                                    </svg>
                                  </a>
                                ) : (
                                  <span className="text-muted-foreground">—</span>
                                )}
                              </td>
                              <td className="px-4 py-3.5 text-right">
                                <div className="flex items-center justify-end gap-2">
                                  {c.started_at && (
                                    <button
                                      type="button"
                                      onClick={() => handleToggleUnblur(c.id, !c.unblurred)}
                                      className={`rounded px-2.5 py-1 text-[11.5px] font-semibold border transition-colors cursor-pointer ${
                                        c.unblurred
                                          ? "bg-amber-500/10 border-amber-500/30 text-amber-700 dark:text-amber-400 hover:bg-amber-500/20"
                                          : "bg-secondary/40 border-border text-muted-foreground hover:bg-secondary/80"
                                      }`}
                                    >
                                      {c.unblurred ? "Unblurred" : "Unblur Git"}
                                    </button>
                                  )}
                                  {c.started_at && !c.submitted_at && (
                                    <button
                                      type="button"
                                      onClick={() => handleCheckSubmission(c.id)}
                                      className="rounded border border-border bg-secondary/35 px-2.5 py-1 text-[11.5px] font-semibold text-foreground transition-colors hover:bg-secondary cursor-pointer"
                                    >
                                      Check push
                                    </button>
                                  )}
                                </div>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </section>

        {/* ========================================================
            COLUMN 3: Context Panel (Right Sidebar - Audit logs)
           ======================================================== */}
        {showActivity && (
          <aside className="w-[320px] border-l border-border/70 flex flex-col bg-card/5 flex-shrink-0 animate-in slide-in-from-right duration-200">
            <div className="p-4 border-b border-border/70 flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Activity Log</h3>
              <button
                onClick={() => setShowActivity(false)}
                className="text-[11px] text-muted-foreground hover:text-foreground cursor-pointer underline"
              >
                Close
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin">
              {auditLogs.length === 0 ? (
                <div className="text-center text-[12.5px] text-muted-foreground py-8">
                  No activity recorded yet. Logs populate as candidates progress.
                </div>
              ) : (
                auditLogs.map((log) => (
                  <div key={log.id} className="relative pl-5 border-l-2 border-border/50 text-[12.5px] flex flex-col gap-0.5">
                    <div className="absolute -left-[5px] top-1.5 h-2 w-2 rounded-full bg-primary/70 ring-4 ring-primary/10" />
                    
                    <span className="font-semibold text-foreground">
                      {log.event.replace(/_/g, " ").toUpperCase()}
                    </span>
                    
                    {log.candidate_id && (
                      <span className="text-[11.5px] text-muted-foreground leading-normal">
                        Candidate: {log.candidates?.email || log.actor || "—"}
                      </span>
                    )}
                    
                    <span className="text-[10.5px] text-muted-foreground font-mono mt-0.5">
                      {new Date(log.created_at).toLocaleString()}
                    </span>
                  </div>
                ))
              )}
            </div>
          </aside>
        )}
      </div>

      {/* ========================================================
          OVERLAY MODAL: Create Assignment Dialog Form
         ======================================================== */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="relative w-full max-w-xl rounded-2xl border border-border bg-card p-6 shadow-xl animate-in fade-in zoom-in duration-150 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-border/40 pb-3.5 mb-5">
              <h2 className="text-lg font-bold text-foreground">Create Assignment Template</h2>
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="text-muted-foreground hover:text-foreground cursor-pointer text-sm font-semibold"
              >
                ✕ Close
              </button>
            </div>

            {/* Template Selector Inside Modal */}
            <div className="mb-6 rounded-xl border border-border/80 bg-secondary/15 p-4">
              <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
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
                className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-ring cursor-pointer"
              >
                <option value="" disabled>-- Select a pre-defined Stance Health template --</option>
                {TEMPLATES.map((t, i) => (
                  <option key={i} value={i}>{t.name}</option>
                ))}
              </select>
            </div>

            <form onSubmit={handleCreate} className="grid gap-4 md:grid-cols-2">
              <div className="md:col-span-2">
                <label className="mb-1 block text-[12px] font-medium text-muted-foreground">Title</label>
                <input
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
                  placeholder="Structured Assessment Form Filler"
                />
              </div>
              <div>
                <label className="mb-1 block text-[12px] font-medium text-muted-foreground">
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
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
              <div>
                <label className="mb-1 block text-[12px] font-medium text-muted-foreground">
                  GitHub repo URL
                </label>
                <input
                  required
                  type="url"
                  value={repo}
                  onChange={(e) => setRepo(e.target.value)}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
                  placeholder="https://github.com/Chris-healthflex/ai-intern.git"
                />
              </div>
              <div className="md:col-span-2">
                <label className="mb-1 block text-[12px] font-medium text-muted-foreground">
                  Problem statement
                </label>
                <textarea
                  required
                  rows={8}
                  value={problem}
                  onChange={(e) => setProblem(e.target.value)}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 font-mono text-[13px] outline-none focus:ring-2 focus:ring-ring"
                  placeholder="Paste the full assignment brief here…"
                />
              </div>
              <div className="md:col-span-2 flex items-center justify-end gap-3 mt-4 border-t border-border/40 pt-4">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="rounded-lg px-4 py-2.5 text-sm font-medium text-muted-foreground hover:bg-secondary cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={busy}
                  className="cta-glow rounded-lg px-5 py-2.5 text-sm font-semibold disabled:opacity-60 cursor-pointer"
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
