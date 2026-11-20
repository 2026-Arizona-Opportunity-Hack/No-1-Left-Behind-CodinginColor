import Link from "next/link";
import { Logo } from "@/components/logo";

// Static page: no animation, no heavy images, so it loads fast on school Wi-Fi and slow laptops.
const WRAP = "mx-auto w-full max-w-[1104px] px-5 sm:px-6";
const CHEVRON = "flex size-7 items-center justify-center rounded-full bg-[#A8E6B8] font-mono text-base font-bold text-primary";

const BLK = "flex size-8 items-center justify-center rounded-[9px] border-2 border-primary font-mono text-base font-bold";
const STEPS = [
  { n: "1", title: "Join with your code", text: "Your teacher gives you a class code and a personal code. No email, no password.",
    visual: (
      <div className="rounded-xl border-2 border-dashed border-primary bg-white px-3.5 py-3 text-[15px]">
        <b>Your name</b>
        <div className="mt-1.5 flex justify-between gap-2.5 font-mono text-[15px]">
          <span><small className="block font-sans text-xs text-muted-foreground">Class code</small>MARY-P3</span>
          <span><small className="block font-sans text-xs text-muted-foreground">Personal code</small>7KQ2MX</span>
        </div>
      </div>) },
  { n: "2", title: "Learn step by step", text: "Videos, quick questions and code you can run. Stuck? Ask for a hint.",
    visual: (
      <>
        <div role="img" aria-label="3 of 6 lessons done" className="flex flex-wrap gap-1.5">
          {["bg-[#0DB031]", "bg-[#0DB031]", "bg-[#0DB031]", "bg-[#FFD75E]", "border-dashed bg-transparent text-muted-foreground", "border-dashed bg-transparent text-muted-foreground"].map((c, i) => <span key={i} aria-hidden="true" className={`${BLK} ${c}`}>&gt;</span>)}
        </div>
        <p className="mt-3"><span className="inline-flex min-h-8 items-center rounded-lg bg-[#CDEBD5] px-3 text-base font-bold">Hint 1</span> <span className="text-base text-muted-foreground">Look at the colon.</span></p>
      </>) },
  { n: "3", title: "See how much you grew", text: "A quiz before and after each unit shows your progress.",
    visual: (
      <>
        <div aria-hidden="true" className="relative mx-2 mt-5 mb-2.5 h-3.5 rounded-full border border-border bg-secondary">
          <span className="absolute inset-y-0 left-[38%] w-[37%] rounded-full bg-[#7FD493]" />
          <i className="absolute -top-1 left-[calc(38%-10px)] size-5 rounded-full border-[3px] border-primary bg-white" />
          <i className="absolute -top-1 left-[calc(75%-10px)] size-5 rounded-full border-[3px] border-primary bg-primary" />
        </div>
        <p className="text-base font-bold">Before 38% &rarr; After 75%</p>
      </>) },
];

