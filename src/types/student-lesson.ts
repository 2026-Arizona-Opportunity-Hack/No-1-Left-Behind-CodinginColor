// What the lesson player receives in the browser. Answers for quiz-style steps are
// REMOVED on the server (see toStudentContent) and checked there instead, so students
// can't find them in the page source. Code exercises keep their checks, because the
// student's Python runs in their own browser.
import type { CodeCheck } from "@/lib/python/runner";

export type StudentStep =
  | { kind: "slide"; heading: string; body: string; code?: string; output?: string; image_url?: string }
  | { kind: "video"; youtube_id: string; key_points: string[] }
  | { kind: "choice"; prompt: string; options: string[] } // quiz_mcq and exit_question
  | { kind: "predict_output"; prompt: string; code: string }
  | { kind: "fill_blank"; prompt: string; template: string }
  | { kind: "parsons"; prompt: string; lines: string[] } // shuffled
  | { kind: "code"; prompt: string; starter_code: string; tests: CodeCheck[] } // code_exercise and fix_bug
  | { kind: "worksheet"; instructions?: string; fields: { id: string; label: string; kind: "short" | "long" | "number"; required?: boolean }[] };

export type PlayerActivity = {
  id: string;
  type: string; // database type, e.g. "quiz_mcq"
  title: string;
  isCore: boolean;
  hints: string[];
  done: boolean;
  step: StudentStep;
};

export type PlayerLesson = {
  id: string;
  title: string;
  unitTitle: string;
  activities: PlayerActivity[];
  nextLesson: { id: string; title: string } | null;
};

export type AnswerResult = { correct: boolean; message: string };
