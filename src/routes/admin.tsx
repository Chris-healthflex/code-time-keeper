import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import logoWhite from "@/assets/logo-white.png";
import {
  getMe,
  listAssignments,
  createAssignment,
  deleteAssignment,
  listCandidates,
  inviteCandidates,
  checkSubmission,
} from "@/lib/admin.functions";

export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [{ title: "Admin — Stance Health Assignments" }],
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
  invite_sent_at: string | null;
  assignments?: { title: string; github_repo: string; duration_hours: number } | null;
};

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

  // Create form
  const [title, setTitle] = useState("");
  const [problem, setProblem] = useState("");
  const [hours, setHours] = useState(10);
  const [repo, setRepo] = useState("");

  // Invite form
  const [inviteEmails, setInviteEmails] = useState("");

  const load = useCallback(async () => {
    try {
      const me = await getMe();
      if (!me.isAdmin) {
        setIsAdmin(false);
        setReady(true);
        return;
      }
      setIsAdmin(true);
      const [asgs, cand] = await Promise.all([
        listAssignments(),
        listCandidates({ data: selectedAssignmentId ? { assignmentId: selectedAssignmentId } : {} }),
      ]);
      setAssignments(asgs as Assignment[]);
      setCandidates((cand as { serverNow: string; rows: CandidateRow[] }).rows);
      setServerNow((cand as { serverNow: string }).serverNow);
      setReady(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load");
      setReady(true);
    }
  }, [selectedAssignmentId]);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session) {
        navigate({ to: "/auth" });
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

  async function signOut() {
    await supabase.auth.signOut();
    navigate({ to: "/auth" });
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
      return <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-[11px] text-emerald-700">Submitted</span>;
    if (c.status === "expired" || c.status === "closed")
      return <span className="rounded-full bg-muted px-2 py-0.5 text-[11px]">Expired</span>;
    if (c.status === "grace")
      return <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-[11px] text-amber-700">Grace</span>;
    if (c.started_at)
      return <span className="rounded-full bg-sky-500/15 px-2 py-0.5 text-[11px] text-sky-700">In progress</span>;
    return <span className="rounded-full bg-muted px-2 py-0.5 text-[11px]">Not started</span>;
  }

  return (
    <main className="min-h-screen bg-background">
      <header className="border-b border-border/70 px-6 py-4">
        <div className="mx-auto flex max-w-6xl items-center justify-between">
          <div className="flex items-center gap-6">
            <Link to="/" className="flex items-center gap-2 text-sm font-medium">
              <img src={logoWhite} alt="Stance Health" className="h-6 w-auto" />
            </Link>
            <span className="text-[13px] text-muted-foreground">Admin console</span>
          </div>
          <button
            onClick={signOut}
            className="text-[13px] text-muted-foreground transition-colors hover:text-foreground"
          >
            Sign out
          </button>
        </div>
      </header>

      <div className="mx-auto max-w-6xl space-y-10 px-6 py-10">
        {error && (
          <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-[13px] text-destructive">
            {error}
          </div>
        )}

        {/* Create assignment */}
        <section className="panel p-6">
          <h2 className="text-base font-medium">Create assignment</h2>
          <p className="mt-1 text-[13px] text-muted-foreground">
            Duration starts the moment the candidate opens their unique link.
          </p>
          <form onSubmit={handleCreate} className="mt-5 grid gap-4 md:grid-cols-2">
            <div className="md:col-span-2">
              <label className="mb-1 block text-[12px] font-medium text-muted-foreground">Title</label>
              <input
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
                placeholder="Voice/Note → Structured Assessment Form Filler"
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
                placeholder="https://github.com/org/assignment-repo"
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
            <div className="md:col-span-2">
              <button
                type="submit"
                disabled={busy}
                className="cta-glow px-5 py-2 text-sm font-medium disabled:opacity-60"
              >
                Create assignment
              </button>
            </div>
          </form>
        </section>

        {/* Assignments list */}
        <section>
          <h2 className="text-base font-medium">Assignments</h2>
          <div className="mt-4 overflow-hidden rounded-xl border border-border">
            <table className="w-full text-left text-[13px]">
              <thead className="border-b border-border bg-secondary/40 text-[11px] uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 font-medium">Title</th>
                  <th className="px-4 py-3 font-medium">Duration</th>
                  <th className="px-4 py-3 font-medium">Repo</th>
                  <th className="px-4 py-3 font-medium" />
                </tr>
              </thead>
              <tbody>
                {assignments.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-4 py-8 text-center text-muted-foreground">
                      No assignments yet
                    </td>
                  </tr>
                )}
                {assignments.map((a) => (
                  <tr
                    key={a.id}
                    className={`border-b border-border/60 last:border-0 ${
                      selectedAssignmentId === a.id ? "bg-secondary/30" : ""
                    }`}
                  >
                    <td className="px-4 py-3">
                      <button
                        type="button"
                        onClick={() => setSelectedAssignmentId(a.id)}
                        className="text-left font-medium hover:underline"
                      >
                        {a.title}
                      </button>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{a.duration_hours}h</td>
                    <td className="max-w-[200px] truncate px-4 py-3 font-mono text-[12px] text-muted-foreground">
                      {a.github_repo.replace(/^https?:\/\//, "")}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        type="button"
                        onClick={() => handleDelete(a.id)}
                        className="text-[12px] text-muted-foreground hover:text-destructive"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* Invite + Candidates */}
        <section className="grid gap-8 lg:grid-cols-[320px_1fr]">
          <div className="panel p-5">
            <h2 className="text-base font-medium">Invite candidates</h2>
            <p className="mt-1 text-[12px] text-muted-foreground">
              {selectedAssignmentId
                ? "Emails get a unique signed link. Timer starts on first open."
                : "Select an assignment above first."}
            </p>
            <form onSubmit={handleInvite} className="mt-4 space-y-3">
              <textarea
                rows={5}
                value={inviteEmails}
                onChange={(e) => setInviteEmails(e.target.value)}
                disabled={!selectedAssignmentId}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring disabled:opacity-50"
                placeholder={"one@email.com\ntwo@email.com"}
              />
              <button
                type="submit"
                disabled={busy || !selectedAssignmentId}
                className="cta-glow w-full py-2 text-sm font-medium disabled:opacity-60"
              >
                Send invites
              </button>
            </form>
          </div>

          <div>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-base font-medium">Candidates</h2>
              {serverNow && (
                <span className="text-[11px] text-muted-foreground">
                  Server: {new Date(serverNow).toLocaleTimeString()}
                </span>
              )}
            </div>
            <div className="overflow-hidden rounded-xl border border-border">
              <table className="w-full text-left text-[13px]">
                <thead className="border-b border-border bg-secondary/40 text-[11px] uppercase tracking-wider text-muted-foreground">
                  <tr>
                    <th className="px-4 py-3 font-medium">Email</th>
                    <th className="px-4 py-3 font-medium">Status</th>
                    <th className="px-4 py-3 font-medium">Started</th>
                    <th className="px-4 py-3 font-medium" />
                  </tr>
                </thead>
                <tbody>
                  {candidates.length === 0 && (
                    <tr>
                      <td colSpan={4} className="px-4 py-8 text-center text-muted-foreground">
                        No candidates yet
                      </td>
                    </tr>
                  )}
                  {candidates.map((c) => (
                    <tr key={c.id} className="border-b border-border/60 last:border-0">
                      <td className="px-4 py-3">{c.email}</td>
                      <td className="px-4 py-3">{statusBadge(c)}</td>
                      <td className="px-4 py-3 text-[12px] text-muted-foreground">
                        {c.started_at
                          ? new Date(c.started_at).toLocaleString()
                          : c.invite_sent_at
                            ? "Invite sent"
                            : "—"}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {c.started_at && !c.submitted_at && (
                          <button
                            type="button"
                            onClick={() => handleCheckSubmission(c.id)}
                            className="text-[12px] text-muted-foreground hover:text-foreground"
                          >
                            Check push
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
