import { appendFileSync } from "node:fs";
import { pathToFileURL } from "node:url";

const probes = [
  ["staff roles", "staff_roles?select=id&limit=0"],
  ["assessment review", "assessments?select=reviewed&limit=0"],
  ["permission checks", "rpc/has_permission", { permission: "curriculum.read" }],
  ["staff access management", "rpc/manage_staff_access", { operation: "readiness", details: {} }],
  ["curriculum imports", "rpc/import_curriculum", { package: {} }],
];

/** Anonymous schema probes only. RPC execute permission must be denied: no mutation runs. */
export async function checkDeploymentSchema(env, request = fetch) {
  const url = env.NEXT_PUBLIC_SUPABASE_URL;
  const key = env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) return { ready: false, missing: ["public Supabase configuration"] };
  const results = await Promise.all(probes.map(async ([label, path, body]) => {
    try {
      const response = await request(`${url.replace(/\/$/, "")}/rest/v1/${path}`, {
        method: body ? "POST" : "GET",
        headers: { apikey: key, "Content-Type": "application/json" },
        ...(body ? { body: JSON.stringify(body) } : {}),
        signal: AbortSignal.timeout(12000),
      });
      const payload = await response.json();
      // Anonymous callers cannot execute the RPCs. A permission denial proves the
      // function exists; a missing function/table/column or invalid key does not.
      const denied = (response.status === 401 || response.status === 403) && payload.code === "42501";
      return { label, present: body ? denied : response.ok || denied };
    } catch {
      return { label, present: false };
    }
  }));
  const missing = results.filter((r) => !r.present).map((r) => r.label);
  return { ready: missing.length === 0, missing };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const result = await checkDeploymentSchema(process.env);
  if (process.env.GITHUB_OUTPUT) appendFileSync(process.env.GITHUB_OUTPUT, `ready=${result.ready}\n`);
  if (result.ready) console.log("Required Supabase schema is available; deployment can continue.");
  else {
    const message = `Production deployment held: required schema is unavailable (${result.missing.join(", ")}). The existing live site is unchanged. Apply 20261115170812_configurable_roles.sql and 20261115171150_curriculum_assessment_import.sql, then rerun the deployment workflow.`;
    console.log(message);
    if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY, `## Production deployment held\n\n${message}\n`);
  }
}
