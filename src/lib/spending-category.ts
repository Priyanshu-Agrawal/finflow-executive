// A client-side mirror of the category rule inside computeSpendingCategories
// (src/lib/computations.ts, which this branch leaves untouched). Keep the keywords and their
// order in sync with that function — src/lib/spending-category.test.ts checks they agree.
const RULES: Array<{ category: string; keywords: string[] }> = [
  { category: 'Housing & Utilities', keywords: ['rent', 'electricity', 'recharge'] },
  { category: 'Loan EMIs', keywords: ['emi', 'loan', 'settlement', 'card payment'] },
  { category: 'Tech & Subscriptions', keywords: ['subscription', 'cursor', 'chatgpt', 'claude'] },
  { category: 'Family & Gifts', keywords: ['mummy', 'gift', 'ring', 'suit', 'bhaiya'] },
  { category: 'General & Ad-Hoc', keywords: ['general', 'food', 'petrol', 'tea'] },
];

/** Which "Where the money goes" category a transaction's description falls into. */
export function categoryForDescription(description: string): string {
  const desc = description.toLowerCase();
  for (const rule of RULES) {
    if (rule.keywords.some((k) => desc.includes(k))) return rule.category;
  }
  return 'Other Expenses';
}
