'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Calendar,
  CreditCard,
  FileSpreadsheet,
  Home,
  LogOut,
  MoreHorizontal,
  Plus,
  RefreshCw,
  TableProperties,
  Users,
  Wallet,
  X,
} from 'lucide-react';
import { useRouter } from 'next/navigation';

interface NavbarProps {
  referenceDate: string;
  onDateChange: (newDate: string) => void;
  onOpenQuickLog?: () => void;
  onOpenEmiScheduler?: () => void;
  onRefresh?: () => void;
  isRefreshing?: boolean;
}

export function Navbar({
  referenceDate,
  onDateChange,
  onOpenQuickLog,
  onOpenEmiScheduler,
  onRefresh,
  isRefreshing,
}: NavbarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showMobileMore, setShowMobileMore] = useState(false);

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } catch {}
    router.push('/login');
    router.refresh();
  };

  const navLinks = [
    { name: 'Dashboard', href: '/', icon: Home },
    { name: 'Expenses', href: '/expenses', icon: FileSpreadsheet },
    { name: 'Excel Mode', href: '/excel', icon: TableProperties },
    { name: 'Loans & Payoff', href: '/loans', icon: CreditCard },
    { name: 'Peer Split', href: '/ledger', icon: Users },
  ];

  const handleDatePreset = (preset: 'today' | 'nov10') => {
    if (preset === 'nov10') {
      onDateChange('2026-11-10');
    } else {
      const today = new Date();
      const y = today.getFullYear();
      const m = String(today.getMonth() + 1).padStart(2, '0');
      const d = String(today.getDate()).padStart(2, '0');
      onDateChange(`${y}-${m}-${d}`);
    }
    setShowDatePicker(false);
  };

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
                <div className="flex items-center gap-1.5 leading-none">
                  <span className="font-serif text-base sm:text-lg font-bold tracking-tight text-zinc-100">
                    FinFlow
                  </span>
                  <span className="rounded bg-amber-500/10 px-1.5 py-0.5 text-[9px] font-mono font-bold text-amber-400 border border-amber-500/20 tracking-wider">
                    PORTAL
                  </span>
                </div>
                <span className="text-[10px] text-zinc-400 font-mono font-medium hidden sm:block mt-0.5">
                  scriptingBear • Executive OS
                </span>
              </div>
            </Link>
          </div>

          {/* Center: Desktop Navigation Tabs (Unified Monochromatic/Amber) */}
          <nav className="hidden lg:flex items-center gap-1 rounded-2xl border border-white/[0.07] bg-[#121214] p-1">
            {navLinks.map((link) => {
              const Icon = link.icon;
              const isActive = pathname === link.href;
              return (
                <Link
                  key={link.name}
                  href={link.href}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                    isActive
                      ? 'bg-amber-500 text-zinc-950 font-bold shadow-sm'
                      : 'text-zinc-400 hover:text-zinc-100 hover:bg-white/[0.04]'
                  }`}
                >
                  <Icon className="h-3.5 w-3.5" />
                  <span>{link.name}</span>
                </Link>
              );
            })}
          </nav>

          {/* Right Action Cluster */}
          <div className="flex items-center gap-2">
            {/* Date Anchor Pill */}
            <div className="relative">
              <button
                onClick={() => setShowDatePicker(!showDatePicker)}
                className="flex items-center gap-1.5 rounded-xl border border-white/[0.08] bg-[#121214] px-2.5 py-1.5 text-xs text-zinc-200 hover:border-amber-500/30 transition-colors"
                title="Change anchor baseline date"
              >
                <Calendar className="h-3.5 w-3.5 text-amber-400 shrink-0" />
                <span className="font-mono text-zinc-200 font-semibold text-xs">
                  {referenceDate === '2026-11-10' ? '10 Nov' : referenceDate}
                </span>
              </button>

              {showDatePicker && (
                <div className="absolute right-0 mt-2 w-64 rounded-2xl border border-white/[0.1] bg-[#121214] p-3.5 shadow-2xl z-50 animate-in fade-in">
                  <p className="text-xs font-bold text-zinc-100 mb-2">Timeline Baseline Anchor</p>
                  <div className="flex flex-col gap-1.5 mb-3">
                    <button
                      onClick={() => handleDatePreset('nov10')}
                      className={`flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition-colors ${
                        referenceDate === '2026-11-10'
                          ? 'bg-amber-500 text-zinc-950 font-bold'
                          : 'bg-white/[0.04] text-zinc-300 hover:bg-white/[0.08]'
                      }`}
                    >
                      <span>10 Nov 2026 (Audit Anchor)</span>
                      <span className="text-[10px] font-mono opacity-80">₹1.28L</span>
                    </button>
                    <button
                      onClick={() => handleDatePreset('today')}
                      className={`flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition-colors ${
                        referenceDate !== '2026-11-10'
                          ? 'bg-amber-500 text-zinc-950 font-bold'
                          : 'bg-white/[0.04] text-zinc-300 hover:bg-white/[0.08]'
                      }`}
                    >
                      <span>System Today</span>
                      <span className="text-[10px] font-mono opacity-80">Live</span>
                    </button>
                  </div>
                  <div>
                    <label className="text-[10px] text-zinc-400 block mb-1">Custom YYYY-MM-DD:</label>
                    <input
                      type="date"
                      value={referenceDate}
                      onChange={(e) => {
                        if (e.target.value) {
                          onDateChange(e.target.value);
                          setShowDatePicker(false);
                        }
                      }}
                      className="w-full rounded-xl border border-white/[0.08] bg-black/60 px-3 py-1.5 text-xs text-white focus:border-amber-500 focus:outline-none"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Sync Refresh Button */}
            {onRefresh && (
              <button
                onClick={onRefresh}
                disabled={isRefreshing}
                className="flex h-8 w-8 items-center justify-center rounded-xl border border-white/[0.08] bg-[#121214] text-zinc-400 hover:text-zinc-100 transition-colors disabled:opacity-50"
                title="Synchronize Google Sheets"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${isRefreshing ? 'animate-spin text-amber-400' : ''}`} />
              </button>
            )}

            {/* Primary Action Button (Unified Warm Amber) */}
            {onOpenQuickLog && (
              <button
                onClick={onOpenQuickLog}
                className="hidden sm:flex items-center gap-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 px-3.5 py-1.5 text-xs font-bold text-zinc-950 shadow-sm transition-all active:scale-95"
              >
                <Plus className="h-4 w-4 stroke-[2.5]" />
                <span>Log Tx</span>
              </button>
            )}

            {/* Logout Button */}
            <button
              onClick={handleLogout}
              className="hidden sm:flex h-8 w-8 items-center justify-center rounded-xl border border-white/[0.08] bg-[#121214] text-zinc-400 hover:text-rose-400 hover:border-rose-500/30 transition-colors"
              title="Sign Out of Executive Cockpit"
            >
              <LogOut className="h-3.5 w-3.5" />
            </button>

            {/* Mobile More Drawer Button */}
            <button
              onClick={() => setShowMobileMore(!showMobileMore)}
              className="flex lg:hidden h-8 w-8 items-center justify-center rounded-xl border border-white/[0.08] bg-[#121214] text-zinc-400 hover:text-white"
            >
              {showMobileMore ? <X className="h-4 w-4" /> : <MoreHorizontal className="h-4 w-4" />}
            </button>
          </div>
        </div>

        {/* Mobile Slide-down Drawer */}
        {showMobileMore && (
          <div className="lg:hidden border-b border-white/[0.08] bg-[#121214]/98 px-4 py-3.5 backdrop-blur-2xl animate-in fade-in space-y-3">
            <div className="grid grid-cols-2 gap-2">
              {navLinks.map((link) => {
                const Icon = link.icon;
                const isActive = pathname === link.href;
                return (
                  <Link
                    key={link.name}
                    href={link.href}
                    onClick={() => setShowMobileMore(false)}
                    className={`flex items-center gap-2 p-2.5 rounded-xl text-xs font-semibold transition-colors ${
                      isActive
                        ? 'bg-amber-500 text-zinc-950 font-bold'
                        : 'bg-white/[0.03] text-zinc-300 hover:bg-white/[0.06]'
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    <span>{link.name}</span>
                  </Link>
                );
              })}
            </div>

            <div className="pt-2 border-t border-white/[0.06] flex items-center justify-between">
              {onOpenEmiScheduler && (
                <button
                  onClick={() => {
                    setShowMobileMore(false);
                    onOpenEmiScheduler();
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-zinc-300 bg-white/[0.04] hover:bg-white/[0.08]"
                >
                  <CreditCard className="h-3.5 w-3.5 text-amber-400" />
                  <span>Schedule Loan EMI</span>
                </button>
              )}
              <button
                onClick={handleLogout}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-rose-400 bg-rose-500/10 hover:bg-rose-500/20"
              >
                <LogOut className="h-3.5 w-3.5" />
                <span>Sign Out</span>
              </button>
            </div>
          </div>
        )}
      </header>

      {/* Floating Bottom App Bar (Mobile Only - Unified Amber & Obsidian) */}
      <div className="fixed bottom-3 inset-x-3 z-40 lg:hidden">
        <div className="mx-auto max-w-md rounded-2xl border border-white/[0.08] bg-[#121214]/95 p-1.5 shadow-2xl backdrop-blur-xl flex items-center justify-around">
          <Link
            href="/"
            className={`flex flex-col items-center gap-0.5 px-3 py-1 rounded-xl transition-all ${
              pathname === '/' ? 'text-amber-400' : 'text-zinc-400 hover:text-white'
            }`}
          >
            <Home className="h-4 w-4" />
            <span className="text-[10px] font-medium">Home</span>
          </Link>

          <Link
            href="/expenses"
            className={`flex flex-col items-center gap-0.5 px-3 py-1 rounded-xl transition-all ${
              pathname === '/expenses' ? 'text-amber-400' : 'text-zinc-400 hover:text-white'
            }`}
          >
            <FileSpreadsheet className="h-4 w-4" />
            <span className="text-[10px] font-medium">Ledger</span>
          </Link>

          {/* Center Floating Quick Log Action */}
          {onOpenQuickLog && (
            <button
              onClick={onOpenQuickLog}
              className="flex h-11 w-11 -mt-4 items-center justify-center rounded-2xl bg-amber-500 text-zinc-950 shadow-lg shadow-amber-500/25 active:scale-95 transition-transform"
              title="Quick Log Expense"
            >
              <Plus className="h-5 w-5 stroke-[2.5]" />
            </button>
          )}

          <Link
            href="/excel"
            className={`flex flex-col items-center gap-0.5 px-3 py-1 rounded-xl transition-all ${
              pathname === '/excel' ? 'text-amber-400' : 'text-zinc-400 hover:text-white'
            }`}
          >
            <TableProperties className="h-4 w-4" />
            <span className="text-[10px] font-medium">Excel</span>
          </Link>

          <Link
            href="/loans"
            className={`flex flex-col items-center gap-0.5 px-3 py-1 rounded-xl transition-all ${
              pathname === '/loans' ? 'text-amber-400' : 'text-zinc-400 hover:text-white'
            }`}
          >
            <CreditCard className="h-4 w-4" />
            <span className="text-[10px] font-medium">Loans</span>
          </Link>
        </div>
      </div>
    </>
  );
}
