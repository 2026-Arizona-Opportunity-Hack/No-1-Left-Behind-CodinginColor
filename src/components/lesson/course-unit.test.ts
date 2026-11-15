import { writeFileSync } from "node:fs";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { expect, it } from "vitest";
import { CourseUnit } from "./course-unit";
import { buildCourseMap, type AssessmentProgress } from "@/lib/course-map";
const map = () =>
  buildCourseMap({
    modules: [1, 2].map((n) => ({
      id: `module${n}`,
      title: `Unit ${n}`,
      position: n,
      lessons: [
        { id: `lesson${n}`, title: `Material for unit ${n}`, position: 1 },
      ],
    })),
    statusByLesson: new Map(),
    startModuleId: null,
    unlockedModuleIds: new Set(),
    assessments: new Map<string, AssessmentProgress>([
      ["module1", { pre: "todo", post: "todo" }],
      ["module2", { pre: "todo", post: "todo" }],
    ]),
  });
it("keeps pre-test, material titles and post-test visible for locked units without linking locked work", () => {
  const html = renderToStaticMarkup(
    createElement(CourseUnit, { unit: map().modules[1] }),
  );
  expect(html).toContain("Pre-test");
  expect(html).toContain("Post-test");
  expect(html).toContain("Material for unit 2");
  expect(html).toContain("Finish Unit 1");
  expect(html).not.toContain('href="/learn/lesson2"');
  expect(html).not.toContain('href="/learn/test/module2');
});
it("links the pre-test before materials and links completed quiz results", () => {
  const unit = map().modules[0];
  const html = renderToStaticMarkup(createElement(CourseUnit, { unit }));
  expect(html).toContain('href="/learn/test/module1/pre"');
  expect(html).not.toContain('href="/learn/lesson1"');
  const completed = renderToStaticMarkup(
    createElement(CourseUnit, {
      unit: { ...unit, preTest: "done", materialUnlocked: true },
    }),
  );
  expect(completed).toContain("view result");
  expect(completed).toContain('href="/learn/lesson1"');
});

it("renders the full course path for visual verification", () => {
  const html = map()
    .modules.map((unit) =>
      renderToStaticMarkup(createElement(CourseUnit, { unit })),
    )
    .join("");
  expect(html).toContain("Unit 2");
  if (process.env.CIC_VISUAL_DIR)
    writeFileSync(
      `${process.env.CIC_VISUAL_DIR}/course.html`,
      `<!doctype html><html style="--font-rubik:Arial,sans-serif;--font-jetbrains-mono:monospace"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="preview.css"></head><body style="--font-rubik:Rubik,Arial,sans-serif;--font-jetbrains-mono:monospace"><main class="mx-auto max-w-6xl px-6 py-10"><p class="mb-8 font-mono text-xl font-bold">&lt;IN&gt; Launchpad</p><div class="grid gap-10 lg:grid-cols-2"><div><h1 class="text-5xl font-bold">My course</h1><p class="my-5 text-muted-foreground">Period 3 · Pre-test → course materials → post-test</p><div class="rounded-3xl bg-primary p-8 text-primary-foreground"><p>Start with the pre-test</p><h2 class="mt-3 text-3xl font-bold">Unit 1</h2></div></div><div class="space-y-4">${html}</div></div></main></body></html>`,
    );
});
