'use client';

import { useEffect, useRef, type ReactNode } from 'react';

/**
 * The page's control bar (search, filters, view switches). It sticks under the top bar and
 * publishes its own height as --sticky-bar-h so table headers can stick right under it.
 */
export function StickyBar({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const root = document.documentElement;
    const publish = () => root.style.setProperty('--sticky-bar-h', `${el.offsetHeight}px`);
    publish();
    const ro = new ResizeObserver(publish);
    ro.observe(el);
    return () => {
      ro.disconnect();
      root.style.setProperty('--sticky-bar-h', '0px');
    };
  }, []);
  return (
    <div
      ref={ref}
      data-sticky-bar
      className="sticky z-30 -mx-3 border-b border-white/[0.07] bg-[#0B0B0C]/95 px-3 py-2 backdrop-blur sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8"
      style={{ top: 'var(--topbar-h)' }}
    >
      {children}
    </div>
  );
}
