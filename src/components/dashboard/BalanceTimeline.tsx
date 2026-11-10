'use client';

import React, { useState, useMemo } from 'react';
import {
  Area,
  AreaChart,
  CartesianGrid,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { ExpenseEntry } from '@/lib/types';
import { formatDisplayDate, formatINR, isBeforeOrEqual } from '@/lib/date-utils';
import { Calendar, Filter, Maximize2, TrendingUp } from 'lucide-react';

interface BalanceTimelineProps {
  expenses: ExpenseEntry[];
  referenceDate: string;
}

export function BalanceTimeline({ expenses, referenceDate }: BalanceTimelineProps) {
  const [rangeFilter, setRangeFilter] = useState<'all' | '2026' | '2027' | 'near'>('all');

  // Prepare chart data and split into actual vs projected
  const chartData = useMemo(() => {
    if (!expenses || expenses.length === 0) return [];

    let filtered = expenses;
    if (rangeFilter === '2026') {
      filtered = expenses.filter(e => e.date.startsWith('2026'));
    } else if (rangeFilter === '2027') {
      filtered = expenses.filter(e => e.date.startsWith('2027'));
    } else if (rangeFilter === 'near') {
      // Oct 2026 to Mar 2027
      filtered = expenses.filter(e => (e.date >= '2026-09-01' && e.date <= '2027-04-01'));
    }

    return filtered.map((e, index) => {
      const isActual = isBeforeOrEqual(e.date, referenceDate);
      return {
        index,
        rowIndex: e.rowIndex,
        date: e.date,
        displayDate: formatDisplayDate(e.date),
        description: e.description,
        amount: e.amount,
        type: e.type,
        // Dual values for visual splitting
        actualBalance: isActual ? e.balance : null,
        projectedBalance: !isActual ? e.balance : null,
        // Combined for tooltip and axis
        balance: e.balance,
        isActual,
      };
    });
  }, [expenses, referenceDate, rangeFilter]);

  // Find the exact anchor point to connect actuals to projections seamlessly
  const anchorIndex = useMemo(() => {
    let lastActualIdx = -1;
    chartData.forEach((d, idx) => {
      if (d.isActual) lastActualIdx = idx;
    });
    return lastActualIdx;
  }, [chartData]);

  // Add the bridge point so the chart line is continuous
  const continuousData = useMemo(() => {
    if (anchorIndex === -1 || anchorIndex === chartData.length - 1) return chartData;
    const cloned = [...chartData];
    // Copy actual balance into projectedBalance at the boundary point
    cloned[anchorIndex] = {
      ...cloned[anchorIndex],
      projectedBalance: cloned[anchorIndex].actualBalance,
    };
    return cloned;
  }, [chartData, anchorIndex]);

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 shadow-xl">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <div>
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-indigo-400" />
            Cash Flow & Running Balance Timeline
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            D3 Dynamic Curve: Settled Historical Actuals (≤ {formatDisplayDate(referenceDate)}) vs Future Projections (2026–2027)
          </p>
        </div>

        {/* Range Filters */}
        <div className="flex items-center gap-1.5 rounded-xl border border-slate-800 bg-slate-950/80 p-1 self-start sm:self-auto">
          <button
            onClick={() => setRangeFilter('all')}
            className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${
              rangeFilter === 'all'
                ? 'bg-indigo-600 text-white'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            All (314+)
          </button>
          <button
            onClick={() => setRangeFilter('near')}
            className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${
              rangeFilter === 'near'
                ? 'bg-indigo-600 text-white'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Q4 26 – Q1 27
          </button>
          <button
            onClick={() => setRangeFilter('2026')}
            className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${
              rangeFilter === '2026'
                ? 'bg-indigo-600 text-white'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            2026
          </button>
          <button
            onClick={() => setRangeFilter('2027')}
            className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${
              rangeFilter === '2027'
                ? 'bg-indigo-600 text-white'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            2027
          </button>
        </div>
      </div>

      {/* Main Area Chart */}
      <div className="h-80 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={continuousData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
            <defs>
              {/* Actuals Gradient: Emerald to Indigo */}
              <linearGradient id="actualGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#10b981" stopOpacity={0.35} />
                <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
              </linearGradient>

              {/* Projections Gradient: Indigo to Slate */}
              <linearGradient id="projectedGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#6366f1" stopOpacity={0.25} />
                <stop offset="95%" stopColor="#6366f1" stopOpacity={0.0} />
              </linearGradient>
            </defs>

            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />

            <XAxis
              dataKey="date"
              stroke="#64748b"
              fontSize={11}
              tickLine={false}
              axisLine={false}
              tickFormatter={(val) => {
                if (!val) return '';
                const parts = val.split('-');
                return parts.length >= 3 ? `${parts[2]}/${parts[1]}` : val;
              }}
            />

            <YAxis
              stroke="#64748b"
              fontSize={11}
              tickLine={false}
              axisLine={false}
              tickFormatter={(val) => `₹${(val / 1000).toFixed(0)}k`}
              domain={['auto', 'auto']}
            />

            <Tooltip
              content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  const data = payload[0].payload;
                  const isCredit = data.type === 'CREDIT';
                  const isSettlement = data.type === 'SETTLEMENT';
                  return (
                    <div className="rounded-xl border border-slate-700 bg-slate-950/95 p-3 shadow-2xl backdrop-blur-md">
                      <div className="flex items-center justify-between gap-3 text-xs">
                        <span className="font-semibold text-white">{data.displayDate}</span>
                        <span
                          className={`rounded px-1.5 py-0.5 text-[10px] font-bold ${
                            isCredit
                              ? 'bg-emerald-500/20 text-emerald-400'
                              : isSettlement
                              ? 'bg-amber-500/20 text-amber-400'
                              : 'bg-rose-500/20 text-rose-400'
                          }`}
                        >
                          {data.type}
                        </span>
                      </div>
                      <div className="mt-1 text-sm font-medium text-slate-300">
                        {data.description}
                      </div>
                      <div className="mt-2 flex items-center justify-between gap-4 text-xs">
                        <span className="text-slate-400">Tx Amount:</span>
                        <span className={`font-mono font-bold ${isCredit ? 'text-emerald-400' : 'text-slate-200'}`}>
                          {isCredit ? '+' : '-'}{formatINR(data.amount)}
                        </span>
                      </div>
                      <div className="mt-1 flex items-center justify-between gap-4 text-xs pt-1 border-t border-slate-800">
                        <span className="text-slate-400">Remaining Balance:</span>
                        <span className="font-mono font-bold text-indigo-400">
                          {formatINR(data.balance)}
                        </span>
                      </div>
                      <div className="mt-1.5 text-[10px] text-slate-500">
                        {data.isActual ? '● Settled Actual Record' : '◌ Future Projection'} (Row {data.rowIndex})
                      </div>
                    </div>
                  );
                }
                return null;
              }}
            />

            {/* Vertical Marker at Reference Date (Anchor) */}
            <ReferenceLine
              x={referenceDate}
              stroke="#ef4444"
              strokeDasharray="4 4"
              strokeWidth={2}
              label={{
                value: `Today (${formatDisplayDate(referenceDate)})`,
                position: 'insideTopLeft',
                fill: '#ef4444',
                fontSize: 11,
                fontWeight: 600,
              }}
            />

            {/* Area 1: Settled Actuals (Solid line, Emerald gradient) */}
            <Area
              type="monotone"
              dataKey="actualBalance"
              stroke="#10b981"
              strokeWidth={2.5}
              fill="url(#actualGradient)"
              isAnimationActive={false}
              connectNulls={false}
            />

            {/* Area 2: Projections (Dashed stroke, Indigo gradient) */}
            <Area
              type="monotone"
              dataKey="projectedBalance"
              stroke="#6366f1"
              strokeWidth={2}
              strokeDasharray="5 5"
              fill="url(#projectedGradient)"
              isAnimationActive={false}
              connectNulls={false}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Chart Legend & Context Notes */}
      <div className="mt-4 pt-3 border-t border-slate-800/80 flex flex-wrap items-center justify-between text-xs text-slate-400 gap-2">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-emerald-500 inline-block" />
            <span>Settled Historical Actuals</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="h-0.5 w-4 border-t-2 border-dashed border-indigo-400 inline-block" />
            <span>Future Projections (Formula Chain)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="h-3 w-0.5 bg-red-500 inline-block" />
            <span>Audit Anchor ({formatDisplayDate(referenceDate)})</span>
          </div>
        </div>

        <div className="font-mono text-[11px] text-slate-500">
          Formula Lineage: <span className="text-indigo-400">=IF(OR(D...))</span>
        </div>
      </div>
    </div>
  );
}
