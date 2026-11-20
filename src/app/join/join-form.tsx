"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { joinClass, type JoinState } from "./actions";

export function JoinForm({ classCode }: { classCode: string }) {
  const [state, action, pending] = useActionState<JoinState, FormData>(joinClass, {});
  const errorProps = state.error ? { "aria-invalid": true, "aria-describedby": "join-error" } : {};
  return (
    <form action={action} className="space-y-5" noValidate>
      <div className="space-y-2">
        <Label htmlFor="classCode" className="text-lg font-semibold">Class code</Label>
        <Input id="classCode" name="classCode" defaultValue={state.classCode ?? classCode} required
          autoComplete="off" autoCapitalize="characters" spellCheck={false} placeholder="e.g. MARY-P3"
          className="h-[72px] rounded-xl border-primary font-mono text-[28px] font-bold tracking-widest uppercase placeholder:font-sans placeholder:text-lg placeholder:font-normal placeholder:tracking-normal placeholder:normal-case" {...errorProps} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="personalCode" className="text-lg font-semibold">Your personal code</Label>
        <Input id="personalCode" name="personalCode" required autoFocus={Boolean(classCode)}
          autoComplete="off" autoCapitalize="characters" spellCheck={false} placeholder="6 letters and numbers"
          aria-describedby={state.error ? "join-error personal-help" : "personal-help"}
          aria-invalid={state.error ? true : undefined}
          className="h-[72px] rounded-xl border-primary font-mono text-[28px] font-bold tracking-widest uppercase placeholder:font-sans placeholder:text-lg placeholder:font-normal placeholder:tracking-normal placeholder:normal-case" />
        <p id="personal-help" className="text-base text-muted-foreground">It&apos;s on the card your teacher gave you. Only you have this code.</p>
      </div>
      {state.error && (
        <p id="join-error" role="alert" className="rounded-2xl bg-help p-4 text-help-ink">{state.error}</p>
      )}
      <Button type="submit" size="lg" className="h-15 w-full text-lg" disabled={pending}>
        {pending ? "Joining…" : <>Join my class <span aria-hidden="true" className="flex size-7 items-center justify-center rounded-full bg-[#A8E6B8] font-mono text-base text-primary">&gt;</span></>}
      </Button>
    </form>
  );
}
