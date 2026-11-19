import Link from "next/link";

/** The < IN > Launchpad mark from the design system. "lg" is for the landing page. */
export function Logo({ href = "/", byline = false, size = "md" }: { href?: string; byline?: boolean; size?: "md" | "lg" }) {
  const text = size === "lg" ? "text-4xl sm:text-5xl" : "text-3xl";
  return (
    <Link href={href} className={`flex items-center gap-3 font-bold text-foreground no-underline ${text}`}>
      <span aria-hidden="true" className="flex gap-1.5 font-mono font-extrabold">
        <span className="text-[#0DB031]">&lt;</span>IN<span className="text-[#0DB031]">&gt;</span>
      </span>
      Launchpad
      {byline && <span className="ml-1 hidden text-lg font-normal text-muted-foreground sm:inline">by Coding in Color</span>}
    </Link>
  );
}
