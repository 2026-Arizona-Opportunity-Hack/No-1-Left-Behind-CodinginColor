"use client";

import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import { CopyLinkButton } from "@/components/teach/copy-link-button";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { displayLabels, parseRosterCsv, type RosterCsv } from "@/lib/roster-csv";
import type { Result } from "@/types/result";
import { addStudentsStep, assignModulesStep, createClassStep, scheduleStep } from "./actions";

export type WizardModule = { id: string; title: string; position: number; lessons: { id: string; title: string; position: number }[] };
type Card = { id: string; label: string; join_code: string };
const STEPS = ["Class", "Students", "Units", "Schedule"] as const;
const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export function ClassWizard({ modules }: { modules: WizardModule[] }) {
  const [step, setStep] = useState(0);
  const [cls, setCls] = useState<{ id: string; class_code: string; name: string; school: string } | null>(null);
  const [cards, setCards] = useState<Card[]>([]);
  const [chosen, setChosen] = useState<string[]>(modules.map((m) => m.id));
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  /** Runs a save; on success moves on, on failure shows the plain-language error. */
  function save<T>(work: () => Promise<Result<T>>, then: (data: T) => void) {
    setError(null);
    start(async () => {
      try {
        const r = await work();
        if (r.ok) then(r.data);
        else setError(r.error);
      } catch (e) {
        setError((e as Error).message);
      }
    });
  }

  if (step === 4 && cls) return <JoinCards cls={cls} cards={cards} />;

  return (
    <div className="mx-auto max-w-3xl space-y-6 print:hidden">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">Set up a class</h1>
        <p className="text-muted-foreground">Four short steps. Most teachers finish in under 10 minutes.</p>
      </div>
      <ol aria-label="Steps" className="flex flex-wrap gap-2">
        {STEPS.map((s, i) => (
          <li key={s} aria-current={i === step ? "step" : undefined}
            className={`rounded-full border-2 px-3 py-1 text-sm font-medium ${i === step ? "border-primary bg-primary text-primary-foreground" : i < step ? "border-green-700 text-green-800" : "border-zinc-300 text-zinc-500"}`}>
            {i < step ? "✓" : i + 1}. {s}
          </li>
        ))}
      </ol>
      <section aria-live="polite" className="rounded-3xl bg-card p-6">
        {step === 0 && (
          <ClassStep pending={pending} onSave={(name, school) =>
            save(() => createClassStep(name, school), (d) => { setCls({ ...d, name, school }); setStep(1); })} />
        )}
        {step === 1 && cls && (
          <RosterStep pending={pending} onSave={(rows) =>
            save(() => addStudentsStep(cls.id, rows), (added) => { setCards(added); setStep(2); })} />
        )}
        {step === 2 && cls && (
          <UnitsStep modules={modules} chosen={chosen} setChosen={setChosen} pending={pending}
            onSave={() => save(() => assignModulesStep(cls.id, chosen), () => setStep(3))} />
        )}
        {step === 3 && cls && (
          <ScheduleStep modules={modules.filter((m) => chosen.includes(m.id))} pending={pending}
            onSave={(sessions) => save(() => scheduleStep(cls.id, sessions), () => setStep(4))}
            onSkip={() => setStep(4)} />
        )}
      </section>
      {error && <p role="alert" className="rounded-lg border border-red-300 bg-red-50 p-3 text-red-900">{error}</p>}
    </div>
  );
}

function ClassStep({ onSave, pending }: { onSave: (name: string, school: string) => void; pending: boolean }) {
  const [name, setName] = useState("");
  const [school, setSchool] = useState("");
  return (
    <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); onSave(name, school); }}>
      <h2 className="text-xl font-semibold">1. Name your class</h2>
      <div className="space-y-2">
        <Label htmlFor="class-name">Class name</Label>
        <Input id="class-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Period 3" required className="h-11" />
      </div>
      <div className="space-y-2">
        <Label htmlFor="school">School</Label>
        <Input id="school" value={school} onChange={(e) => setSchool(e.target.value)} placeholder="e.g. Maryvale High" required className="h-11" />
      </div>
      <p className="text-sm text-muted-foreground">We&apos;ll make a class code your students type to join.</p>
      <Button type="submit" size="lg" disabled={pending || !name.trim() || !school.trim()}>{pending ? "Creating…" : "Create class"}</Button>
    </form>
  );
}

