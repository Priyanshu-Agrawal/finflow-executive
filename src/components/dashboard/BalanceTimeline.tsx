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
import { formatDateShort } from '@/lib/format';
import { TrendingUp } from 'lucide-react';

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
      filtered = expenses.filter((e) => e.date.startsWith('2026'));
    } else if (rangeFilter === '2027') {
      filtered = expenses.filter((e) => e.date.startsWith('2027'));
    } else if (rangeFilter === 'near') {
      // Oct 2026 to Mar 2027
      filtered = expenses.filter((e) => e.date >= '2026-09-01' && e.date <= '2027-04-01');
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
    <div className="rounded-2xl border border-white/[0.07] bg-[#121214] p-5 shadow-xl space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-medium text-white flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-amber-500" />
            Cash Flow & Running Balance Timeline
          </h2>
          <p className="text-xs tabular-nums text-zinc-400 mt-0.5">
            Dynamic Curve: Already happened (≤ {formatDisplayDate(referenceDate)}) vs Future Projections (2026–2027)
          </p>
        </div>

        {/* Range Filters */}
        <div className="flex items-center gap-1 rounded-xl border border-white/10 bg-[#18181B] p-1 self-start sm:self-auto text-xs">
          <button
            onClick={() => setRangeFilter('all')}
            className={`px-3 py-1 min-h-11 sm:min-h-0 rounded-lg font-medium transition-all ${
              rangeFilter === 'all'
                ? 'bg-amber-500 text-black font-semibold shadow-sm'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            All (314+)
          </button>
          <button
            onClick={() => setRangeFilter('near')}
            className={`px-3 py-1 min-h-11 sm:min-h-0 rounded-lg font-medium transition-all ${
              rangeFilter === 'near'
                ? 'bg-amber-500 text-black font-semibold shadow-sm'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            Q4 26 – Q1 27
          </button>
          <button
            onClick={() => setRangeFilter('2026')}
            className={`px-3 py-1 min-h-11 sm:min-h-0 rounded-lg font-medium transition-all ${
              rangeFilter === '2026'
                ? 'bg-amber-500 text-black font-semibold shadow-sm'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            2026
          </button>
          <button
            onClick={() => setRangeFilter('2027')}
            className={`px-3 py-1 min-h-11 sm:min-h-0 rounded-lg font-medium transition-all ${
              rangeFilter === '2027'
                ? 'bg-amber-500 text-black font-semibold shadow-sm'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            2027
          </button>
        </div>
      </div>

      {/* Main Area Chart */}
      <div className="h-80 w-full pt-2">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={continuousData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
            <defs>
              {/* Actuals Gradient: Warm Amber */}
              <linearGradient id="actualGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#F59E0B" stopOpacity={0.35} />
                <stop offset="95%" stopColor="#F59E0B" stopOpacity={0.0} />
              </linearGradient>

              {/* Projections Gradient: Subtle Amber Tint */}
              <linearGradient id="projectedGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#F59E0B" stopOpacity={0.15} />
                <stop offset="95%" stopColor="#F59E0B" stopOpacity={0.0} />
              </linearGradient>
            </defs>

            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" vertical={false} />

            <XAxis
              dataKey="date"
              stroke="#71717A"
              fontSize={12}
              fontFamily="var(--font-sans), system-ui, sans-serif"
              tickLine={false}
              axisLine={false}
              minTickGap={24}
              tickFormatter={(val) => (val ? formatDateShort(val) : '')}
            />

            <YAxis
              stroke="#71717A"
              fontSize={12}
              fontFamily="var(--font-sans), system-ui, sans-serif"
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
                    <div className="rounded-xl border border-white/10 bg-[#121214]/95 p-3.5 shadow-2xl backdrop-blur-md space-y-1.5">
                      <div className="flex items-center justify-between gap-3 text-xs">
                        <span className="font-semibold text-white">{data.displayDate}</span>
                        <span
                          className={`rounded px-1.5 py-0.5 text-xs tabular-nums font-medium ${
                            isCredit
                              ? 'bg-credit/10 text-credit border border-credit/20'
                              : isSettlement
                              ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                              : 'bg-white/[0.05] text-zinc-300 border border-white/10'
                          }`}
                        >
                          {data.type}
                        </span>
                      </div>
                      <div className="text-sm font-medium text-zinc-200">
                        {data.description}
                      </div>
                      <div className="flex items-center justify-between gap-4 text-xs pt-1">
                        <span className="text-zinc-400">Tx Amount:</span>
                        <span className={`tabular-nums font-bold ${isCredit ? 'text-credit' : 'text-white'}`}>
                          {isCredit ? '+' : '-'}{formatINR(data.amount)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between gap-4 text-xs pt-1 border-t border-white/[0.07]">
                        <span className="text-zinc-400">Remaining Balance:</span>
                        <span className="tabular-nums font-bold text-amber-400">
                          {formatINR(data.balance)}
                        </span>
                      </div>
                      <div className="pt-0.5 text-xs text-zinc-500">
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
              stroke="#F59E0B"
              strokeDasharray="4 4"
              strokeWidth={1.5}
              label={{
                value: `Today (${formatDateShort(referenceDate)})`,
                position: 'insideTopLeft',
                fill: '#F59E0B',
                fontSize: 12,
                fontFamily: 'var(--font-sans), system-ui, sans-serif',
                fontWeight: 600,
              }}
            />

            {/* Area 1: Settled Actuals (Solid line, Warm Amber gradient) */}
            <Area
              type="monotone"
              dataKey="actualBalance"
              stroke="#F59E0B"
              strokeWidth={2.5}
              fill="url(#actualGradient)"
              isAnimationActive={false}
              connectNulls={false}
            />

            {/* Area 2: Projections (Dashed stroke, Subtle Amber gradient) */}
            <Area
              type="monotone"
              dataKey="projectedBalance"
              stroke="#F59E0B"
              strokeWidth={2}
              strokeDasharray="5 5"
              fill="url(#projectedGradient)"
              isAnimationActive={false}
              connectNulls={false}
              opacity={0.8}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Chart Legend & Context Notes */}
      <div className="mt-4 pt-3 border-t border-white/[0.07] flex flex-wrap items-center justify-between text-xs text-zinc-400 gap-2 tabular-nums">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-amber-500 inline-block" />
            <span className="text-zinc-200">Settled Historical Actuals</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="h-0.5 w-4 border-t-2 border-dashed border-amber-400/80 inline-block" />
            <span className="text-zinc-300">Planned</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="h-3 w-0.5 bg-amber-500 inline-block" />
            <span className="text-amber-400">As of {formatDisplayDate(referenceDate)}</span>
          </div>
        </div>

      </div>
    </div>
  );
}
