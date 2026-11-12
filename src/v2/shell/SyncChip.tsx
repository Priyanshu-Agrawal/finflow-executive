'use client';

import { useEffect, useState } from 'react';
import { useV2Sync } from '../V2Providers';
import { useSync } from '../state/useSync';

function ago(at: number, now: number): string {
  const min = Math.floor((now - at) / 60000);
  if (min < 1) return 'Synced just now';
  if (min < 60) return `Synced ${min} min ago`;
  return `Synced ${Math.floor(min / 60)} h ago`;
}

export function SyncChip() {
  const status = useSync(useV2Sync());
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 30000);
    return () => clearInterval(t);
  }, []);
  const text =
    status.kind === 'synced' ? ago(status.at, now)
    : status.kind === 'saving' ? `Saving ${status.pending}…`
    : status.kind === 'offline' ? 'Offline, showing saved copy'
    : status.kind === 'busy' ? status.message
    : status.kind === 'conflict' ? 'Sheet changed, refresh'
    : "Couldn't save";
  return (
    <span className="v2-chip" data-kind={status.kind} role="status">
      {text}
    </span>
  );
}
