import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { z } from "zod";

const tokenSchema = z.object({ token: z.string().min(20).max(4096) });

export interface AssignmentPreview {
  ok: boolean;
  reason?: string;
  candidateId?: string;
  email?: string;
  title?: string;
  problemStatement?: string;
  githubRepo?: string;
  durationHours?: number;
  alreadyStarted?: boolean;
}

/** Reads assignment details WITHOUT starting the timer. Safe to call on page load. */
export const peekAssignment = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => tokenSchema.parse(data))
  .handler(async ({ data }): Promise<AssignmentPreview> => {
    const { verifyLink } = await import("./link-token.server");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const claims = await verifyLink(data.token);
    if (!claims) return { ok: false, reason: "invalid_link" };

    const { data: candidate } = await supabaseAdmin
      .from("candidates")
      .select("*, assignments(*)")
      .eq("id", claims.cid)
      .maybeSingle();

    if (!candidate || candidate.token_id !== claims.jti) return { ok: false, reason: "invalid_link" };
    if (candidate.revoked) return { ok: false, reason: "revoked" };

    const assignment = candidate.assignments as unknown as {
      title: string;
      problem_statement: string;
      github_repo: string;
      duration_hours: number;
    } | null;
    if (!assignment) return { ok: false, reason: "invalid_link" };

    if (candidate.status === "expired") return { ok: false, reason: "closed" };

    return {
      ok: true,
      candidateId: candidate.id,
      email: candidate.email,
      title: assignment.title,
      problemStatement: assignment.problem_statement,
      githubRepo: assignment.github_repo,
      durationHours: assignment.duration_hours,
      alreadyStarted: !!candidate.started_at,
    };
  });

export interface CandidateView {
  ok: boolean;
  reason?: string;
  candidateId?: string;
  email?: string;
  title?: string;
  problemStatement?: string;
  githubRepo?: string;
  unblurred?: boolean;
  status?: "in_progress" | "grace" | "closed" | "submitted";
  serverNow?: string;
  startedAt?: string | undefined;
  endsAt?: string | undefined;
  graceEndsAt?: string | undefined;
}

/**
 * Opens (and on first call starts) a candidate assignment. All timing is
 * server-side: `started_at`, `ends_at` and `grace_ends_at` are written here and
 * never accepted from the client.
 */
export const openAssignment = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => tokenSchema.parse(data))
  .handler(async ({ data }): Promise<CandidateView> => {
    const { verifyLink } = await import("./link-token.server");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { sendMail, startedMail, timeUpMail, closedMail } = await import("./mailer.server");

    const claims = await verifyLink(data.token);
    if (!claims) return { ok: false, reason: "invalid_link" };

    const request = getRequest();
    const ip = request?.headers.get("x-forwarded-for") ?? null;
    const userAgent = request?.headers.get("user-agent") ?? null;

    const { data: candidate } = await supabaseAdmin
      .from("candidates")
      .select("*, assignments(*)")
      .eq("id", claims.cid)
      .maybeSingle();

    if (!candidate || candidate.token_id !== claims.jti) return { ok: false, reason: "invalid_link" };
    const assignment = candidate.assignments as unknown as {
      title: string;
      problem_statement: string;
      github_repo: string;
      duration_hours: number;
    } | null;
    if (!assignment) return { ok: false, reason: "invalid_link" };

    if (candidate.revoked) return { ok: false, reason: "revoked" };

    const now = new Date();
    let startedAt = candidate.started_at ? new Date(candidate.started_at) : null;
    let endsAt = candidate.ends_at ? new Date(candidate.ends_at) : null;

    if (!startedAt) {
      startedAt = now;
      endsAt = new Date(
        now.getTime() + Number(assignment.duration_hours) * 3600_000 + candidate.extra_minutes * 60_000,
      );
      await supabaseAdmin
        .from("candidates")
        .update({
          started_at: startedAt.toISOString(),
          ends_at: endsAt.toISOString(),
          status: "in_progress",
          last_activity_at: now.toISOString(),
        })
        .eq("id", candidate.id);

      await supabaseAdmin.from("audit_logs").insert({
        candidate_id: candidate.id,
        assignment_id: candidate.assignment_id,
        actor: candidate.email,
        event: "assignment_started",
        detail: { ends_at: endsAt.toISOString() },
        ip,
        user_agent: userAgent,
      });

      const mail = startedMail({
        title: assignment.title,
        endsAt: endsAt.toISOString().replace("T", " ").slice(0, 16),
        repo: assignment.github_repo,
      });
      await sendMail({
        kind: "started",
        to: candidate.email,
        candidateId: candidate.id,
        assignmentId: candidate.assignment_id,
        ...mail,
      });
    } else {
      await supabaseAdmin
        .from("candidates")
        .update({ last_activity_at: now.toISOString() })
        .eq("id", candidate.id);
      await supabaseAdmin.from("audit_logs").insert({
        candidate_id: candidate.id,
        assignment_id: candidate.assignment_id,
        actor: candidate.email,
        event: "assignment_accessed",
        ip,
        user_agent: userAgent,
      });
    }

    if (candidate.submitted_at) {
      return {
        ok: true,
        candidateId: candidate.id,
        status: "submitted",
        email: candidate.email,
        title: assignment.title,
        problemStatement: assignment.problem_statement,
        githubRepo: assignment.github_repo,
        unblurred: Boolean((candidate as any).unblurred),
        serverNow: now.toISOString(),
        startedAt: startedAt ? startedAt.toISOString() : undefined,
      };
    }

    // Timer expired while nobody polled: settle it now.
    let graceEndsAt = candidate.grace_ends_at ? new Date(candidate.grace_ends_at) : null;
    if (endsAt && now >= endsAt && !graceEndsAt) {
      graceEndsAt = new Date(endsAt.getTime() + 10 * 60_000);
      await supabaseAdmin
        .from("candidates")
        .update({
          status: "grace",
          grace_ends_at: graceEndsAt.toISOString(),
          timeup_email_sent_at: now.toISOString(),
        })
        .eq("id", candidate.id);
      await sendMail({
        kind: "time_up",
        to: candidate.email,
        candidateId: candidate.id,
        assignmentId: candidate.assignment_id,
        ...timeUpMail({ repo: assignment.github_repo }),
      });
    }

    if (graceEndsAt && now >= graceEndsAt) {
      if (candidate.status !== "expired") {
        await supabaseAdmin
          .from("candidates")
          .update({ status: "expired", closed_email_sent_at: now.toISOString() })
          .eq("id", candidate.id);
        await sendMail({
          kind: "window_closed",
          to: candidate.email,
          candidateId: candidate.id,
          assignmentId: candidate.assignment_id,
          ...closedMail(),
        });
      }
      return { ok: false, reason: "closed" };
    }

    return {
      ok: true,
      candidateId: candidate.id,
      status: graceEndsAt ? "grace" : "in_progress",
      email: candidate.email,
      title: assignment.title,
      problemStatement: assignment.problem_statement,
      githubRepo: assignment.github_repo,
      unblurred: Boolean((candidate as any).unblurred),
      serverNow: now.toISOString(),
      startedAt: startedAt ? startedAt.toISOString() : undefined,
      ...(endsAt ? { endsAt: endsAt.toISOString() } : {}),
      ...(graceEndsAt ? { graceEndsAt: graceEndsAt.toISOString() } : {}),
    };
  });
