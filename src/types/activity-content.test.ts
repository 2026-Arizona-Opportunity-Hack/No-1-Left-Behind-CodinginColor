import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { activityContentSchemas, emptyContent, hintsSchema, teachingGuideSchema, type ActivityType } from "./activity-content";

describe("activity authoring", () => {
  it.each(Object.keys(activityContentSchemas) as ActivityType[])("provides a valid independent %s starter", (type) => {
    expect(activityContentSchemas[type].safeParse(emptyContent(type)).success).toBe(true);
    expect(emptyContent(type)).not.toBe(emptyContent(type));
  });
  it("validates every literal activity, guide and hint in the seed", () => {
    const seed = readFileSync("supabase/seed.sql", "utf8");
    const activities = seed.slice(seed.indexOf("-- ---------- The"), seed.indexOf("-- Short slide"));
    const rows = [...activities.matchAll(/\('30000000-[\s\S]*?(?=,\n\('30000000-|;\n)/g)];
    expect(rows).toHaveLength(10);
    for (const [row] of rows) {
      const type = row.match(/\d+, '([a-z_]+)',/)![1] as ActivityType;
      const json = [...row.matchAll(/\$j\$([\s\S]*?)\$j\$/g)].map((m) => JSON.parse(m[1]));
      expect(activityContentSchemas[type].safeParse(json[0]).success, type).toBe(true);
      for (const extra of json.slice(1)) {
        expect((Array.isArray(extra) ? hintsSchema : teachingGuideSchema).safeParse(extra).success).toBe(true);
      }
    }
  });
  it("rejects invalid answers, missing blanks, duplicate fields, and ineffective checks", () => {
    expect(activityContentSchemas.quiz_mcq.safeParse({ prompt: "?", options: ["a", "b"], answer: 2 }).success).toBe(false);
    expect(activityContentSchemas.fill_blank.safeParse({ prompt: "?", template: "no blank", answers: ["x"] }).success).toBe(false);
    expect(activityContentSchemas.worksheet.safeParse({ fields: [{ id: "a", label: "", kind: "long" }, { id: "a", label: "", kind: "short" }] }).success).toBe(false);
    expect(activityContentSchemas.code_exercise.safeParse({ prompt: "", starter_code: "", tests: [{ label: "No check" }] }).success).toBe(false);
  });
});
