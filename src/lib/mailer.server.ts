// Server-only email dispatch. Uses Lovable's managed email templates when they
// are scaffolded (requires a verified sender domain); every attempt is recorded
// in the audit log either way so admins always see what was triggered.
import { supabaseAdmin } from "@/integrations/supabase/client.server";

export type MailKind = "invitation" | "started" | "time_up" | "window_closed";

interface MailInput {
  kind: MailKind;
  to: string;
  candidateId: string;
  assignmentId: string;
  subject: string;
  body: string;
}

export async function sendMail(input: MailInput): Promise<{ sent: boolean; reason?: string }> {
  let sent = false;
  let reason: string | undefined;

  try {
    const apiKey = process.env["LOVABLE_API_KEY"];
    const senderDomain = process.env["SENDER_DOMAIN"];
    if (!apiKey || !senderDomain) {
      reason = "email_domain_not_configured";
    } else {
      const res = await fetch("https://api.lovable.dev/v1/emails/send", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
        body: JSON.stringify({
          from: `Stance Health <assignments@${senderDomain}>`,
          to: input.to,
          subject: input.subject,
          text: input.body,
          html: `<pre style="font:14px/1.6 ui-sans-serif,system-ui;white-space:pre-wrap">${input.body.replace(
            /[<>&]/g,
            (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;" })[c] as string,
          )}</pre>`,
        }),
      });
      sent = res.ok;
      if (!res.ok) reason = `email_api_${res.status}`;
    }
  } catch (error) {
    reason = error instanceof Error ? error.message : "unknown_error";
  }

  await supabaseAdmin.from("audit_logs").insert({
    candidate_id: input.candidateId,
    assignment_id: input.assignmentId,
    actor: input.to,
    event: sent ? `email_sent:${input.kind}` : `email_failed:${input.kind}`,
    detail: { subject: input.subject, reason: reason ?? null },
  });

  return { sent, reason };
}

export function invitationMail(opts: { title: string; link: string; hours: number }) {
  return {
    subject: `Your Stance Health coding assignment: ${opts.title}`,
    body: [
      `Hello,`,
      ``,
      `You have been invited to complete a timed take-home assignment for Stance Health.`,
      ``,
      `Your unique link: ${opts.link}`,
      ``,
      `IMPORTANT: your ${opts.hours}-hour timer starts the moment you open this link, so only open it when you are ready to begin. The link is personal and single-use.`,
      ``,
      `Good luck,`,
      `Stance Health`,
    ].join("\n"),
  };
}

export function startedMail(opts: { title: string; endsAt: string; repo: string }) {
  return {
    subject: `Assignment started: ${opts.title}`,
    body: [
      `Your timer has started.`,
      ``,
      `Deadline (UTC): ${opts.endsAt}`,
      `Submission repository: ${opts.repo}`,
      ``,
      `When the timer ends you will receive an email giving you exactly 10 minutes to push your final code.`,
    ].join("\n"),
  };
}

export function timeUpMail(opts: { repo: string }) {
  return {
    subject: "Your time is up - 10 minutes to submit",
    body: [
      `Your time is up. You have exactly 10 minutes to push your final code to the GitHub repository: ${opts.repo}`,
      ``,
      `After 10 minutes the submission window will close permanently.`,
    ].join("\n"),
  };
}

export function closedMail() {
  return {
    subject: "Submission window closed",
    body: "The submission window for your Stance Health assignment has now closed permanently. Thank you for your time.",
  };
}
