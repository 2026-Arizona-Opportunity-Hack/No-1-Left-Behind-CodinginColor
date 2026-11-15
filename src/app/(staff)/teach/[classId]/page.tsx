import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { AutoRefresh } from "@/components/teach/auto-refresh";
import { CopyLinkButton } from "@/components/teach/copy-link-button";
import { formatDuration, timeAgo } from "@/lib/status-display";
import { requireStaff } from "@/server/auth";
import { getCatchUpState } from "@/server/catch-up-teacher";
import { getClassroom, getTopicMastery } from "@/server/dashboard";
import type { ClassroomStudent } from "@/types/dashboard";
import { assignCatchUpAction, markAttendance } from "./actions";

// Live, per-user data: navigations wait for it rather than showing a prerendered shell.
export const instant = false;

export const metadata: Metadata = { title: "Live classroom · CIC Launchpad" };

type Props = { params: Promise<{ classId: string }>; searchParams: Promise<{ show?: string }> };
type CatchUp = "assigned" | "caught_up" | undefined;

// The live classroom: one plain sentence, then one line per student, most urgent first
// (needs help, behind, not started). Students doing fine are folded away until asked for.
export default async function LiveClassroom({ params, searchParams }: Props) {
  await connection(); // per-user, live data: render at request time
  const { classId } = await params;
  await requireStaff(["instructor", "admin"], `/teach/${classId}`);
  const showAll = (await searchParams).show === "all";
  const [room, mastery, catchUp] = await Promise.all([getClassroom(classId), getTopicMastery(classId), getCatchUpState(classId)]);

  if (!room.ok) {
    return (
      <div className="space-y-3">
        <h1 className="text-3xl font-bold tracking-tight">We couldn&apos;t open that class</h1>
        <p className="text-muted-foreground">{room.error}</p>
        <Link href="/teach">Back to my classes</Link>
      </div>
    );
  }
  const { class: cls, today, attendance, students, counts } = room.data;
  const now = Date.parse(new Date().toISOString());
  const by = (st: ClassroomStudent["status"]) => students.filter((x) => x.status === st);
  const fine = by("on_track");
  const behindWithout = by("behind").filter((x) => !catchUp.get(x.id));
  const hardest = mastery.ok ? mastery.data.find((m) => m.percent_struggling > 0) : undefined;
  const row = (x: ClassroomStudent) => <StudentRow key={x.id} s={x} classId={cls.id} sessionId={today?.session_id} now={now} catchUp={catchUp.get(x.id)} />;
  const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center gap-x-8 gap-y-2">
        <Link href="/teach" className="flex-1 text-base text-foreground no-underline"><span aria-hidden="true" className="font-mono font-extrabold text-[#0DB031]">&lt;</span> My classes</Link>
        <span className="flex items-center gap-2 text-base"><i aria-hidden="true" className="size-2.5 rounded-full bg-[#0DB031]" /><AutoRefresh /></span>
        <CopyLinkButton classCode={cls.class_code} />
      </div>

      <div>
        <h1 className="text-4xl leading-none font-bold tracking-tight sm:text-5xl">{cls.name}</h1>
        <p className="mt-2 text-muted-foreground">
          {cls.school} · Today: {today?.lesson_title ?? "no class"}{today ? ` · ${attendance.present} here, ${attendance.absent} absent` : ""} · Class code <span className="font-mono font-bold text-foreground">{cls.class_code}</span>
        </p>
      </div>

      {!students.length ? (
        <p className="rounded-3xl bg-card p-10 text-center text-lg">No students in this class yet. Add them from <Link href="/teach/new">Set up a class</Link>.</p>
      ) : (
        <>
          {/* One plain sentence first: the whole class at a glance. */}
          <p className="text-2xl leading-snug">
            {counts.needs_help
              ? <b className="font-semibold text-[#B3261E]">{plural(counts.needs_help, "student needs", "students need")} help.</b>
              : <b className="font-semibold">Nobody needs help right now.</b>}
            {counts.behind ? ` ${plural(counts.behind, "is", "are")} behind.` : ""}
            {counts.not_started ? ` ${counts.not_started} ${counts.not_started === 1 ? "hasn't" : "haven't"} started.` : ""}
            {` ${counts.on_track} ${counts.on_track === 1 ? "is" : "are"} doing fine.`}
          </p>

          <section aria-label="Students who need your attention" className="flex flex-col gap-2.5">
            {by("needs_help").map(row)}
            {by("behind").map(row)}
            {by("not_started").map(row)}
            {behindWithout.length > 1 && (
              <form action={assignCatchUpAction} className="self-start">
                <input type="hidden" name="classId" value={cls.id} />
                <input type="hidden" name="studentIds" value={behindWithout.map((x) => x.id).join(",")} />
                <button type="submit" className="h-11 cursor-pointer rounded-full border-2 border-primary bg-card px-5 font-semibold hover:bg-secondary">Give a catch-up to all {behindWithout.length} who are behind</button>
              </form>
            )}
            {fine.length > 0 && (
              <details open={showAll} className="group rounded-[22px] bg-card">
                <summary className="flex min-h-12 cursor-pointer items-center px-5 font-semibold text-[#047D13]">
                  <span className="group-open:hidden">Show the {plural(fine.length, "student", "students")} doing fine</span>
                  <span className="hidden group-open:inline">Hide the {plural(fine.length, "student", "students")} doing fine</span>
                </summary>
                <div className="flex flex-col gap-2 px-2.5 pb-2.5">{fine.map(row)}</div>
              </details>
            )}
          </section>

          {hardest && <p className="text-muted-foreground">Hardest topic right now: <b className="font-semibold text-foreground capitalize">{hardest.concept_tag}</b> ({hardest.percent_struggling}% of the class is stuck on it)</p>}
        </>
      )}
    </div>
  );
}

