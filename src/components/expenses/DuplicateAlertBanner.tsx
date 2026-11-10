'use client';

import React, { useState } from 'react';
import { DuplicateGroup, ExpenseEntry } from '@/lib/types';
import { formatINR } from '@/lib/date-utils';
import { AlertCircle, ChevronDown, ChevronUp, Copy, Trash2, CheckCircle2 } from 'lucide-react';
import { useDeleteExpense } from '@/hooks/useFinancials';

interface DuplicateAlertBannerProps {
  duplicates: DuplicateGroup[];
  onSelectDuplicate?: (entry: ExpenseEntry) => void;
}

export function DuplicateAlertBanner({ duplicates, onSelectDuplicate }: DuplicateAlertBannerProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const deleteMutation = useDeleteExpense();

  if (!duplicates || duplicates.length === 0) {
    return null;
  }

  const totalFlaggedCount = duplicates.reduce((acc, g) => acc + g.rows.length, 0);

  return (
    <div className="rounded-2xl border border-amber-500/30 bg-amber-950/20 p-4 shadow-lg mb-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-500/20 text-amber-400 shrink-0">
            <AlertCircle className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-amber-300 flex items-center gap-2">
              Duplicate Detection Engine
              <span className="rounded-full bg-amber-500/20 px-2 py-0.5 text-[10px] font-bold text-amber-400">
                {duplicates.length} clusters flagged ({totalFlaggedCount} entries)
              </span>
            </h3>
            <p className="text-xs text-slate-300 mt-0.5">
              Found transactions with identical description and amount within a 3-day window
            </p>
          </div>
        </div>

        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex items-center gap-1.5 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-1.5 text-xs font-semibold text-amber-300 hover:bg-amber-500/20 transition-colors"
        >
          <span>{isExpanded ? 'Hide Clusters' : 'Inspect & Resolve'}</span>
          {isExpanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
        </button>
      </div>

      {/* Expanded Cluster View */}
      {isExpanded && (
        <div className="mt-4 pt-4 border-t border-amber-500/20 space-y-3">
          {duplicates.map((group) => (
            <div
              key={group.id}
              className="p-3.5 rounded-xl border border-slate-800 bg-slate-900/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
            >
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-white text-sm">{group.description}</span>
                  <span className="font-mono font-semibold text-amber-400">
                    {formatINR(group.amount)}
                  </span>
                </div>
                <div className="mt-1 flex flex-wrap gap-2 text-slate-400">
                  {group.rows.map((r) => (
                    <span
                      key={r.rowIndex}
                      className="rounded bg-slate-800 px-2 py-0.5 font-mono text-[11px] text-slate-300"
                    >
                      Row {r.rowIndex} ({r.date}) — {r.type}
                    </span>
                  ))}
                </div>
              </div>

              {/* Action: Delete duplicate copy (keeps the first occurrence) */}
              <div className="flex items-center gap-2 shrink-0">
                {group.rows.slice(1).map((dupRow) => (
                  <button
                    key={dupRow.rowIndex}
                    onClick={() => {
                      if (confirm(`Delete duplicate Row ${dupRow.rowIndex} (${dupRow.description} - ${formatINR(dupRow.amount)})?`)) {
                        deleteMutation.mutate(dupRow.rowIndex);
                      }
                    }}
                    disabled={deleteMutation.isPending}
                    className="flex items-center gap-1 rounded-lg border border-rose-500/30 bg-rose-500/10 px-2.5 py-1 text-[11px] font-semibold text-rose-300 hover:bg-rose-500/20 transition-colors"
                    title={`Delete Row ${dupRow.rowIndex} and preserve Row ${group.rows[0].rowIndex}`}
                  >
                    <Trash2 className="h-3 w-3" />
                    <span>Delete Row {dupRow.rowIndex}</span>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
