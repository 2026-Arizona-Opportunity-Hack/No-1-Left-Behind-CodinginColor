import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { aiConfigured } from "@/server/ai";
import { requireStaff } from "@/server/auth";
import { ImportForm } from "./import-form";

// Live, per-user data: navigations wait for it rather than showing a prerendered shell.
export const instant = false;
// Reading captions and drafting with AI can take up to a minute.
export const maxDuration = 60;

export const metadata: Metadata = { title: "Import a lesson · CIC Launchpad" };

export default async function ImportPage() {
  await connection(); // per-user, live data: render at request time
  await requireStaff(["admin"], "/admin/curriculum/import");
  const { data } = await (await createClient()).from("modules").select("id, title").order("position");
  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <Link href="/admin/curriculum" className="inline-block text-base text-foreground no-underline"><span aria-hidden="true" className="font-mono font-extrabold text-[#0DB031]">&lt;</span> All units</Link>
      <div>
        <h1 className="text-4xl font-bold tracking-tight">Make a lesson</h1>
        <p className="mt-2 text-muted-foreground">Upload your slides or paste a YouTube link, and we&apos;ll draft a full lesson from it. You check everything before students see it.</p>
      </div>
      <ImportForm units={data ?? []} aiOn={aiConfigured()} />
    </div>
  );
}
