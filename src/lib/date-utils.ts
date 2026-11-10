const MONTH_MAP: Record<string, string> = {
  jan: '01', feb: '02', mar: '03', apr: '04', may: '05', jun: '06',
  jul: '07', aug: '08', sep: '09', oct: '10', nov: '11', dec: '12',
};

/**
 * Normalizes any spreadsheet date value into 'YYYY-MM-DD'
 * Handles:
 * - '2026-Nov-08'
 * - '2026-11-08'
 * - 'Aug-12' (infers year based on context, default 2025/2026)
 * - Serial number (e.g. 46334)
 */
export function normalizeDate(input: string | number | undefined | null, fallbackYear: number = 2026): string {
  if (input === undefined || input === null || input === '') {
    return '2026-11-10';
  }

  // Handle Google Sheets date serial number
  if (typeof input === 'number') {
    // Google Sheets epoch starts on Dec 30, 1899
    const utcDays = input - 25569;
    const utcMs = utcDays * 86400 * 1000;
    const dateObj = new Date(utcMs);
    const y = dateObj.getUTCFullYear();
    const m = String(dateObj.getUTCMonth() + 1).padStart(2, '0');
    const d = String(dateObj.getUTCDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  const str = String(input).trim();

  // Pattern: 2026-11-08
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
    return str;
  }

  // Pattern: 2026-Nov-08 or 2026-Nov-8
  const ymdMatch = str.match(/^(\d{4})-([A-Za-z]{3})-(\d{1,2})$/);
  if (ymdMatch) {
    const year = ymdMatch[1];
    const month = MONTH_MAP[ymdMatch[2].toLowerCase()] || '01';
    const day = ymdMatch[3].padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  // Pattern: Aug-12 or Nov-5 (no year)
  const mdMatch = str.match(/^([A-Za-z]{3})-(\d{1,2})$/);
  if (mdMatch) {
    const month = MONTH_MAP[mdMatch[1].toLowerCase()] || '01';
    const day = mdMatch[2].padStart(2, '0');
    return `${fallbackYear}-${month}-${day}`;
  }

  // Standard Date parse fallback
  const parsed = new Date(str);
  if (!isNaN(parsed.getTime())) {
    const y = parsed.getFullYear();
    const m = String(parsed.getMonth() + 1).padStart(2, '0');
    const d = String(parsed.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  return '2026-11-10';
}

/**
 * Formats a YYYY-MM-DD date string into human-readable Indian format: '10 Nov 2026'
 */
export function formatDisplayDate(dateStr: string): string {
  if (!dateStr) return '';
  const parts = dateStr.split('-');
  if (parts.length === 3) {
    const year = parts[0];
    const monthIdx = parseInt(parts[1], 10) - 1;
    const day = parseInt(parts[2], 10);
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return `${day} ${monthNames[monthIdx] || ''} ${year}`;
  }
  return dateStr;
}

/**
 * Returns true if dateA <= dateB (comparing YYYY-MM-DD strings lexically)
 */
export function isBeforeOrEqual(dateA: string, dateB: string): boolean {
  return dateA <= dateB;
}

/**
 * Returns true if target is within [start, end] inclusive
 */
export function isBetweenDates(target: string, start: string, end: string): boolean {
  return target >= start && target <= end;
}

/**
 * Formats number to Indian Currency: ₹1,28,792
 */
export function formatINR(val: number | null | undefined, includeSymbol: boolean = true): string {
  if (val === null || val === undefined || isNaN(val)) return includeSymbol ? '₹0' : '0';
  const rounded = Math.round(val);
  const formatted = new Intl.NumberFormat('en-IN', {
    maximumFractionDigits: 0,
  }).format(rounded);
  return includeSymbol ? `₹${formatted}` : formatted;
}
