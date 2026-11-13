'use client';

import { forwardRef, useCallback, useImperativeHandle, useLayoutEffect, useRef, type ReactNode } from 'react';

/**
 * Scroll area for a long table. It is sized to fill the screen below the page controls, so the
 * table header (position: sticky; top: 0 inside it) always stays in view, on phone and laptop,
 * and the page itself does not need to scroll to reach the last row.
 */
export const TableScroller = forwardRef<HTMLDivElement, { children: ReactNode; className?: string }>(function TableScroller(
  { children, className = '' },
  forwardedRef
) {
  const ref = useRef<HTMLDivElement>(null);
  useImperativeHandle(forwardedRef, () => ref.current as HTMLDivElement);

  const fit = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    // Size for the room there will be once the top bar and the page's sticky control bar are
    // actually stuck (their heights, not how far down the unscrolled page this element sits —
    // those differ whenever other content, like summary cards, sits above the scroller).
    // Measured straight from the DOM (not StickyBar's published CSS variable), so this does not
    // depend on that sibling's own effect having already run.
    const topbar = document.querySelector('header')?.getBoundingClientRect().height ?? 0;
    const stickyBar = document.querySelector('[data-sticky-bar]')?.getBoundingClientRect().height ?? 0;
    // room kept below: the phone bottom bar, or a little breathing space on a laptop
    const gap = window.matchMedia('(min-width: 1024px)').matches ? 24 : 104;
    const height = Math.max(240, Math.round(window.innerHeight - topbar - stickyBar - gap));
    if (el.style.maxHeight !== `${height}px`) el.style.maxHeight = `${height}px`;
  }, []);

  useLayoutEffect(() => {
    fit();
    window.addEventListener('resize', fit);
    const ro = new ResizeObserver(fit);
    ro.observe(document.body);
    return () => {
      window.removeEventListener('resize', fit);
      ro.disconnect();
    };
  }, [fit]);

  return (
    <div
      ref={ref}
      className={`overflow-auto overscroll-contain rounded-xl border border-white/[0.07] bg-[#121214] ${className}`}
      style={{ maxHeight: '70dvh' }}
    >
      {children}
    </div>
  );
});
