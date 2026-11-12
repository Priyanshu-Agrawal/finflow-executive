// Rupee formatting for v2: Indian digit grouping, a real minus sign, never NaN.
const NF = new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 });

const safe = (v: number) => (Number.isFinite(v) ? Math.round(v) : 0);

export const rupees = (v: number): string => {
  const n = safe(v);
  return `${n < 0 ? '−' : ''}₹${NF.format(Math.abs(n))}`;
};

export const signedRupees = (v: number): string => {
  const n = safe(v);
  return `${n < 0 ? '−' : '+'}₹${NF.format(Math.abs(n))}`;
};
