'use client';

import { useCallback, useEffect, useState, type RefObject } from 'react';

/**
 * True while the anchor row (the element marked `data-anchor-row` inside `containerRef`) is on
 * screen and not hidden behind the table header. Drives the floating Today button.
 * `watch` is anything that changes when the rows change.
 */
export function useAnchorInView(containerRef: RefObject<HTMLElement | null>, watch: unknown): boolean {
  const [inView, setInView] = useState(true);

  const update = useCallback(() => {
    const container = containerRef.current;
    const row = container?.querySelector('[data-anchor-row]');
    if (!container || !row) {
      setInView(false);
      return;
    }
    const c = container.getBoundingClientRect();
    const r = row.getBoundingClientRect();
    const head = container.querySelector('thead')?.getBoundingClientRect().height ?? 0;
    const insideContainer = r.bottom > c.top + head && r.top < c.bottom - 8;
    const onScreen = r.bottom > 0 && r.top < window.innerHeight;
    setInView(insideContainer && onScreen);
  }, [containerRef]);

  useEffect(() => {
    const container = containerRef.current;
    update();
    if (!container) return;
    container.addEventListener('scroll', update, { passive: true });
    window.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update);
    return () => {
      container.removeEventListener('scroll', update);
      window.removeEventListener('scroll', update);
      window.removeEventListener('resize', update);
    };
  }, [containerRef, update, watch]);

  return inView;
}
