import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getStaff } from "@/server/auth";
import { ROLE_HOME, safeNextPath } from "@/lib/roles";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Sign in · CIC Launchpad" };

type Props = { searchParams: Promise<{ next?: string }> };

export default function LoginPage({ searchParams }: Props) {
  return (
    <main className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center gap-6 px-4 py-12">
      <div className="space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight">Sign in</h1>
        <p className="text-muted-foreground">For teachers, CIC staff and curriculum reviewers.</p>
      </div>
      <Suspense fallback={<p role="status" className="text-muted-foreground">Loading…</p>}>
        <SignInArea searchParams={searchParams} />
      </Suspense>
      <p className="text-sm text-muted-foreground">
        Are you a student? <Link href="/join" className="font-medium text-foreground underline underline-offset-4">Join your class with your codes</Link>.
      </p>
    </main>
  );
}

// Already signed in? Skip the form. Reads cookies, so it renders at request time.
async function SignInArea({ searchParams }: Props) {
  const next = safeNextPath((await searchParams).next);
  const staff = await getStaff();
  if (staff) redirect(next ?? ROLE_HOME[staff.role]);
  return <LoginForm next={next} />;
}
