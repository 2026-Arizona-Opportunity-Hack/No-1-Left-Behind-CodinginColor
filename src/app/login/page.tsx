import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Logo } from "@/components/logo";
import { getStaff } from "@/server/auth";
import { safeNextPath } from "@/lib/roles";
import { staffHome } from "@/lib/permissions";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Sign in · CIC Launchpad" };

type Props = { searchParams: Promise<{ next?: string }> };

export default function LoginPage({ searchParams }: Props) {
  return (
    <div className="flex flex-1 flex-col">
      <header className="mx-auto w-full max-w-6xl px-6 py-7 sm:px-14"><Logo /></header>
      <main className="flex flex-1 items-center justify-center px-4 pb-16">
        <div className="flex w-full max-w-[480px] flex-col gap-6 rounded-[28px] bg-card p-8 sm:p-11">
          <div>
            <h1 className="text-4xl font-bold">Sign in</h1>
            <p className="mt-1 text-muted-foreground">For teachers, CIC staff and curriculum reviewers.</p>
          </div>
          <Suspense fallback={<p role="status" className="text-muted-foreground">Loading…</p>}>
            <SignInArea searchParams={searchParams} />
          </Suspense>
          <p className="text-base text-muted-foreground">Are you a student? <Link href="/join">Join your class with your codes</Link>.</p>
        </div>
      </main>
    </div>
  );
}

// Already signed in? Skip the form. Reads cookies, so it renders at request time.
async function SignInArea({ searchParams }: Props) {
  const next = safeNextPath((await searchParams).next);
  const staff = await getStaff();
  if (staff) redirect(next ?? staffHome(staff));
  return <LoginForm next={next} />;
}
