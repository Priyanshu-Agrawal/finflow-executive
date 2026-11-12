// Serial write queue with optimistic rollback and a user-facing sync status. Framework-free.
export class ConflictError extends Error {}

export type SyncStatus =
  | { kind: 'synced'; at: number }
  | { kind: 'saving'; pending: number }
  | { kind: 'offline'; reason: string }
  | { kind: 'busy'; message: string }
  | { kind: 'conflict'; message: string }
  | { kind: 'error'; message: string };

export interface WriteJob {
  label: string;
  run: () => Promise<void>;
  /** Undoes the optimistic change this job made on screen. */
  rollback: () => void;
}

const OFFLINE_REASON = "You're offline. Changes can't be saved until you're back online.";

export function createSync(opts: { isOnline: () => boolean; now: () => number }) {
  let state: SyncStatus = { kind: 'synced', at: opts.now() };
  const listeners = new Set<() => void>();
  const queue: Array<{ job: WriteJob; resolve: (ok: boolean) => void }> = [];
  let draining = false;

  const set = (next: SyncStatus) => {
    state = next;
    listeners.forEach((fn) => fn());
  };

  async function drain() {
    if (draining) return;
    draining = true;
    while (queue.length > 0) {
      const item = queue[0];
      try {
        await item.job.run();
        queue.shift();
        item.resolve(true);
        set(queue.length > 0 ? { kind: 'saving', pending: queue.length } : { kind: 'synced', at: opts.now() });
      } catch (err) {
        // Newest unsaved change first, the failed one last, so each rollback undoes what sits on top.
        const unsaved = queue.splice(0);
        for (let i = unsaved.length - 1; i >= 0; i--) {
          try { unsaved[i].job.rollback(); } catch { /* keep rolling back the rest */ }
          unsaved[i].resolve(false);
        }
        const message = err instanceof Error ? err.message : String(err);
        set(err instanceof ConflictError ? { kind: 'conflict', message } : { kind: 'error', message });
      }
    }
    draining = false;
  }

  return {
    getState: () => state,
    subscribe(fn: () => void) {
      listeners.add(fn);
      return () => { listeners.delete(fn); };
    },
    enqueue(job: WriteJob): Promise<boolean> {
      if (!opts.isOnline()) {
        set({ kind: 'offline', reason: OFFLINE_REASON });
        return Promise.resolve(false);
      }
      return new Promise<boolean>((resolve) => {
        queue.push({ job, resolve });
        set({ kind: 'saving', pending: queue.length });
        void drain();
      });
    },
    /** Call after a successful refetch of the sheet; `at` is when that fetch finished. */
    refreshed(at?: number) {
      if (queue.length === 0) set({ kind: 'synced', at: at ?? opts.now() });
    },
    /** Browser online/offline events. Going back online waits for the next successful fetch. */
    setOnline(online: boolean) {
      if (!online) set({ kind: 'offline', reason: OFFLINE_REASON });
    },
    /** Sheets quota hit: tell the user instead of retrying in a loop. */
    markBusy(message: string) {
      set({ kind: 'busy', message });
    },
  };
}

export type Sync = ReturnType<typeof createSync>;
