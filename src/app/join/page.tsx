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
      <header className="mx-auto w-full max-w-[1104px] px-5 sm:px-6 py-7"><Logo /></header>
      <main className="mx-auto grid w-full max-w-[1104px] flex-1 items-center gap-12 px-5 sm:px-6 pb-16 lg:grid-cols-[1fr_540px]">
        <div>
          <span className="inline-flex min-h-8 items-center gap-1.5 rounded-lg bg-sky px-3 text-base font-bold text-sky-ink"><span aria-hidden="true" className="font-mono">&gt;_</span> For students</span>
          <h1 className="mt-4 text-5xl leading-tight font-bold tracking-tight sm:text-[56px]">Join your class</h1>
          <p className="mt-5 max-w-sm text-xl text-muted-foreground">Both codes are on the card your teacher gave you. No email, no password.</p>
          <div role="img" aria-label="Example join card with a class code and a personal code" className="mt-7 hidden w-full max-w-[420px] rounded-xl border-2 border-dashed border-primary bg-card px-5 py-[18px] sm:block">
            <p className="font-semibold">Your name</p>
            <p className="mt-3 flex justify-between text-base text-muted-foreground"><span>Class code</span><span>Your personal code</span></p>
            <p className="flex justify-between font-mono text-xl font-bold"><span>MARY-P3</span><span>7KQ2MX</span></p>
          </div>
          <p aria-hidden="true" className="mt-2.5 hidden items-center gap-2 font-bold text-[#047D13] sm:flex"><span className="font-mono">&uarr;</span> This is what your card looks like.</p>
        </div>
        <div className="rounded-[20px] border-2 border-primary bg-card p-8 sm:p-9">
          <Suspense fallback={<p role="status" className="text-muted-foreground">Loading…</p>}>
            <JoinArea searchParams={searchParams} />
          </Suspense>
          <p className="mt-6 text-center text-base text-muted-foreground">
            Lost your card? Ask your teacher to print a new one. Teacher or CIC staff? <Link href="/login">Sign in here</Link>.
          </p>
          <p className="mt-4 rounded-xl bg-secondary p-4 text-center text-base"><span aria-hidden="true" className="font-mono font-bold">&gt;_</span> <b>Just trying it out?</b> Use class code <b className="font-mono">DEMO</b> and personal code <b className="font-mono">TRYIT</b>. You get your own copy to play with.</p>
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
