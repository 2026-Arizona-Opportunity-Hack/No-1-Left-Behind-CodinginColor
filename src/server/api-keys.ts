import "server-only";
import { generateApiKey, hashApiKey } from "@/lib/api-keys";
import { createClient } from "@/lib/supabase/server";
import { fail, ok, type Result } from "@/types/result";

// API key management for the admin screen (issue #11). Runs as the signed-in staff member,
// and the database only lets CIC admins touch `api_keys`. The plain key is returned ONCE by
// createApiKey; only its hash is stored, so a lost key can't be recovered, only replaced.

export type ApiKeyRow = { id: string; name: string; created_at: string; last_used_at: string | null; revoked_at: string | null };

const ADMINS_ONLY = "Only CIC admins can manage API keys.";

export async function listApiKeys(): Promise<Result<ApiKeyRow[]>> {
  const { data, error } = await (await createClient())
    .from("api_keys")
    .select("id, name, created_at, last_used_at, revoked_at") // never the hash
    .order("created_at", { ascending: false });
  return error ? fail("We couldn't load the API keys. Please try again.") : ok(data ?? []);
}

/** Creates a key. `key` is shown to the admin once and never stored. */
export async function createApiKey(name: string): Promise<Result<{ id: string; key: string }>> {
  const label = name.trim();
  if (label.length < 1 || label.length > 80) return fail("Give the key a short name, like \"CIC dashboard\".");
  const db = await createClient();
  const { data: { user } } = await db.auth.getUser();
  if (!user) return fail(ADMINS_ONLY);
  const key = generateApiKey();
  const { data, error } = await db.from("api_keys").insert({ name: label, key_hash: hashApiKey(key), created_by: user.id }).select("id").single();
  return error || !data ? fail(ADMINS_ONLY) : ok({ id: data.id, key });
}

/** Stops a key from working. The row stays, so the log of who used it is kept. */
export async function revokeApiKey(id: string): Promise<Result<void>> {
  const { data, error } = await (await createClient())
    .from("api_keys")
    .update({ revoked_at: new Date().toISOString() })
    .eq("id", id)
    .is("revoked_at", null)
    .select("id");
  if (error) return fail(ADMINS_ONLY);
  return data && data.length > 0 ? ok(undefined) : fail("That key doesn't exist or was already revoked.");
}
