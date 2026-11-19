import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { requirePermission } from "@/server/auth";
import { getAssessment, getModuleTree } from "@/server/curriculum";
import { ModuleEditor } from "./module-editor";

// Live, per-user data: navigations wait for it rather than showing a prerendered shell.
export const instant = false;

export const metadata: Metadata = { title: "Edit unit · CIC Launchpad" };

export default async function ModulePage({ params }: { params: Promise<{ moduleId: string }> }) {
  await connection(); // per-user, live data: render at request time
  const { moduleId } = await params;
  await requirePermission("curriculum.write", `/admin/curriculum/${moduleId}`);
  const tree = await getModuleTree(moduleId);
  if (!tree.ok) return <div className="space-y-2"><p role="alert">{tree.error}</p><Link href="/admin/curriculum" className="underline">All units</Link></div>;
  const [pre,post]=await Promise.all([getAssessment(moduleId,"pre"),getAssessment(moduleId,"post")]);
  const quizzes=[{kind:"Pre-test",result:pre},{kind:"Post-test",result:post}];
  return <div className="space-y-4"><div className="flex flex-wrap gap-3">{quizzes.map(({kind,result}) => <p key={kind} className="rounded-lg bg-behind px-4 py-2 text-base text-behind-ink">{kind}: {result.ok ? `${result.data.questions.length} questions · ${result.data.reviewed ? "reviewed" : "review and save before publishing"}` : result.error}</p>)}</div><ModuleEditor key={tree.data.updated_at} module={tree.data} /></div>;
}
