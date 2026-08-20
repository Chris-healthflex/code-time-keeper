import { sendMail } from "../src/lib/mailer.server";

async function run() {
  console.log("Attempting to send test email from thrisha.s@stance.health...");
  
  // Update the FROM address in environment for this test
  process.env["MAIL_FROM"] = "thrisha.s@stance.health";
  
  // Note: This script assumes RESEND_API_KEY or LOVABLE_API_KEY is available in the shell env.
  // We'll use a dummy input for the required fields.
  const result = await sendMail({
    kind: "magic_link",
    to: "thrisha.s@stance.health",
    candidateId: "test-candidate",
    assignmentId: "test-assignment",
    subject: "Test Email from Codeshipp",
    html: "<p>This is a test email sent to verify the custom sender address.</p>",
    text: "This is a test email sent to verify the custom sender address.",
  });

  console.log("Result:", result);
}

run().catch(console.error);
