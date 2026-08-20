import 'dotenv/config';
import { invitationHtml } from '../src/lib/mail-templates.js';

const apiKey = process.env.RESEND_API_KEY;
const from = "ai-hiring@stance.health";
const to = "thechris241103@gmail.com";

async function run() {
  const html = invitationHtml({
    title: 'Fullstack AI Engineer Assessment',
    link: 'https://ai-assignments.stance.health/start/test-token',
    hours: 2
  });

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      from,
      to,
      subject: "Invitation: Fullstack AI Engineer Assessment",
      html,
    }),
  });

  const data = await res.json();
  console.log("Status:", res.status);
  console.log("Response:", data);
}

run().catch(console.error);
