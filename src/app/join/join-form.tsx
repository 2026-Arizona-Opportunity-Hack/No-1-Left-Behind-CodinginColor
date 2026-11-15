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
        <Label htmlFor="classCode" className="text-base">Class code</Label>
        <Input id="classCode" name="classCode" defaultValue={state.classCode ?? classCode} required
          autoComplete="off" autoCapitalize="characters" spellCheck={false} placeholder="e.g. MARY-P3"
          className="h-12 font-mono text-lg uppercase" {...errorProps} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="personalCode" className="text-base">Your personal code</Label>
        <Input id="personalCode" name="personalCode" required autoFocus={Boolean(classCode)}
          autoComplete="off" autoCapitalize="characters" spellCheck={false} placeholder="6 letters and numbers"
          aria-describedby={state.error ? "join-error personal-help" : "personal-help"}
          aria-invalid={state.error ? true : undefined}
          className="h-12 font-mono text-lg tracking-widest uppercase" />
        <p id="personal-help" className="text-sm text-muted-foreground">It&apos;s on the card your teacher gave you. Only you have this code.</p>
      </div>
      {state.error && (
        <p id="join-error" role="alert" className="rounded-lg border border-red-300 bg-red-50 p-3 text-red-900">{state.error}</p>
      )}
      <Button type="submit" size="lg" className="h-12 w-full text-base" disabled={pending}>
        {pending ? "Joining…" : "Join class"}
      </Button>
    </form>
  );
}
