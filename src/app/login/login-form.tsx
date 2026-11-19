"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { signIn, type SignInState } from "./actions";

export function LoginForm({ next }: { next: string | null }) {
  const [state, action, pending] = useActionState<SignInState, FormData>(signIn, {});
  return (
    <form action={action} className="space-y-4" noValidate>
      {next && <input type="hidden" name="next" value={next} />}
      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input id="email" name="email" type="email" autoComplete="email" required defaultValue={state.email}
          aria-invalid={Boolean(state.error)} aria-describedby={state.error ? "login-error" : undefined} className="h-14" />
      </div>
      <div className="space-y-2">
        <Label htmlFor="password">Password</Label>
        <Input id="password" name="password" type="password" autoComplete="current-password" required
          aria-invalid={Boolean(state.error)} aria-describedby={state.error ? "login-error" : undefined} className="h-14" />
      </div>
      {state.error && (
        <p id="login-error" role="alert" className="rounded-xl bg-help p-4 text-base text-help-ink">
          {state.error}
        </p>
      )}
      <Button type="submit" size="lg" className="h-14 w-full text-lg" disabled={pending}>
        {pending ? "Signing in…" : <>Sign in <span aria-hidden="true" className="flex size-7 items-center justify-center rounded-full bg-[#A8E6B8] font-mono text-base text-primary">&gt;</span></>}
      </Button>
    </form>
  );
}
