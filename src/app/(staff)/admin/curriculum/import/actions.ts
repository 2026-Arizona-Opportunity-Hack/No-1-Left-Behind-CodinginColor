"use server";

import { can } from "@/lib/permissions";

import { revalidatePath } from "next/cache";
import { getStaff } from "@/server/auth";
import { aiConfigured } from "@/server/ai";
import { z } from "zod";
import { MAX_SLIDES } from "@/lib/pptx";
import { importSlideLesson, importVideoLesson } from "@/server/lesson-import";
import { fetchTranscript, getVideoTitle, parsePastedTranscript, parseYouTubeId, parseYouTubeStart } from "@/server/youtube";

export type ImportState = { ok: true; lessonId: string; moduleId: string; usedAi: boolean; note: string | null } | { ok: false; error: string; needTranscript?: boolean };

export async function importFromYouTube(moduleId: string | null, link: string, pastedTranscript: string, moduleTitle?: string): Promise<ImportState> {
  if (!can(await getStaff(), "curriculum.write")) return { ok: false, error: "Only CIC staff can import lessons." };
  const videoId = parseYouTubeId(link);
  if (!videoId) return { ok: false, error: "That doesn't look like a YouTube link. Copy it from the browser's address bar." };
  if (moduleId !== null && !/^[0-9a-f-]{36}$/i.test(moduleId)) return { ok: false, error: "Pick the unit this lesson belongs to." };
  try {
    const [title, fetched] = await Promise.all([getVideoTitle(videoId), pastedTranscript.trim() ? null : fetchTranscript(videoId)]);
    const transcript = pastedTranscript.trim() ? parsePastedTranscript(pastedTranscript.slice(0, 60000)) : fetched;
    // YouTube often blocks reading captions from a server. Rather than a half-empty draft, ask for the transcript.
    if (aiConfigured() && !transcript?.length) {
      return { ok: false, needTranscript: true, error: "We couldn't read what this video says. On YouTube, click ⋯ under the video → Show transcript, copy all of it, and paste it below." };
    }
    const r = await importVideoLesson({ moduleId, moduleTitle: moduleTitle?.trim().slice(0,200), videoId, videoTitle: title, transcript, startSeconds: parseYouTubeStart(link) });
    revalidatePath("/", "layout");
    return { ok: true, ...r };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}

const slidesSchema = z.array(z.object({
  heading: z.string().max(300), body: z.string().max(4000), notes: z.string().max(4000),
})).min(1).max(MAX_SLIDES);

/** The browser reads the .pptx and sends only the slide text (no images, nothing about students). */
export async function importFromSlides(moduleId: string | null, deckName: string, slides: unknown, moduleTitle?: string): Promise<ImportState> {
  if (!can(await getStaff(), "curriculum.write")) return { ok: false, error: "Only CIC staff can import lessons." };
  if (moduleId !== null && !/^[0-9a-f-]{36}$/i.test(moduleId)) return { ok: false, error: "Pick the unit this lesson belongs to." };
  const parsed = slidesSchema.safeParse(slides);
  if (!parsed.success) return { ok: false, error: "We couldn't find any words on those slides. Check it's the right file." };
  try {
    const name = deckName.replace(/\.pptx$/i, "").replace(/[_-]+/g, " ").trim().slice(0, 120);
    const r = await importSlideLesson({ moduleId, moduleTitle: moduleTitle?.trim().slice(0,200), deckName: name, slides: parsed.data });
    revalidatePath("/", "layout");
    return { ok: true, ...r };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}
