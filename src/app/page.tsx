import Link from "next/link";
import { Logo } from "@/components/logo";

export default function Home() {
  return (
    <div className="relative flex flex-1 flex-col overflow-hidden">
      <span aria-hidden="true" className="pointer-events-none absolute -bottom-40 -left-10 font-mono text-[620px] leading-none font-extrabold text-[#E0F1E5] select-none">&lt;</span>
      <header className="relative px-6 py-7 sm:px-14"><Logo byline /></header>
      <main className="relative mx-auto grid w-full max-w-6xl flex-1 items-center gap-12 px-6 pb-16 sm:px-14 lg:grid-cols-[1fr_500px]">
        <div>
          <h1 className="text-5xl leading-none font-bold tracking-tight sm:text-7xl lg:text-[84px]">Learn to code at your own pace</h1>
          <p className="mt-7 max-w-md text-xl text-muted-foreground">Free Python lessons for high school students, from Coding in Color in Phoenix.</p>
        </div>
        <div className="flex flex-col gap-5">
          <Link href="/join" className="flex items-center justify-between gap-5 rounded-[28px] bg-primary px-9 py-10 text-primary-foreground no-underline hover:bg-[#047D13]">
            <span><span className="block text-lg">I&apos;m a student</span><span className="mt-1 block text-4xl leading-tight font-semibold">Join my class</span></span>
            <span aria-hidden="true" className="font-mono text-5xl font-extrabold">&gt;</span>
          </Link>
          <Link href="/login" className="flex items-center justify-between gap-5 rounded-[28px] border-2 border-primary bg-card px-9 py-7 text-foreground no-underline hover:bg-secondary">
            <span className="text-2xl font-semibold">I&apos;m a teacher or CIC staff</span>
            <span aria-hidden="true" className="font-mono text-3xl font-extrabold">&gt;</span>
          </Link>
          <Link href="/try" className="px-2 text-base">Just want to try Python? Open the playground</Link>
        </div>
      </main>
    </div>
  );
}
