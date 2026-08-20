// HTML email templates — Stance Health brand
// Logo served from /public/logo-white.png at the production origin

const ORIGIN = process.env["APP_ORIGIN"] ?? "https://ai-assignments.stance.health";
const LOGO = `${ORIGIN}/logo-white.png`;

// ─── Shared shell ───────────────────────────────────────────────────────────

function shell(opts: {
  preheader: string;
  badge?: string;
  headline: string;
  body: string;
  cta?: { label: string; href: string };
  footer?: string;
}): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<meta http-equiv="X-UA-Compatible" content="IE=edge" />
<title>${opts.headline}</title>
<!--[if mso]><noscript><xml><o:OfficeDocumentSettings><o:PixelsPerInch>96</o:PixelsPerInch></o:OfficeDocumentSettings></xml></noscript><![endif]-->
<style>
  body,html{margin:0;padding:0;background:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%}
  table,td{border-collapse:collapse;mso-table-lspace:0;mso-table-rspace:0}
  img{border:0;height:auto;line-height:100%;outline:0;text-decoration:none;-ms-interpolation-mode:bicubic}
  *{box-sizing:border-box}
  a{color:inherit;text-decoration:none}
  @media only screen and (max-width: 600px) {
    .container { width: 100% !important; max-width: 100% !important; }
    .content { padding: 30px 20px !important; }
    .header { padding: 24px 20px !important; }
  }
</style>
</head>
<body style="margin:0;padding:0;background:#f4f4f5">

<!-- preheader (hidden) -->
<span style="display:none;font-size:1px;color:#f4f4f5;max-height:0;max-width:0;opacity:0;overflow:hidden">${opts.preheader}&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;</span>

<table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f4f4f5;padding:32px 0">
  <tr><td align="center">
    <!--[if mso]><table width="560" cellpadding="0" cellspacing="0" border="0"><tr><td><![endif]-->
    <table class="container" width="100%" style="max-width:560px;margin:0 auto" cellpadding="0" cellspacing="0" border="0">

      <!-- Header -->
      <tr>
        <td class="header" style="background:#0a0a0a;border-radius:12px 12px 0 0;padding:32px 40px;text-align:center">
          <h1 style="color:#ffffff;font-size:24px;margin:0;letter-spacing:4px;font-weight:800;text-transform:uppercase">STANCE HEALTH</h1>
        </td>
      </tr>

      <!-- Body card -->
      <tr>
        <td class="content" style="background:#ffffff;padding:40px 40px 32px;border-left:1px solid #e4e4e7;border-right:1px solid #e4e4e7">
          ${opts.badge ? `<p style="margin:0 0 20px;display:inline-block;background:#f4f4f5;border:1px solid #e4e4e7;border-radius:999px;font-size:11px;font-weight:600;letter-spacing:.08em;text-transform:uppercase;color:#71717a;padding:4px 12px">${opts.badge}</p><br/>` : ""}
          <h1 style="margin:0 0 16px;font-size:24px;font-weight:700;letter-spacing:-.02em;color:#09090b;line-height:1.3">${opts.headline}</h1>
          ${opts.body}
          ${opts.cta ? `
          <table cellpadding="0" cellspacing="0" border="0" style="margin-top:32px;width:100%">
            <tr>
              <td align="center" style="background:#09090b;border-radius:8px">
                <a href="${opts.cta.href}" style="display:block;padding:16px 28px;font-size:15px;font-weight:600;color:#ffffff;text-decoration:none;letter-spacing:-.01em">
                  ${opts.cta.label}
                </a>
              </td>
            </tr>
          </table>
          <p style="margin:16px 0 0;font-size:11px;color:#a1a1aa;text-align:center">Or copy this link: <span style="color:#09090b;word-break:break-all">${opts.cta.href}</span></p>
          ` : ""}
        </td>
      </tr>

      <!-- Footer -->
      <tr>
        <td class="content" style="background:#fafafa;border:1px solid #e4e4e7;border-top:0;border-radius:0 0 12px 12px;padding:24px 40px;text-align:center">
          <p style="margin:0;font-size:11px;color:#a1a1aa;line-height:1.6">
            ${opts.footer ?? "This email was sent by Stance Health as part of the candidate assessment process."}
            <br/>© ${new Date().getFullYear()} Stance Health. All rights reserved.
          </p>
        </td>
      </tr>

    </table>
    <!--[if mso]></td></tr></table><![endif]-->
  </td></tr>
