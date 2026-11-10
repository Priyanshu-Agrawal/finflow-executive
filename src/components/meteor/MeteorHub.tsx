'use client';

import React from 'react';
import { MeteorAccessory, MeteorCapitalCost, LoanStatus } from '@/lib/types';
import { formatINR } from '@/lib/date-utils';
import { CheckCircle, Clock, Compass, DollarSign, ShieldCheck, Tag, Wrench, Zap } from 'lucide-react';

interface MeteorHubProps {
  accessories: MeteorAccessory[];
  costs: MeteorCapitalCost[];
  bikeLoan?: LoanStatus;
}

export function MeteorHub({ accessories, costs, bikeLoan }: MeteorHubProps) {
  const totalOnRoad = costs.reduce((sum, c) => sum + c.amount, 0);

  return (
    <div className="space-y-6">
      {/* Bike Loan & Capital Overview Banner */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* On-Road Capital Cost */}
        <div className="rounded-2xl border border-indigo-500/20 bg-slate-900/60 p-5 shadow-xl">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-indigo-400 uppercase tracking-wider flex items-center gap-1.5">
              <Compass className="h-4 w-4" />
              Meteor 350 Capital Asset
            </span>
            <span className="rounded-md bg-indigo-500/10 px-2 py-0.5 text-[10px] font-bold text-indigo-300">
              Total On-Road
            </span>
          </div>
          <div className="font-mono text-3xl font-extrabold text-white">
            {formatINR(totalOnRoad)}
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Ex-Showroom + RTO + Insurance + OEM Protection
          </p>
        </div>

        {/* Amortization Status */}
        {bikeLoan && (
          <div className="rounded-2xl border border-emerald-500/20 bg-slate-900/60 p-5 shadow-xl">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
                <ShieldCheck className="h-4 w-4" />
                Active Loan Liquidation
              </span>
              <span className="rounded-md bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold text-emerald-300">
                {bikeLoan.progressPercent}% Cleared
              </span>
            </div>
            <div className="font-mono text-3xl font-extrabold text-emerald-300">
              {formatINR(bikeLoan.paidToDate)}
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Remaining: <span className="font-mono text-rose-400 font-bold">{formatINR(bikeLoan.currentDue)}</span> • EMI: <span className="font-mono text-white">{formatINR(bikeLoan.monthlyEmi || 11771)}/mo</span>
            </p>
          </div>
        )}

        {/* Milestone Free-up */}
        <div className="rounded-2xl border border-amber-500/20 bg-slate-900/60 p-5 shadow-xl flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                <Zap className="h-4 w-4" />
                Payoff Milestone
              </span>
              <span className="text-xs font-mono text-slate-400">August 2027</span>
            </div>
            <div className="text-lg font-bold text-white">
              Debt-Free Asset Status
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Unlocks <strong className="font-mono text-emerald-400">+₹11,771/mo</strong> directly to your personal surplus.
            </p>
          </div>
          <div className="pt-2 border-t border-slate-800 text-[11px] text-emerald-400 font-medium flex items-center gap-1">
            <Clock className="h-3.5 w-3.5" />
            <span>Target liquidation on 2 Aug 2027</span>
          </div>
        </div>
      </div>

      {/* Two Columns: Capital Breakdown & Accessories Wishlist */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Capital Breakdown List */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 shadow-xl">
          <h3 className="text-base font-bold text-white mb-1 flex items-center gap-2">
            <DollarSign className="h-4 w-4 text-indigo-400" />
            On-Road Invoice Breakdown
          </h3>
          <p className="text-xs text-slate-400 mb-4">
            Official delivery invoice recorded in Meteor sheet
          </p>

          <div className="space-y-2">
            {costs.map((c, i) => (
              <div
                key={i}
                className="flex items-center justify-between p-2.5 rounded-xl border border-slate-800/80 bg-slate-950/60 text-xs"
              >
                <span className="text-slate-300 font-medium">{c.label}</span>
                <span
                  className={`font-mono font-bold ${
                    c.amount < 0 ? 'text-emerald-400' : 'text-white'
                  }`}
                >
                  {c.amount < 0 ? '-' : ''}{formatINR(Math.abs(c.amount))}
                </span>
              </div>
            ))}
            <div className="pt-2 border-t border-slate-800 flex items-center justify-between font-bold text-xs p-2">
              <span className="text-white">Net On-Road Total</span>
              <span className="font-mono text-indigo-400">{formatINR(totalOnRoad)}</span>
            </div>
          </div>
        </div>

        {/* Accessories & Modifications Wishlist */}
        <div className="lg:col-span-2 rounded-2xl border border-slate-800 bg-slate-900/60 p-5 shadow-xl">
          <h3 className="text-base font-bold text-white mb-1 flex items-center gap-2">
            <Wrench className="h-4 w-4 text-indigo-400" />
            Accessories & Aftermarket Price Comparisons
          </h3>
          <p className="text-xs text-slate-400 mb-4">
            Cataloged official Royal Enfield parts vs. aftermarket sourcing estimates
          </p>

          <div className="overflow-x-auto rounded-xl border border-slate-800">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-950/80 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                  <th className="py-3 px-4">Accessory Part</th>
                  <th className="py-3 px-4">Variant / Finish</th>
                  <th className="py-3 px-4 text-right">RE Official (₹)</th>
                  <th className="py-3 px-4 text-right">Aftermarket (₹)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 bg-slate-900/30 font-medium">
                {accessories.map((a, i) => (
                  <tr key={i} className="hover:bg-slate-800/40 transition-colors">
                    <td className="py-2.5 px-4 text-white font-medium">{a.name}</td>
                    <td className="py-2.5 px-4 text-slate-400">{a.variant || '--'}</td>
                    <td className="py-2.5 px-4 text-right font-mono font-bold text-slate-200">
                      {a.rePrice}
                    </td>
                    <td className="py-2.5 px-4 text-right font-mono text-emerald-400">
                      {a.afterMarketPrice || '--'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
