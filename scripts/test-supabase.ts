import { createClient } from '@supabase/supabase-js';

const supabase = createClient('https://example.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV4YW1wbGUiLCJyb2xlIjoiYW5vbiIsImlhdCI6MTU5ODg4Mzg0MCwiZXhwIjoxOTE0NDM5ODQwfQ.signature');

console.log("supabase.auth.getClaims:", typeof (supabase.auth as any).getClaims);
console.log("Methods on supabase.auth:", Object.keys(supabase.auth));
