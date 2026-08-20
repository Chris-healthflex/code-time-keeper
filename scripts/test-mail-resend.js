import 'dotenv/config';

const apiKey = process.env.RESEND_API_KEY;
const from = "thrisha.s@stance.health";
const to = "thrisha.s@stance.health";

async function run() {
  console.log(`Testing Resend API with API Key starting with: ${apiKey?.substring(0, 5)}...`);
  console.log(`From: ${from}`);
  console.log(`To: ${to}`);

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      from,
      to,
      subject: "Verification Test",
      html: "<p>If you see this, thrisha.s@stance.health is verified as a sender in Resend.</p>",
      text: "If you see this, thrisha.s@stance.health is verified as a sender in Resend.",
    }),
  });

  const data = await res.json();
  console.log("Status:", res.status);
  console.log("Response:", data);
}

run().catch(console.error);
