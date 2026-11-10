'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Calendar,
  CreditCard,
  FileSpreadsheet,
  Grid,
  Home,
  LogOut,
  Menu,
  MoreHorizontal,
  Plus,
  RefreshCw,
  Sliders,
  TableProperties,
  Users,
  Wallet,
  X,
  Zap,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { formatDisplayDate } from '@/lib/date-utils';

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
    { name: 'Excel Mode', href: '/excel', icon: TableProperties, isExcel: true },
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
      <header className="sticky top-0 z-40 w-full border-b border-[rgba(246,239,227,0.08)] bg-[#161310]/90 backdrop-blur-xl">
        <div className="mx-auto flex h-14 sm:h-16 max-w-7xl items-center justify-between px-3 sm:px-6 lg:px-8">
          {/* Left: Brand Monogram & Title */}
          <div className="flex items-center gap-3">
            <Link href="/" className="flex items-center gap-2.5 group">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-tr from-[#F0A93C] via-[#EDBF70] to-[#E5B869] p-[1.5px] shadow-lg shadow-[#F0A93C]/10 group-hover:scale-105 transition-transform">
                <div className="flex h-full w-full items-center justify-center rounded-[10px] bg-[#161310]">
                  <Wallet className="h-4 w-4 text-[#F0A93C]" />
                </div>
              </div>
              <div className="flex flex-col">
                <div className="flex items-center gap-1.5 leading-none">
                  <span className="font-serif text-base sm:text-lg font-bold tracking-tight text-white">
                    FinFlow
                  </span>
                  <span className="rounded bg-[#F0A93C]/15 px-1.5 py-0.5 text-[9px] font-mono font-bold text-[#F0A93C] border border-[#F0A93C]/30 tracking-wider">
                    PORTAL
                  </span>
                </div>
                <span className="text-[10px] text-[#A89F91] font-mono font-medium hidden sm:block mt-0.5">
                  scriptingBear • Executive OS
                </span>
              </div>
            </Link>
          </div>

          {/* Center: Desktop Navigation Tabs */}
          <nav className="hidden lg:flex items-center gap-1 rounded-2xl border border-[rgba(246,239,227,0.08)] bg-[#100D0A]/80 p-1">
            {navLinks.map((link) => {
              const Icon = link.icon;
              const isActive = pathname === link.href;
              return (
                <Link
                  key={link.name}
                  href={link.href}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                    isActive
                      ? link.isExcel
                        ? 'bg-emerald-500 text-slate-950 font-bold shadow-md shadow-emerald-500/20'
                        : 'bg-[#F0A93C] text-[#100D0A] font-bold shadow-md shadow-[#F0A93C]/20'
                      : link.isExcel
                      ? 'text-emerald-400 hover:text-emerald-300 hover:bg-emerald-950/30'
                      : 'text-[#A89F91] hover:text-white hover:bg-white/[0.04]'
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
            {/* Quick Excel Mode Button (Desktop) */}
            <Link
              href={pathname === '/excel' ? '/' : '/excel'}
              className={`hidden md:flex items-center gap-1.5 rounded-xl px-2.5 py-1.5 text-xs font-bold border transition-all ${
                pathname === '/excel'
                  ? 'bg-indigo-600 text-white border-indigo-500'
                  : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/20'
              }`}
            >
              <TableProperties className="h-3.5 w-3.5 text-emerald-400" />
              <span>{pathname === '/excel' ? 'Exit Excel' : 'Excel Grid'}</span>
            </Link>

            {/* Date Anchor Pill */}
            <div className="relative">
              <button
                onClick={() => setShowDatePicker(!showDatePicker)}
                className="flex items-center gap-1.5 rounded-xl border border-[rgba(246,239,227,0.08)] bg-[#181411] px-2.5 py-1.5 text-xs text-[#E9E1DB] hover:border-[#F0A93C]/40 transition-colors"
                title="Change anchor baseline date"
              >
                <Calendar className="h-3.5 w-3.5 text-[#F0A93C] shrink-0" />
                <span className="font-mono text-[#F0A93C] font-semibold text-xs">
                  {referenceDate === '2026-11-10' ? '10 Nov' : referenceDate}
                </span>
              </button>

              {showDatePicker && (
                <div className="absolute right-0 mt-2 w-64 rounded-2xl border border-white/[0.1] bg-[#11131a] p-3.5 shadow-2xl z-50 animate-in fade-in">
                  <p className="text-xs font-bold text-white mb-2">Timeline Baseline Anchor</p>
                  <div className="flex flex-col gap-1.5 mb-3">
                    <button
                      onClick={() => handleDatePreset('nov10')}
                      className={`flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition-colors ${
                        referenceDate === '2026-11-10'
                          ? 'bg-emerald-500 text-slate-950 font-bold'
                          : 'bg-white/[0.04] text-slate-300 hover:bg-white/[0.08]'
                      }`}
                    >
                      <span>10 Nov 2026 (Audit Anchor)</span>
                      <span className="text-[10px] opacity-80">₹1.28L</span>
                    </button>
                    <button
                      onClick={() => handleDatePreset('today')}
                      className={`flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition-colors ${
                        referenceDate !== '2026-11-10'
                          ? 'bg-emerald-500 text-slate-950 font-bold'
                          : 'bg-white/[0.04] text-slate-300 hover:bg-white/[0.08]'
                      }`}
                    >
                      <span>System Today</span>
                      <span className="text-[10px] opacity-80">Live</span>
                    </button>
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-400 block mb-1">Custom YYYY-MM-DD:</label>
                    <input
                      type="date"
                      value={referenceDate}
                      onChange={(e) => {
                        if (e.target.value) {
                          onDateChange(e.target.value);
                          setShowDatePicker(false);
                        }
                      }}
                      className="w-full rounded-xl border border-white/[0.1] bg-black/60 px-3 py-1.5 text-xs text-white focus:border-emerald-500 focus:outline-none"
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
                className="flex h-8 w-8 items-center justify-center rounded-xl border border-white/[0.08] bg-white/[0.03] text-slate-400 hover:text-white transition-colors disabled:opacity-50"
                title="Synchronize Google Sheets"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${isRefreshing ? 'animate-spin text-emerald-400' : ''}`} />
              </button>
            )}

            {/* Primary Action Button */}
            {onOpenQuickLog && (
              <button
                onClick={onOpenQuickLog}
                className="hidden sm:flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-emerald-500 to-indigo-600 px-3.5 py-1.5 text-xs font-bold text-white shadow-md shadow-emerald-500/20 hover:opacity-95 transition-all active:scale-95"
              >
                <Plus className="h-4 w-4 stroke-[2.5]" />
                <span>Log Tx</span>
              </button>
            )}

            {/* Logout Button */}
            <button
              onClick={handleLogout}
              className="hidden sm:flex h-8 w-8 items-center justify-center rounded-xl border border-white/[0.08] bg-white/[0.03] text-slate-400 hover:text-rose-400 hover:border-rose-500/30 transition-colors"
              title="Sign Out of Executive Cockpit"
            >
              <LogOut className="h-3.5 w-3.5" />
            </button>

            {/* Mobile More Drawer Button */}
            <button
              onClick={() => setShowMobileMore(!showMobileMore)}
              className="flex lg:hidden h-8 w-8 items-center justify-center rounded-xl border border-white/[0.08] text-slate-400 hover:text-white"
            >
              {showMobileMore ? <X className="h-4 w-4" /> : <MoreHorizontal className="h-4 w-4" />}
            </button>
          </div>
        </div>

        {/* Mobile Slide-down Drawer */}
        {showMobileMore && (
          <div className="lg:hidden border-b border-white/[0.08] bg-[#0c0e14]/98 px-4 py-3.5 backdrop-blur-2xl animate-in fade-in">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-2">
              All Sections
            </span>
            <div className="grid grid-cols-2 gap-2">
              {navLinks.map((link) => {
                const Icon = link.icon;
                const isActive = pathname === link.href;
                return (
                  <Link
                    key={link.name}
                    href={link.href}
                    onClick={() => setShowMobileMore(false)}
                    className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-semibold ${
                      isActive
                        ? 'bg-emerald-500 text-slate-950 font-bold'
                        : 'bg-white/[0.03] text-slate-300 hover:text-white'
                    }`}
                  >
                    <Icon className="h-4 w-4 text-emerald-400" />
                    <span>{link.name}</span>
                  </Link>
                );
              })}
            </div>
            <div className="mt-3 pt-3 border-t border-white/[0.06] flex flex-col gap-2">
              {onOpenEmiScheduler && (
                <button
                  onClick={() => {
                    setShowMobileMore(false);
                    onOpenEmiScheduler();
                  }}
                  className="w-full flex items-center justify-center gap-2 rounded-xl border border-white/[0.1] bg-white/[0.04] py-2.5 text-xs font-bold text-slate-200"
                >
                  <Sliders className="h-4 w-4 text-indigo-400" />
                  <span>Open EMI Scheduler</span>
                </button>
              )}
              <button
                onClick={handleLogout}
                className="w-full flex items-center justify-center gap-2 rounded-xl border border-rose-500/20 bg-rose-950/20 py-2.5 text-xs font-bold text-rose-300 hover:bg-rose-900/30 transition-colors"
              >
                <LogOut className="h-4 w-4" />
                <span>Sign Out</span>
              </button>
            </div>
          </div>
        )}
      </header>

      {/* Modern Floating Bottom Dock for Mobile (Ultra-Sleek Glass Dock) */}
      <div className="fixed bottom-3 inset-x-3 z-40 lg:hidden flex justify-center pointer-events-none pb-[env(safe-area-inset-bottom)]">
        <nav className="pointer-events-auto flex items-center gap-1 sm:gap-2 rounded-2xl border border-white/[0.12] bg-[#0c0e14]/90 px-3 py-2 shadow-2xl backdrop-blur-2xl">
          {/* Home */}
          <Link
            href="/"
            className={`flex flex-col items-center gap-0.5 px-3 py-1 rounded-xl transition-all ${
              pathname === '/'
                ? 'text-emerald-400 font-bold bg-white/[0.06]'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Home className="h-4 w-4" />
            <span className="text-[9px]">Home</span>
          </Link>

          {/* Ledger */}
          <Link
            href="/expenses"
            className={`flex flex-col items-center gap-0.5 px-3 py-1 rounded-xl transition-all ${
              pathname === '/expenses'
                ? 'text-emerald-400 font-bold bg-white/[0.06]'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <FileSpreadsheet className="h-4 w-4" />
            <span className="text-[9px]">Ledger</span>
          </Link>

          {/* Elevated Central (+) Add Button */}
          {onOpenQuickLog && (
            <button
              onClick={onOpenQuickLog}
              className="mx-1 flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-tr from-emerald-500 to-indigo-600 text-white shadow-lg shadow-emerald-500/30 active:scale-95 transition-transform"
              title="Quick Log Expense"
            >
              <Plus className="h-6 w-6 stroke-[2.5]" />
            </button>
          )}

          {/* Excel Mode */}
          <Link
            href="/excel"
            className={`flex flex-col items-center gap-0.5 px-3 py-1 rounded-xl transition-all ${
              pathname === '/excel'
                ? 'text-emerald-400 font-bold bg-white/[0.06]'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <TableProperties className="h-4 w-4" />
            <span className="text-[9px]">Excel</span>
          </Link>

          {/* Loans */}
          <Link
            href="/loans"
            className={`flex flex-col items-center gap-0.5 px-3 py-1 rounded-xl transition-all ${
              pathname === '/loans'
                ? 'text-emerald-400 font-bold bg-white/[0.06]'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <CreditCard className="h-4 w-4" />
            <span className="text-[9px]">Loans</span>
          </Link>
        </nav>
      </div>
    </>
  );
}
