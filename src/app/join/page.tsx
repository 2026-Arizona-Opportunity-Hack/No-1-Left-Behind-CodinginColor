import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { redirect } from "next/navigation";
import { Logo } from "@/components/logo";
import { normalizeClassCode } from "@/lib/join-codes";
import { getStudent } from "@/server/student-session";
import { JoinForm } from "./join-form";

export const metadata: Metadata = { title: "Join your class · CIC Launchpad" };

type Props = { searchParams: Promise<{ class?: string }> };

// The shareable class link is /join?class=MARY-P3: the class code is filled in for them.
export default function JoinPage({ searchParams }: Props) {
  return (
    <div className="flex flex-1 flex-col">
      <header className="px-6 py-7 sm:px-14"><Logo /></header>
      <main className="mx-auto grid w-full max-w-6xl flex-1 items-center gap-12 px-6 pb-16 sm:px-14 lg:grid-cols-[1fr_540px]">
        <div>
          <h1 className="text-5xl leading-tight font-bold tracking-tight sm:text-6xl">Join your class</h1>
          <p className="mt-5 max-w-sm text-xl text-muted-foreground">Both codes are on the card your teacher gave you. No email, no password.</p>
          <div aria-hidden="true" className="mt-11 hidden w-80 -rotate-3 rounded-2xl border-2 border-dashed border-primary bg-card px-6 py-5 sm:block">
            <p className="font-semibold">Your name</p>
            <p className="mt-3 flex justify-between text-sm text-muted-foreground"><span>Class code</span><span>Your personal code</span></p>
            <p className="flex justify-between font-mono text-xl font-bold"><span>MARY-P3</span><span>K7Q2MX</span></p>
          </div>
        </div>
        <div className="rounded-[28px] bg-card p-8 sm:p-11">
          <Suspense fallback={<p role="status" className="text-muted-foreground">Loading…</p>}>
            <JoinArea searchParams={searchParams} />
          </Suspense>
          <p className="mt-6 text-center text-base text-muted-foreground">
            Lost your card? Ask your teacher to print a new one. Teacher or CIC staff? <Link href="/login">Sign in here</Link>.
          </p>
        </div>
      </main>
    </div>
  );
}

async function JoinArea({ searchParams }: Props) {
  if (await getStudent()) redirect("/learn");
  const code = (await searchParams).class;
  return <JoinForm classCode={typeof code === "string" ? normalizeClassCode(code).slice(0, 20) : ""} />;
}
