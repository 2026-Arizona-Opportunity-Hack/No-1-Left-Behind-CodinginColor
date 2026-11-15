import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { requireStaff } from "@/server/auth";
import { getModuleTree } from "@/server/curriculum";
import { ModuleEditor } from "./module-editor";

export const metadata: Metadata = { title: "Edit unit · CIC Launchpad" };

export default async function ModulePage({ params }: { params: Promise<{ moduleId: string }> }) {
  await connection(); // per-user, live data: render at request time
  const { moduleId } = await params;
  await requireStaff(["admin"], `/admin/curriculum/${moduleId}`);
  const tree = await getModuleTree(moduleId);
  if (!tree.ok) return <div className="space-y-2"><p role="alert">{tree.error}</p><Link href="/admin/curriculum" className="underline">All units</Link></div>;
  return <ModuleEditor key={tree.data.updated_at} module={tree.data} />;
}
