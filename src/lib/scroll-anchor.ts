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
  const rowTop = el.getBoundingClientRect().top;
  const container = scrollParent(el);
  if (container) {
    const top = container.getBoundingClientRect().top;
    const target = container.scrollTop + rowTop - top - fraction * container.clientHeight;
    glide((y, b) => container.scrollTo({ top: y, behavior: b }), container.scrollTop, target, container.clientHeight, smooth);
  } else {
    const target = window.scrollY + rowTop - fraction * window.innerHeight;
    glide((y, b) => window.scrollTo({ top: y, behavior: b }), window.scrollY, target, window.innerHeight, smooth);
  }
}

/** Smooth scroll that jumps most of a long distance first, so it lands quickly. */
function glide(
  scroll: (y: number, behavior: ScrollBehavior) => void,
  from: number,
  to: number,
  view: number,
  smooth: boolean
): void {
  if (!smooth) return scroll(to, 'auto');
  const dist = to - from;
  if (Math.abs(dist) > view * 1.5) scroll(to - Math.sign(dist) * view * 0.75, 'auto');
  scroll(to, 'smooth');
}
