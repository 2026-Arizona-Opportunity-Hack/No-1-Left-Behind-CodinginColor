import { can } from "@/lib/permissions";
import { getStaff } from "@/server/auth";
import { getResults } from "@/server/results";

// CSV download of learning gain per student, for grant reports and gradebooks.
// Staff only; the database limits teachers to their own classes.
export async function GET(request: Request) {
  const staff = await getStaff();
  if (!can(staff,"results.read")) return new Response("Sign in as a teacher or CIC staff.", { status: 401 });
  const url = new URL(request.url);
  const r = await getResults(url.searchParams.get("unit") ?? undefined, url.searchParams.get("class") ?? undefined);
  const unit = r.units.find((u) => u.id === r.unitId)?.title ?? "unit";
  const cls = new Map(r.classes.map((c) => [c.id, c]));
  const cell = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  const lines = [
    ["Student", "School", "Class", "Unit", "Pre-test %", "Post-test %", "Gain (points)"],
    ...r.students.map((s) => [s.name, cls.get(s.classId)?.school, cls.get(s.classId)?.name, unit,
      s.pre_pct === null ? "missing" : Math.round(s.pre_pct), s.post_pct === null ? "missing" : Math.round(s.post_pct),
      s.pre_pct !== null && s.post_pct !== null ? Math.round(s.post_pct - s.pre_pct) : ""]),
  ].map((row) => row.map(cell).join(","));
  return new Response(lines.join("\r\n") + "\r\n", {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="learning-gain-${unit.toLowerCase().replace(/[^a-z0-9]+/g, "-")}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
