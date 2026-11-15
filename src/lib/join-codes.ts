// Student join codes. The plain code is printed on the student's card once;
// the database only stores hashJoinCode(classId, code).

/** Uppercase and drop spaces/dashes, so "7kq2-mx" and "7KQ2MX" both work. */
export function normalizeJoinCode(code: string): string {
  return code.toUpperCase().replace(/[\s-]/g, "");
}

/** Class codes keep their dash ("MARY-P3"); just tidy case and spaces. */
export function normalizeClassCode(code: string): string {
  return code.toUpperCase().replace(/\s/g, "");
}

/** hex sha256 of `${classId}:${CODE}`. Must match supabase/seed.sql. */
export async function hashJoinCode(classId: string, code: string): Promise<string> {
  const bytes = new TextEncoder().encode(`${classId}:${normalizeJoinCode(code)}`);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, "0")).join("");
}
