/**
 * The anchor row of a dated list: the last row dated on or before the reference date, or the
 * first row when the date is before them all. The Excel grid, the Ledger and the date shortcut
 * in the top bar all use it, so "today" points at the same row everywhere.
 */
export function anchorRowFor<T extends { date: string }>(rows: readonly T[], refDate: string): T | null {
  if (rows.length === 0) return null;
  for (let i = rows.length - 1; i >= 0; i--) {
    if (rows[i].date <= refDate) return rows[i];
  }
  return rows[0];
}
