import "server-only";

// Reads a YouTube video's title and captions so AI can draft a lesson from them.
// Caption fetching uses YouTube's public player data and can be blocked; callers fall back to a
// pasted transcript (CIC can copy it from YouTube: ⋯ → Show transcript).

export function parseYouTubeId(input: string): string | null {
  const s = input.trim();
  if (/^[\w-]{11}$/.test(s)) return s;
  try {
    const u = new URL(s);
    if (u.hostname.endsWith("youtu.be")) return u.pathname.slice(1, 12) || null;
    if (u.hostname.endsWith("youtube.com") || u.hostname.endsWith("youtube-nocookie.com")) {
      const v = u.searchParams.get("v") ?? u.pathname.match(/\/(?:embed|shorts|live)\/([\w-]{11})/)?.[1];
      return v && /^[\w-]{11}$/.test(v) ? v : null;
    }
  } catch {}
  return null;
}

export async function getVideoTitle(id: string): Promise<string | null> {
  const res = await fetch(`https://www.youtube.com/oembed?format=json&url=${encodeURIComponent(`https://www.youtube.com/watch?v=${id}`)}`, { signal: AbortSignal.timeout(8000) }).catch(() => null);
  if (!res?.ok) return null;
  return ((await res.json()) as { title?: string }).title ?? null;
}

export type TranscriptLine = { seconds: number; text: string };

export async function fetchTranscript(id: string): Promise<TranscriptLine[] | null> {
  try {
    const page = await fetch(`https://www.youtube.com/watch?v=${id}&hl=en`, {
      headers: { "Accept-Language": "en-US,en;q=0.9", "User-Agent": "Mozilla/5.0 (CIC Launchpad lesson import)" },
      signal: AbortSignal.timeout(10000),
    });
    const html = await page.text();
    const tracks = JSON.parse(html.match(/"captionTracks":(\[.*?\])/)?.[1] ?? "null") as { baseUrl: string; languageCode: string }[] | null;
    const track = tracks?.find((t) => t.languageCode.startsWith("en")) ?? tracks?.[0];
    if (!track) return null;
    const xml = await (await fetch(track.baseUrl, { signal: AbortSignal.timeout(10000) })).text();
    const lines = [...xml.matchAll(/<text start="([\d.]+)"[^>]*>([\s\S]*?)<\/text>/g)].map((m) => ({ seconds: Math.floor(Number(m[1])), text: decode(m[2]) }));
    return lines.length ? lines : null;
  } catch {
    return null;
  }
}

/** Accepts a pasted transcript, with or without "1:23" timestamps. */
export function parsePastedTranscript(text: string): TranscriptLine[] {
  let last = 0;
  const out: TranscriptLine[] = [];
  for (const raw of text.split("\n")) {
    const line = raw.trim();
    if (!line) continue;
    const ts = line.match(/^(?:(\d+):)?(\d{1,2}):(\d{2})\s*(.*)$/);
    if (ts) {
      last = Number(ts[1] ?? 0) * 3600 + Number(ts[2]) * 60 + Number(ts[3]);
      if (ts[4]) out.push({ seconds: last, text: ts[4] });
    } else out.push({ seconds: last, text: line });
  }
  return out;
}

function decode(s: string) {
  return s.replace(/&amp;#39;|&#39;/g, "'").replace(/&amp;quot;|&quot;/g, '"').replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();
}
