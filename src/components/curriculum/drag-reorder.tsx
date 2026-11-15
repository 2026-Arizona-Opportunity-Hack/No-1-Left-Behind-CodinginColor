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
      className="cursor-grab touch-none px-1 text-2xl leading-none text-muted-foreground select-none active:cursor-grabbing">
      ⠿
    </span>
  );
}