export default function Home() {
  return (
    <div className="flex flex-1 flex-col">
      <header className={`${WRAP} flex min-h-24 flex-wrap items-center justify-between gap-4 py-3`}>
        <Logo size="lg" byline />
        <nav aria-label="Main" className="flex flex-wrap items-center gap-1.5">
          <a href="#how" className="inline-flex min-h-11 items-center rounded-[10px] px-3.5 font-medium text-foreground no-underline hover:bg-secondary">How it works</a>
          <Link href="/login" className="inline-flex min-h-11 items-center rounded-[10px] px-3.5 font-medium text-foreground no-underline hover:bg-secondary">For teachers</Link>
          <a href="https://www.codingincolor.net" className="inline-flex min-h-11 items-center rounded-[10px] px-3.5 font-medium text-foreground no-underline hover:bg-secondary">About</a>
          <Link href="/login" className="inline-flex h-11 items-center rounded-[10px] border-2 border-primary bg-card px-[18px] font-bold text-foreground no-underline hover:bg-secondary">Sign in</Link>
        </nav>
      </header>

      <main id="main" className="flex-1">
        <section aria-labelledby="hero" className={`${WRAP} grid items-center gap-10 pt-8 pb-14 lg:grid-cols-[1.25fr_1fr]`}>
          <div>
            <span className="inline-flex min-h-8 items-center gap-1.5 rounded-lg bg-[#D6F2DE] px-3 text-base font-bold text-primary"><span aria-hidden="true" className="font-mono">&gt;_</span> Free Python for high school students</span>
            <h1 id="hero" className="mt-5 mb-5 text-5xl leading-[1.02] font-bold tracking-tighter sm:text-[60px]">
              Learn to code at your own pace
            </h1>
            <p className="max-w-xl text-xl text-muted-foreground">Short videos, quick questions and a code editor in your browser. Free lessons from Coding in Color.</p>
            <div className="mt-7 mb-4 flex flex-wrap gap-3">
              <Link href="/join" className="inline-flex min-h-[60px] items-center justify-center gap-2.5 rounded-xl border-2 border-primary bg-primary px-4 text-[17px] font-bold text-primary-foreground no-underline hover:bg-[#047D13]">
                I&apos;m a student: join my class <span aria-hidden="true" className={`${CHEVRON} size-8`}>&gt;</span>
              </Link>
              <Link href="/login" className="inline-flex min-h-[60px] items-center justify-center rounded-xl border-2 border-primary bg-card px-4 text-[17px] font-bold text-foreground no-underline hover:bg-secondary">I&apos;m a teacher or CIC staff</Link>
            </div>
            <p><Link href="/try" className="font-medium">Just want to try Python? Open the playground</Link></p>
          </div>

          {/* A picture of a lesson, drawn with plain HTML (no image to download). */}
          <div role="img" aria-label="Preview of a Launchpad lesson in a code editor: Python code, a Run button, the output You can drive, and a result that says 2 of 3 checks passed."
            className="relative min-h-[420px] overflow-hidden rounded-[20px] bg-primary p-7">
            <span aria-hidden="true" className="pointer-events-none absolute -top-16 -right-10 font-mono text-[380px] leading-none font-bold text-[#10492A] select-none">&gt;</span>
            <div aria-hidden="true" className="relative overflow-hidden rounded-xl border border-[#2C5A3F] bg-[#0F2E1C] font-mono">
              <div className="flex items-center gap-2 bg-[#16422A] px-3.5 py-2.5">
                <i className="size-3 rounded-full bg-[#FF5F57]" /><i className="size-3 rounded-full bg-[#FEBC2E]" /><i className="size-3 rounded-full bg-[#28C840]" />
                <span className="mx-auto font-sans text-sm text-[#C9E3D1]">Launchpad · If statements</span>
              </div>
              <div className="flex items-end gap-0.5 border-t border-[#1F5236] bg-[#16422A] px-2.5">
                <b className="rounded-t-lg bg-[#0F2E1C] px-3.5 py-2 text-sm font-medium text-white">if_statements.py</b>
                <b className="px-3.5 py-2 text-sm font-medium text-[#9DB8A5]">variables.py</b>
                <em className="my-1 ml-auto rounded-lg bg-[#FFD75E] px-3.5 py-1 font-sans text-sm font-bold text-primary not-italic">Run &gt;</em>
              </div>
              <div className="grid grid-cols-[44px_1fr] text-[17px] leading-[1.85]">
                <div className="bg-[#0C2618] py-3 pr-2.5 text-right text-[#6F8F7A]">1<br />2<br />3<br />4</div>
                <pre className="m-0 overflow-hidden px-4 py-3 text-[#E6F4EA]"><span className="text-[#8FAE9A] italic"># Can this person drive?</span>{"\n"}<span className="text-[#B8C7FF]">age</span> = <span className="text-[#FFB86B]">16</span>{"\n"}<span className="-mx-4 block border-l-[3px] border-[#0DB031] bg-[#16422A] px-4"><span className="text-[#FFD75E]">if</span> <span className="text-[#B8C7FF]">age</span> &gt;= <span className="text-[#FFB86B]">16</span>:</span>{"    "}<span className="text-[#7FDBFF]">print</span>(<span className="text-[#9BE3AE]">&quot;You can drive!&quot;</span>)</pre>
              </div>
              <div className="border-t border-[#2C5A3F] bg-[#0C2618] px-4 py-2.5">
                <h4 className="mb-1 flex items-center gap-2 font-sans text-xs font-bold tracking-wider text-[#9DB8A5] uppercase"><span className="size-2 rounded-full bg-[#0DB031]" />Output</h4>
                <p className="text-[17px] text-[#E6F4EA]"><span className="text-[#0DB031]">&gt;</span> You can drive!</p>
              </div>
              <div className="flex justify-between gap-2.5 bg-[#A8E6B8] px-3.5 py-1.5 font-sans text-sm font-bold text-primary"><span>Python 3</span><span>Ln 3, Col 31</span></div>
            </div>
            <div aria-hidden="true" className="relative mt-3 flex flex-wrap gap-2 text-[15px] font-bold">
              <span className="inline-flex min-h-[34px] items-center gap-1.5 rounded-lg bg-[#D6F2DE] px-3 text-primary">✓ Prints a message</span>
              <span className="inline-flex min-h-[34px] items-center gap-1.5 rounded-lg bg-[#D6F2DE] px-3 text-primary">✓ Uses if</span>
              <span className="inline-flex min-h-[34px] items-center gap-1.5 rounded-lg bg-[#FFEBD2] px-3 text-behind-ink">✗ Tests 15 too</span>
              <span className="inline-flex min-h-8 items-center rounded-lg bg-white px-3 text-primary">2 of 3 checks passed</span>
            </div>
          </div>
        </section>

        <section id="how" aria-labelledby="how-h" className={`${WRAP} pt-6 pb-14`}>
          <h2 id="how-h" className="flex items-center gap-3 text-[40px] font-bold tracking-tight">
            <span aria-hidden="true" className="font-mono font-bold text-[#047D13]">&lt;</span> How it works <span aria-hidden="true" className="font-mono font-bold text-[#047D13]">&gt;</span>
          </h2>
          <p className="mt-2 mb-7 text-xl text-muted-foreground">Three steps, at your own speed.</p>
          <ol className="grid list-none gap-6 p-0 md:grid-cols-3">
            {STEPS.map((s) => (
              <li key={s.n} className="rounded-2xl border border-border bg-card p-6">
                <span aria-hidden="true" className="mb-3.5 flex size-[52px] items-center justify-center rounded-full border-2 border-primary bg-[#D6F2DE] text-2xl font-bold">{s.n}</span>
                <h3 className="mb-1.5 text-[26px] font-bold">{s.title}</h3>
                <p className="text-muted-foreground">{s.text}</p>
                <div className="mt-[18px] min-h-28 rounded-xl bg-background p-4">{s.visual}</div>
              </li>
            ))}
          </ol>
        </section>

        <section aria-label="About Coding in Color" className={`${WRAP} pb-14`}>
          <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl bg-secondary p-6">
            <p><span aria-hidden="true" className="font-mono font-bold">&lt;/&gt;</span> <b>Made by Coding in Color</b>, a Phoenix, Arizona nonprofit teaching computer science to students whose schools don&apos;t offer it.</p>
            <a href="https://www.codingincolor.net" className="inline-flex h-11 items-center gap-2 rounded-[10px] border-2 border-primary bg-card px-[18px] font-bold text-foreground no-underline hover:bg-secondary">About Coding in Color <span aria-hidden="true" className="font-mono">&gt;</span></a>
          </div>
        </section>
      </main>

      <footer className="border-t-2 border-[#CFE3D6] bg-card">
        <div className={`${WRAP} flex flex-wrap justify-between gap-6 py-8`}>
          <div>
            <Logo />
            <p className="mt-1.5 text-muted-foreground"><span aria-hidden="true" className="font-mono font-bold">&lt;/&gt;</span> Coding in Color, Phoenix, Arizona</p>
          </div>
          <nav aria-label="Footer" className="flex flex-wrap items-start gap-x-6">
            <Link href="/join" className="inline-flex min-h-11 items-center font-medium">Join my class</Link>
            <Link href="/login" className="inline-flex min-h-11 items-center font-medium">Teacher or staff sign in</Link>
            <Link href="/try" className="inline-flex min-h-11 items-center font-medium">Python playground</Link>
            <a href="https://www.codingincolor.net" className="inline-flex min-h-11 items-center font-medium">codingincolor.net</a>
          </nav>
        </div>
      </footer>
    </div>
  );
}
