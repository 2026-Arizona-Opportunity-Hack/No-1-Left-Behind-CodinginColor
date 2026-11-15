"use client";

import Link from "next/link";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DragHandle, useDragReorder } from "@/components/curriculum/drag-reorder";
import { SaveMessage, StatusBadge, moved, useSave } from "@/components/curriculum/use-save";
import { createModuleAction, deleteModuleAction, reorderModulesAction, setModuleStatusAction } from "./actions";

type Row = { id: string; title: string; description: string | null; position: number; status: string; lesson_count: number };

export function ModuleList({ modules }: { modules: Row[] }) {
  const { pending, message, save } = useSave();
  const [title, setTitle] = useState("");
  const ids = modules.map((m) => m.id);
  const drag = useDragReorder(ids, (next) => save(() => reorderModulesAction(next), "Order saved"), pending);
  return (
    <div className="space-y-6">
      <ol className="space-y-3">
        {modules.map((m, i) => (
          <li key={m.id} {...drag.rowProps(m.id)} className={`flex flex-wrap items-center gap-3 rounded-2xl bg-card p-4 ${drag.rowClass(m.id)}`}>
            <DragHandle {...drag.handleProps(m.id)} />
            <div className="min-w-0 flex-1">
              <Link href={`/admin/curriculum/${m.id}`} className="text-xl font-semibold text-foreground underline-offset-4 hover:underline">Unit {i + 1}: {m.title}</Link>
              <p className="text-sm text-muted-foreground">{m.lesson_count} lessons{m.description ? ` · ${m.description}` : ""}</p>
            </div>
            <StatusBadge status={m.status} />
            <Button size="sm" variant="destructive" disabled={pending} onClick={() => { if(confirm(`Delete "${m.title}" and its lessons? Assigned units or units with student work must be hidden instead.`)) save(() => deleteModuleAction(m.id), "Unit deleted"); }}>Delete</Button>
            <Button size="sm" variant="outline" disabled={pending}
              onClick={() => save(() => setModuleStatusAction(m.id, m.status === "published" ? "draft" : "published"), m.status === "published" ? "Hidden from students" : "Students can see it now")}>
              {m.status === "published" ? "Hide from students" : "Show to students"}
            </Button>
            <Button size="sm" variant="secondary" disabled={pending || i === 0} aria-label={`Move ${m.title} up`} onClick={() => save(() => reorderModulesAction(moved(ids, i, -1)), "Order saved")}>Up</Button>
            <Button size="sm" variant="secondary" disabled={pending || i === modules.length - 1} aria-label={`Move ${m.title} down`} onClick={() => save(() => reorderModulesAction(moved(ids, i, 1)), "Order saved")}>Down</Button>
          </li>
        ))}
      </ol>
      <SaveMessage message={message} />
      <form className="flex flex-wrap items-end gap-3 rounded-xl border border-dashed p-4"
        onSubmit={(e) => { e.preventDefault(); save(() => createModuleAction(title, ""), "Unit created", () => setTitle("")); }}>
        <div className="flex-1 space-y-1">
          <Label htmlFor="new-unit">New unit</Label>
          <Input id="new-unit" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Working with data" className="h-10" />
        </div>
        <Button type="submit" disabled={pending || !title.trim()}>Add unit</Button>
      </form>
    </div>
  );
}
