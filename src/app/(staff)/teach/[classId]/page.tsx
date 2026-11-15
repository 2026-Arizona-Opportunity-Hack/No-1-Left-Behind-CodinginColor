import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { AutoRefresh } from "@/components/teach/auto-refresh";
import { CopyLinkButton } from "@/components/teach/copy-link-button";
import { STATUS_DISPLAY, formatDuration, timeAgo } from "@/lib/status-display";
import type { Status } from "@/lib/student-status";
import { requireStaff } from "@/server/auth";
import { getCatchUpState } from "@/server/catch-up-teacher";
import { getClassroom, getTopicMastery } from "@/server/dashboard";
import type { ClassroomStudent } from "@/types/dashboard";
import { assignCatchUpAction, markAttendance } from "./actions";

export const metadata: Metadata = { title: "Live classroom · CIC Launchpad" };

type Props = { params: Promise<{ classId: string }>; searchParams: Promise<{ show?: string }> };

const FILTERS: { key: "all" | Status; label: string }[] = [
  { key: "all", label: "Everyone" },
  { key: "needs_help", label: "Needs help" },
  { key: "behind", label: "Behind" },
  { key: "not_started", label: "Not started" },
];

export default async function LiveClassroom({ params, searchParams }: Props) {
  const { classId } = await params;
  await requireStaff(["instructor", "admin"], `/teach/${classId}`);
  await connection(); // always fresh: this page is live
  const show = (await searchParams).show;
  const filter = FILTERS.some((f) => f.key === show) ? (show as "all" | Status) : "all";
  const [room, mastery, catchUp] = await Promise.all([getClassroom(classId), getTopicMastery(classId), getCatchUpState(classId)]);

  if (!room.ok) {
    return (
      <div className="space-y-3">
        <h1 className="text-2xl font-semibold">We couldn&apos;t open that class</h1>
        <p className="text-muted-foreground">{room.error}</p>
        <Link href="/teach" className="font-medium underline underline-offset-4">Back to my classes</Link>
      </div>
    );
  }
  const { class: cls, today, attendance, students, counts } = room.data;
  const shown = filter === "all" ? students : students.filter((s) => s.status === filter);
  const now = Date.parse(new Date().toISOString());

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-muted-foreground">{cls.school}</p>
          <h1 className="text-3xl font-semibold tracking-tight">{cls.name} · Live classroom</h1>
        </div>
        <dl className="flex flex-wrap gap-6 text-sm">
          <div><dt className="text-muted-foreground">Today&apos;s lesson</dt><dd className="text-base font-semibold">{today?.lesson_title ?? "No class today"}</dd></div>
          {today && <div><dt className="text-muted-foreground">Attendance</dt><dd className="text-base font-semibold">{attendance.present} here · {attendance.absent} absent</dd></div>}
          <div><dt className="text-muted-foreground">Class code</dt><dd className="font-mono text-base font-semibold">{cls.class_code}</dd></div>
        </dl>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <CopyLinkButton classCode={cls.class_code} />
        <AutoRefresh />
      </div>

      <nav aria-label="Filter students" className="flex flex-wrap gap-2">
        {FILTERS.map((f) => {
          const n = f.key === "all" ? students.length : counts[f.key];
          const active = f.key === filter;
          return (
            <Link key={f.key} href={f.key === "all" ? `/teach/${cls.id}` : `/teach/${cls.id}?show=${f.key}`}
              aria-current={active ? "page" : undefined}
              className={`rounded-full border-2 px-4 py-1.5 text-sm font-medium focus-visible:outline-2 focus-visible:outline-offset-2 ${active ? "border-primary bg-primary text-primary-foreground" : f.key !== "all" ? STATUS_DISPLAY[f.key].chip : "border-zinc-300"}`}>
              {f.key !== "all" && <span aria-hidden="true" className="mr-1">{STATUS_DISPLAY[f.key].icon}</span>}
              {f.label} ({n})
            </Link>
          );
        })}
      </nav>

      {filter === "behind" && counts.behind > 0 && (
        <form action={assignCatchUpAction} className="flex flex-wrap items-center gap-3 rounded-xl border border-orange-700 bg-orange-50 p-3 text-orange-950">
          <input type="hidden" name="classId" value={cls.id} />
          <input type="hidden" name="studentIds" value={students.filter((s) => s.status === "behind").map((s) => s.id).join(",")} />
          <p className="flex-1">These students missed a lesson. A catch-up gives them a 2-minute recap and only the core exercises.</p>
          <button type="submit" className="rounded-md bg-orange-800 px-3 py-2 text-sm font-semibold text-white focus-visible:outline-2 focus-visible:outline-offset-2">Assign catch-up to everyone behind</button>
        </form>
      )}
      <div className="grid gap-6 lg:grid-cols-[1fr_18rem]">
        <section aria-label="Students" className="overflow-x-auto rounded-2xl border">
          <table className="w-full min-w-[44rem] text-left text-sm">
            <thead className="border-b bg-muted/50 text-muted-foreground">
              <tr>
                <th scope="col" className="p-3 font-medium">Student</th>
                <th scope="col" className="p-3 font-medium">Working on</th>
                <th scope="col" className="p-3 font-medium">Done</th>
                <th scope="col" className="p-3 font-medium">Time on task</th>
                <th scope="col" className="p-3 font-medium">Last active</th>
                <th scope="col" className="p-3 font-medium">Status</th>
                {today && <th scope="col" className="p-3 font-medium">Today</th>}
              </tr>
            </thead>
            <tbody>
              {shown.map((s) => <StudentRow key={s.id} s={s} classId={cls.id} sessionId={today?.session_id} now={now} catchUp={catchUp.get(s.id)} />)}
              {!shown.length && (
                <tr><td colSpan={7} className="p-8 text-center text-muted-foreground">
                  {students.length ? "Nobody in this list right now. 🎉" : "No students in this class yet."}
                </td></tr>
              )}
            </tbody>
          </table>
        </section>

        <aside aria-labelledby="topics-heading" className="space-y-4 rounded-2xl border p-5">
          <h2 id="topics-heading" className="font-semibold">Class topics</h2>
          {mastery.ok && mastery.data.length ? mastery.data.map((m) => (
            <div key={m.concept_tag}>
              <p className="flex justify-between text-sm"><span className="font-medium capitalize">{m.concept_tag}</span>
                <span className="tabular-nums">{m.percent_struggling}% stuck</span></p>
              <div className="mt-1 flex h-2 overflow-hidden rounded-full bg-muted" aria-hidden="true">
                <div className="bg-green-700" style={{ width: `${m.percent_mastered}%` }} />
                <div className="bg-red-600" style={{ width: `${m.percent_struggling}%` }} />
              </div>
              <p className="mt-1 text-xs text-muted-foreground">{m.percent_mastered}% got it · {m.students_counted} students</p>
            </div>
          )) : <p className="text-sm text-muted-foreground">Topic results appear once students start answering.</p>}
        </aside>
      </div>
    </div>
  );
}

