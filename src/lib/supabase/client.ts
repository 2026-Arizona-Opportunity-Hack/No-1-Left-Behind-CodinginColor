import { createBrowserClient } from "@supabase/ssr";

// Browser client: uses the public publishable key, so Row Level Security decides what it can see.
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
  );
}
