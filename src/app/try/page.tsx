import type { Metadata } from "next";
import { Logo } from "@/components/logo";
import { Playground } from "./playground";

export const metadata: Metadata = {
  title: "Try Python · CIC Launchpad",
  description: "Write and run Python in your browser. No account needed.",
};

export default function TryPage() {
  return (
    <div className="flex flex-1 flex-col">
      <header className="px-6 py-5 sm:px-12"><Logo /></header>
      <main className="mx-auto w-full max-w-6xl flex-1 px-6 pb-12 sm:px-12">
        <h1 className="text-5xl font-bold tracking-tight">Try Python</h1>
        <p className="mt-2 text-lg text-muted-foreground">
          Write code, press Run, and see what it prints. Nothing is saved and no account is needed.
        </p>
        <Playground />
      </main>
    </div>
  );
}