function StudentRow({ s, classId, sessionId, now, catchUp }: { s: ClassroomStudent; classId: string; sessionId?: string; now: number; catchUp?: "assigned" | "caught_up" }) {
  const d = STATUS_DISPLAY[s.status];
  return (
    <tr className="border-b last:border-0 hover:bg-muted/30">
      <th scope="row" className="p-3 font-medium">
        <Link href={`/teach/${classId}/students/${s.id}`} className="underline-offset-4 hover:underline focus-visible:outline-2">{s.label}</Link>
      </th>
      <td className="p-3">{s.current ? <>{s.current.lesson_title} <span className="text-muted-foreground">· step {s.current.step} of {s.current.total_steps}</span></> : <span className="text-muted-foreground">—</span>}</td>
      <td className="p-3">
        <div className="flex items-center gap-2">
          <div className="h-2 w-16 rounded-full bg-muted" aria-hidden="true"><div className="h-2 rounded-full bg-green-700" style={{ width: `${s.percent_complete}%` }} /></div>
          <span className="tabular-nums">{s.percent_complete}%</span>
        </div>
      </td>
      <td className="p-3 tabular-nums">{formatDuration(s.time_on_task_ms)}</td>
      <td className="p-3">{timeAgo(s.last_active_at, now)}</td>
      <td className="p-3">
        <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-semibold ${d.chip}`}>
          <span aria-hidden="true">{d.icon}</span>{d.word}
        </span>
        {s.reasons.length > 0 && <span className="mt-1 block text-xs text-muted-foreground">{s.reasons.join(" · ")}</span>}
        {catchUp === "caught_up" && <span className="mt-1 block text-xs font-semibold text-green-800">✓ Caught up</span>}
        {catchUp === "assigned" && <span className="mt-1 block text-xs font-semibold text-orange-800">Catch-up assigned</span>}
        {s.status === "behind" && !catchUp && (
          <form action={assignCatchUpAction} className="mt-1">
            <input type="hidden" name="classId" value={classId} /><input type="hidden" name="studentIds" value={s.id} />
            <button type="submit" className="text-xs font-semibold text-orange-800 underline underline-offset-2 focus-visible:outline-2">Assign catch-up</button>
          </form>
        )}
      </td>
      {sessionId && (
        <td className="p-3">
          <form action={markAttendance}>
            <input type="hidden" name="classId" value={classId} />
            <input type="hidden" name="sessionId" value={sessionId} />
            <input type="hidden" name="studentId" value={s.id} />
            <input type="hidden" name="status" value={s.present_today === false ? "present" : "absent"} />
            <button type="submit" aria-label={`${s.label}: ${s.present_today === false ? "absent, mark present" : "present, mark absent"}`}
              className={`rounded-md border px-2 py-1 text-xs font-medium focus-visible:outline-2 ${s.present_today === false ? "border-zinc-400 text-zinc-600" : "border-green-700 text-green-800"}`}>
              {s.present_today === false ? "✗ Absent" : "✓ Here"}
            </button>
          </form>
        </td>
      )}
    </tr>
  );
}
