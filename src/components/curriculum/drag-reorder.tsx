"use client";

import { useState, type DragEvent } from "react";
import { reorderTo } from "@/lib/reorder";

/**
 * Drag-to-reorder for the curriculum lists. Grab the handle, drop on another row.
 * The Up / Down buttons stay next to it for keyboard and touch use (dragging needs a mouse).
 */
export function useDragReorder(ids: string[], onReorder: (ids: string[]) => void, disabled = false) {
  const [dragId, setDragId] = useState<string | null>(null);
  const [overId, setOverId] = useState<string | null>(null);
  const reset = () => { setDragId(null); setOverId(null); };

  return {
    /** Spread on the row (<li>). */
    rowProps: (id: string) => ({
      onDragOver: (e: DragEvent) => { if (!dragId || disabled) return; e.preventDefault(); if (overId !== id) setOverId(id); },
      onDrop: (e: DragEvent) => {
        e.preventDefault();
        if (dragId && dragId !== id) onReorder(reorderTo(ids, dragId, id));
        reset();
      },
    }),
    /** Extra classes for the row while it is dragged or being dropped on. */
    rowClass: (id: string) => `${dragId === id ? "opacity-50 " : ""}${overId === id && dragId && dragId !== id ? "outline-3 outline-offset-2 outline-[#0DB031] " : ""}`,
    /** Spread on the grab handle. */
    handleProps: (id: string) => ({
      draggable: !disabled,
      onDragStart: (e: DragEvent) => {
        setDragId(id);
        e.dataTransfer.effectAllowed = "move";
        e.dataTransfer.setData("text/plain", id);
        const row = (e.currentTarget as HTMLElement).closest("li");
        if (row) e.dataTransfer.setDragImage(row, 24, 24);
      },
      onDragEnd: reset,
    }),
  };
}

export function DragHandle(props: React.HTMLAttributes<HTMLSpanElement> & { draggable?: boolean }) {
  return (
    <span {...props} title="Drag to change the order" aria-hidden="true"
      className="inline-flex size-10 shrink-0 cursor-grab touch-none items-center justify-center rounded-full border-2 border-primary bg-card text-primary select-none hover:bg-secondary active:cursor-grabbing">
      <svg viewBox="0 0 16 16" className="size-5" fill="currentColor">
        {[5, 11].flatMap((x) => [3, 8, 13].map((y) => <circle key={`${x}-${y}`} cx={x} cy={y} r="1.6" />))}
      </svg>
    </span>
  );
}

export const DRAG_HINT = "Drag the round handle on the left of a row to change the order, or use the Up and Down buttons.";
