console.log("Checking environment keys:");
const safeKeys = [
  "SUPABASE_URL",
  "SUPABASE_PUBLISHABLE_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
  "DATABASE_URL",
  "SUPABASE_DB_PASSWORD",
  "SUPABASE_PROJECT_ID",
  "SUPABASE_ACCESS_TOKEN",
  "VITE_SUPABASE_URL",
  "VITE_SUPABASE_PUBLISHABLE_KEY"
];

for (const key of safeKeys) {
  const val = process.env[key];
  console.log(`${key}: ${val ? `defined (length: ${val.length})` : "undefined"}`);
}
