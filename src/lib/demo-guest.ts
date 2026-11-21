// Demo guest login. Anyone who joins with the shared demo codes gets a brand-new guest student with their own
// empty progress, so people trying the app never share (or spoil) each other's lessons.
// The codes are public on purpose: they only ever create guests in the DEMO class, never touch a real class.

import { normalizeClassCode, normalizeJoinCode } from "./join-codes";

export const DEMO_CLASS_CODE = "DEMO";
export const DEMO_JOIN_CODE = "TRYIT";
/** Guests are deleted (with their progress) after this many days. */
export const GUEST_LIFETIME_DAYS = 3;
/** The most guests kept at once, so nobody can fill the database by joining over and over. */
export const MAX_GUESTS = 300;

/** True when both codes are the shared demo codes ("demo" and "try-it" also work). */
export function isDemoLogin(classCode: string, personalCode: string): boolean {
  return normalizeClassCode(classCode) === DEMO_CLASS_CODE && normalizeJoinCode(personalCode) === DEMO_JOIN_CODE;
}

/** A friendly, unique-enough name such as "Guest-4821". Guests can't be told apart by anything else. */
export function guestName(): string {
  const n = crypto.getRandomValues(new Uint32Array(1))[0] % 10000;
  return `Guest-${String(n).padStart(4, "0")}`;
}

/** Guests created before this moment are old enough to delete. */
export function guestCutoff(now: Date = new Date()): string {
  return new Date(now.getTime() - GUEST_LIFETIME_DAYS * 24 * 60 * 60 * 1000).toISOString();
}
