"use client";

import { useState, useTransition } from "react";
import type { Result } from "@/types/result";

/** Runs a curriculum save, tracks pending, and keeps the last plain-language message. */
export function useSave() {
  const [pending, start] = useTransition();
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  function save<T>(work: () => Promise<Result<T>>, okText = "Saved", then?: (data: T) => void) {
    setMessage(null);
    start(async () => {
      try {
        const r = await work();
        if (r.ok) { setMessage({ ok: true, text: okText }); then?.(r.data); }
        else setMessage({ ok: false, text: r.error });
      } catch (e) {
        setMessage({ ok: false, text: (e as Error).message });
      }
    });
  }
  return { pending, message, save };
}

export function SaveMessage({ message }: { message: { ok: boolean; text: string } | null }) {
  if (!message) return null;
  return (
    <p role={message.ok ? "status" : "alert"} className={`text-sm ${message.ok ? "text-[#047D13]" : "rounded-2xl bg-help p-3 text-help-ink"}`}>
      {message.ok ? "✓ " : ""}{message.text}
    </p>
  );
}

/** Swap two neighbours in a list of ids (for Up / Down buttons). */
export function moved(ids: string[], index: number, by: -1 | 1): string[] {
  const out = [...ids];
  [out[index], out[index + by]] = [out[index + by], out[index]];
  return out;
}

export function StatusBadge({ status }: { status: string }) {
  return status === "published"
    ? <span className="rounded-full bg-ontrack px-2.5 py-0.5 text-sm font-semibold text-ontrack-ink">✓ Students can see this</span>
    : <span className="rounded-full bg-sun px-2.5 py-0.5 text-sm font-semibold text-sun-ink">✎ Hidden from students</span>;
}