// One line per student. The colour matches the status (red needs help, yellow behind, green doing fine),
// and the word and symbol say it too, so colour is never the only signal.
const LOOK = {
  needs_help: { row: "bg-help text-help-ink", word: "! Needs help" },
  behind: { row: "bg-sun text-sun-ink", word: "◷ Behind" },
  not_started: { row: "bg-card text-foreground border-2 border-dashed border-[#7FA08B]", word: "○ Not started" },
  on_track: { row: "bg-ontrack text-ontrack-ink", word: "✓ Doing fine" },
};

function StudentRow({ s, classId, sessionId, now, catchUp }: { s: ClassroomStudent; classId: string; sessionId?: string; now: number; catchUp: CatchUp }) {
  const look = LOOK[s.status];
  const where = s.current ? `${s.current.lesson_title}, step ${s.current.step}` : "No activity yet";
  const why = s.status === "on_track" || !s.reasons.length ? where : s.reasons[0];
  return (
    <article className={`grid items-center gap-x-5 gap-y-2 rounded-[20px] px-5 py-3.5 sm:grid-cols-[minmax(0,13rem)_minmax(0,1fr)_auto] ${look.row}`}>
      <Link href={`/teach/${classId}/students/${s.id}`} className="text-lg font-semibold text-inherit">{s.label}</Link>
      <p className="m-0 min-w-0">
        <span className="font-semibold">{look.word}</span>
        <span> · {why}</span>
        <span className="block text-sm opacity-80">
          {[`${s.percent_complete}% done`, s.time_on_task_ms ? `working for ${formatDuration(s.time_on_task_ms)}` : null,
            s.last_active_at ? `active ${timeAgo(s.last_active_at, now)}` : null].filter(Boolean).join(" · ")}
        </span>
      </p>
      <div className="flex flex-wrap items-center gap-3 sm:justify-end">
        {s.status === "needs_help" && (
          <Link href={`/teach/${classId}/students/${s.id}#help`} className="inline-flex h-11 items-center rounded-full bg-primary px-5 text-base font-semibold text-primary-foreground no-underline hover:bg-[#047D13]">Help me teach this</Link>
        )}
        {s.status === "behind" && !catchUp && (
          <form action={assignCatchUpAction}>
            <input type="hidden" name="classId" value={classId} /><input type="hidden" name="studentIds" value={s.id} />
            <button type="submit" className="h-11 cursor-pointer rounded-full border-2 border-primary bg-card px-5 text-base font-semibold text-foreground hover:bg-secondary">Give catch-up</button>
          </form>
        )}
        {catchUp === "assigned" && <span className="font-semibold">✓ Catch-up given</span>}
        {catchUp === "caught_up" && <span className="font-semibold">✓ Caught up</span>}
        {sessionId && (
          <form action={markAttendance}>
            <input type="hidden" name="classId" value={classId} />
            <input type="hidden" name="sessionId" value={sessionId} />
            <input type="hidden" name="studentId" value={s.id} />
            <input type="hidden" name="status" value={s.present_today === false ? "present" : "absent"} />
            <button type="submit" aria-label={`${s.label}: ${s.present_today === false ? "absent, mark present" : "here, mark absent"}`}
              className="cursor-pointer border-0 bg-transparent p-0 text-[15px] font-medium text-inherit underline underline-offset-2">
              {s.present_today === false ? "✗ Absent" : "✓ Here"}
            </button>
          </form>
        )}
      </div>
    </article>
  );
}
