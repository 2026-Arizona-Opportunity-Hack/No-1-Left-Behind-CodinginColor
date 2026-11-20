"use client";

import { useState } from "react";
import { SaveMessage, useSave } from "@/components/curriculum/use-save";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { ApiKeyRow } from "@/server/api-keys";
import { createKeyAction, revokeKeyAction } from "./actions";

export function KeysManager({ keys }: { keys: ApiKeyRow[] }) {
  const { pending, message, save } = useSave();
  const [name, setName] = useState("");
  const [fresh, setFresh] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const fmt = (iso: string | null) => (iso ? new Date(iso).toLocaleString() : "Never");

  return (
    <div className="space-y-6">
      <form className="flex flex-wrap items-end gap-3 rounded-xl bg-card p-4 border border-border"
        onSubmit={(e) => { e.preventDefault(); save(() => createKeyAction(name), "Key created", (d) => { setFresh(d.key); setName(""); setCopied(false); }); }}>
        <div className="flex-1 space-y-1">
          <Label htmlFor="key-name">Name the new key (who will use it)</Label>
          <Input id="key-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. CIC org dashboard" className="h-10" />
        </div>
        <Button type="submit" disabled={pending || !name.trim()}>Create key</Button>
      </form>
      <SaveMessage message={message} />

      {fresh && (
        <div role="status" className="space-y-3 rounded-xl bg-behind p-5 text-behind-ink">
          <p className="font-semibold">Copy this key now. You won&apos;t see it again.</p>
          <p className="text-base">We only keep a scrambled version. If it&apos;s lost, revoke it and create a new one. Keep it out of email and chat; put it straight into your dashboard&apos;s settings.</p>
          <div className="flex flex-wrap items-center gap-2">
            <code className="rounded bg-white px-3 py-2 font-mono text-base break-all">{fresh}</code>
            <Button variant="outline" onClick={async () => { await navigator.clipboard.writeText(fresh); setCopied(true); }}>{copied ? "✓ Copied" : "Copy key"}</Button>
            <Button variant="ghost" onClick={() => setFresh(null)}>I saved it, hide it</Button>
          </div>
        </div>
      )}

      <div tabIndex={0} role="region" aria-label="API keys table, scrolls sideways" className="overflow-x-auto rounded-xl border">
        <table className="w-full min-w-[36rem] text-left text-base">
          <caption className="sr-only">API keys</caption>
          <thead className="border-b bg-muted/50"><tr>{["Name", "Created", "Last used", "Status", ""].map((h, i) => <th key={i} scope="col" className="relative p-3 font-medium">{h || <span className="sr-only">Actions</span>}</th>)}</tr></thead>
          <tbody>
            {keys.map((k) => (
              <tr key={k.id} className="border-b last:border-0">
                <th scope="row" className="p-3 font-medium">{k.name}</th>
                <td className="p-3">{fmt(k.created_at)}</td>
                <td className="p-3">{fmt(k.last_used_at)}</td>
                <td className="p-3">{k.revoked_at ? <span className="text-muted-foreground">✕ Revoked</span> : <span className="text-[#047D13]">✓ Active</span>}</td>
                <td className="p-3 text-right">{!k.revoked_at && (
                  <Button size="sm" variant="destructive" disabled={pending}
                    onClick={() => { if (confirm(`Revoke "${k.name}"? Anything using it stops working right away.`)) save(() => revokeKeyAction(k.id), "Key revoked"); }}>Revoke</Button>
                )}</td>
              </tr>
            ))}
            {!keys.length && <tr><td colSpan={5} className="p-6 text-center text-muted-foreground">No keys yet.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
