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
      return true;
    } catch (err) {
      set({ busy: false, error: err instanceof Error ? err.message : String(err) });
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
      const entry: HistoryEntry = { ...e, id: `h${++seq}`, at: Date.now() };
      const entries = [...state.entries.slice(0, state.cursor), entry].slice(-limit);
      set({ entries, cursor: entries.length, error: null });
    },
    undo,
    redo,
    async jumpTo(cursor: number) {
      while (state.cursor > cursor) if (!(await undo())) return false;
      while (state.cursor < cursor) if (!(await redo())) return false;
      return true;
    },
    clear() {
      set({ entries: [], cursor: 0, error: null });
    },
  };
}

export type History = ReturnType<typeof createHistory>;
