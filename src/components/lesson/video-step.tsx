"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { answerPausePoint } from "@/app/learn/[lessonId]/actions";
import { Button } from "@/components/ui/button";
import type { AnswerResult } from "@/types/student-lesson";
import { Feedback } from "./feedback";
import type { StepProps } from "./simple-steps";

// A YouTube video that pauses itself at quiz points ("Quick check before we continue").
// Students can't skip past a question they haven't answered. Answers are checked on the server.

type YTPlayer = { getCurrentTime(): number; getDuration(): number; pauseVideo(): void; playVideo(): void; seekTo(s: number, allowAhead: boolean): void; destroy(): void };
type YTNamespace = { Player: new (el: HTMLElement, opts: object) => YTPlayer };
declare global { interface Window { YT?: YTNamespace; onYouTubeIframeAPIReady?: () => void } }

let apiPromise: Promise<YTNamespace> | null = null;
function loadYouTubeApi(): Promise<YTNamespace> {
  if (window.YT?.Player) return Promise.resolve(window.YT);
  apiPromise ??= new Promise((resolve) => {
    window.onYouTubeIframeAPIReady = () => resolve(window.YT!);
    const s = document.createElement("script");
    s.src = "https://www.youtube.com/iframe_api";
    document.head.appendChild(s);
  });
  return apiPromise;
}

const mmss = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;

export function VideoStep({ activity }: StepProps<"video">) {
  const { youtube_id, key_points, pause_points } = activity.step;
  const host = useRef<HTMLDivElement>(null);
  const player = useRef<YTPlayer | null>(null);
  const answered = useRef(new Set<number>());
  const [solved, setSolved] = useState<number[]>([]);
  const [active, setActive] = useState<(typeof pause_points)[number] | null>(null);
  const [duration, setDuration] = useState(0);
  const [choice, setChoice] = useState<number | null>(null);
  const [result, setResult] = useState<AnswerResult | null>(null);
  const [pending, start] = useTransition();
  const quizRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    if (!youtube_id || !host.current) return;
    let timer: ReturnType<typeof setInterval> | undefined;
    let cancelled = false;
    loadYouTubeApi().then((YT) => {
      if (cancelled || !host.current) return;
      player.current = new YT.Player(host.current, {
        videoId: youtube_id, host: "https://www.youtube-nocookie.com",
        playerVars: { rel: 0, modestbranding: 1 },
        events: { onReady: () => setDuration(player.current?.getDuration() ?? 0) },
      });
      timer = setInterval(() => {
        const p = player.current;
        if (!p?.getCurrentTime) return;
        const t = p.getCurrentTime();
        const next = pause_points.find((q) => !answered.current.has(q.at_seconds));
        if (next && t >= next.at_seconds) {
          if (t > next.at_seconds + 2) p.seekTo(next.at_seconds, true); // no skipping past a question
          p.pauseVideo();
          setActive((cur) => cur ?? next);
        }
      }, 300);
    });
    return () => { cancelled = true; clearInterval(timer); player.current?.destroy?.(); player.current = null; };
  }, [youtube_id, pause_points]);

  useEffect(() => { if (active) quizRef.current?.focus(); }, [active]);

  function check() {
    if (!active || choice === null) return;
    start(async () => {
      try {
        const r = await answerPausePoint(activity.id, active.at_seconds, choice);
        setResult(r);
        if (r.correct) {
          answered.current.add(active.at_seconds);
          setSolved((s) => [...s, active.at_seconds]);
          setTimeout(() => { setActive(null); setChoice(null); setResult(null); player.current?.playVideo(); }, 1200);
        }
      } catch (e) { setResult({ correct: false, message: (e as Error).message }); }
    });
  }

  if (!youtube_id) return <p className="text-muted-foreground">No video has been added to this step yet.</p>;
  return (
    <div className="space-y-4">
      <div className="relative aspect-video overflow-hidden rounded-lg border bg-black">
        <div ref={host} className="size-full" title={activity.title || "Lesson video"} />
        {active && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/70 p-4">
            <div role="dialog" aria-modal="false" aria-labelledby={`pp-${activity.id}`} className="w-full max-w-lg space-y-3 rounded-xl bg-background p-5 shadow-lg">
              <p className="text-sm font-medium text-muted-foreground">Quick check before we continue · {mmss(active.at_seconds)}</p>
              <h2 id={`pp-${activity.id}`} ref={quizRef} tabIndex={-1} className="text-lg font-semibold outline-none">{active.prompt}</h2>
              <fieldset className="space-y-2">
                <legend className="sr-only">Choose an answer</legend>
                {active.options.map((o, i) => (
                  <label key={i} className="flex cursor-pointer items-center gap-3 rounded-lg border p-3 has-checked:border-primary has-checked:bg-muted has-focus-visible:outline-2">
                    <input type="radio" name={`pp-${activity.id}-${active.at_seconds}`} checked={choice === i} onChange={() => setChoice(i)} className="size-5" />
                    {o}
                  </label>
                ))}
              </fieldset>
              <Button onClick={check} disabled={choice === null || pending}>{pending ? "Checking…" : "Check my answer"}</Button>
              <Feedback result={result} />
            </div>
          </div>
        )}
      </div>
      {pause_points.length > 0 && (
        <div>
          <p className="text-sm text-muted-foreground">The video stops {pause_points.length} time{pause_points.length === 1 ? "" : "s"} for a quick question ({solved.length} answered).</p>
          <div className="relative mt-2 h-2 rounded-full bg-muted" aria-hidden="true">
            {duration > 0 && pause_points.map((q) => (
              <span key={q.at_seconds} className={`absolute -top-1 size-4 rounded-full border-2 ${solved.includes(q.at_seconds) ? "border-green-700 bg-green-700" : "border-primary bg-background"}`}
                style={{ left: `calc(${(q.at_seconds / duration) * 100}% - 8px)` }} />
            ))}
          </div>
        </div>
      )}
      {key_points.length > 0 && (
        <div><p className="font-medium">Key points</p><ul className="list-disc space-y-1 pl-5">{key_points.map((k) => <li key={k}>{k}</li>)}</ul></div>
      )}
    </div>
  );
}
