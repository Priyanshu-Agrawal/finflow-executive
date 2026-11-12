// React Query retry rule: Google's Sheets read quota (60 reads a minute) must never be hammered.
const QUOTA_RE = /quota|429|too many requests|read requests/i;

export function isQuotaError(error: unknown): boolean {
  return QUOTA_RE.test(error instanceof Error ? error.message : String(error));
}

export function shouldRetry(failureCount: number, error: unknown): boolean {
  if (isQuotaError(error)) return false;
  return failureCount < 2;
}

export const retryDelay = (attempt: number): number => Math.min(30000, 1000 * 2 ** attempt);
