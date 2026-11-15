// "Today" for class schedules is the school's date in Arizona (no daylight saving), not the server's UTC date.
export const SCHOOL_TIME_ZONE = "America/Phoenix";

/** YYYY-MM-DD in Arizona. */
export function schoolToday(now = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: SCHOOL_TIME_ZONE, year: "numeric", month: "2-digit", day: "2-digit" }).format(now);
}

/** "Wednesday" for a YYYY-MM-DD date. */
export function weekdayName(isoDate: string): string {
  return new Date(`${isoDate}T12:00:00Z`).toLocaleDateString("en-US", { weekday: "long", timeZone: "UTC" });
}
