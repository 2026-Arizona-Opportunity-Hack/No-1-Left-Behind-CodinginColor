import type { Metadata } from "next";
import { connection } from "next/server";
import { requireStaff } from "@/server/auth";
import { listApiKeys } from "@/server/api-keys";
import { KeysManager } from "./keys-manager";

export const metadata: Metadata = { title: "API keys · CIC Launchpad" };

const ENDPOINTS = [
  ["/api/v1/classes", "Every class with student count and completion %"],
  ["/api/v1/classes/{id}/summary", "One class: completion, active students, behind count, learning gain"],
  ["/api/v1/learning-gain?classId=&moduleId=&concept=", "Learning gain (pre → post) with how many students it's based on"],
  ["/api/v1/concepts/mastery?classId=", "Per topic: % who got it and % who are stuck"],
];

export default async function ApiKeysPage() {
  await connection(); // per-user, live data: render at request time
  await requireStaff(["admin"], "/admin/api-keys");
  const keys = await listApiKeys();
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">API keys</h1>
        <p className="text-muted-foreground">Let CIC&apos;s org dashboard read class completion and learning gain without a login.
          The API only returns totals and averages, <strong>never student names</strong>.</p>
      </div>
      {keys.ok ? <KeysManager keys={keys.data} /> : <p role="alert">{keys.error}</p>}
      <section aria-labelledby="how-h" className="space-y-3 rounded-3xl bg-card p-5">
        <h2 id="how-h" className="text-xl font-semibold">How to use a key</h2>
        <p>Send it in the <code className="rounded bg-muted px-1">x-api-key</code> header. For example:</p>
        <pre className="overflow-auto rounded-lg bg-[#0F2E1C] p-4 font-mono text-sm text-[#E6F4EA]">{`curl -H "x-api-key: YOUR_KEY" https://cic-launchpad.vercel.app/api/v1/classes`}</pre>
        <ul className="space-y-1 text-sm">
          {ENDPOINTS.map(([path, what]) => <li key={path}><code className="rounded bg-muted px-1">GET {path}</code> {what}</li>)}
        </ul>
        <p className="text-sm text-muted-foreground">Full examples are in the README, under &quot;Read API&quot;.</p>
      </section>
    </div>
  );
}
