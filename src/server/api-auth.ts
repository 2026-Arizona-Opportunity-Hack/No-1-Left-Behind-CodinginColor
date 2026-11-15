import "server-only";
import { API_KEY_PATTERN, hashApiKey } from "@/lib/api-keys";
import { createAdminClient } from "@/lib/supabase/admin";

// Shared pieces of the read API (issue #11). Callers aren't signed-in users, so these routes use
// the secret-key client AFTER the key is verified, and return aggregates only.

/** JSON response that must never be cached (the numbers are live). */
export function apiJson(data: unknown, status = 200): Response {
  return Response.json(data, { status, headers: { "Cache-Control": "no-store" } });
}

export const apiError = (message: string, status: number) => apiJson({ error: message }, status);

/**
 * Checks the `x-api-key` header. Returns null when the key is valid (and records that it was used),
 * or the 401 response to send back. The key is looked up by its hash; revoked keys never match.
 */
export async function verifyApiKey(request: Request): Promise<Response | null> {
  const unauthorized = () => apiError("Missing or invalid API key", 401);
  const key = request.headers.get("x-api-key")?.trim() ?? "";
  if (!API_KEY_PATTERN.test(key)) return unauthorized(); // wrong shape: don't even ask the database
  try {
    const db = createAdminClient();
    const { data, error } = await db.from("api_keys").select("id").eq("key_hash", hashApiKey(key)).is("revoked_at", null).maybeSingle();
    if (error) return apiError("The API is not available right now.", 500); // a database problem is not a bad key
    if (!data) return unauthorized();
    await db.from("api_keys").update({ last_used_at: new Date().toISOString() }).eq("id", data.id);
    return null;
  } catch {
    return apiError("The API is not available right now.", 500);
  }
}
