// Sets up the LOCAL test database (never the live one): creates test staff logins with random passwords and loads the
// demo data. Run it after `supabase start`:  node scripts/local-setup.mjs
// It reads the local keys from `supabase status` and prints the logins in your terminal, so no password or key is
// ever written in this repository. It refuses to run against anything that is not on your own computer.
import { execSync } from "node:child_process";
import { randomBytes } from "node:crypto";
import { readFileSync, writeFileSync, existsSync } from "node:fs";

const workdir = process.env.SUPABASE_WORKDIR; // optional: folder that holds supabase/config.toml
const run = (cmd) => execSync(cmd, { encoding: "utf8", cwd: workdir || process.cwd() });

const env = Object.fromEntries(
  run("npx supabase status -o env").split("\n").map((l) => l.match(/^([A-Z_]+)="?(.*?)"?$/)).filter(Boolean).map((m) => [m[1], m[2]]),
);
const url = env.API_URL;
const secret = env.SECRET_KEY || env.SERVICE_ROLE_KEY;
if (!url || !secret) throw new Error("Could not read local Supabase keys. Is `supabase start` running?");
if (!/^https?:\/\/(127\.0\.0\.1|localhost)[:/]/.test(url)) throw new Error("This script only sets up a database on your own computer. Stopping.");

// A new random password per account on every run (set LOCAL_TEST_PASSWORD to use one password for all of them).
const password = () => process.env.LOCAL_TEST_PASSWORD || randomBytes(9).toString("base64url");

const USERS = [
  { email: "admin@launchpad.test", password: password(), role: "admin" },
  { email: "teacher@launchpad.test", password: password(), role: "instructor" },
  { email: "reviewer@launchpad.test", password: password(), role: "reviewer" },
  { email: "mentor@launchpad.test", password: password(), role: "mentor" }, // custom role, added by local-ui-seed.sql
];

const db = "supabase_db_" + (readFileSync("supabase/config.toml", "utf8").match(/project_id\s*=\s*"([^"]+)"/)?.[1] ?? "");
const sql = (q) => execSync(`docker exec -i ${db} psql -U postgres -v ON_ERROR_STOP=1`, { input: q, encoding: "utf8" });
const value = (q) => execSync(`docker exec -i ${db} psql -U postgres -At`, { input: q, encoding: "utf8" }).trim();
const headers = { apikey: secret, Authorization: `Bearer ${secret}`, "Content-Type": "application/json" };

for (const u of USERS) {
  const existing = value(`select id from auth.users where email='${u.email}';`);
  const res = existing
    ? await fetch(`${url}/auth/v1/admin/users/${existing}`, { method: "PUT", headers, body: JSON.stringify({ password: u.password, email_confirm: true }) })
    : await fetch(`${url}/auth/v1/admin/users`, { method: "POST", headers, body: JSON.stringify({ email: u.email, password: u.password, email_confirm: true }) });
  if (!res.ok) throw new Error(`Could not set up ${u.email}: ${(await res.text()).slice(0, 120)}`);
}
// The base seed refuses to delete units that already have student work, so only run it on a fresh database.
const alreadySeeded = !sql("select 'seeded=' || count(*) from public.classes where class_code = 'MARY-P3';").includes("seeded=0");
if (!alreadySeeded) {
  sql("delete from public.classes where id = 'c0000000-0000-0000-0000-000000000004';"); // its unit assignments would block the base seed
  sql(readFileSync("supabase/seed.sql", "utf8"));
}
sql(readFileSync("scripts/local-ui-seed.sql", "utf8"));
sql(readFileSync("supabase/demo-class.sql", "utf8"));
for (const u of USERS) sql(`update public.profiles set role='${u.role}' where id=(select id from auth.users where email='${u.email}');`);
console.log("Roles set and demo data loaded.");
console.log("");
console.log("Test logins (they only work on your own computer, and change every time you run this):");
for (const u of USERS) console.log(`  ${u.role.padEnd(10)} ${u.email}  ${u.password}`);
console.log("  student    join page: class MARY-P3, code 7KQ2MX (made-up demo card), or class DEMO, code TRYIT");
console.log("");

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
