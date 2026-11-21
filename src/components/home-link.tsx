"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

/** The Home button in the header. It is not shown when the person is already on their home page. */
export function HomeLink({ href, className }: { href: string; className?: string }) {
  const pathname = usePathname();
  if (pathname === href) return null;
  return <Link href={href} className={className}>Home</Link>;
}
