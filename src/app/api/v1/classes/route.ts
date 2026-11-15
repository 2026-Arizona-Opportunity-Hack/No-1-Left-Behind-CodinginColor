import { createAdminClient } from "@/lib/supabase/admin";
import { apiError, apiJson, verifyApiKey } from "@/server/api-auth";
import { listClasses } from "@/server/api-data";

// GET /api/v1/classes: every class with its student count and completion %. Aggregates only.
export async function GET(request: Request) {
  const denied = await verifyApiKey(request);
  if (denied) return denied;
  try {
    const result = await listClasses(createAdminClient());
    return result.ok ? apiJson(result.data) : apiError(result.error, 500);
  } catch {
    return apiError("The API is not available right now.", 500);
  }
}