</table>
</body>
</html>`;
}

function p(text: string) {
  return `<p style="margin:0 0 16px;font-size:15px;color:#3f3f46;line-height:1.65">${text}</p>`;
}

function ul(items: string[]) {
  return `<ul style="margin:0 0 20px;padding:0 0 0 20px">${items.map((i) => `<li style="font-size:14px;color:#3f3f46;line-height:1.7;margin-bottom:6px">${i}</li>`).join("")}</ul>`;
}

function infoBox(rows: { label: string; value: string }[]) {
  return `<table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f4f4f5;border-radius:8px;margin:24px 0;overflow:hidden">
  ${rows.map((r, i) => `<tr>
    <td style="padding:16px;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.1em;color:#71717a;border-bottom:${i < rows.length - 1 ? "1px solid #e4e4e7" : "none"};width:35%">${r.label}</td>
    <td style="padding:16px;font-size:14px;color:#09090b;font-weight:600;border-bottom:${i < rows.length - 1 ? "1px solid #e4e4e7" : "none"}">${r.value}</td>
  </tr>`).join("")}
</table>`;
}

// ─── Template 1 — Invitation ────────────────────────────────────────────────

export function invitationHtml(opts: { title: string; link: string; hours: number }) {
  return shell({
    preheader: `You've been invited to complete a timed coding assignment from Stance Health.`,
    badge: "Assignment Invitation",
    headline: "You have a coding assignment waiting.",
    body: [
      p("You've been invited to take a timed take-home coding assignment as part of the Stance Health interview process. This is your chance to show us what you can build."),
      infoBox([
        { label: "Assignment", value: opts.title },
        { label: "Time limit", value: `${opts.hours} hour${opts.hours === 1 ? "" : "s"}` },
        { label: "Format", value: "Push your code to GitHub before time runs out" },
      ]),
      p("<strong>Important before you begin:</strong>"),
      ul([
        "Your timer starts the moment you open the link below — do not open it until you are ready.",
        "The link is personal and single-use. Do not share it.",
        `You have exactly <strong>${opts.hours} hour${opts.hours === 1 ? "" : "s"}</strong> once you open it.`,
        "Push your final code to GitHub before the window closes.",
      ]),
      p("When you're ready, click the button below to begin. Good luck!"),
    ].join(""),
    cta: { label: "Open my assignment →", href: opts.link },
    footer: "You received this because your email was added to a Stance Health assessment. If this was unexpected, you can safely ignore it.",
  });
}

export function invitationText(opts: { title: string; link: string; hours: number }) {
  return `You have been invited to complete a timed take-home assignment for Stance Health.

Assignment: ${opts.title}
Time limit: ${opts.hours} hour${opts.hours === 1 ? "" : "s"}

IMPORTANT: your timer starts the moment you open the link below. Only open it when you are ready.

Your link: ${opts.link}

Good luck,
Stance Health`;
}

// ─── Template 2 — Magic link / sign-in ─────────────────────────────────────

export function magicLinkHtml(opts: { link: string; expiresMinutes?: number }) {
  return shell({
    preheader: "Your Stance Health sign-in link is ready.",
    badge: "Sign In",
    headline: "Here's your sign-in link.",
    body: [
      p("Click the button below to sign in to Stance Health Assignments. This link is single-use and expires in <strong>${opts.expiresMinutes ?? 60} minutes</strong>.".replace("${opts.expiresMinutes ?? 60}", String(opts.expiresMinutes ?? 60))),
      p("If you didn't request this, you can safely ignore this email."),
    ].join(""),
    cta: { label: "Sign in to Stance Health →", href: opts.link },
    footer: "This sign-in link was requested for your account. Links expire after " + (opts.expiresMinutes ?? 60) + " minutes.",
  });
}

export function magicLinkText(opts: { link: string; expiresMinutes?: number }) {
  return `Sign in to Stance Health Assignments

Click this link to sign in (expires in ${opts.expiresMinutes ?? 60} minutes):
${opts.link}

If you didn't request this, ignore this email.`;
}

// ─── Template 3 — Time is up ────────────────────────────────────────────────

