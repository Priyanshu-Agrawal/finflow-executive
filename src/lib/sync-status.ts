// How long ago the last successful sync was, for the offline banner and the top-bar chip.
const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

/** `formatSyncedAgo(lastSyncedMs, nowMs)`: "just now", "5 min ago", "3 hr ago", "yesterday", "3 days ago", or "never". */
export function formatSyncedAgo(lastSyncedMs: number | null, nowMs: number): string {
  if (lastSyncedMs === null) return 'never';
  const elapsed = Math.max(0, nowMs - lastSyncedMs);
  if (elapsed < MINUTE) return 'just now';
  if (elapsed < HOUR) return `${Math.floor(elapsed / MINUTE)} min ago`;
  if (elapsed < DAY) return `${Math.floor(elapsed / HOUR)} hr ago`;
  const days = Math.floor(elapsed / DAY);
  return days === 1 ? 'yesterday' : `${days} days ago`;
}
