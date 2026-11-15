import { parseMasteryQuery } from "@/lib/api-query";
import { createAdminClient } from "@/lib/supabase/admin";
import { apiError, apiJson, verifyApiKey } from "@/server/api-auth";
import { conceptMastery } from "@/server/api-data";

// GET /api/v1/concepts/mastery?classId=: per concept, the % of students who mastered it / are struggling.
export async function GET(request: Request) {
  const denied = await verifyApiKey(request);
  if (denied) return denied;
  const query = parseMasteryQuery(new URL(request.url).searchParams);
  if (!query.ok) return apiError(query.error, 400);
  try {
    const result = await conceptMastery(createAdminClient(), query.value.classId);
    return result.ok ? apiJson(result.data) : apiError(result.error, 404);
  } catch {
    return apiError("The API is not available right now.", 500);
  }
}
