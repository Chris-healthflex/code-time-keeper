const apiKey = "re_DvUbqQ2Z_PGzgqboSWNupCdCYNQznxuPT";
const from = "thrisha.s@stance.health";
const to = "thrisha.s@stance.health";

async function run() {
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      from,
      to,
      subject: "Verification Test",
      html: "<p>Testing sender verification.</p>",
    }),
  });

  const data = await res.json();
  console.log("Status:", res.status);
  console.log("Response:", data);
}

run().catch(console.error);
