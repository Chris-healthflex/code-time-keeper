import { createFileRoute } from "@tanstack/react-router";

/**
 * Runs every minute (pg_cron). Sends the "time is up - 10 minutes" email the
 * moment a candidate's server-side timer ends, and closes the window when the
 * grace period elapses. Bounded batch, idempotent per candidate.
 */
export const Route = createFileRoute("/api/public/hooks/timer-tick")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const apikey = request.headers.get("apikey");
        if (!apikey || apikey !== process.env["SUPABASE_PUBLISHABLE_KEY"]) {
          return new Response(JSON.stringify({ error: "unauthorized" }), {
            status: 401,
            headers: { "Content-Type": "application/json" },
          });
        }

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { sendMail, timeUpMail, closedMail } = await import("@/lib/mailer.server");
        const now = new Date();
        let timeUp = 0;
        let closed = 0;

        const { data: dueTimers } = await supabaseAdmin
          .from("candidates")
          .select("*, assignments(github_repo)")
          .not("ends_at", "is", null)
          .is("timeup_email_sent_at", null)
          .is("submitted_at", null)
          .eq("revoked", false)
          .lte("ends_at", now.toISOString())
          .limit(50);

        for (const candidate of dueTimers ?? []) {
          const graceEndsAt = new Date(new Date(candidate.ends_at!).getTime() + 10 * 60_000);
          await supabaseAdmin
            .from("candidates")
            .update({
              status: "grace",
              grace_ends_at: graceEndsAt.toISOString(),
              timeup_email_sent_at: now.toISOString(),
            })
            .eq("id", candidate.id)
            .is("timeup_email_sent_at", null);
          const repo = (candidate.assignments as unknown as { github_repo: string } | null)?.github_repo ?? "";
          await sendMail({
            kind: "time_up",
            to: candidate.email,
            candidateId: candidate.id,
            assignmentId: candidate.assignment_id,
            ...timeUpMail({ repo }),
          });
          timeUp += 1;
        }

        const { data: dueClose } = await supabaseAdmin
          .from("candidates")
          .select("*")
          .not("grace_ends_at", "is", null)
          .is("closed_email_sent_at", null)
          .is("submitted_at", null)
          .lte("grace_ends_at", now.toISOString())
          .limit(50);

        for (const candidate of dueClose ?? []) {
          await supabaseAdmin
            .from("candidates")
            .update({ status: "expired", closed_email_sent_at: now.toISOString() })
            .eq("id", candidate.id)
            .is("closed_email_sent_at", null);
          await sendMail({
            kind: "window_closed",
            to: candidate.email,
            candidateId: candidate.id,
            assignmentId: candidate.assignment_id,
            ...closedMail(),
          });
          closed += 1;
        }

        return new Response(JSON.stringify({ ok: true, timeUp, closed }), {
          headers: { "Content-Type": "application/json" },
        });
      },
    },
  },
});
