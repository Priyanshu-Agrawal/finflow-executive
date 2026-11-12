'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Calendar, CreditCard, LogOut, MoreHorizontal, Plus, RefreshCw, Wallet, X } from 'lucide-react';
import { NAV_ITEMS } from './nav-items';
import { useFrame } from './FrameContext';
import { anchorRowFor } from '@/lib/anchor';
import { formatDate, formatDateShort, formatMoney } from '@/lib/format';

export function Navbar() {
  const router = useRouter();
  const pathname = usePathname();
  const { referenceDate, setReferenceDate, resetToToday, openLog, openEmi, refetch, isFetching, data } = useFrame();
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showMobileMore, setShowMobileMore] = useState(false);
  const todayStr = new Date().toLocaleDateString('en-CA');

  // The last day with a logged row: a shortcut to see the books as they stood then. Built from
  // the sheet data, so it moves on its own.
  const anchor = data ? anchorRowFor(data.expenses, todayStr) : null;
  const showAnchorPreset = !!anchor && anchor.date !== todayStr;

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } catch {}
    router.push('/login');
    router.refresh();
  };

  const pickDate = (iso: string) => {
    setReferenceDate(iso);
    setShowDatePicker(false);
  };

  const phoneItems = NAV_ITEMS.filter((item) => item.phone);
  const isActive = (href: string) => pathname === href;

  return (
    <>
      {/* Top Header */}
      <header className="sticky top-0 z-40 w-full border-b border-white/[0.07] bg-[#0B0B0C]/90 backdrop-blur-xl">
        <div className="mx-auto flex h-14 sm:h-16 max-w-7xl items-center justify-between px-3 sm:px-6 lg:px-8">
          {/* Left: Brand Monogram & Title */}
          <div className="flex items-center gap-3">
            <Link href="/" className="flex items-center gap-2.5 group">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 group-hover:border-amber-500/40 transition-colors">
                <Wallet className="h-4 w-4" />
              </div>
              <div className="flex flex-col">
                <span data-allow-serif className="font-serif text-base sm:text-lg font-bold tracking-tight text-zinc-100 leading-none">
                  FinFlow
                </span>
                <span className="text-xs text-zinc-400 font-medium hidden sm:block mt-0.5">scriptingBear</span>
              </div>
            </Link>
          </div>

          {/* Center: Desktop Navigation Tabs */}
          <nav aria-label="Main" className="hidden lg:flex items-center gap-1 rounded-2xl border border-white/[0.07] bg-[#121214] p-1">
            {NAV_ITEMS.map((link) => {
              const Icon = link.icon;
              return (
                <Link
                  key={link.label}
                  href={link.href}
                  aria-current={isActive(link.href) ? 'page' : undefined}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                    isActive(link.href)
                      ? 'bg-amber-500 text-zinc-950 font-bold shadow-sm'
                      : 'text-zinc-400 hover:text-zinc-100 hover:bg-white/[0.04]'
                  }`}
                >
                  <Icon className="h-3.5 w-3.5" />
                  <span>{link.label}</span>
                </Link>
              );
            })}
          </nav>

          {/* Right Action Cluster */}
          <div className="flex items-center gap-2">
            {/* Reference date */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowDatePicker(!showDatePicker)}
                aria-label="Change the date the books are shown as of"
                aria-expanded={showDatePicker}
                className="flex items-center gap-1.5 rounded-xl border border-white/[0.08] bg-[#121214] px-2.5 py-1.5 text-xs text-zinc-200 hover:border-amber-500/30 transition-colors"
              >
                <Calendar className="h-3.5 w-3.5 text-amber-400 shrink-0" />
                <span className="tabular-nums text-zinc-200 font-semibold text-xs">
                  {referenceDate === todayStr ? 'Today' : formatDateShort(referenceDate)}
                </span>
              </button>

              {showDatePicker && (
                <div className="absolute right-0 mt-2 w-64 rounded-2xl border border-white/[0.1] bg-[#121214] p-3.5 shadow-2xl z-50 animate-in fade-in">
                  <p className="text-xs font-bold text-zinc-100 mb-2">Show the books as of</p>
                  <div className="flex flex-col gap-1.5 mb-3">
                    <button
                      type="button"
                      onClick={() => {
                        resetToToday();
                        setShowDatePicker(false);
                      }}
                      className={`flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition-colors ${
                        referenceDate === todayStr
                          ? 'bg-amber-500 text-zinc-950 font-bold'
                          : 'bg-white/[0.04] text-zinc-300 hover:bg-white/[0.08]'
                      }`}
                    >
                      <span>Today ({formatDate(todayStr)})</span>
                    </button>
                    {showAnchorPreset && anchor && (
                      <button
                        type="button"
                        onClick={() => pickDate(anchor.date)}
                        className={`flex items-center justify-between gap-2 px-3 py-2 rounded-xl text-xs font-semibold transition-colors ${
                          referenceDate === anchor.date
                            ? 'bg-amber-500 text-zinc-950 font-bold'
                            : 'bg-white/[0.04] text-zinc-300 hover:bg-white/[0.08]'
                        }`}
                      >
                        <span>Last logged day ({formatDate(anchor.date)})</span>
                        <span className="text-xs tabular-nums opacity-80">{formatMoney(anchor.balance)}</span>
                      </button>
                    )}
                  </div>
                  <div>
                    <label htmlFor="frame-date" className="text-xs text-zinc-400 block mb-1">
                      Pick a date
                    </label>
                    <input
                      id="frame-date"
                      type="date"
                      value={referenceDate}
                      onChange={(e) => {
                        if (e.target.value) pickDate(e.target.value);
                      }}
                      className="w-full rounded-xl border border-white/[0.08] bg-black/60 px-3 py-1.5 text-xs text-white focus:border-amber-500 focus:outline-none"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Refresh */}
            <button
              type="button"
              onClick={refetch}
              disabled={isFetching}
              aria-label="Refresh from Google Sheets"
              className="flex h-8 w-8 items-center justify-center rounded-xl border border-white/[0.08] bg-[#121214] text-zinc-400 hover:text-zinc-100 transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isFetching ? 'animate-spin text-amber-400' : ''}`} />
            </button>

            {/* Primary action */}
            <button
              type="button"
              onClick={openLog}
              className="hidden sm:flex items-center gap-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 px-3.5 py-1.5 text-xs font-bold text-zinc-950 shadow-sm transition-all active:scale-95"
            >
              <Plus className="h-4 w-4 stroke-[2.5]" />
              <span>Log</span>
            </button>

            {/* Sign out */}
            <button
              type="button"
              onClick={handleLogout}
              aria-label="Sign out"
              className="hidden sm:flex h-8 w-8 items-center justify-center rounded-xl border border-white/[0.08] bg-[#121214] text-zinc-400 hover:text-orange-400 hover:border-orange-500/30 transition-colors"
            >
              <LogOut className="h-3.5 w-3.5" />
            </button>

            {/* Phone: More menu */}
            <button
              type="button"
              onClick={() => setShowMobileMore(!showMobileMore)}
              aria-label="More"
              aria-expanded={showMobileMore}
              className="flex lg:hidden h-8 w-8 items-center justify-center rounded-xl border border-white/[0.08] bg-[#121214] text-zinc-400 hover:text-white"
            >
              {showMobileMore ? <X className="h-4 w-4" /> : <MoreHorizontal className="h-4 w-4" />}
            </button>
          </div>
        </div>

        {/* Phone: More drawer */}
        {showMobileMore && (
          <div className="lg:hidden border-b border-white/[0.08] bg-[#121214]/98 px-4 py-3.5 backdrop-blur-2xl animate-in fade-in space-y-3">
            <div className="grid grid-cols-2 gap-2">
              {NAV_ITEMS.map((link) => {
                const Icon = link.icon;
                return (
                  <Link
                    key={link.label}
                    href={link.href}
                    onClick={() => setShowMobileMore(false)}
                    aria-current={isActive(link.href) ? 'page' : undefined}
                    className={`flex items-center gap-2 p-2.5 rounded-xl text-xs font-semibold transition-colors ${
                      isActive(link.href)
                        ? 'bg-amber-500 text-zinc-950 font-bold'
                        : 'bg-white/[0.03] text-zinc-300 hover:bg-white/[0.06]'
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    <span>{link.label}</span>
                  </Link>
                );
              })}
            </div>

            <div className="pt-2 border-t border-white/[0.06] flex items-center justify-between">
              <button
                type="button"
                onClick={() => {
                  setShowMobileMore(false);
                  openEmi();
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-zinc-300 bg-white/[0.04] hover:bg-white/[0.08]"
              >
                <CreditCard className="h-3.5 w-3.5 text-amber-400" />
                <span>Schedule EMI</span>
              </button>
              <button
                type="button"
                onClick={handleLogout}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-orange-400 bg-orange-500/10 hover:bg-orange-500/20"
              >
                <LogOut className="h-3.5 w-3.5" />
                <span>Sign out</span>
              </button>
            </div>
          </div>
        )}
      </header>

      {/* Phone bottom bar: the first two destinations, the Log button, then the rest of the phone items */}
      <nav aria-label="Bottom" className="fixed bottom-3 inset-x-3 z-40 lg:hidden">
        <div className="mx-auto max-w-md rounded-2xl border border-white/[0.08] bg-[#121214]/95 p-1.5 shadow-2xl backdrop-blur-xl flex items-center justify-around">
          {phoneItems.map((link, i) => {
            const Icon = link.icon;
            return (
              <React.Fragment key={link.label}>
                {i === 2 && (
                  <button
                    type="button"
                    onClick={openLog}
                    aria-label="Log"
                    className="flex h-11 w-11 -mt-4 items-center justify-center rounded-2xl bg-amber-500 text-zinc-950 shadow-lg shadow-amber-500/25 active:scale-95 transition-transform"
                  >
                    <Plus className="h-5 w-5 stroke-[2.5]" />
                  </button>
                )}
                <Link
                  href={link.href}
                  aria-current={isActive(link.href) ? 'page' : undefined}
                  className={`flex flex-col items-center gap-0.5 px-3 py-1 rounded-xl transition-all ${
                    isActive(link.href) ? 'text-amber-400' : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  <span className="text-xs font-medium">{link.label}</span>
                </Link>
              </React.Fragment>
            );
          })}
        </div>
      </nav>
    </>
  );
}
