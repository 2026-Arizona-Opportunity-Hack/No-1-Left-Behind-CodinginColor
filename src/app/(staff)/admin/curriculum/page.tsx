import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { buttonVariants } from "@/components/ui/button";
import { requirePermission } from "@/server/auth";
import { listModules } from "@/server/curriculum";
import { ModuleList } from "./module-list";

// Live, per-user data: navigations wait for it rather than showing a prerendered shell.
export const instant = false;

export const metadata: Metadata = { title: "Edit curriculum · CIC Launchpad" };

export default async function CurriculumEditorPage() {
  await connection(); // per-user, live data: render at request time
  await requirePermission("curriculum.write", "/admin/curriculum");
  const modules = await listModules();
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
      <div>
        <h1 className="text-4xl font-bold tracking-tight">Edit curriculum</h1>
        <p className="text-muted-foreground">Students go through units in this order. They only see the units and lessons you choose to show them.</p>
      </div>
      <Link href="/admin/curriculum/import" className={buttonVariants({ size: "lg" })}>Add curriculum from slides or video</Link>
      </div>
      {modules.ok ? <ModuleList modules={modules.data} /> : <p role="alert">{modules.error}</p>}
    </div>
  );
}
