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

// The live classroom (Calm Mint design): three columns a teacher reads at a glance:
// Needs help · Behind (+ not started) · On track. Every status has a symbol and a word.
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
  const by = (s: ClassroomStudent["status"]) => students.filter((x) => x.status === s);
  const onTrack = by("on_track");
  const shownOnTrack = showAll ? onTrack : onTrack.slice(0, 4);
  const card = (s: ClassroomStudent) => <StudentCard key={s.id} s={s} classId={cls.id} sessionId={today?.session_id} now={now} catchUp={catchUp.get(s.id)} />;

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
          {cls.school} · Today: {today?.lesson_title ?? "no class"}{today ? ` · ${attendance.present} here, ${attendance.absent} absent` : ""} · Code <span className="font-mono font-bold text-foreground">{cls.class_code}</span>
        </p>
      </div>

      <div className="grid items-stretch gap-4 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <dl className="m-0 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {(Object.keys(COUNT_TILE) as (keyof typeof COUNT_TILE)[]).map((k) => (
            <div key={k} className={`flex flex-col-reverse justify-end gap-1 rounded-[22px] px-5 py-4 ${COUNT_TILE[k].tone}`}>
              <dt className="text-base font-medium">{COUNT_TILE[k].label}</dt>
              <dd className="m-0 text-4xl leading-none font-bold tabular-nums">{counts[k]}</dd>
            </div>
          ))}
        </dl>
        <section aria-labelledby="topics-h" className="flex flex-col gap-2.5 rounded-[22px] bg-card px-5 py-4 text-[15px]">
          <h2 id="topics-h" className="text-base font-semibold">Where the class is stuck</h2>
          {mastery.ok && mastery.data.length ? mastery.data.slice(0, 3).map((m) => (
            <div key={m.concept_tag}>
              <div className="flex justify-between gap-3"><span className="font-medium capitalize">{m.concept_tag}</span><span className="tabular-nums">{m.percent_struggling}% stuck</span></div>
              <div aria-hidden="true" className="mt-1 h-2 rounded-full bg-background"><div className="h-full rounded-full bg-[#C2452F]" style={{ width: `${m.percent_struggling ? Math.max(m.percent_struggling, 3) : 0}%` }} /></div>
            </div>
          )) : <p className="text-muted-foreground">Topic results appear once students start answering.</p>}
        </section>
      </div>

      {!students.length && <p className="rounded-3xl bg-card p-10 text-center text-lg">No students in this class yet. Add them from <Link href="/teach/new">Set up a class</Link>.</p>}

      <div className="grid items-start gap-5 lg:grid-cols-3">
        <section aria-labelledby="help-col" className="flex flex-col gap-2.5">
          <h2 id="help-col" className={COL_HEAD + " bg-help text-help-ink"}>! Needs help · {counts.needs_help}</h2>
          {by("needs_help").map(card)}
          {!counts.needs_help && <p className="rounded-[22px] bg-card px-5 py-4 text-muted-foreground">Nobody is stuck right now.</p>}
        </section>
        <section aria-labelledby="behind-col" className="flex flex-col gap-2.5">
          <h2 id="behind-col" className={COL_HEAD + " bg-behind text-behind-ink"}>◷ Behind · {counts.behind}</h2>
          {by("behind").map(card)}
          {counts.behind > 1 && !by("behind").every((s) => catchUp.get(s.id)) && (
            <form action={assignCatchUpAction}>
              <input type="hidden" name="classId" value={cls.id} />
              <input type="hidden" name="studentIds" value={by("behind").filter((s) => !catchUp.get(s.id)).map((s) => s.id).join(",")} />
              <button type="submit" className="h-11 cursor-pointer rounded-full border-2 border-primary bg-card px-5 font-semibold hover:bg-secondary">Assign catch-up to everyone behind</button>
            </form>
          )}
          {counts.not_started > 0 && (
            <details className="rounded-[22px] border-2 border-dashed border-[#7FA08B] px-5 py-3.5">
              <summary className="cursor-pointer">○ {counts.not_started} student{counts.not_started === 1 ? " hasn't" : "s haven't"} started</summary>
              <div className="mt-3 flex flex-col gap-2.5">{by("not_started").map(card)}</div>
            </details>
          )}
        </section>
        <section aria-labelledby="ok-col" className="flex flex-col gap-2.5">
          <h2 id="ok-col" className={COL_HEAD + " bg-ontrack text-ontrack-ink"}>✓ On track · {counts.on_track}</h2>
          {shownOnTrack.map(card)}
          {onTrack.length > shownOnTrack.length && <Link href={`/teach/${cls.id}?show=all`} className="px-5 py-1.5">Show {onTrack.length - shownOnTrack.length} more on track</Link>}
        </section>
      </div>
    </div>
  );
}