function RosterStep({ onSave, pending }: { onSave: (rows: RosterCsv["rows"]) => void; pending: boolean }) {
  const [text, setText] = useState("");
  const parsed = useMemo(() => (text.trim() ? parseRosterCsv(text) : null), [text]);
  const labels = useMemo(() => (parsed ? displayLabels(parsed.rows.map((r) => r.name)) : []), [parsed]);
  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold">2. Add your students</h2>
      <p className="text-muted-foreground">
        Upload your roster as a CSV file (from Google Sheets or Excel: File → Download → CSV) with a <strong>name</strong> column.
        We only keep each student&apos;s name and school.
      </p>
      <div className="space-y-2">
        <Label htmlFor="roster-file">Roster file (.csv)</Label>
        <Input id="roster-file" type="file" accept=".csv,text/csv" className="h-11"
          onChange={async (e) => { const f = e.target.files?.[0]; if (f) setText(await f.text()); }} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="roster-text">…or paste it here</Label>
        <Textarea id="roster-text" value={text} onChange={(e) => setText(e.target.value)} className="min-h-28 font-mono text-sm"
          placeholder={"name\nAlex Rivera\nAlex Morales\nMaria Garcia"} />
      </div>
      {parsed && (
        <div className="space-y-3">
          {parsed.warnings.map((w) => <p key={w} className="rounded-lg bg-amber-50 p-3 text-sm text-amber-900">{w}</p>)}
          {parsed.errors.length > 0 && (
            <ul role="alert" className="space-y-1 rounded-lg border border-red-300 bg-red-50 p-3 text-sm text-red-900">
              {parsed.errors.map((e) => <li key={`${e.line}${e.message}`}>Line {e.line}: {e.message}</li>)}
            </ul>
          )}
          {parsed.rows.length > 0 && (
            <div className="max-h-72 overflow-auto rounded-lg border">
              <table className="w-full text-left text-sm">
                <caption className="sr-only">Roster preview</caption>
                <thead className="sticky top-0 bg-muted"><tr><th scope="col" className="p-2">Name</th><th scope="col" className="p-2">Shown as</th><th scope="col" className="p-2">School</th></tr></thead>
                <tbody>{parsed.rows.map((r, i) => (
                  <tr key={i} className="border-t"><td className="p-2">{r.name}</td><td className="p-2 font-medium">{labels[i]}</td><td className="p-2 text-muted-foreground">{r.school ?? "—"}</td></tr>
                ))}</tbody>
              </table>
            </div>
          )}
        </div>
      )}
      <Button size="lg" disabled={pending || !parsed?.rows.length || parsed.errors.length > 0} onClick={() => parsed && onSave(parsed.rows)}>
        {pending ? "Adding…" : `Add ${parsed?.rows.length ?? 0} students`}
      </Button>
    </div>
  );
}

function UnitsStep({ modules, chosen, setChosen, onSave, pending }: {
  modules: WizardModule[]; chosen: string[]; setChosen: (ids: string[]) => void; onSave: () => void; pending: boolean;
}) {
  return (
    <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); onSave(); }}>
      <h2 className="text-xl font-semibold">3. Pick the units this class will do</h2>
      <p className="text-muted-foreground">Students unlock them in this order.</p>
      <fieldset className="space-y-2">
        <legend className="sr-only">Units</legend>
        {modules.map((m) => (
          <label key={m.id} className="flex cursor-pointer items-center gap-3 rounded-lg border p-3 has-focus-visible:outline-2">
            <input type="checkbox" className="size-5" checked={chosen.includes(m.id)}
              onChange={(e) => setChosen(e.target.checked
                ? modules.filter((x) => x.id === m.id || chosen.includes(x.id)).map((x) => x.id)
                : chosen.filter((id) => id !== m.id))} />
            <span><span className="font-medium">Unit {m.position}: {m.title}</span>
              <span className="block text-sm text-muted-foreground">{m.lessons.map((l) => l.title).join(" · ")}</span></span>
          </label>
        ))}
      </fieldset>
      <Button type="submit" size="lg" disabled={pending || chosen.length === 0}>{pending ? "Saving…" : "Save units"}</Button>
    </form>
  );
}

