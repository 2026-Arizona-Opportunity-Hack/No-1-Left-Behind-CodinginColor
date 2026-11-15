// Short roster labels for the teacher dashboard: "Alex Rivera" → "Alex R.".
// If two students would get the same label, they get a number: "Sam T. (1)", "Sam T. (2)".
// Pure helper. Names stay inside the teacher's own class view and never go to an AI service or the API.

function baseLabel(displayName: string): string {
  const parts = displayName.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "Student";
  if (parts.length === 1) return parts[0];
  const initial = [...parts[parts.length - 1]][0].toUpperCase();
  return `${parts[0]} ${initial}.`;
}

/** One label per name, same order as the input. */
export function studentLabels(displayNames: string[]): string[] {
  const bases = displayNames.map(baseLabel);
  const total = new Map<string, number>();
  for (const b of bases) total.set(b, (total.get(b) ?? 0) + 1);
  const seen = new Map<string, number>();
  return bases.map((b) => {
    if ((total.get(b) ?? 0) < 2) return b;
    const n = (seen.get(b) ?? 0) + 1;
    seen.set(b, n);
    return `${b} (${n})`;
  });
}
