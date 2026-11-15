// Short roster labels for the teacher dashboard: "Alex Rivera" → "Alex R.".
// Uses the same rule as class setup (displayLabels in roster-csv.ts), so a student has the
// same label on every screen: duplicates become "Alex R.", "Alex R. (2)".
// Pure helper. Names stay inside the teacher's own class view and never go to an AI service or the API.
import { displayLabels } from "./roster-csv";

/** One label per name, same order as the input. Blank names show as "Student". */
export function studentLabels(displayNames: string[]): string[] {
  return displayLabels(displayNames.map((n) => n.trim() || "Student"));
}
