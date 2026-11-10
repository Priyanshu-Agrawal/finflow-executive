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
    <div className="obsidian-card rounded-2xl border border-[rgba(246,239,227,0.08)] bg-[#161310] p-5 shadow-xl space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-serif font-bold text-[#e9e1db] flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-[#f0a93c]" />
            Cash Flow & Running Balance Timeline
          </h2>
          <p className="text-xs font-mono text-[#9e8e7c] mt-0.5">
            Dynamic Curve: Settled Historical Actuals (≤ {formatDisplayDate(referenceDate)}) vs Future Projections (2026–2027)
          </p>
        </div>

        {/* Range Filters */}
        <div className="flex items-center gap-1.5 rounded-xl border border-[#514535]/40 bg-[#1e1b18] p-1 self-start sm:self-auto text-xs">
          <button
            onClick={() => setRangeFilter('all')}
            className={`px-3 py-1 rounded-lg font-semibold transition-all ${
              rangeFilter === 'all'
                ? 'bg-[#f0a93c] text-[#161310] font-bold shadow-sm'
                : 'text-[#9e8e7c] hover:text-[#e9e1db]'
            }`}
          >
            All (314+)
          </button>
          <button
            onClick={() => setRangeFilter('near')}
            className={`px-3 py-1 rounded-lg font-semibold transition-all ${
              rangeFilter === 'near'
                ? 'bg-[#f0a93c] text-[#161310] font-bold shadow-sm'
                : 'text-[#9e8e7c] hover:text-[#e9e1db]'
            }`}
          >
            Q4 26 – Q1 27
          </button>
          <button
            onClick={() => setRangeFilter('2026')}
            className={`px-3 py-1 rounded-lg font-semibold transition-all ${
              rangeFilter === '2026'
                ? 'bg-[#f0a93c] text-[#161310] font-bold shadow-sm'
                : 'text-[#9e8e7c] hover:text-[#e9e1db]'
            }`}
          >
            2026
          </button>
          <button
            onClick={() => setRangeFilter('2027')}
            className={`px-3 py-1 rounded-lg font-semibold transition-all ${
              rangeFilter === '2027'
                ? 'bg-[#f0a93c] text-[#161310] font-bold shadow-sm'
                : 'text-[#9e8e7c] hover:text-[#e9e1db]'
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
              {/* Actuals Gradient: Primary Obsidian Gold */}
              <linearGradient id="actualGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#f0a93c" stopOpacity={0.35} />
                <stop offset="95%" stopColor="#f0a93c" stopOpacity={0.0} />
              </linearGradient>

              {/* Projections Gradient: Secondary Gold */}
              <linearGradient id="projectedGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#edbf70" stopOpacity={0.20} />
                <stop offset="95%" stopColor="#edbf70" stopOpacity={0.0} />
              </linearGradient>
            </defs>

            <CartesianGrid strokeDasharray="3 3" stroke="#514535" opacity={0.25} vertical={false} />

            <XAxis
              dataKey="date"
              stroke="#9e8e7c"
              fontSize={11}
              fontFamily="monospace"
              tickLine={false}
              axisLine={false}
              tickFormatter={(val) => {
                if (!val) return '';
                const parts = val.split('-');
                return parts.length >= 3 ? `${parts[2]}/${parts[1]}` : val;
              }}
            />

            <YAxis
              stroke="#9e8e7c"
              fontSize={11}
              fontFamily="monospace"
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
                    <div className="rounded-xl border border-[#514535]/50 bg-[#161310]/95 p-3 shadow-2xl backdrop-blur-md space-y-1">
                      <div className="flex items-center justify-between gap-3 text-xs">
                        <span className="font-semibold text-[#e9e1db]">{data.displayDate}</span>
                        <span
                          className={`rounded px-1.5 py-0.5 text-[10px] font-mono font-bold ${
                            isCredit
                              ? 'bg-[#edbf70]/20 text-[#edbf70]'
                              : isSettlement
                              ? 'bg-[#f0a93c]/20 text-[#ffc981]'
                              : 'bg-[#ffb4ab]/20 text-[#ffb4ab]'
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
              stroke="#ffb4ab"
              strokeDasharray="4 4"
              strokeWidth={2}
              label={{
                value: `Today (${formatDisplayDate(referenceDate)})`,
                position: 'insideTopLeft',
                fill: '#ffb4ab',
                fontSize: 11,
                fontFamily: 'monospace',
                fontWeight: 600,
              }}
            />

            {/* Area 1: Settled Actuals (Solid line, Primary Gold gradient) */}
            <Area
              type="monotone"
              dataKey="actualBalance"
              stroke="#f0a93c"
              strokeWidth={2.5}
              fill="url(#actualGradient)"
              isAnimationActive={false}
              connectNulls={false}
            />

            {/* Area 2: Projections (Dashed stroke, Secondary Gold gradient) */}
            <Area
              type="monotone"
              dataKey="projectedBalance"
              stroke="#edbf70"
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
      <div className="mt-4 pt-3 border-t border-[#514535]/30 flex flex-wrap items-center justify-between text-xs text-[#9e8e7c] gap-2 font-mono">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-[#f0a93c] inline-block shadow-xs" />
            <span className="text-[#e9e1db]">Settled Historical Actuals</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="h-0.5 w-4 border-t-2 border-dashed border-[#edbf70] inline-block" />
            <span className="text-[#d6c4af]">Future Projections (Formula Chain)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="h-3 w-0.5 bg-[#ffb4ab] inline-block" />
            <span className="text-[#ffb4ab]">Anchor ({formatDisplayDate(referenceDate)})</span>
          </div>
        </div>

        <div className="text-[11px] text-[#9e8e7c]">
          Formula Lineage: <span className="text-[#ffc981]">=IF(OR(D...))</span>
        </div>
      </div>
    </div>
  );
}
