import { strFromU8, unzipSync } from "fflate";

// Reads the words out of a PowerPoint (.pptx) file: each slide's title, its other text, and the
// speaker notes. A .pptx is a zip of XML files, so this runs in the browser and only the text
// (never the images) is sent on. Pictures and charts are skipped.

export type DeckSlide = { heading: string; body: string; notes: string };

export const MAX_SLIDES = 60;

const unescape = (s: string) =>
  s.replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n))).replace(/&amp;/g, "&");

/** Each <a:p> paragraph becomes one line of text. */
function paragraphs(xml: string): string[] {
  return [...xml.matchAll(/<a:p\b[^>]*>([\s\S]*?)<\/a:p>/g)]
    // Keep leading spaces: in Python code they are the indentation.
    .map((p) => [...p[1].matchAll(/<a:t(?:\s[^>]*)?>([\s\S]*?)<\/a:t>/g)].map((t) => unescape(t[1])).join("").replace(/\s+$/, ""))
    .filter((line) => line.trim());
}

const shapes = (xml: string) => [...xml.matchAll(/<p:sp\b[\s\S]*?<\/p:sp>/g)].map((m) => m[0]);
const placeholder = (shape: string) => shape.match(/<p:ph\b[^>]*\btype="([^"]+)"/)?.[1] ?? null;

function readSlide(xml: string): { heading: string; body: string } {
  let heading = "";
  const body: string[] = [];
  for (const sp of shapes(xml)) {
    const type = placeholder(sp);
    const lines = paragraphs(sp);
    if (!lines.length || type === "sldNum" || type === "dt" || type === "ftr") continue;
    if (!heading && (type === "title" || type === "ctrTitle")) heading = lines.join(" ").trim();
    else body.push(...lines);
  }
  if (!heading && body.length) heading = body.shift()!.trim();
  return { heading, body: body.join("\n") };
}

function readNotes(xml: string): string {
  return shapes(xml).filter((sp) => placeholder(sp) === "body").flatMap(paragraphs).join("\n");
}

/** Resolves "../notesSlides/notesSlide3.xml" against "ppt/slides/". */
const resolve = (base: string, target: string) => {
  const parts = (base + target).split("/");
  const out: string[] = [];
  for (const p of parts) {
    if (p === "..") out.pop();
    else if (p && p !== ".") out.push(p);
  }
  return out.join("/");
};

const relTargets = (rels: string | undefined) =>
  new Map([...(rels ?? "").matchAll(/<Relationship\b[^>]*>/g)].map((m) => [
    m[0].match(/\bId="([^"]+)"/)?.[1] ?? "", m[0].match(/\bTarget="([^"]+)"/)?.[1] ?? "",
  ]));

/** Throws a plain-language error if the file isn't a PowerPoint file. */
export function readPptx(bytes: Uint8Array): DeckSlide[] {
  let files: Record<string, Uint8Array>;
  try {
    files = unzipSync(bytes, { filter: (f) => f.name.endsWith(".xml") || f.name.endsWith(".rels") });
  } catch {
    throw new Error("That file isn't a PowerPoint file we can read. Save it as .pptx and try again.");
  }
  const text = (name: string) => (files[name] ? strFromU8(files[name]) : undefined);
  const presentation = text("ppt/presentation.xml");
  if (!presentation) throw new Error("That file isn't a PowerPoint (.pptx) file. In PowerPoint or Google Slides, download it as .pptx.");

  // Slide order comes from presentation.xml (the slide files' numbers can be out of order).
  const rels = relTargets(text("ppt/_rels/presentation.xml.rels"));
  let order = [...presentation.matchAll(/<p:sldId\b[^>]*\br:id="([^"]+)"/g)]
    .map((m) => rels.get(m[1])).filter((t): t is string => Boolean(t)).map((t) => resolve("ppt/", t));
  if (!order.length) {
    order = Object.keys(files).filter((n) => /^ppt\/slides\/slide\d+\.xml$/.test(n))
      .sort((a, b) => Number(a.match(/\d+/g)!.at(-1)) - Number(b.match(/\d+/g)!.at(-1)));
  }

  return order.slice(0, MAX_SLIDES).flatMap((path) => {
    const xml = text(path);
    if (!xml) return [];
    const { heading, body } = readSlide(xml);
    const slideRels = relTargets(text(path.replace(/slides\/(slide\d+\.xml)$/, "slides/_rels/$1.rels")));
    const notesTarget = [...slideRels.values()].find((t) => t.includes("notesSlide"));
    const notes = notesTarget ? readNotes(text(resolve("ppt/slides/", notesTarget)) ?? "") : "";
    return heading || body || notes ? [{ heading, body, notes }] : [];
  });
}
