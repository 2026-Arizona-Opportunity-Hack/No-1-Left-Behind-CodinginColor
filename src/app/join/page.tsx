import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { redirect } from "next/navigation";
import { normalizeClassCode } from "@/lib/join-codes";
import { getStudent } from "@/server/student-session";
import { JoinForm } from "./join-form";

export const metadata: Metadata = { title: "Join your class · CIC Launchpad" };

type Props = { searchParams: Promise<{ class?: string }> };

// The shareable class link is /join?class=MARY-P3: the class code is filled in for them.
export default function JoinPage({ searchParams }: Props) {
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center gap-6 px-4 py-12">
      <div className="space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight">Join your class</h1>
        <p className="text-lg text-muted-foreground">Type the two codes from your card. No email or password needed.</p>
      </div>
      <Suspense fallback={<p role="status" className="text-muted-foreground">Loading…</p>}>
        <JoinArea searchParams={searchParams} />
      </Suspense>
      <p className="text-sm text-muted-foreground">
        Teacher or CIC staff? <Link href="/login" className="font-medium text-foreground underline underline-offset-4">Sign in here</Link>.
      </p>
    </main>
  );
}

async function JoinArea({ searchParams }: Props) {
  if (await getStudent()) redirect("/learn");
  const code = (await searchParams).class;
  return <JoinForm classCode={typeof code === "string" ? normalizeClassCode(code).slice(0, 20) : ""} />;
}
