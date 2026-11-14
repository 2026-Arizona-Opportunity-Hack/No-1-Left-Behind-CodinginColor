import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";

// Placeholder home page. Real screens follow the Claude Design prototype.
export default function Home() {
  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col justify-center gap-8 px-6 py-16">
      <div className="space-y-3">
        <p className="text-sm font-medium text-muted-foreground">Coding in Color</p>
        <h1 className="text-4xl font-semibold tracking-tight">CIC Launchpad</h1>
        <p className="text-lg text-muted-foreground">
          Learn to code at your own pace. Your teacher can see when you need a hand.
        </p>
      </div>
      <div className="flex flex-col gap-3 sm:flex-row">
        <Link href="/join" className={buttonVariants({ size: "lg" })}>
          I&apos;m a student: join my class
        </Link>
        <Link href="/login" className={buttonVariants({ size: "lg", variant: "outline" })}>
          I&apos;m a teacher or CIC staff
        </Link>
      </div>
    </main>
  );
}
