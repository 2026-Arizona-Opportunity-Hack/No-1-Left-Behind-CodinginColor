/** Moves `fromId` to the spot `toId` occupies (dragging down lands after it, dragging up lands before it). */
export function reorderTo(ids: string[], fromId: string, toId: string): string[] {
  const from = ids.indexOf(fromId);
  const to = ids.indexOf(toId);
  if (from === -1 || to === -1 || from === to) return ids;
  const out = ids.filter((id) => id !== fromId);
  out.splice(to, 0, fromId);
  return out;
}
