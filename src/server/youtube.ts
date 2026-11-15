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

/** The "start at" time in a link (…&t=2848s, ?t=47m28s, &start=90), in seconds; 0 if none. */
export function parseYouTubeStart(input: string): number {
  let raw: string | null = null;
  try {
    const u = new URL(input.trim());
    raw = u.searchParams.get("t") ?? u.searchParams.get("start") ?? new URLSearchParams(u.hash.slice(1)).get("t");
  } catch {
    return 0;
  }
  if (!raw) return 0;
  if (/^\d+s?$/.test(raw)) return parseInt(raw, 10);
  const m = raw.match(/^(?:(\d+)h)?(?:(\d+)m)?(?:(\d+)s)?$/);
  return m ? Number(m[1] ?? 0) * 3600 + Number(m[2] ?? 0) * 60 + Number(m[3] ?? 0) : 0;
}

export async function getVideoTitle(id: string): Promise<string | null> {
  const res = await fetch(`https://www.youtube.com/oembed?format=json&url=${encodeURIComponent(`https://www.youtube.com/watch?v=${id}`)}`, { signal: AbortSignal.timeout(8000) }).catch(() => null);
  if (!res?.ok) return null;
  return ((await res.json()) as { title?: string }).title ?? null;
}

export type TranscriptLine = { seconds: number; text: string };

export async function fetchTranscript(id: string): Promise<TranscriptLine[] | null> {
  return (await fromWatchPage(id)) ?? (await fromAppApi(id));
}

type Track = { baseUrl: string; languageCode: string; kind?: string };
const pickTrack = (tracks: Track[] | null | undefined) =>
  tracks?.find((t) => t.languageCode.startsWith("en") && t.kind !== "asr") ?? tracks?.find((t) => t.languageCode.startsWith("en")) ?? tracks?.[0];

// YouTube now often returns an empty caption file to plain web requests; the same captions are still
// served to its mobile app's public API, so we try that second.
async function fromAppApi(id: string): Promise<TranscriptLine[] | null> {
  try {
    const res = await fetch("https://www.youtube.com/youtubei/v1/player?prettyPrint=false", {
      method: "POST",
      headers: { "Content-Type": "application/json", "User-Agent": "com.google.android.youtube/20.10.38 (Linux; U; Android 11) gzip" },
      body: JSON.stringify({ context: { client: { clientName: "ANDROID", clientVersion: "20.10.38", androidSdkVersion: 30, hl: "en" } }, videoId: id }),
      signal: AbortSignal.timeout(10000),
    });
    const data = (await res.json()) as { captions?: { playerCaptionsTracklistRenderer?: { captionTracks?: Track[] } } };
    const track = pickTrack(data.captions?.playerCaptionsTracklistRenderer?.captionTracks);
    if (!track) return null;
    return parseCaptionXml(await (await fetch(track.baseUrl, { signal: AbortSignal.timeout(10000) })).text());
  } catch {
    return null;
  }
}

async function fromWatchPage(id: string): Promise<TranscriptLine[] | null> {
  try {
    const page = await fetch(`https://www.youtube.com/watch?v=${id}&hl=en`, {
      headers: { "Accept-Language": "en-US,en;q=0.9", "User-Agent": "Mozilla/5.0 (CIC Launchpad lesson import)" },
      signal: AbortSignal.timeout(10000),
    });
    const html = await page.text();
    const track = pickTrack(JSON.parse(html.match(/"captionTracks":(\[.*?\])/)?.[1] ?? "null") as Track[] | null);
    if (!track) return null;
    return parseCaptionXml(await (await fetch(track.baseUrl, { signal: AbortSignal.timeout(10000) })).text());
  } catch {
    return null;
  }
}

/** Reads both caption formats YouTube serves: <text start="1.5"> (seconds) and <p t="1500"> (milliseconds). */
export function parseCaptionXml(xml: string): TranscriptLine[] | null {
  const lines = [
    ...[...xml.matchAll(/<text start="([\d.]+)"[^>]*>([\s\S]*?)<\/text>/g)].map((m) => ({ seconds: Math.floor(Number(m[1])), text: decode(m[2]) })),
    ...[...xml.matchAll(/<p t="(\d+)"[^>]*>([\s\S]*?)<\/p>/g)].map((m) => ({ seconds: Math.floor(Number(m[1]) / 1000), text: decode(m[2]) })),
  ].filter((l) => l.text);
  return lines.length ? lines : null;
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
