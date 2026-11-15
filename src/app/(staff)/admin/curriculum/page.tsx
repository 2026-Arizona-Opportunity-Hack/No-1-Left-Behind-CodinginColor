import type { Metadata } from "next";
import { connection } from "next/server";
import { requireStaff } from "@/server/auth";
import { listModules } from "@/server/curriculum";
import { ModuleList } from "./module-list";

export const metadata: Metadata = { title: "Edit curriculum · CIC Launchpad" };

export default async function CurriculumEditorPage() {
  await requireStaff(["admin"], "/admin/curriculum");
  await connection();
  const modules = await listModules();
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">Edit curriculum</h1>
        <p className="text-muted-foreground">Units unlock for students in this order. Students only see published units and lessons.</p>
      </div>
      {modules.ok ? <ModuleList modules={modules.data} /> : <p role="alert">{modules.error}</p>}
    </div>
  );
}
