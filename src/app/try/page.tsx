import type { Metadata } from "next";
import { Playground } from "./playground";

export const metadata: Metadata = {
  title: "Try Python · CIC Launchpad",
  description: "Write and run Python in your browser. No account needed.",
};

export default function TryPage() {
  return (
    <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6">
      <h1 className="text-3xl font-semibold tracking-tight">Try Python</h1>
      <p className="mt-2 text-muted-foreground">
        Write code, press Run, and see what it prints. Nothing is saved and no account is needed.
      </p>
      <Playground />
    </main>
  );
}
