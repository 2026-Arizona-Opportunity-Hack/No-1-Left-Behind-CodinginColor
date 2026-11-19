import type { Metadata } from "next";
import { connection } from "next/server";
import { requirePermission } from "@/server/auth";
import { listApiKeys } from "@/server/api-keys";
import { KeysManager } from "./keys-manager";

// Live, per-user data: navigations wait for it rather than showing a prerendered shell.
export const instant = false;

export const metadata: Metadata = { title: "API keys · CIC Launchpad" };

const ENDPOINTS = [
  ["/api/v1/classes", "Every class with student count and completion %"],
  ["/api/v1/classes/{id}/summary", "One class: completion, active students, behind count, learning gain"],
  ["/api/v1/learning-gain?classId=&moduleId=&concept=", "How much students improved (before vs after a unit), with how many students it's based on"],
  ["/api/v1/concepts/mastery?classId=", "Per topic: % who got it and % who are stuck"],
];

export default async function ApiKeysPage() {
  await connection(); // per-user, live data: render at request time
  await requirePermission("api_keys.manage", "/admin/api-keys");
  const keys = await listApiKeys();
  return (
    <div className="space-y-6">
      <div>
        <h1 className="flex items-center gap-3 text-4xl font-bold tracking-tight sm:text-[52px]"><span aria-hidden="true" className="font-mono text-[#0DB031]">&gt;</span>API keys</h1>
        <p className="text-muted-foreground">A key lets CIC&apos;s own reporting tools read class progress and learning results.
          They only get totals and averages, <strong>never student names</strong>. You only need this if someone technical asks for one.</p>
      </div>
      {keys.ok ? <KeysManager keys={keys.data} /> : <p role="alert">{keys.error}</p>}
      <details className="space-y-3 rounded-[20px] bg-card p-5 border border-border">
        <summary className="cursor-pointer text-xl font-semibold">For developers: how to use a key</summary>
        <p>Send it in the <code className="rounded bg-muted px-1">x-api-key</code> header. For example:</p>
        <pre className="overflow-auto rounded-lg bg-[#0F2E1C] p-4 font-mono text-base text-[#E6F4EA]">{`curl -H "x-api-key: YOUR_KEY" https://cic-launchpad.vercel.app/api/v1/classes`}</pre>
        <ul className="space-y-1 text-base">
          {ENDPOINTS.map(([path, what]) => <li key={path}><code className="rounded bg-muted px-1">GET {path}</code> {what}</li>)}
        </ul>
        <p className="text-base text-muted-foreground">Full examples are in the README, under &quot;Read API&quot;.</p>
      </details>
    </div>
  );
}
