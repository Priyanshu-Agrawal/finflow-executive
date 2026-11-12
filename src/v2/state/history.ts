// One undo/redo history for the whole app. Session-only; framework-free.
export interface HistoryEntry {
  id: string;
  label: string;
  at: number;
  forward: () => Promise<void>;
  inverse: () => Promise<void>;
}

export interface HistoryState {
  entries: HistoryEntry[];
  /** Number of entries currently applied; entries[cursor..] can be redone. */
  cursor: number;
  busy: boolean;
  error: string | null;
}

export function createHistory(opts: { limit?: number } = {}) {
  const limit = opts.limit ?? 50;
  let state: HistoryState = { entries: [], cursor: 0, busy: false, error: null };
  let seq = 0;
  const listeners = new Set<() => void>();
  // push/clear called while an undo or redo is running wait for it, so the cursor stays right.
  let deferred: Array<() => void> = [];
  const flush = () => {
    const run = deferred;
    deferred = [];
    run.forEach((fn) => fn());
  };

  const set = (next: Partial<HistoryState>) => {
    state = { ...state, ...next };
    listeners.forEach((fn) => fn());
  };

  async function step(run: (e: HistoryEntry) => Promise<void>, pick: () => HistoryEntry | undefined, delta: 1 | -1) {
    if (state.busy) return false;
    const e = pick();
    if (!e) return false;
    set({ busy: true });
    try {
      await run(e);
      set({ cursor: state.cursor + delta, busy: false, error: null });
      flush();
      return true;
    } catch (err) {
      set({ busy: false, error: err instanceof Error ? err.message : String(err) });
      flush();
      return false;
    }
  }

  const undo = () => step((e) => e.inverse(), () => state.entries[state.cursor - 1], -1);
  const redo = () => step((e) => e.forward(), () => state.entries[state.cursor], 1);

  return {
    getState: () => state,
    subscribe(fn: () => void) {
      listeners.add(fn);
      return () => { listeners.delete(fn); };
    },
    /** Records a change that has already been applied. */
    push(e: { label: string; forward: () => Promise<void>; inverse: () => Promise<void> }) {
      const add = () => {
        const entry: HistoryEntry = { ...e, id: `h${++seq}`, at: Date.now() };
        const entries = [...state.entries.slice(0, state.cursor), entry].slice(-limit);
        set({ entries, cursor: entries.length, error: null });
      };
      if (state.busy) deferred.push(add);
      else add();
    },
    undo,
    redo,
    async jumpTo(cursor: number) {
      while (state.cursor > cursor) if (!(await undo())) return false;
      while (state.cursor < cursor) if (!(await redo())) return false;
      return true;
    },
    clear() {
      const wipe = () => set({ entries: [], cursor: 0, error: null });
      if (state.busy) deferred.push(wipe);
      else wipe();
    },
  };
}

export type History = ReturnType<typeof createHistory>;
