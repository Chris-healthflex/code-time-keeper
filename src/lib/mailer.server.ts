import { supabaseAdmin } from "@/integrations/supabase/client.server";
import {
  invitationHtml, invitationText,
  startedHtml, startedText,
  magicLinkHtml, magicLinkText,
  timeUpHtml, timeUpText,
  submissionReceivedHtml, submissionReceivedText,
  selectedHtml, selectedText,
  adminInviteHtml, adminInviteText,
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

async function getGmailAccessToken(): Promise<string> {
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: process.env["GMAIL_CLIENT_ID"] ?? "",
      client_secret: process.env["GMAIL_CLIENT_SECRET"] ?? "",
      refresh_token: process.env["GMAIL_REFRESH_TOKEN"] ?? "",
      grant_type: "refresh_token",
    }),
  });
  const data = await res.json() as { access_token?: string; error?: string; error_description?: string };
  if (!data.access_token) throw new Error(`token_error: ${data.error} — ${data.error_description}`);
  return data.access_token;
}

async function sendViaGmail(input: MailInput, from: string): Promise<{ sent: boolean; reason?: string }> {
  try {
    const accessToken = await getGmailAccessToken();

    // RFC 2047 encode subject so non-ASCII chars (→, etc.) render correctly
    const encodedSubject = `=?UTF-8?B?${Buffer.from(input.subject).toString("base64")}?=`;

    const mime = [
      `From: ${from}`,
      `To: ${input.to}`,
      `Subject: ${encodedSubject}`,
      `MIME-Version: 1.0`,
      `Content-Type: text/html; charset=UTF-8`,
      ``,
      input.html,
    ].join("\r\n");

    const encoded = Buffer.from(mime).toString("base64url");

    const res = await fetch("https://gmail.googleapis.com/gmail/v1/users/me/messages/send", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ raw: encoded }),
    });

    if (!res.ok) {
      const body = await res.text();
      return { sent: false, reason: `gmail_${res.status}: ${body}` };
    }
    return { sent: true };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "gmail_error";
    return { sent: false, reason: msg };
  }
}

export async function sendMail(input: MailInput): Promise<{ sent: boolean; reason?: string }> {
  let sent = false;
  let reason: string | undefined;
  const from = process.env["MAIL_FROM"] ?? "Stance Health <thrisha.suvarna@stance.health>";

  try {
    const result = await sendViaGmail(input, from);
    sent = result.sent;
    reason = result.reason;
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

export function startedMail(opts: { title: string; endsAt: string; repo?: string }) {
  return {
    subject: `Assignment started: ${opts.title}`,
    html: startedHtml({ title: opts.title, endsAt: opts.endsAt }),
    text: startedText({ title: opts.title, endsAt: opts.endsAt }),
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

export function adminInviteMail(opts: { link: string }) {
  return {
    subject: "You've been invited as a Stance Health admin",
    html: adminInviteHtml(opts),
    text: adminInviteText(opts),
  };
}
