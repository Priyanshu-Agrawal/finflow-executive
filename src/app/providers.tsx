'use client';

import React, { useState } from 'react';
import { usePathname } from 'next/navigation';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { UndoProvider } from '@/context/UndoContext';
import { UndoToast } from '@/components/common/UndoToast';

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 30 * 1000, // 30 seconds
            refetchOnWindowFocus: true,
            retry: 2,
          },
          mutations: {
            // 'always': a write attempted offline fails immediately instead of TanStack Query's
            // default behaviour of silently queueing it and replaying it on reconnect — "offline
            // = read only" means no queued writes anywhere, not just the two dialogs that show a
            // notice; without this, a drag-reorder or an edit made while offline would optimistically
            // show as done, then actually run later against row numbers that may have moved by then.
            networkMode: 'always',
          },
        },
      })
  );

  // The v2 UI (/v2) has its own providers and its own undo; the old global Ctrl+Z handler and
  // toast must not run there. Delete this file's old-UI parts at cutover.
  const pathname = usePathname();
  if (pathname === '/v2' || pathname.startsWith('/v2/')) return <>{children}</>;

  return (
    <QueryClientProvider client={queryClient}>
      <UndoProvider>
        {children}
        <UndoToast />
      </UndoProvider>
    </QueryClientProvider>
  );
}
