import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error("Missing env vars.");
  process.exit(1);
}

const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

const usersToMakeAdmin = [
  { id: "39dbc158-2fb2-4b57-b3e1-442ad6abbb74", email: "chris.thomas@healthflex.in" },
  { id: "822a728b-9c9b-4647-8266-37cb46fb3f41", email: "thechris241103@gmail.com" }
];

async function run() {
  for (const user of usersToMakeAdmin) {
    console.log(`Granting admin role to ${user.email} (${user.id})...`);
    const { data, error } = await supabaseAdmin
      .from("user_roles")
      .insert({ user_id: user.id, role: "admin" })
      .select();
    
    if (error) {
      if (error.code === "23505") {
        console.log(`  ${user.email} is already an admin.`);
      } else {
        console.error(`  Error granting admin to ${user.email}:`, error);
      }
    } else {
      console.log(`  Successfully made ${user.email} an admin:`, data);
    }
  }
}

run();
