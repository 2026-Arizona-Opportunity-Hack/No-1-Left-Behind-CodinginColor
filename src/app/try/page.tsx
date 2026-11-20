import type { Metadata } from "next";
import Link from "next/link";
import { Logo } from "@/components/logo";
import { Playground } from "./playground";

export const metadata: Metadata = {
  title: "Try Python · CIC Launchpad",
  description: "Write and run Python in your browser. No account needed.",
};

export default function TryPage() {
  return (
    <div className="flex flex-1 flex-col">
      <header className="mx-auto w-full max-w-[1104px] px-5 sm:px-6 py-6"><Logo /></header>
      <main className="mx-auto w-full max-w-[1104px] flex-1 px-5 sm:px-6 pb-12">
        <span className="inline-flex min-h-8 items-center gap-1.5 rounded-lg bg-sky px-3 text-base font-bold text-sky-ink"><span aria-hidden="true" className="font-mono">&gt;_</span> No account needed</span>
        <h1 className="mt-3 text-[52px] leading-tight font-bold tracking-tight">Try Python</h1>
        <p className="mt-2 text-lg text-muted-foreground">
          Write code, press Run, and see what it prints. Nothing is saved and no account is needed.
        </p>
        <Playground />
        <section aria-labelledby="try-things" className="mt-8 rounded-[20px] border border-border bg-card p-6">
          <h2 id="try-things" className="mb-2 text-[22px] font-bold">Things to try</h2>
          <ul className="list-disc space-y-1 pl-5 leading-8">
            <li>Change the numbers in <span className="font-mono font-bold">range(1, 5)</span> and press Run.</li>
            <li>Press <b>Check my code</b> to see which checks pass.</li>
            <li>Add a line that prints your favorite number.</li>
          </ul>
        </section>
        <div className="mt-8 flex flex-wrap items-center justify-between gap-4 rounded-[20px] bg-secondary p-6">
          <p><b>Want the full course?</b> Join your class to save your progress and get hints.</p>
          <Link href="/join" className="inline-flex h-12 items-center gap-2.5 rounded-[10px] border-2 border-primary bg-primary px-6 text-lg font-bold text-primary-foreground no-underline hover:bg-[#047D13]">Join my class <span aria-hidden="true" className="flex size-7 items-center justify-center rounded-full bg-[#A8E6B8] font-mono text-base text-primary">&gt;</span></Link>
        </div>
      </main>
    </div>
  );
}
