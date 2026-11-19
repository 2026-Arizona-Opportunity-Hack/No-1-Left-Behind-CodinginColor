"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

/** Main navigation. The page you are on gets a dark pill and a ">" marker, and is announced as the current page. */
export function StaffNav({ items }: { items: { href: string; label: string }[] }) {
  const path = usePathname();
  // The most specific link wins, so "Curriculum" stays marked on a lesson page but "Home" does not.
  const current = items
    .filter((i) => path === i.href || path.startsWith(`${i.href}/`))
    .sort((a, b) => b.href.length - a.href.length)[0]?.href;
  return (
    <nav aria-label="Main" className="-ml-4 flex flex-wrap gap-2">
      {items.map((item) => {
        const here = item.href === current;
        return (
          <Link key={item.href} href={item.href} aria-current={here ? "page" : undefined}
            className={`inline-flex min-h-11 items-center gap-1.5 rounded-[10px] px-[18px] py-2 text-lg font-bold whitespace-nowrap no-underline ${here ? "bg-primary text-primary-foreground" : "text-foreground hover:bg-card"}`}>
            {here && <span aria-hidden="true" className="font-mono font-extrabold text-[#A8E6B8]">&gt;</span>}
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
