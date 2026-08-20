import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

// Load .env from root
const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, "../.env") });

import { sendMail } from "../src/lib/mailer.server.js";

async function run() {
  console.log("Simulating invitation email send from dashboard...");
  console.log("Sender:", process.env.MAIL_FROM);

  const result = await sendMail({
    kind: "invitation",
    to: "thechris241103@gmail.com",
    candidateId: "simulated-candidate-id",
    assignmentId: "simulated-assignment-id",
    // These match the expected opts for invitation template
    title: "Fullstack AI Engineer Assessment",
    link: "https://ai-assignments.stance.health/start/test-token",
    hours: 2,
  });

  if (result.success) {
    console.log("✅ Simulation successful! Email sent.");
    console.log("Message ID:", result.id);
  } else {
    console.log("❌ Simulation failed.");
    console.log("Error:", result.error);
  }
}

run().catch(console.error);
