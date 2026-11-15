import type { Metadata } from "next";
import { connection } from "next/server";
import { buttonVariants } from "@/components/ui/button";
import type { GainSummary } from "@/lib/learning-gain";
import { requireStaff } from "@/server/auth";
import { getResults } from "@/server/results";

// Live, per-user data: navigations wait for it rather than showing a prerendered shell.
export const instant = false;

export const metadata: Metadata = { title: "Learning results · CIC Launchpad" };

const pct = (v: number | null) => (v === null ? "—" : `${Math.round(v)}%`);
const signed = (v: number | null) => (v === null ? "—" : `${v >= 0 ? "+" : ""}${Math.round(v)}`);

export default async function ResultsPage({ searchParams }: { searchParams: Promise<{ unit?: string; class?: string }> }) {
  await connection(); // per-user, live data: render at request time
  const staff = await requireStaff(["instructor", "admin"], "/results");
  const q = await searchParams;
  const r = await getResults(q.unit, q.class);
  const top = r.byTopic.find((t) => t.avg_gain !== null);
  const unitTitle = r.units.find((u) => u.id === r.unitId)?.title;
  const exportHref = `/results/export?${new URLSearchParams({ ...(r.unitId ? { unit: r.unitId } : {}), ...(q.class ? { class: q.class } : {}) })}`;

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">Learning results</h1>
          <p className="text-muted-foreground">How much students improved: their quiz score before a unit, compared with after it. Only students who took both quizzes count. {staff.role === "instructor" ? "Your classes only." : "All classes."}</p>
        </div>
        <form className="flex flex-wrap items-end gap-2" method="get">
          <label className="text-sm">Unit<select name="unit" defaultValue={r.unitId ?? ""} className="mt-1 block h-9 rounded-md border bg-background px-2">
            {r.units.map((u) => <option key={u.id} value={u.id}>{u.title}</option>)}</select></label>
          <label className="text-sm">Class<select name="class" defaultValue={q.class ?? ""} className="mt-1 block h-9 rounded-md border bg-background px-2">
            <option value="">All classes</option>
            {r.classes.map((c) => <option key={c.id} value={c.id}>{c.school} · {c.name}</option>)}</select></label>
          <button type="submit" className={buttonVariants({ variant: "outline" })}>Show</button>
          <a href={exportHref} className={buttonVariants()}>Download CSV</a>
        </form>
      </div>

      {!r.unitId ? <p className="rounded-xl border border-dashed p-8 text-center text-muted-foreground">No results yet. They appear once students take the quiz before and after a unit.</p> : (
        <>
          <section aria-label="Headline" className="grid gap-4 md:grid-cols-[2fr_1fr]">
            <div className="rounded-3xl bg-ontrack p-6 text-ontrack-ink">
              <p className="text-sm font-medium">{unitTitle}</p>
              <p className="text-5xl font-semibold tracking-tight tabular-nums">
                {top ? <>{signed(top.avg_gain)} points <span className="text-3xl">on <span className="capitalize">{top.concept_tag}</span></span></> : "Not enough data yet"}
              </p>
              {top && <p className="mt-2">Before {pct(top.avg_pre_pct)} · After {pct(top.avg_post_pct)} · {top.n} students</p>}
            </div>
            <div className="space-y-2 rounded-3xl bg-sky p-6 text-sky-ink">
              <p className="text-sm font-medium">Whole unit</p>
              <p className="text-3xl font-semibold tabular-nums">{signed(r.overall.avg_gain)} points</p>
              <p className="text-sm">Before {pct(r.overall.avg_pre_pct)} · After {pct(r.overall.avg_post_pct)} · {r.overall.n} students</p>
              <Missing gain={r.overall} />
            </div>
          </section>

          <section aria-labelledby="topic-h" className="space-y-3 rounded-3xl bg-card p-6">
            <h2 id="topic-h" className="text-xl font-semibold">By topic</h2>
            <ul className="space-y-4">
              {r.byTopic.map((t) => (
                <li key={t.concept_tag}>
                  <p className="flex flex-wrap justify-between gap-2 text-sm"><span className="font-medium capitalize">{t.concept_tag}</span>
                    <span className="tabular-nums">Before {pct(t.avg_pre_pct)} · After {pct(t.avg_post_pct)} · <strong>{signed(t.avg_gain)} points</strong></span></p>
                  <div className="relative mt-2 h-3 rounded-full bg-muted" aria-hidden="true">
                    {t.avg_pre_pct !== null && t.avg_post_pct !== null && (
                      <div className="absolute h-3 rounded-full bg-[#0DB031]/40" style={{ left: `${Math.min(t.avg_pre_pct, t.avg_post_pct)}%`, width: `${Math.abs(t.avg_post_pct - t.avg_pre_pct)}%` }} />
                    )}
                    {t.avg_pre_pct !== null && <div className="absolute top-0 size-3 rounded-full border-2 border-[#3D5C49] bg-white" style={{ left: `calc(${t.avg_pre_pct}% - 6px)` }} />}
                    {t.avg_post_pct !== null && <div className="absolute top-0 size-3 rounded-full bg-[#047D13]" style={{ left: `calc(${t.avg_post_pct}% - 6px)` }} />}
                  </div>
                </li>
              ))}
            </ul>
            <p className="text-xs text-muted-foreground">○ before the unit · ● after the unit</p>
          </section>

          <section aria-labelledby="class-h" className="space-y-3">
            <h2 id="class-h" className="text-xl font-semibold">By class</h2>
            <div className="overflow-x-auto rounded-2xl border bg-card">
              <table className="w-full min-w-[36rem] text-left text-sm">
                <thead className="border-b bg-lilac text-lilac-ink"><tr>{["Class", "Before", "After", "Improved by", "Students", "Missing a quiz"].map((h) => <th key={h} scope="col" className="p-3 font-medium">{h}</th>)}</tr></thead>
                <tbody>{r.classes.map((c) => (
                  <tr key={c.id} className="border-b last:border-0">
                    <th scope="row" className="p-3 font-medium">{c.school} · {c.name}</th>
                    <td className="p-3 tabular-nums">{pct(c.gain.avg_pre_pct)}</td><td className="p-3 tabular-nums">{pct(c.gain.avg_post_pct)}</td>
                    <td className="p-3 font-semibold tabular-nums">{signed(c.gain.avg_gain)}</td><td className="p-3 tabular-nums">{c.gain.n}</td>
                    <td className="p-3">{c.gain.missing_pre + c.gain.missing_post || "—"}</td>
                  </tr>))}</tbody>
              </table>
            </div>
          </section>

          <details className="rounded-3xl bg-card p-5">
            <summary className="cursor-pointer text-xl font-semibold">By student ({r.students.length})</summary>
            <table className="mt-3 w-full text-left text-sm">
              <thead className="border-b"><tr>{["Student", "Before", "After", "Improved by"].map((h) => <th key={h} scope="col" className="p-2 font-medium">{h}</th>)}</tr></thead>
              <tbody>{r.students.map((s) => (
                <tr key={s.id} className="border-b last:border-0">
                  <th scope="row" className="p-2 font-medium">{s.label}</th>
                  <td className="p-2 tabular-nums">{s.pre_pct === null ? "Not taken" : pct(s.pre_pct)}</td>
                  <td className="p-2 tabular-nums">{s.post_pct === null ? "Not taken" : pct(s.post_pct)}</td>
                  <td className="p-2 font-semibold tabular-nums">{s.pre_pct !== null && s.post_pct !== null ? signed(s.post_pct - s.pre_pct) : "—"}</td>
                </tr>))}</tbody>
            </table>
          </details>
        </>
      )}
    </div>
  );
}

function Missing({ gain }: { gain: GainSummary }) {
  if (!gain.missing_pre && !gain.missing_post) return null;
  return (
    <p className="rounded-2xl bg-behind p-3 text-sm text-behind-ink">
      ⚠ {[gain.missing_post && `${gain.missing_post} haven't taken the after quiz`, gain.missing_pre && `${gain.missing_pre} haven't taken the before quiz`].filter(Boolean).join(", ")}. They aren&apos;t counted in these numbers yet.
    </p>
  );
}
