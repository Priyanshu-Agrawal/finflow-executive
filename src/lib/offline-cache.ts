// Clears this device's offline copy of the balance on sign-out, so the next person to open the
// installed app here never sees a previous session's numbers while offline.
// DATA_CACHE name must match public/sw.js's DATA_CACHE exactly — they can't share an import (the
// service worker is a plain script, not a module), so keep the two in sync by hand.
const DATA_CACHE = 'finflow-financials-1';
const LAST_SYNCED_KEY = 'finflow_last_synced';

export async function clearOfflineFinancialsCache(): Promise<void> {
  try {
    if (typeof caches !== 'undefined') {
      const cache = await caches.open(DATA_CACHE);
      await cache.delete('/api/financials');
    }
  } catch {
    // Cache API unavailable (e.g. private mode) — nothing to clear.
  }
  try {
    localStorage.removeItem(LAST_SYNCED_KEY);
  } catch {
    // ignore storage errors
  }
}
