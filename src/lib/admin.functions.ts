import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

async function assertAdmin(supabase: {
  from: (t: string) => {
    select: (c: string) => {
      eq: (a: string, b: string) => { maybeSingle: () => Promise<{ data: unknown }> };
    };
  };
}) {
  const { data } = await supabase.from("user_roles").select("role").eq("role", "admin").maybeSingle();
  if (!data) throw new Error("Forbidden: admin role required");
}

export const getMe = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data } = await context.supabase.from("user_roles").select("role").eq("role", "admin").maybeSingle();
    return { userId: context.userId, isAdmin: Boolean(data) };
  });

const assignmentSchema = z.object({
  title: z.string().trim().min(3).max(160),
  problemStatement: z.string().trim().min(10).max(20000),
  durationHours: z.number().min(0.25).max(168),
  githubRepo: z.string().trim().url().max(400),
});

export const createAssignment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => assignmentSchema.parse(data))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase as never);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: row, error } = await supabaseAdmin
      .from("assignments")
      .insert({
        created_by: context.userId,
        title: data.title,
        problem_statement: data.problemStatement,
        duration_hours: data.durationHours,
        github_repo: data.githubRepo,
      })
      .select()
      .single();
    if (error) throw new Error(error.message);
    return row;
  });

export const listAssignments = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.supabase as never);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin
      .from("assignments")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const deleteAssignment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => z.object({ id: z.string().uuid() }).parse(data))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase as never);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("assignments").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const listCandidates = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => z.object({ assignmentId: z.string().uuid().optional() }).parse(data ?? {}))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase as never);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    let query = supabaseAdmin
      .from("candidates")
      .select("*, assignments(title, github_repo, duration_hours)")
      .order("created_at", { ascending: false });
    if (data.assignmentId) query = query.eq("assignment_id", data.assignmentId);
    const { data: rows, error } = await query;
    if (error) throw new Error(error.message);
    return { serverNow: new Date().toISOString(), rows: rows ?? [] };
  });

export const inviteCandidates = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z
      .object({
        assignmentId: z.string().uuid(),
        emails: z.array(z.string().trim().email().max(255)).min(1).max(50),
      })
      .parse(data),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase as never);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { signLink } = await import("./link-token.server");
    const { sendMail, invitationMail } = await import("./mailer.server");
    const { getRequest } = await import("@tanstack/react-start/server");

    const { data: assignment, error: aErr } = await supabaseAdmin
      .from("assignments")
      .select("*")
      .eq("id", data.assignmentId)
      .single();
    if (aErr || !assignment) throw new Error("Assignment not found");

    const request = getRequest();
    const origin = new URL(request?.url ?? "https://localhost").origin;
    const results: { email: string; sent: boolean; link: string }[] = [];

    for (const rawEmail of data.emails) {
      const email = rawEmail.toLowerCase();
      const { data: candidate, error } = await supabaseAdmin
        .from("candidates")
        .upsert({ assignment_id: data.assignmentId, email }, { onConflict: "assignment_id,email" })
        .select()
        .single();
      if (error || !candidate) continue;

      const token = await signLink({
        cid: candidate.id,
        aid: data.assignmentId,
        email,
        jti: candidate.token_id,
      });
      const link = `${origin}/a/${token}`;
      const mail = invitationMail({
        title: assignment.title,
        link,
        hours: Number(assignment.duration_hours),
      });
      const res = await sendMail({
        kind: "invitation",
        to: email,
        candidateId: candidate.id,
        assignmentId: data.assignmentId,
        ...mail,
      });
      await supabaseAdmin
        .from("candidates")
        .update({ invite_sent_at: new Date().toISOString() })
        .eq("id", candidate.id);
      results.push({ email, sent: res.sent, link });
    }
    return { results };
  });

