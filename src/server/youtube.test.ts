import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
const { parseCaptionXml, parseYouTubeId, parseYouTubeStart } = await import("./youtube");

describe("YouTube links", () => {
  it("finds the video id in a link with a start time", () => {
    expect(parseYouTubeId("https://www.youtube.com/watch?v=4vU4aEFmTSo&t=2848s")).toBe("4vU4aEFmTSo");
  });
  it("reads the start time in all the ways YouTube writes it", () => {
    expect(parseYouTubeStart("https://www.youtube.com/watch?v=4vU4aEFmTSo&t=2848s")).toBe(2848);
    expect(parseYouTubeStart("https://youtu.be/4vU4aEFmTSo?t=90")).toBe(90);
    expect(parseYouTubeStart("https://www.youtube.com/watch?v=4vU4aEFmTSo&t=47m28s")).toBe(2848);
    expect(parseYouTubeStart("https://www.youtube.com/watch?v=4vU4aEFmTSo")).toBe(0);
    expect(parseYouTubeStart("not a link")).toBe(0);
  });
});

describe("caption files", () => {
  it("reads the seconds format", () => {
    expect(parseCaptionXml('<transcript><text start="1.5" dur="2">for i in range(3):</text></transcript>'))
      .toEqual([{ seconds: 1, text: "for i in range(3):" }]);
  });
  it("reads the milliseconds format the app API returns", () => {
    expect(parseCaptionXml('<timedtext><body><p t="61280" d="1230">All right, &amp;#39;arrays&amp;#39;</p></body></timedtext>'))
      .toEqual([{ seconds: 61, text: "All right, 'arrays'" }]);
  });
  it("returns null for an empty file", () => {
    expect(parseCaptionXml("")).toBeNull();
  });
});
