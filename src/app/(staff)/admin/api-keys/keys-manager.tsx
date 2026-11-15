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
      <form className="flex flex-wrap items-end gap-3 rounded-xl border p-4"
        onSubmit={(e) => { e.preventDefault(); save(() => createKeyAction(name), "Key created", (d) => { setFresh(d.key); setName(""); setCopied(false); }); }}>
        <div className="flex-1 space-y-1">
          <Label htmlFor="key-name">Name the new key (who will use it)</Label>
          <Input id="key-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. CIC org dashboard" className="h-10" />
        </div>
        <Button type="submit" disabled={pending || !name.trim()}>Create key</Button>
      </form>
      <SaveMessage message={message} />

      {fresh && (
        <div role="status" className="space-y-3 rounded-xl border-2 border-amber-600 bg-amber-50 p-4 text-amber-950">
          <p className="font-semibold">Copy this key now. You won&apos;t see it again.</p>
          <p className="text-sm">We only keep a scrambled version. If it&apos;s lost, revoke it and create a new one. Keep it out of email and chat; put it straight into your dashboard&apos;s settings.</p>
          <div className="flex flex-wrap items-center gap-2">
            <code className="rounded bg-white px-3 py-2 font-mono text-sm break-all">{fresh}</code>
            <Button variant="outline" onClick={async () => { await navigator.clipboard.writeText(fresh); setCopied(true); }}>{copied ? "✓ Copied" : "Copy key"}</Button>
            <Button variant="ghost" onClick={() => setFresh(null)}>I saved it, hide it</Button>
          </div>
        </div>
      )}

      <div className="overflow-x-auto rounded-2xl border">
        <table className="w-full min-w-[36rem] text-left text-sm">
          <caption className="sr-only">API keys</caption>
          <thead className="border-b bg-muted/50"><tr>{["Name", "Created", "Last used", "Status", ""].map((h, i) => <th key={i} scope="col" className="p-3 font-medium">{h}</th>)}</tr></thead>
          <tbody>
            {keys.map((k) => (
              <tr key={k.id} className="border-b last:border-0">
                <th scope="row" className="p-3 font-medium">{k.name}</th>
                <td className="p-3">{fmt(k.created_at)}</td>
                <td className="p-3">{fmt(k.last_used_at)}</td>
                <td className="p-3">{k.revoked_at ? <span className="text-zinc-600">✕ Revoked</span> : <span className="text-green-800">✓ Active</span>}</td>
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
