import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

console.log("SUPABASE_URL:", SUPABASE_URL ? "defined" : "undefined");
console.log("SUPABASE_SERVICE_ROLE_KEY:", SUPABASE_SERVICE_ROLE_KEY ? "defined" : "undefined");

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error("Missing environment variables.");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function run() {
  try {
    // 1. Check user_roles
    const { data: roles, error: err1 } = await supabase.from('user_roles').select('*');
    console.log("Roles count:", roles?.length, "Error:", err1);
    if (roles) {
      console.log("Roles detail:", JSON.stringify(roles, null, 2));
    }

    // 2. Check candidates
    const { data: candidates, error: err2 } = await supabase.from('candidates').select('*');
    console.log("Candidates count:", candidates?.length, "Error:", err2);
    if (candidates) {
      console.log("Candidates detail:", JSON.stringify(candidates, null, 2));
    }

    // 3. List auth users
    const { data: usersData, error: err3 } = await supabase.auth.admin.listUsers();
    console.log("Auth users count:", usersData?.users?.length, "Error:", err3);
    if (usersData?.users) {
      const simplified = usersData.users.map(u => ({
        id: u.id,
        email: u.email,
        created_at: u.created_at,
        last_sign_in_at: u.last_sign_in_at
      }));
      console.log("Auth users:", JSON.stringify(simplified, null, 2));
    }

  } catch (error) {
    console.error("Failed to run check-db:", error);
  }
}

run();