function ScheduleStep({ modules, onSave, onSkip, pending }: {
  modules: WizardModule[]; onSave: (s: { session_date: string; lesson_id: string }[]) => void; onSkip: () => void; pending: boolean;
}) {
  const lessons = modules.flatMap((m) => m.lessons);
  const [dates, setDates] = useState<Record<string, string>>({});
  const [startDate, setStartDate] = useState("");
  const [days, setDays] = useState<number[]>([2, 4]); // Tue + Thu

  /** One lesson per class day, starting from the chosen date, on the chosen weekdays. */
  function fill() {
    if (!startDate || !days.length) return;
    const d = new Date(`${startDate}T12:00:00`);
    const out: Record<string, string> = {};
    for (const l of lessons) {
      while (!days.includes(d.getDay())) d.setDate(d.getDate() + 1);
      out[l.id] = d.toISOString().slice(0, 10);
      d.setDate(d.getDate() + 1);
    }
    setDates(out);
  }

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold">4. When will you teach each lesson?</h2>
      <p className="text-muted-foreground">This sets the class pace, so we can spot students who fall behind. You can skip it and do it later.</p>
      <div className="flex flex-wrap items-end gap-3 rounded-lg bg-muted/50 p-3">
        <div className="space-y-1"><Label htmlFor="start">First class</Label>
          <Input id="start" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="h-10" /></div>
        <fieldset className="flex flex-wrap gap-2"><legend className="mb-1 text-sm font-medium">Class days</legend>
          {WEEKDAYS.map((w, i) => i > 0 && i < 6 && (
            <label key={w} className="flex items-center gap-1 rounded border bg-background px-2 py-1 text-sm">
              <input type="checkbox" checked={days.includes(i)} onChange={(e) => setDays(e.target.checked ? [...days, i] : days.filter((x) => x !== i))} />{w}
            </label>
          ))}
        </fieldset>
        <Button variant="outline" onClick={fill} disabled={!startDate || !days.length}>Fill in dates</Button>
      </div>
      <ul className="space-y-2">
        {lessons.map((l) => (
          <li key={l.id} className="flex items-center justify-between gap-3 border-b pb-2">
            <Label htmlFor={`d-${l.id}`} className="font-normal">{l.title}</Label>
            <Input id={`d-${l.id}`} type="date" value={dates[l.id] ?? ""} className="h-9 w-44"
              onChange={(e) => setDates({ ...dates, [l.id]: e.target.value })} />
          </li>
        ))}
      </ul>
      <div className="flex flex-wrap gap-3">
        <Button size="lg" disabled={pending || !Object.values(dates).some(Boolean)}
          onClick={() => onSave(Object.entries(dates).filter(([, d]) => d).map(([lesson_id, session_date]) => ({ lesson_id, session_date })))}>
          {pending ? "Saving…" : "Save schedule"}
        </Button>
        <Button size="lg" variant="ghost" onClick={onSkip}>Skip for now</Button>
      </div>
    </div>
  );
}

function JoinCards({ cls, cards }: { cls: { id: string; class_code: string; name: string; school: string }; cards: Card[] }) {
  return (
    <div className="space-y-6">
      <div className="space-y-3 print:hidden">
        <h1 className="text-3xl font-semibold tracking-tight">✓ {cls.name} is ready</h1>
        <p className="text-lg">Class code <span className="font-mono font-semibold">{cls.class_code}</span>. Print these cards and hand one to each student.</p>
        <p className="rounded-lg border border-amber-600 bg-amber-50 p-3 text-amber-900">
          Personal codes are shown <strong>only now</strong>. If a card gets lost, you can give that student a new code from the classroom.
        </p>
        <div className="flex flex-wrap gap-3">
          <Button size="lg" onClick={() => window.print()}>Print join cards</Button>
          <CopyLinkButton classCode={cls.class_code} />
          <Link href={`/teach/${cls.id}`} className={buttonVariants({ size: "lg", variant: "outline" })}>Open live classroom</Link>
        </div>
      </div>
      <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 print:grid-cols-2 print:gap-2">
        {cards.map((c) => (
          <li key={c.id} className="break-inside-avoid rounded-xl border-2 border-dashed p-5 print:p-4">
            <p className="text-sm text-muted-foreground">Coding in Color · {cls.school}, {cls.name}</p>
            <p className="mt-1 text-xl font-semibold">{c.label}</p>
            <dl className="mt-3 grid grid-cols-2 gap-2">
              <div><dt className="text-xs text-muted-foreground">Class code</dt><dd className="font-mono text-lg font-semibold">{cls.class_code}</dd></div>
              <div><dt className="text-xs text-muted-foreground">Your personal code</dt><dd className="font-mono text-lg font-semibold tracking-widest">{c.join_code}</dd></div>
            </dl>
            <p className="mt-3 text-xs text-muted-foreground">Go to the class link your teacher shares, or /join, and type both codes. Keep your code private.</p>
          </li>
        ))}
      </ul>
    </div>
  );
}
