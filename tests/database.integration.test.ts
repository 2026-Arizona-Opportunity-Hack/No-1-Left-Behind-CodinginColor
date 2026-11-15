import { execFileSync } from "node:child_process";
import { describe, expect, it } from "vitest";
import { activityContentSchemas, hintsSchema, teachingGuideSchema, type ActivityType } from "../src/types/activity-content";
import { hashJoinCode } from "../src/lib/join-codes";

const url = process.env.TEST_DATABASE_URL;
function sql(...args: string[]) {
  return execFileSync("psql", [url!, "-X", "-v", "ON_ERROR_STOP=1", ...args], { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
}
describe.skipIf(!url)("disposable migrated and seeded database", () => {
  it("runs curriculum admin publishing and non-admin refusal flows", () => {
    expect(sql("-f", "supabase/tests/curriculum.sql")).toContain("ROLLBACK");
  });
  it("runs instructor class setup and cross-instructor isolation flows", () => {
    expect(sql("-f", "supabase/tests/classes.sql")).toContain("ROLLBACK");
  });
  it("validates ALL materialized seed activities, including generated slides/questions", () => {
    const rows = JSON.parse(sql("-Atc", "select jsonb_agg(jsonb_build_object('type',type,'content',content,'teaching_guide',teaching_guide,'hints',hints)) from public.activities"));
    expect(rows.length).toBeGreaterThanOrEqual(24);
    for (const row of rows) {
      expect(activityContentSchemas[row.type as ActivityType].safeParse(row.content).success, row.type).toBe(true);
      if (row.teaching_guide) expect(teachingGuideSchema.safeParse(row.teaching_guide).success).toBe(true);
      if (row.hints) expect(hintsSchema.safeParse(row.hints).success).toBe(true);
    }
  });
  it("matches the actual hash stored for the seeded personal join code", async () => {
    const stored = sql("-Atc", "select join_code_hash from public.students where class_id='c0000000-0000-0000-0000-000000000003' and display_name='Jaylen Washington'").trim();
    expect(await hashJoinCode("c0000000-0000-0000-0000-000000000003", "7KQ2MX")).toBe(stored);
  });
});
