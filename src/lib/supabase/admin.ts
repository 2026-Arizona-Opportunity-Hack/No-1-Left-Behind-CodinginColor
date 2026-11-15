import "server-only";
import { createClient } from "@supabase/supabase-js";

// Uses the SECRET key: bypasses Row Level Security. Only for server code that has already
// checked who is asking (a verified student session, or a valid API key). Never import
// this from a client component, and never send its results to the browser unfiltered.
export function createAdminClient() {
  const key = process.env.SUPABASE_SECRET_KEY;
  if (!key) throw new Error("SUPABASE_SECRET_KEY is not set (see .env.example).");
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
