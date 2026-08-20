import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error("Missing env vars.");
  process.exit(1);
}

const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
const userId = "39dbc158-2fb2-4b57-b3e1-442ad6abbb74"; // The user's ID
const email = "chris.thomas@healthflex.in";

async function run() {
  try {
    console.log("Checking if user has admin role in database...");
    const { data: roleRow, error: err1 } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .eq("role", "admin")
      .maybeSingle();

    console.log("roleRow:", roleRow, "Error:", err1);
    if (roleRow) {
      console.log("User already has admin role. Path: /admin");
      return;
    }

    console.log("Checking total user_roles count...");
    const { count, error: err2 } = await supabaseAdmin
      .from("user_roles")
      .select("*", { count: "exact", head: true });

    console.log("Count:", count, "Error:", err2);

    if ((count ?? 0) === 0) {
      console.log("Count is 0! Bootstrapping first admin user...");
      const { data: insertRow, error: err3 } = await supabaseAdmin
        .from("user_roles")
        .insert({ user_id: userId, role: "admin" })
        .select();
      console.log("Inserted row:", insertRow, "Error:", err3);
    }
  } catch (e) {
    console.error("Exception occurred:", e);
  }
}

run();
