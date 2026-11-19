// Sets up the LOCAL test database (never the live one): creates the three demo staff logins and re-runs the demo
// seed so the demo teacher owns the demo classes. Run it after `supabase start`:  node scripts/local-setup.mjs
// Reads the local keys from `supabase status`, so no secret is ever typed or committed.
import { execSync } from "node:child_process";
import { readFileSync, writeFileSync, existsSync } from "node:fs";

const workdir = process.env.SUPABASE_WORKDIR; // optional: folder that holds supabase/config.toml
const run = (cmd) => execSync(cmd, { encoding: "utf8", cwd: workdir || process.cwd() });

const env = Object.fromEntries(
  run("npx supabase status -o env").split("\n").map((l) => l.match(/^([A-Z_]+)="?(.*?)"?$/)).filter(Boolean).map((m) => [m[1], m[2]]),
);
const url = env.API_URL;
const secret = env.SECRET_KEY || env.SERVICE_ROLE_KEY;
if (!url || !secret) throw new Error("Could not read local Supabase keys. Is `supabase start` running?");

const USERS = [
  { email: "admin@launchpad.test", password: "admin1", role: "admin" },
  { email: "teacher@launchpad.test", password: "teacher1", role: "instructor" },
  { email: "reviewer@launchpad.test", password: "review1", role: "reviewer" },
  { email: "mentor@launchpad.test", password: "mentor1", role: "mentor" }, // custom role, added by local-ui-seed.sql
];

for (const u of USERS) {
  const res = await fetch(`${url}/auth/v1/admin/users`, {
    method: "POST",
    headers: { apikey: secret, Authorization: `Bearer ${secret}`, "Content-Type": "application/json" },
    body: JSON.stringify({ email: u.email, password: u.password, email_confirm: true }),
  });
  const body = await res.text();
  console.log(u.email, res.ok ? "created" : `skipped (${body.slice(0, 80)})`);
}

const db = "supabase_db_" + (readFileSync("supabase/config.toml", "utf8").match(/project_id\s*=\s*"([^"]+)"/)?.[1] ?? "");
const sql = (q) => execSync(`docker exec -i ${db} psql -U postgres -v ON_ERROR_STOP=1`, { input: q, encoding: "utf8" });
// The base seed refuses to delete units that already have student work, so only run it on a fresh database.
const alreadySeeded = !sql("select 'seeded=' || count(*) from public.classes where class_code = 'MARY-P3';").includes("seeded=0");
if (!alreadySeeded) {
  sql("delete from public.classes where id = 'c0000000-0000-0000-0000-000000000004';"); // its unit assignments would block the base seed
  sql(readFileSync("supabase/seed.sql", "utf8"));
}
sql(readFileSync("scripts/local-ui-seed.sql", "utf8"));
for (const u of USERS) sql(`update public.profiles set role='${u.role}' where id=(select id from auth.users where email='${u.email}');`);
console.log("Roles set and demo data loaded.");

// Point the app at the local database. The previous file is kept as .env.local.live.
const keep = existsSync(".env.local") ? readFileSync(".env.local", "utf8") : "";
if (keep && !existsSync(".env.local.live") && !keep.includes("127.0.0.1")) writeFileSync(".env.local.live", keep);
writeFileSync(
  ".env.local",
  [
    `NEXT_PUBLIC_SUPABASE_URL=${url}`,
    `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=${env.PUBLISHABLE_KEY || env.ANON_KEY}`,
    `SUPABASE_SECRET_KEY=${secret}`,
    "SESSION_SECRET=local-dev-only-not-secret-0123456789abcdef",
    "",
  ].join("\n"),
);
console.log(".env.local now points at the local database.");
