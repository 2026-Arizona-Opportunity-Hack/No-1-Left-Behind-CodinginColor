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

export const JOIN_CODE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";

/** Rejection sampling avoids modulo bias. */
export function generateJoinCode(): string {
  let code = "";
  const limit = 256 - (256 % JOIN_CODE_ALPHABET.length);
  while (code.length < 6) {
    for (const byte of crypto.getRandomValues(new Uint8Array(12))) {
      if (byte < limit) code += JOIN_CODE_ALPHABET[byte % JOIN_CODE_ALPHABET.length];
      if (code.length === 6) break;
    }
  }
  return code;
}
export function generateClassCode(school: string, name: string): string {
  const clean = (value: string) => value.normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toUpperCase().replace(/[^A-Z0-9]/g, "");
  return `${clean(school).slice(0, 4) || "CLASS"}-${clean(name.trim().replace(/^period\s*/i, "P")).slice(0, 8) || "1"}`;
}
export function classJoinUrl(origin: string, classCode: string): string {
  const url = new URL("/join", origin);
  url.searchParams.set("class", normalizeClassCode(classCode));
  return url.toString();
}