export const extendTime = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z.object({ candidateId: z.string().uuid(), minutes: z.number().int().min(1).max(1440) }).parse(data),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase as never);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: candidate } = await supabaseAdmin
      .from("candidates")
      .select("*")
      .eq("id", data.candidateId)
      .single();
    if (!candidate) throw new Error("Candidate not found");

    const base = candidate.ends_at ? new Date(candidate.ends_at) : null;
    const patch = {
      extra_minutes: candidate.extra_minutes + data.minutes,
      ...(base
        ? {
            ends_at: new Date(base.getTime() + data.minutes * 60_000).toISOString(),
            grace_ends_at: null,
            timeup_email_sent_at: null,
            closed_email_sent_at: null,
            status: "in_progress",
          }
        : {}),
    };
    await supabaseAdmin.from("candidates").update(patch).eq("id", data.candidateId);
    await supabaseAdmin.from("audit_logs").insert({
      candidate_id: data.candidateId,
      assignment_id: candidate.assignment_id,
      actor: context.userId,
      event: "time_extended",
      detail: { minutes: data.minutes },
    });
    return { ok: true };
  });

export const setRevoked = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z.object({ candidateId: z.string().uuid(), revoked: z.boolean() }).parse(data),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase as never);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: candidate } = await supabaseAdmin
      .from("candidates")
      .select("assignment_id")
      .eq("id", data.candidateId)
      .single();
    await supabaseAdmin
      .from("candidates")
      .update({ revoked: data.revoked, status: data.revoked ? "revoked" : "not_started" })
      .eq("id", data.candidateId);
    await supabaseAdmin.from("audit_logs").insert({
      candidate_id: data.candidateId,
      assignment_id: candidate?.assignment_id ?? null,
      actor: context.userId,
      event: data.revoked ? "access_revoked" : "access_restored",
    });
    return { ok: true };
  });

/** Checks the assignment repo for a push from/after the candidate started. */
export const checkSubmission = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => z.object({ candidateId: z.string().uuid() }).parse(data))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase as never);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: candidate } = await supabaseAdmin
      .from("candidates")
      .select("*, assignments(github_repo)")
      .eq("id", data.candidateId)
      .single();
    if (!candidate) throw new Error("Candidate not found");
    const repo = (candidate.assignments as unknown as { github_repo: string } | null)?.github_repo ?? "";
    const match = repo.match(/github\.com\/([^/]+)\/([^/.]+)/i);
    if (!match) return { ok: false, reason: "not_a_github_repo" };

    const headers: Record<string, string> = { Accept: "application/vnd.github+json" };
    const ghToken = process.env["GITHUB_TOKEN"];
    if (ghToken) headers["Authorization"] = `Bearer ${ghToken}`;

    const res = await fetch(`https://api.github.com/repos/${match[1]}/${match[2]}/commits?per_page=1`, {
      headers,
    });
    if (!res.ok) return { ok: false, reason: `github_${res.status}` };
    const commits = (await res.json()) as Array<{
      commit?: { author?: { date?: string; email?: string; name?: string } };
    }>;
    const last = commits[0]?.commit?.author;
    const pushedAt = last?.date ?? null;
    const startedAt = candidate.started_at ? new Date(candidate.started_at) : null;
    const submitted = Boolean(pushedAt && startedAt && new Date(pushedAt) > startedAt);

    if (submitted && !candidate.submitted_at) {
      await supabaseAdmin
        .from("candidates")
        .update({ submitted_at: pushedAt, status: "submitted" })
        .eq("id", candidate.id);
      await supabaseAdmin.from("audit_logs").insert({
        candidate_id: candidate.id,
        assignment_id: candidate.assignment_id,
        actor: context.userId,
        event: "submission_detected",
        detail: { pushed_at: pushedAt },
      });
    }
    return { ok: true, submitted, lastPushAt: pushedAt, author: last?.name ?? null };
  });

export const listAuditLogs = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.supabase as never);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin
      .from("audit_logs")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(200);
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const inviteAdmin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => z.object({ email: z.string().trim().email().max(255) }).parse(data))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase as never);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("admin_invites")
      .upsert({ email: data.email.toLowerCase() }, { onConflict: "email" });
    if (error) throw new Error(error.message);
    await supabaseAdmin.from("audit_logs").insert({
      actor: context.userId,
      event: "admin_invited",
      detail: { email: data.email.toLowerCase() },
    });
    return { ok: true };
  });