const COL_HEAD = "self-start rounded-full px-4 py-1.5 text-lg font-semibold";

const COUNT_TILE = {
  needs_help: { label: "! Needs help", tone: "bg-help text-help-ink" },
  behind: { label: "◷ Behind", tone: "bg-behind text-behind-ink" },
  not_started: { label: "○ Not started", tone: "border-2 border-dashed border-[#7FA08B] bg-card" },
  on_track: { label: "✓ On track", tone: "bg-ontrack text-ontrack-ink" },
};

// Tinted card + a coloured left edge, so the status reads at a glance (the words say it too).
const TONE = {
  needs_help: "bg-help text-help-ink border-l-[6px] border-[#C2452F]",
  behind: "bg-behind text-behind-ink border-l-[6px] border-[#C77700]",
  not_started: "bg-card text-foreground border-l-[6px] border-[#7FA08B]",
  on_track: "bg-card text-foreground border-l-[6px] border-[#0DB031]",
};

function StudentCard({ s, classId, sessionId, now, catchUp }: { s: ClassroomStudent; classId: string; sessionId?: string; now: number; catchUp: CatchUp }) {
  const muted = s.status === "on_track" || s.status === "not_started" ? "text-muted-foreground" : "";
  return (
    <article className={`rounded-[22px] px-5 py-4 ${TONE[s.status]}`}>
      <div className="flex items-baseline justify-between gap-3">
        <Link href={`/teach/${classId}/students/${s.id}`} className="text-xl font-semibold text-inherit">{s.label}</Link>
        <span className="text-[15px] tabular-nums">{s.percent_complete}% done</span>
      </div>
      <p className={`text-[15px] ${muted}`}>
        {[
          s.current ? `${s.current.lesson_title} · step ${s.current.step}` : null,
          s.time_on_task_ms ? `${formatDuration(s.time_on_task_ms)} on task` : null,
          s.last_active_at ? `active ${timeAgo(s.last_active_at, now)}` : "No activity yet",
        ].filter(Boolean).join(" · ")}
      </p>
      {s.reasons.length > 0 && s.status !== "on_track" && <p className="mt-1.5 font-semibold">{s.reasons.join(" · ")}</p>}
      {catchUp === "caught_up" && <p className="mt-1.5 font-semibold text-[#047D13]">✓ Caught up</p>}
      {catchUp === "assigned" && <p className="mt-1.5 font-semibold">Catch-up assigned</p>}
      <div className="mt-2.5 flex flex-wrap items-center gap-2.5">
        {s.status === "needs_help" && (
          <Link href={`/teach/${classId}/students/${s.id}#help`} className="inline-flex h-11 items-center rounded-full bg-primary px-5 text-base font-semibold text-primary-foreground no-underline hover:bg-[#047D13]">Help me teach this</Link>
        )}
        {s.status === "behind" && !catchUp && (
          <form action={assignCatchUpAction}>
            <input type="hidden" name="classId" value={classId} /><input type="hidden" name="studentIds" value={s.id} />
            <button type="submit" className="h-11 cursor-pointer rounded-full border-2 border-primary bg-card px-5 text-base font-semibold text-foreground hover:bg-secondary">Assign catch-up</button>
          </form>
        )}
        {sessionId && (
          <form action={markAttendance} className="ml-auto">
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
