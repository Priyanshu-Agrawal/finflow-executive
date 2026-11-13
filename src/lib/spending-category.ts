// A client-side mirror of the category rule inside computeSpendingCategories
// (src/lib/computations.ts, which this branch otherwise leaves untouched — this one function was
// changed on 13 Nov 2026, owner decision: Bhaiya transactions are a personal IOU, not spending).
// Keep the keywords, their order, and the Bhaiya-pairing rule in sync with that function —
// spending-category.test.ts checks they agree.
import type { ExpenseEntry } from './types';

const RULES: Array<{ category: string; keywords: string[] }> = [
  { category: 'Housing & Utilities', keywords: ['rent', 'electricity', 'recharge'] },
  { category: 'Loan EMIs', keywords: ['emi', 'loan', 'settlement', 'card payment'] },
  { category: 'Tech & Subscriptions', keywords: ['subscription', 'cursor', 'chatgpt', 'claude'] },
  { category: 'Family & Gifts', keywords: ['mummy', 'gift', 'ring', 'suit'] },
  { category: 'General & Ad-Hoc', keywords: ['general', 'food', 'petrol', 'tea'] },
];

/**
 * Which "Where the money goes" category a transaction's description falls into, judged on its
 * own text alone. Most rows are self-describing and this is all you need; a row that is only
 * identifiable as Bhaiya's by its date and amount matching a nearby bhaiya-worded row (see
 * `categorizeExpenses`) will NOT be caught by this function on its own.
 */
export function categoryForDescription(description: string): string {
  const desc = description.toLowerCase();
  if (desc.includes('bhaiya')) return 'Bhaiya Udhar';
  for (const rule of RULES) {
    if (rule.keywords.some((k) => desc.includes(k))) return rule.category;
  }
  return 'Other Expenses';
}

/**
 * The category for every row in `expenses`, keyed by rowIndex. Unlike `categoryForDescription`,
 * this also links the other leg of a same-day, same-amount, opposite-type Bhaiya transaction pair
 * (e.g. he once used a card and paid back the same day: one leg's own text says "bhaiya", the
 * other is just "SBI Card Payment") — matched by date and amount, not row number, since rows get
 * sorted and reordered.
 */
export function categorizeExpenses(expenses: readonly ExpenseEntry[]): Map<number, string> {
  const bhaiyaRows = expenses.filter((e) => e.description.toLowerCase().includes('bhaiya'));
  const linked = new Set<number>(bhaiyaRows.map((b) => b.rowIndex));
  for (const b of bhaiyaRows) {
    for (const e of expenses) {
      if (e.rowIndex === b.rowIndex) continue;
      if (e.date === b.date && e.amount === b.amount && e.type !== b.type) linked.add(e.rowIndex);
    }
  }

  const byRow = new Map<number, string>();
  for (const e of expenses) {
    byRow.set(e.rowIndex, linked.has(e.rowIndex) ? 'Bhaiya Udhar' : categoryForDescription(e.description));
  }
  return byRow;
}
