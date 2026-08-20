import { supabaseAdmin } from "@/integrations/supabase/client.server";
import {
  invitationHtml, invitationText,
  magicLinkHtml, magicLinkText,
  timeUpHtml, timeUpText,
  submissionReceivedHtml, submissionReceivedText,
  selectedHtml, selectedText,
} from "./mail-templates";

export type MailKind = "invitation" | "magic_link" | "started" | "time_up" | "window_closed" | "submission_received" | "selected";

interface MailInput {
  kind: MailKind;
  to: string;
  candidateId: string;
  assignmentId: string;
  subject: string;
  html: string;
  text: string;
}

export async function sendMail(input: MailInput): Promise<{ sent: boolean; reason?: string }> {
  let sent = false;
  let reason: string | undefined;

  try {
    const apiKey = process.env["RESEND_API_KEY"] ?? process.env["LOVABLE_API_KEY"];
    const fromAddress = process.env["MAIL_FROM"] ?? `Stance Health <assignments@ai-assignments.stance.health>`;

    if (!apiKey) {
      reason = "mail_api_key_not_configured";
    } else if (process.env["RESEND_API_KEY"]) {
      // Resend
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
        body: JSON.stringify({ from: fromAddress, to: input.to, subject: input.subject, html: input.html, text: input.text }),
      });
      sent = res.ok;
      if (!res.ok) reason = `resend_${res.status}`;
    } else {
      // Lovable fallback
      const res = await fetch("https://api.lovable.dev/v1/emails/send", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
        body: JSON.stringify({ from: fromAddress, to: input.to, subject: input.subject, html: input.html, text: input.text }),
      });
      sent = res.ok;
      if (!res.ok) reason = `lovable_${res.status}`;
    }
  } catch (err) {
    reason = err instanceof Error ? err.message : "unknown_error";
  }

  await supabaseAdmin.from("audit_logs").insert({
    candidate_id: input.candidateId,
    assignment_id: input.assignmentId,
    actor: input.to,
    event: sent ? `email_sent:${input.kind}` : `email_failed:${input.kind}`,
    detail: { subject: input.subject, reason: reason ?? null },
  });

  return reason !== undefined ? { sent, reason } : { sent };
}

// ─── Mail builders ───────────────────────────────────────────────────────────

export function invitationMail(opts: { title: string; link: string; hours: number }) {
  return {
    subject: `Your Stance Health coding assignment: ${opts.title}`,
    html: invitationHtml(opts),
    text: invitationText(opts),
  };
}

export function magicLinkMail(opts: { link: string; expiresMinutes?: number }) {
  return {
    subject: "Your Stance Health sign-in link",
    html: magicLinkHtml(opts),
    text: magicLinkText(opts),
  };
}

export function startedMail(opts: { title: string; endsAt: string; repo: string }) {
  return {
    subject: `Assignment started: ${opts.title}`,
    html: `<p style="font-family:sans-serif">Your timer has started.<br/><br/>Deadline: ${opts.endsAt}<br/>Repository: ${opts.repo}</p>`,
    text: `Your timer has started.\n\nDeadline (UTC): ${opts.endsAt}\nRepository: ${opts.repo}\n\nPush your code before the timer ends.`,
  };
}

export function timeUpMail(opts: { repo: string; graceMinutes?: number }) {
  return {
    subject: `Your time is up — ${opts.graceMinutes ?? 10} minutes to submit`,
    html: timeUpHtml(opts),
    text: timeUpText(opts),
  };
}

export function closedMail() {
  return {
    subject: "Submission window closed",
    html: `<p style="font-family:sans-serif">The submission window for your Stance Health assignment has now closed permanently. Thank you for your time.</p>`,
    text: "The submission window for your Stance Health assignment has now closed permanently. Thank you for your time.",
  };
}

export function submissionReceivedMail(opts: { title: string; pushedAt: string; author?: string }) {
  return {
    subject: "Submission received — Stance Health",
    html: submissionReceivedHtml(opts),
    text: submissionReceivedText(opts),
  };
}

export function selectedMail(opts: { name?: string; nextSteps?: string }) {
  return {
    subject: "You've been selected — Stance Health",
    html: selectedHtml(opts),
    text: selectedText(opts),
  };
}
