"use server";

import { revalidatePath } from "next/cache";
import { getStaff } from "@/server/auth";
import { aiConfigured } from "@/server/ai";
import { importVideoLesson } from "@/server/lesson-import";
import { fetchTranscript, getVideoTitle, parsePastedTranscript, parseYouTubeId, parseYouTubeStart } from "@/server/youtube";

export type ImportState = { ok: true; lessonId: string; usedAi: boolean; note: string | null } | { ok: false; error: string; needTranscript?: boolean };

export async function importFromYouTube(moduleId: string, link: string, pastedTranscript: string): Promise<ImportState> {
  if ((await getStaff())?.role !== "admin") return { ok: false, error: "Only CIC staff can import lessons." };
  const videoId = parseYouTubeId(link);
  if (!videoId) return { ok: false, error: "That doesn't look like a YouTube link. Copy it from the browser's address bar." };
  if (!/^[0-9a-f-]{36}$/i.test(moduleId)) return { ok: false, error: "Pick the unit this lesson belongs to." };
  try {
    const [title, fetched] = await Promise.all([getVideoTitle(videoId), pastedTranscript.trim() ? null : fetchTranscript(videoId)]);
    const transcript = pastedTranscript.trim() ? parsePastedTranscript(pastedTranscript.slice(0, 60000)) : fetched;
    // YouTube often blocks reading captions from a server. Rather than a half-empty draft, ask for the transcript.
    if (aiConfigured() && !transcript?.length) {
      return { ok: false, needTranscript: true, error: "We couldn't read what this video says. On YouTube, click ⋯ under the video → Show transcript, copy all of it, and paste it below." };
    }
    const r = await importVideoLesson({ moduleId, videoId, videoTitle: title, transcript, startSeconds: parseYouTubeStart(link) });
    revalidatePath("/admin/curriculum", "layout");
    return { ok: true, ...r };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}
