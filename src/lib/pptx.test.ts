import { strToU8, zipSync } from "fflate";
import { describe, expect, it } from "vitest";
import { readPptx } from "./pptx";

const sp = (type: string | null, ...lines: string[]) =>
  `<p:sp><p:nvSpPr>${type ? `<p:nvPr><p:ph type="${type}"/></p:nvPr>` : ""}</p:nvSpPr><p:txBody>${
    lines.map((l) => `<a:p><a:r><a:t>${l}</a:t></a:r></a:p>`).join("")}</p:txBody></p:sp>`;
const slide = (...shapes: string[]) => `<p:sld><p:cSld><p:spTree>${shapes.join("")}</p:spTree></p:cSld></p:sld>`;

// A deck whose slide files are numbered out of order: slide2.xml is shown first.
function deck() {
  return zipSync({
    "ppt/presentation.xml": strToU8('<p:presentation><p:sldIdLst><p:sldId id="256" r:id="rId3"/><p:sldId id="257" r:id="rId2"/></p:sldIdLst></p:presentation>'),
    "ppt/_rels/presentation.xml.rels": strToU8('<Relationships><Relationship Id="rId2" Target="slides/slide1.xml"/><Relationship Id="rId3" Target="slides/slide2.xml"/></Relationships>'),
    "ppt/slides/slide2.xml": strToU8(slide(sp("title", "Why loops?"), sp(null, "A loop repeats code.", "for i in range(3): print(i)"), sp("sldNum", "1"))),
    "ppt/slides/slide1.xml": strToU8(slide(sp(null, "range stops early"), sp(null, "range(1, 5) gives 1, 2, 3, 4 &lt;- not 5"))),
    "ppt/slides/_rels/slide2.xml.rels": strToU8('<Relationships><Relationship Id="rId1" Target="../notesSlides/notesSlide7.xml"/></Relationships>'),
    "ppt/notesSlides/notesSlide7.xml": strToU8(slide(sp("sldImg"), sp("body", "Ask: what would you copy and paste?"))),
  });
}

describe("readPptx", () => {
  it("reads slides in the order they are shown, with titles, text and speaker notes", () => {
    expect(readPptx(deck())).toEqual([
      { heading: "Why loops?", body: "A loop repeats code.\nfor i in range(3): print(i)", notes: "Ask: what would you copy and paste?" },
      { heading: "range stops early", body: "range(1, 5) gives 1, 2, 3, 4 <- not 5", notes: "" },
    ]);
  });

  it("explains in plain words when the file is not a PowerPoint", () => {
    expect(() => readPptx(strToU8("hello"))).toThrow(/PowerPoint/);
    expect(() => readPptx(zipSync({ "word/document.xml": strToU8("<w/>") }))).toThrow(/PowerPoint/);
  });
});
