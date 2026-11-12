// Small calendar helpers on YYYY-MM-DD strings (local calendar, no time zones involved).
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

const parse = (iso: string) => {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d);
};

export const daysBetween = (a: string, b: string): number => Math.round((parse(b).getTime() - parse(a).getTime()) / 86400000);
export const dayMonth = (iso: string): string => `${parse(iso).getDate()} ${MONTHS[parse(iso).getMonth()]}`;
export const weekdayShort = (iso: string): string => DAYS[parse(iso).getDay()].slice(0, 3);
export const longDate = (iso: string): string => `${DAYS[parse(iso).getDay()]}, ${dayMonth(iso)}`;
export const localToday = (): string => new Date().toLocaleDateString('en-CA');
