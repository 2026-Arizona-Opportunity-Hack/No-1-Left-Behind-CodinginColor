import { createAdminClient } from "@/lib/supabase/admin";
import { isUuid } from "@/lib/validate";
import { apiError, apiJson, verifyApiKey } from "@/server/api-auth";
import { classSummary } from "@/server/api-data";

// GET /api/v1/classes/{id}/summary: completion, activity, behind count and learning gain for one class.
export async function GET(request: Request, ctx: { params: Promise<{ id: string }> }) {
  const denied = await verifyApiKey(request);
  if (denied) return denied;
  const { id } = await ctx.params;
  if (!isUuid(id)) return apiError("The class id must look like c0000000-0000-0000-0000-000000000003.", 400);
  try {
    const result = await classSummary(createAdminClient(), id);
    return result.ok ? apiJson(result.data) : apiError(result.error, 404);
  } catch {
    return apiError("The API is not available right now.", 500);
  }
}
