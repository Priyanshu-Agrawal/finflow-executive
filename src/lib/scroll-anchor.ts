/** Fraction of the visible area above the anchor row (0.3 = row sits 30% down from the top). */
export const ANCHOR_VIEW_FRACTION = 0.3;

function scrollParent(el: HTMLElement): HTMLElement | null {
  let node = el.parentElement;
  while (node) {
    const oy = getComputedStyle(node).overflowY;
    if ((oy === 'auto' || oy === 'scroll') && node.scrollHeight > node.clientHeight) return node;
    node = node.parentElement;
  }
  return null; // the page itself scrolls
}

/**
 * Scrolls so `el` sits `fraction` of the way down its scroll area (its nearest vertically
 * scrollable ancestor, else the window). `smooth: false` jumps without animation.
 */
export function placeRowInView(
  el: HTMLElement,
  { fraction = ANCHOR_VIEW_FRACTION, smooth = true }: { fraction?: number; smooth?: boolean } = {}
): void {
  const behavior: ScrollBehavior = smooth ? 'smooth' : 'auto';
  const rowTop = el.getBoundingClientRect().top;
  const container = scrollParent(el);
  if (container) {
    const top = container.getBoundingClientRect().top;
    container.scrollTo({ top: container.scrollTop + rowTop - top - fraction * container.clientHeight, behavior });
  } else {
    window.scrollTo({ top: window.scrollY + rowTop - fraction * window.innerHeight, behavior });
  }
}
