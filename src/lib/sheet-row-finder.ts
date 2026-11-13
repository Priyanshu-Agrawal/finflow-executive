// Finds a row by its content (date + description), not by a fixed row number. Row numbers drift
// whenever a row is inserted before them (a back-dated log, a sort) — content does not.
export interface FindableRow {
  rowIndex: number;
  date: string;
  description: string;
}

/** The row matching this exact date and description, or null if none does. Exact match on both, not a substring. */
export function findRowByDateDescription<T extends FindableRow>(rows: readonly T[], date: string, description: string): T | null {
  return rows.find((r) => r.date === date && r.description === description) ?? null;
}
