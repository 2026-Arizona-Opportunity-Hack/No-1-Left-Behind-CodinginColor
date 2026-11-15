import Link from "next/link";

/** The < IN > Launchpad mark from the design system. */
export function Logo({ href = "/", byline = false }: { href?: string; byline?: boolean }) {
  return (
    <Link href={href} className="flex items-center gap-2 text-xl font-bold text-foreground no-underline">
      <span aria-hidden="true" className="flex gap-1 font-mono font-extrabold">
        <span className="text-[#0DB031]">&lt;</span>IN<span className="text-[#0DB031]">&gt;</span>
      </span>
      Launchpad
      {byline && <span className="ml-1 text-base font-normal text-muted-foreground">by Coding in Color</span>}
    </Link>
  );
}
