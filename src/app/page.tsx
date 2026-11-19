import Link from "next/link";
import { Logo } from "@/components/logo";

// Static page: no animation, no heavy images, so it loads fast on school Wi-Fi and slow laptops.
const WRAP = "mx-auto w-full max-w-6xl px-6 sm:px-14";

const STEPS = [
  { n: "1", title: "Join with your code", text: "Your teacher gives you a class code and a personal code. No email and no password.", tone: "bg-sky text-sky-ink" },
  { n: "2", title: "Learn step by step", text: "Short videos, quick questions and a code editor right in your browser. Stuck? Ask for a hint.", tone: "bg-lilac text-lilac-ink" },
  { n: "3", title: "See how much you grew", text: "A warm-up quiz before and a final quiz after show your progress, topic by topic.", tone: "bg-sun text-sun-ink" },
];

export default function Home() {
  return (
    <div className="relative flex flex-1 flex-col overflow-hidden">
      <span aria-hidden="true" className="pointer-events-none absolute -bottom-40 -left-10 font-mono text-[620px] leading-none font-extrabold text-[#E0F1E5] select-none">&lt;</span>
      <header className={`relative ${WRAP} py-8`}><Logo size="lg" byline /></header>

      <main className="relative flex-1">
        <section aria-labelledby="hero" className={`${WRAP} grid items-center gap-12 pt-6 pb-20 lg:grid-cols-[1fr_500px]`}>
          <div>
            <h1 id="hero" className="text-5xl leading-none font-bold tracking-tight sm:text-7xl lg:text-[84px]">Learn to code at your own pace</h1>
            <p className="mt-7 max-w-lg text-2xl text-muted-foreground">Free Python lessons for high school students, from Coding in Color in Phoenix.</p>
          </div>
          <div className="flex flex-col gap-5">
            <Link href="/join" className="flex items-center justify-between gap-5 rounded-[28px] bg-primary px-9 py-10 text-primary-foreground no-underline hover:bg-[#047D13]">
              <span><span className="block text-xl">I&apos;m a student</span><span className="mt-1 block text-4xl leading-tight font-semibold">Join my class</span></span>
              <span aria-hidden="true" className="font-mono text-5xl font-extrabold">&gt;</span>
            </Link>
            <Link href="/login" className="flex items-center justify-between gap-5 rounded-[28px] border-2 border-primary bg-card px-9 py-7 text-foreground no-underline hover:bg-secondary">
              <span className="text-2xl font-semibold">I&apos;m a teacher or CIC staff</span>
              <span aria-hidden="true" className="font-mono text-3xl font-extrabold">&gt;</span>
            </Link>
            <Link href="/try" className="px-2 text-xl">Just want to try Python? Open the playground</Link>
          </div>
        </section>

        <section aria-labelledby="how" className={`${WRAP} pb-24`}>
          <h2 id="how" className="flex items-center gap-3 text-4xl font-bold tracking-tight">
            <span aria-hidden="true" className="font-mono font-extrabold text-[#0DB031]">&lt;</span>How it works<span aria-hidden="true" className="font-mono font-extrabold text-[#0DB031]">&gt;</span>
          </h2>
          <ol className="mt-8 grid list-none gap-5 p-0 md:grid-cols-3">
            {STEPS.map((s) => (
              <li key={s.n} className="flex flex-col gap-3 rounded-[28px] bg-card p-8">
                <span aria-hidden="true" className={`flex size-14 items-center justify-center rounded-full font-mono text-2xl font-extrabold ${s.tone}`}>{s.n}</span>
                <h3 className="text-2xl font-semibold">{s.title}</h3>
                <p className="text-lg text-muted-foreground">{s.text}</p>
              </li>
            ))}
          </ol>
        </section>
      </main>

      <footer className="relative border-t-2 border-[#CFE3D6] bg-card">
        <div className={`${WRAP} flex flex-wrap items-center justify-between gap-4 py-8 text-lg`}>
          <p><span aria-hidden="true" className="font-mono font-extrabold text-[#0DB031]">&lt;/&gt; </span>Coding in Color, Phoenix, Arizona</p>
          <nav aria-label="Footer" className="flex flex-wrap gap-x-6 gap-y-2">
            <Link href="/join">Join my class</Link>
            <Link href="/login">Teacher or staff sign in</Link>
            <Link href="/try">Python playground</Link>
          </nav>
        </div>
      </footer>
    </div>
  );
}
