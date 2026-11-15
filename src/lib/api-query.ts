import { isUuid } from "./validate";

// Validation of read-API query strings (issue #11). A bad value gets a plain-words 400, never a database error.

export type Parsed<T> = { ok: true; value: T } | { ok: false; error: string };
export const MAX_CONCEPT_LENGTH = 64;

function optionalUuid(params: URLSearchParams, name: string): Parsed<string | undefined> {
  const raw = params.get(name);
  if (raw === null || raw === "") return { ok: true, value: undefined };
  return isUuid(raw) ? { ok: true, value: raw } : { ok: false, error: `${name} must be an id like c0000000-0000-0000-0000-000000000003.` };
}

/** /learning-gain?classId=&moduleId=&concept= (all optional). */
export function parseGainQuery(params: URLSearchParams): Parsed<{ classId?: string; moduleId?: string; concept?: string }> {
  const classId = optionalUuid(params, "classId");
  if (!classId.ok) return classId;
  const moduleId = optionalUuid(params, "moduleId");
  if (!moduleId.ok) return moduleId;
  const concept = params.get("concept")?.trim() || undefined;
  if (concept && concept.length > MAX_CONCEPT_LENGTH) return { ok: false, error: `concept must be ${MAX_CONCEPT_LENGTH} characters or fewer.` };
  return { ok: true, value: { classId: classId.value, moduleId: moduleId.value, concept } };
}

/** /concepts/mastery?classId= (required). */
export function parseMasteryQuery(params: URLSearchParams): Parsed<{ classId: string }> {
  const classId = optionalUuid(params, "classId");
  if (!classId.ok) return classId;
  if (!classId.value) return { ok: false, error: "classId is required, for example ?classId=c0000000-0000-0000-0000-000000000003." };
  return { ok: true, value: { classId: classId.value } };
}
