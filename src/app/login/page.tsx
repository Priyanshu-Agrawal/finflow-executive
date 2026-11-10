'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Eye, EyeOff, Lock, LogIn, ShieldCheck, User, Wallet } from 'lucide-react';

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const from = searchParams.get('from') || '/';

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Check if already authenticated
  useEffect(() => {
    let mounted = true;
    fetch('/api/auth/me')
      .then((res) => {
        if (res.ok && mounted) {
          window.location.replace(from);
        }
      })
      .catch(() => {});
    return () => {
      mounted = false;
    };
  }, [from]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setLoading(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password, rememberMe }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Invalid credentials.');
      }

      // Successful login -> Full window document navigation
      // Using window.location.href guarantees cookies are attached to the browser request
      window.location.href = from;

      // Fallback timeout to unfreeze button if network delays navigation
      setTimeout(() => {
        setLoading(false);
      }, 6000);
    } catch (err: any) {
      setErrorMsg(err.message || 'Authentication failed');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#100D0A] text-[#e9e1db] flex flex-col justify-center items-center px-4 relative overflow-hidden font-sans">
      {/* Ambient background glows */}
      <div className="pointer-events-none absolute -top-40 -left-40 h-96 w-96 rounded-full bg-[#f0a93c]/10 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-40 -right-40 h-96 w-96 rounded-full bg-[#edbf70]/10 blur-3xl" />

      {/* Main Login Box */}
      <div className="w-full max-w-md relative z-10">
        {/* Brand Header */}
        <div className="text-center mb-8">
          <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-tr from-[#f0a93c] via-[#edbf70] to-[#f0a93c] p-[1.5px] shadow-2xl shadow-[#f0a93c]/20 mb-4">
            <div className="flex h-full w-full items-center justify-center rounded-[14px] bg-[#161310]">
              <span className="font-serif text-lg font-bold text-[#ffc981]">PA</span>
            </div>
          </div>
          <h1 className="text-2xl font-serif font-bold text-[#e9e1db] tracking-tight flex items-center justify-center gap-2">
            FinFlow
            <span className="rounded-full bg-[#f0a93c]/15 px-2.5 py-0.5 text-[10px] font-mono font-bold text-[#ffc981] border border-[#f0a93c]/30 uppercase tracking-wider">
              PORTAL
            </span>
          </h1>
          <p className="text-xs font-mono text-[#9e8e7c] mt-1.5">
            Private Financial Management & Intelligence
          </p>
        </div>

        {/* Card Form */}
        <div className="obsidian-card rounded-2xl border border-[rgba(246,239,227,0.08)] bg-[#161310] p-6 sm:p-8 shadow-2xl">
          <form onSubmit={handleLogin} className="space-y-4">
            {/* Error Message */}
            {errorMsg && (
              <div className="rounded-xl border border-rose-500/40 bg-rose-950/40 p-3 text-xs text-rose-300 animate-in fade-in">
                {errorMsg}
              </div>
            )}

            {/* Username Input */}
            <div>
              <label className="text-xs font-mono font-semibold text-[#d6c4af] block mb-1.5">
                Username
              </label>
              <div className="relative">
                <User className="absolute left-3.5 top-3 h-4 w-4 text-[#9e8e7c]" />
                <input
                  type="text"
                  name="username"
                  autoComplete="username"
                  autoCapitalize="none"
                  autoCorrect="off"
                  spellCheck="false"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Username"
                  className="w-full rounded-xl border border-[#514535]/40 bg-[#1e1b18] pl-10 pr-4 py-2.5 text-xs sm:text-sm text-[#e9e1db] placeholder-[#9e8e7c] focus:border-[#f0a93c] focus:outline-none transition-colors"
                />
              </div>
            </div>

            {/* Password Input */}
            <div>
              <label className="text-xs font-mono font-semibold text-[#d6c4af] block mb-1.5">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-3 h-4 w-4 text-[#9e8e7c]" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Password"
                  className="w-full rounded-xl border border-[#514535]/40 bg-[#1e1b18] pl-10 pr-10 py-2.5 text-xs sm:text-sm text-[#e9e1db] placeholder-[#9e8e7c] focus:border-[#f0a93c] focus:outline-none font-mono transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-3 text-[#9e8e7c] hover:text-[#e9e1db] transition-colors"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {/* Remember Me Checkbox */}
            <div className="flex items-center justify-between pt-1">
              <label className="flex items-center gap-2 cursor-pointer text-xs text-[#9e8e7c] hover:text-[#e9e1db]">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="rounded border-[#514535] bg-[#1e1b18] text-[#f0a93c] focus:ring-0"
                />
                <span>Stay signed in (30 days)</span>
              </label>
              <span className="text-[11px] font-mono text-[#9e8e7c]">Encrypted Session</span>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-[#f0a93c] via-[#edbf70] to-[#f0a93c] hover:brightness-110 text-[#161310] font-bold text-xs sm:text-sm shadow-[0_0_20px_rgba(240,169,60,0.25)] transition-all flex items-center justify-center gap-2 disabled:opacity-50 mt-2 active:scale-95"
            >
              {loading ? (
                <>
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-[#161310] border-t-transparent" />
                  <span>Verifying Session...</span>
                </>
              ) : (
                <>
                  <LogIn className="h-4 w-4" />
                  <span>Sign In</span>
                </>
              )}
            </button>
          </form>
        </div>

        {/* Security Footer */}
        <div className="mt-8 text-center text-xs text-[#9e8e7c] flex items-center justify-center gap-1.5 font-mono">
          <ShieldCheck className="h-4 w-4 text-[#f0a93c]" />
          <span>Encrypted Session • Automatic Token Rotation</span>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#07090e] flex items-center justify-center text-slate-500 text-xs font-sans">
          Loading Portal...
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
