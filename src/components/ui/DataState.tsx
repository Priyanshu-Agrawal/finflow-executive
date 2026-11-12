import type { ReactNode } from 'react';
import { AlertCircle, Loader2, RefreshCw } from 'lucide-react';

/** One loading and error block for every page: a spinner with a label, or the error and a Retry button, or the content. */
export function DataState({
  isLoading,
  error,
  onRetry,
  label,
  children,
}: {
  isLoading: boolean;
  error: unknown;
  onRetry: () => void;
  label: string;
  children: ReactNode;
}) {
  if (isLoading) {
    return (
      <div role="status" className="flex flex-col items-center justify-center gap-3 py-24">
        <Loader2 className="h-8 w-8 animate-spin text-amber-400" aria-hidden="true" />
        <p className="text-sm text-zinc-400">{label}</p>
      </div>
    );
  }
  if (error) {
    const message = error instanceof Error && error.message ? error.message : 'Could not read the sheet.';
    return (
      <div role="alert" className="rounded-2xl border border-orange-500/30 bg-orange-950/20 p-6 text-center">
        <AlertCircle className="mx-auto h-8 w-8 text-orange-400" aria-hidden="true" />
        <h2 className="mt-2 text-base font-semibold text-zinc-100">Could not load your data</h2>
        <p className="mx-auto mt-1 max-w-md text-sm text-zinc-400">{message}</p>
        <button
          type="button"
          onClick={onRetry}
          className="mt-4 inline-flex min-h-11 items-center gap-2 rounded-xl bg-amber-500 px-4 text-sm font-semibold text-zinc-950 hover:bg-amber-400 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-300"
        >
          <RefreshCw className="h-4 w-4" aria-hidden="true" />
          Retry
        </button>
      </div>
    );
  }
  return <>{children}</>;
}
