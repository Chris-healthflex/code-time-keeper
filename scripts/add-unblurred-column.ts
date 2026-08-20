import postgres from 'postgres';

const DB_URL = "postgresql://postgres:Stance%402026HQ@db.jmdkwtfuagwjloemfthj.supabase.co:5432/postgres";

async function run() {
  console.log("Connecting to PostgreSQL...");
  const sql = postgres(DB_URL);
  
  try {
    console.log("Running migration to add 'unblurred' column to 'candidates' table...");
    await sql`
      ALTER TABLE public.candidates 
      ADD COLUMN IF NOT EXISTS unblurred boolean NOT NULL DEFAULT false;
    `;
    console.log("SUCCESS! 'unblurred' column has been successfully added to 'candidates' table.");
  } catch (error) {
    console.error("Migration failed:", error);
  } finally {
    await sql.end();
  }
}

run();
