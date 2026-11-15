// How student statuses look everywhere. Never color alone: always an icon and a word.
import type { Status } from "@/lib/student-status";

export const STATUS_DISPLAY: Record<Status, { icon: string; word: string; chip: string }> = {
  needs_help: { icon: "!", word: "Needs help", chip: "border-red-700 bg-red-50 text-red-800" },
  behind: { icon: "⏱", word: "Behind", chip: "border-orange-700 bg-orange-50 text-orange-800" },
  not_started: { icon: "○", word: "Not started", chip: "border-zinc-500 bg-zinc-50 text-zinc-700" },
  on_track: { icon: "✓", word: "On track", chip: "border-green-700 bg-green-50 text-green-800" },
};

/** "4 min", "1 h 12 min", "—" for nothing yet. */
export function formatDuration(ms: number): string {
  if (!ms) return "—";
  const min = Math.round(ms / 60000);
  if (min < 1) return "< 1 min";
  return min < 60 ? `${min} min` : `${Math.floor(min / 60)} h ${min % 60} min`;
}

/** "just now", "5 min ago", "3 h ago", "2 days ago", "never". */
export function timeAgo(iso: string | null, now: number): string {
  if (!iso) return "never";
  const min = Math.floor((now - new Date(iso).getTime()) / 60000);
  if (min < 1) return "just now";
  if (min < 60) return `${min} min ago`;
  const h = Math.floor(min / 60);
  return h < 24 ? `${h} h ago` : `${Math.floor(h / 24)} day${h < 48 ? "" : "s"} ago`;
}
