'use client';

import React, { useState, useMemo } from 'react';
import { PeerLedgerEntry } from '@/lib/types';
import { formatINR } from '@/lib/date-utils';
import { useAddLedgerEntry } from '@/hooks/useFinancials';
import { Plus, Search, Users, Wallet, Check, Sparkles } from 'lucide-react';

interface PeerLedgerTableProps {
  entries: PeerLedgerEntry[];
}

export function PeerLedgerTable({ entries }: PeerLedgerTableProps) {
  const [selectedPerson, setSelectedPerson] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [isAddOpen, setIsAddOpen] = useState(false);

  // Form state
  const [date, setDate] = useState('10 Nov');
  const [amount, setAmount] = useState<number | ''>('');
  const [description, setDescription] = useState('');
  const [splitWith, setSplitWith] = useState('Bhavishya, Harsh, Keshav');
  const [perPersonShare, setPerPersonShare] = useState<number | ''>('');

  const addMutation = useAddLedgerEntry();

  const peopleList = ['Keshav', 'Bhavishya', 'Harsh', 'Yash', 'Omendra'];

  const filteredEntries = useMemo(() => {
    return entries.filter((e) => {
      const matchesSearch =
        e.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        e.splitWith.toLowerCase().includes(searchQuery.toLowerCase()) ||
        e.date.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesPerson =
        selectedPerson === 'ALL' ||
        e.splitWith.toLowerCase().includes(selectedPerson.toLowerCase());

      return matchesSearch && matchesPerson;
    });
  }, [entries, searchQuery, selectedPerson]);

  const totalGroupSpend = entries.reduce((sum, e) => sum + e.amount, 0);
  const totalMyShare = entries.reduce((sum, e) => sum + e.perPersonShare, 0);

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || Number(amount) <= 0) return;

    await addMutation.mutateAsync({
      date,
      amount: Number(amount),
      description: description.trim() || 'Shared Outlay',
      splitWith: splitWith.trim(),
      perPersonShare: perPersonShare ? Number(perPersonShare) : Number(amount),
    });

    setIsAddOpen(false);
    setDescription('');
    setAmount('');
    setPerPersonShare('');
  };

  return (
    <div className="space-y-6">
      {/* Overview Metric Banner */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="obsidian-card rounded-2xl border border-[rgba(246,239,227,0.08)] bg-[#161310] p-4">
          <span className="text-xs font-mono text-[#9e8e7c] block">Total Group Outlays Recorded</span>
          <span className="font-serif text-2xl font-bold text-[#e9e1db] mt-1 block">
            {formatINR(totalGroupSpend)}
          </span>
          <span className="text-[11px] font-mono text-[#9e8e7c]">{entries.length} shared events in Ledger</span>
        </div>

        <div className="obsidian-card rounded-2xl border border-[#f0a93c]/30 bg-[#161310] p-4">
          <span className="text-xs font-mono text-[#ffc981] block">Priyanshu&apos;s Split Share</span>
          <span className="font-serif text-2xl font-bold text-[#edbf70] mt-1 block">
            {formatINR(totalMyShare)}
          </span>
          <span className="text-[11px] text-[#edbf70]/80">Net personal allocation</span>
        </div>

        <div className="obsidian-card rounded-2xl border border-[rgba(246,239,227,0.08)] bg-[#161310] p-4">
          <span className="text-xs font-mono text-[#d6c4af] block">Peer Group Members</span>
          <span className="text-sm font-semibold text-[#e9e1db] mt-1 block">
            Keshav, Bhavishya, Harsh, Yash, Omendra
          </span>
          <span className="text-[11px] text-[#9e8e7c]">Includes recurring Cursor AI split</span>
        </div>
      </div>

      {/* Main Table Container */}
      <div className="obsidian-card rounded-2xl border border-[rgba(246,239,227,0.08)] bg-[#161310] p-5 shadow-xl space-y-4">
        {/* Toolbar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex flex-1 items-center gap-2 max-w-sm">
            <div className="relative w-full">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-[#9e8e7c]" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search event, description, person..."
                className="w-full rounded-xl border border-[#514535]/40 bg-[#1e1b18] pl-9 pr-4 py-2 text-xs text-[#e9e1db] placeholder-[#9e8e7c] focus:border-[#f0a93c] focus:outline-none"
              />
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Person Filter Pills */}
            <div className="flex items-center gap-1 rounded-xl border border-[#514535]/40 bg-[#1e1b18] p-1">
              <button
                onClick={() => setSelectedPerson('ALL')}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors ${
                  selectedPerson === 'ALL'
                    ? 'bg-[#f0a93c] text-[#161310] font-bold shadow-sm'
                    : 'text-[#9e8e7c] hover:text-[#e9e1db]'
                }`}
              >
                All
              </button>
              {peopleList.map((p) => (
                <button
                  key={p}
                  onClick={() => setSelectedPerson(p)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors ${
                    selectedPerson === p
                      ? 'bg-[#f0a93c] text-[#161310] font-bold shadow-sm'
                      : 'text-[#9e8e7c] hover:text-[#e9e1db]'
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>

            <button
              onClick={() => setIsAddOpen(true)}
              className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-[#f0a93c] to-[#edbf70] px-3.5 py-2 text-xs font-bold text-[#161310] hover:brightness-110 transition-all shadow-sm active:scale-95"
            >
              <Plus className="h-4 w-4" />
              <span>Add Shared Outlay</span>
            </button>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto rounded-xl border border-[#514535]/30 bg-[#161310]">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-[#514535]/30 bg-[#1e1b18] text-[11px] font-mono font-semibold text-[#9e8e7c] uppercase tracking-wider">
                <th className="py-3 px-3 w-14 font-mono text-[#9e8e7c]"># Row</th>
                <th className="py-3 px-3 w-28">Date</th>
                <th className="py-3 px-4">Event / Description</th>
                <th className="py-3 px-4">Split With (Beneficiaries)</th>
                <th className="py-3 px-4 text-right">Total Outlay</th>
                <th className="py-3 px-4 text-right">My Share</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#514535]/15 bg-[#161310] font-medium">
              {filteredEntries.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-[#9e8e7c]">
                    No shared outlays match your selection.
                  </td>
                </tr>
              ) : (
                filteredEntries.map((e) => (
                  <tr key={e.rowIndex} className="hover:bg-[#1e1b18]/70 transition-colors">
                    <td className="py-2.5 px-3 font-mono text-[11px] text-[#9e8e7c]">
                      #{e.rowIndex}
                    </td>
                    <td className="py-2.5 px-3 font-mono text-[#d6c4af] whitespace-nowrap">
                      {e.date}
                    </td>
                    <td className="py-2.5 px-4 text-[#e9e1db] font-medium">
                      {e.description}
                    </td>
                    <td className="py-2.5 px-4 text-[#d6c4af]">
                      <div className="flex flex-wrap gap-1">
                        {e.splitWith.split(',').map((p) => (
                          <span
                            key={p.trim()}
                            className="rounded bg-[#1e1b18] border border-[#514535]/30 px-2 py-0.5 text-[10px] text-[#ffc981] font-medium"
                          >
                            {p.trim()}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="py-2.5 px-4 text-right font-serif font-bold text-[#e9e1db] whitespace-nowrap">
                      {formatINR(e.amount)}
                    </td>
                    <td className="py-2.5 px-4 text-right font-serif font-bold text-[#edbf70] whitespace-nowrap">
                      {formatINR(e.perPersonShare)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Shared Outlay Modal */}
      {isAddOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-md">
          <div className="w-full max-w-lg rounded-2xl border border-[rgba(246,239,227,0.1)] bg-[#161310] p-6 shadow-2xl space-y-4">
            <div>
              <h3 className="text-base font-serif font-bold text-[#e9e1db]">
                Add Shared Outlay to Ledger
              </h3>
              <p className="text-xs font-mono text-[#9e8e7c] mt-0.5">
                Directly records split entries into the Ledger tab
              </p>
            </div>

            <form onSubmit={handleAddSubmit} className="space-y-4 text-xs">
              <div>
                <label className="text-[#d6c4af] font-mono font-medium block mb-1">Date</label>
                <input
                  type="text"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  placeholder="e.g. 10 Nov"
                  className="w-full rounded-xl border border-[#514535]/40 bg-[#1e1b18] px-3 py-2 text-[#e9e1db] focus:border-[#f0a93c] focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="text-[#d6c4af] font-mono font-medium block mb-1">Total Amount (₹)</label>
                <input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(Number(e.target.value))}
                  placeholder="e.g. 1200"
                  className="w-full rounded-xl border border-[#514535]/40 bg-[#1e1b18] px-3 py-2 font-serif font-bold text-[#e9e1db] focus:border-[#f0a93c] focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="text-[#d6c4af] font-mono font-medium block mb-1">Description</label>
                <input
                  type="text"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="e.g. Dinner, Gift, Cursor Split"
                  className="w-full rounded-xl border border-[#514535]/40 bg-[#1e1b18] px-3 py-2 text-[#e9e1db] focus:border-[#f0a93c] focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="text-[#d6c4af] font-mono font-medium block mb-1">Split With (People)</label>
                <input
                  type="text"
                  value={splitWith}
                  onChange={(e) => setSplitWith(e.target.value)}
                  placeholder="e.g. Keshav, Bhavishya, Harsh"
                  className="w-full rounded-xl border border-[#514535]/40 bg-[#1e1b18] px-3 py-2 text-[#e9e1db] focus:border-[#f0a93c] focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="text-[#d6c4af] font-mono font-medium block mb-1">My Share (₹)</label>
                <input
                  type="number"
                  value={perPersonShare}
                  onChange={(e) => setPerPersonShare(Number(e.target.value))}
                  placeholder="e.g. 400"
                  className="w-full rounded-xl border border-[#514535]/40 bg-[#1e1b18] px-3 py-2 font-serif font-bold text-[#edbf70] focus:border-[#f0a93c] focus:outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-[#514535]/30">
                <button
                  type="button"
                  onClick={() => setIsAddOpen(false)}
                  className="px-4 py-2 rounded-xl text-[#9e8e7c] hover:text-[#e9e1db] transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={addMutation.isPending}
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-[#f0a93c] to-[#edbf70] font-bold text-[#161310] hover:brightness-110 transition-all shadow-sm active:scale-95"
                >
                  {addMutation.isPending ? 'Saving...' : 'Append to Ledger'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
