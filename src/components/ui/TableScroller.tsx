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
    const top = el.getBoundingClientRect().top + window.scrollY; // where it starts with the page scrolled to the top
    // room kept below: the phone bottom bar, or a little breathing space on a laptop
    const gap = window.matchMedia('(min-width: 1024px)').matches ? 24 : 104;
    const height = Math.max(240, Math.round(window.innerHeight - top - gap));
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
