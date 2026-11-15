import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { requireStaff } from "@/server/auth";
import { getAssessment, getModuleTree } from "@/server/curriculum";
import { TestEditor } from "./test-editor";

// Live, per-user data: navigations wait for it rather than showing a prerendered shell.
export const instant = false;

export const metadata: Metadata = { title: "Edit test · CIC Launchpad" };

export default async function TestPage({ params }: { params: Promise<{ moduleId: string; kind: string }> }) {
  await connection(); // per-user, live data: render at request time
  const { moduleId, kind } = await params;
  if (kind !== "pre" && kind !== "post") notFound();
  await requireStaff(["admin"], `/admin/curriculum/${moduleId}/test/${kind}`);
  const [unit, test] = await Promise.all([getModuleTree(moduleId), getAssessment(moduleId, kind)]);
  if (!unit.ok || !test.ok) return <p role="alert">{!unit.ok ? unit.error : !test.ok ? test.error : ""}</p>;
  return <TestEditor moduleId={moduleId} unitTitle={unit.data.title} kind={kind} questions={test.data.questions} />;
}