export function timeUpHtml(opts: { repo: string; graceMinutes?: number }) {
  const grace = opts.graceMinutes ?? 10;
  return shell({
    preheader: `Your assignment time is up. You have ${grace} minutes to push your final code.`,
    badge: "Time's Up",
    headline: `Your time is up — ${grace} minutes to submit.`,
    body: [
      p("Your assignment timer has ended. You now have a short grace window to push your final code."),
      infoBox([
        { label: "Grace window", value: `${grace} minutes remaining` },
        { label: "Repository", value: opts.repo },
        { label: "Action required", value: "git push origin &lt;your-branch&gt;" },
      ]),
      p("Push whatever you have right now — a partial submission is better than nothing. After the grace window closes, the repository will be locked for review."),
      p("<strong>Steps:</strong>"),
      ul([
        "<code style='background:#f4f4f5;padding:1px 5px;border-radius:3px;font-size:13px'>git add .</code>",
        "<code style='background:#f4f4f5;padding:1px 5px;border-radius:3px;font-size:13px'>git commit -m \"final submission\"</code>",
        `<code style='background:#f4f4f5;padding:1px 5px;border-radius:3px;font-size:13px'>git push</code> to <strong>${opts.repo}</strong>`,
      ]),
    ].join(""),
    footer: "This is an automated message from the Stance Health assessment platform.",
  });
}

export function timeUpText(opts: { repo: string; graceMinutes?: number }) {
  const grace = opts.graceMinutes ?? 10;
  return `Your time is up. You have ${grace} minutes to push your final code to: ${opts.repo}

After ${grace} minutes the submission window will close permanently.`;
}

// ─── Template 4 — Submission received ───────────────────────────────────────

export function submissionReceivedHtml(opts: { title: string; pushedAt: string; author?: string }) {
  return shell({
    preheader: "We've received your Stance Health assignment submission.",
    badge: "Submission Received",
    headline: "We've got your code.",
    body: [
      p("Your assignment has been successfully submitted. Our team will review it and get back to you with next steps."),
      infoBox([
        { label: "Assignment", value: opts.title },
        { label: "Received at", value: opts.pushedAt },
        ...(opts.author ? [{ label: "Author", value: opts.author }] : []),
        { label: "Status", value: "Under review" },
      ]),
      p("You don't need to do anything else right now. We'll be in touch shortly with feedback and next steps."),
      p("Thank you for taking the time to complete this assignment."),
    ].join(""),
    footer: "This is a confirmation that your Stance Health assignment was received.",
  });
}

export function submissionReceivedText(opts: { title: string; pushedAt: string }) {
  return `We have received your Stance Health assignment submission.

Assignment: ${opts.title}
Received at: ${opts.pushedAt}

Our team will review your submission and be in touch with next steps. Thank you.

Stance Health`;
}

// ─── Template 5 — You've been selected ──────────────────────────────────────

export function selectedHtml(opts: { name?: string; nextSteps?: string }) {
  return shell({
    preheader: "Congratulations — you've been selected to move forward with Stance Health.",
    badge: "Great News",
    headline: "You've been selected! 🎉",
    body: [
      p(`${opts.name ? `Hi ${opts.name},` : "Hi there,"}`),
      p("We're delighted to let you know that after reviewing your assignment, you've been selected to move forward in the Stance Health interview process."),
      p("Your work stood out, and we're excited about the possibility of having you on our team."),
      ...(opts.nextSteps
        ? [p("<strong>Next steps:</strong>"), p(opts.nextSteps)]
        : [p("Someone from our team will be reaching out shortly to schedule the next conversation. Please keep an eye on your inbox.")]
      ),
      p("Congratulations again — we look forward to speaking with you!"),
    ].join(""),
    footer: "This email was sent because you completed a Stance Health assessment and were selected to proceed.",
  });
}

export function selectedText(opts: { name?: string; nextSteps?: string }) {
  return `${opts.name ? `Hi ${opts.name},` : "Hi there,"}

Congratulations! After reviewing your assignment, you have been selected to move forward in the Stance Health interview process.

${opts.nextSteps ?? "Someone from our team will be in touch shortly to discuss next steps."}

We look forward to speaking with you,
Stance Health`;
}

export function adminInviteHtml(opts: { link: string }) {
  return shell({
    preheader: "You've been invited to join the Stance Health hiring admin panel.",
    badge: "Admin Invite",
    headline: "You've been invited as an admin",
    body: [
      p("You've been added as an admin on the Stance Health Hiring Desk."),
      p("Click the button below to accept the invitation and sign in. The link is valid for 24 hours."),
    ].join(""),
    cta: { label: "Accept Invitation & Sign In", href: opts.link },
    footer: "This invite was sent by a Stance Health admin. If you weren't expecting this, you can safely ignore it.",
  });
}

export function adminInviteText(opts: { link: string }) {
  return `You've been invited as an admin on the Stance Health Hiring Desk.

Click the link below to accept the invitation and sign in (valid for 24 hours):
${opts.link}

If you weren't expecting this, you can safely ignore it.
— Stance Health`;
}
