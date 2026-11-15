import { parseGainQuery } from "@/lib/api-query";
import { createAdminClient } from "@/lib/supabase/admin";
import { apiError, apiJson, verifyApiKey } from "@/server/api-auth";
import { learningGainReport } from "@/server/api-data";

// GET /api/v1/learning-gain?classId=&moduleId=&concept=: post % minus pre %, averaged over students
// who took both tests (n), with the number missing a test. Without `concept`, also gain per concept.
export async function GET(request: Request) {
  const denied = await verifyApiKey(request);
  if (denied) return denied;
  const query = parseGainQuery(new URL(request.url).searchParams);
  if (!query.ok) return apiError(query.error, 400);
  try {
    const result = await learningGainReport(createAdminClient(), query.value);
    return result.ok ? apiJson(result.data) : apiError(result.error, 404);
  } catch {
    return apiError("The API is not available right now.", 500);
  }
}
