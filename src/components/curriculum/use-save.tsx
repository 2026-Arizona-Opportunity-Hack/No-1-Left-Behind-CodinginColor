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
    <p role={message.ok ? "status" : "alert"} className={`text-sm ${message.ok ? "text-green-800" : "rounded-md border border-red-300 bg-red-50 p-2 text-red-900"}`}>
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
    ? <span className="rounded-full border border-green-700 bg-green-50 px-2 py-0.5 text-xs font-semibold text-green-800">✓ Published</span>
    : <span className="rounded-full border border-zinc-400 bg-zinc-50 px-2 py-0.5 text-xs font-semibold text-zinc-700">✎ Draft</span>;
}
