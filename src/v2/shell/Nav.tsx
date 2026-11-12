'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useLogSheet } from '../log/LogSheetContext';

const ICON = { width: 22, height: 22, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, 'aria-hidden': true } as const;

const ITEMS = [
  { href: '/v2', label: 'Today', icon: <svg {...ICON}><circle cx="12" cy="12" r="8.5" /><path d="M12 7.5V12l3 2" /></svg> },
  { href: '/v2/passbook', label: 'Passbook', icon: <svg {...ICON}><rect x="4.5" y="3.5" width="15" height="17" rx="2" /><path d="M8 8h8M8 12h8M8 16h5" /></svg> },
  { href: '/v2/plan', label: 'Plan', icon: <svg {...ICON}><path d="M4 19h16M6 15l4-5 3 3 5-7" /></svg> },
  { href: '/v2/owe', label: 'Owe', icon: <svg {...ICON}><rect x="3.5" y="6" width="17" height="12" rx="2" /><path d="M3.5 10h17" /></svg> },
];

export function Nav() {
  const path = usePathname();
  const log = useLogSheet();
  const link = (it: (typeof ITEMS)[number]) => (
    <Link key={it.href} href={it.href} className="v2-link" aria-current={path === it.href ? 'page' : undefined}>
      {it.icon}
      {it.label}
    </Link>
  );
  return (
    <nav aria-label="Main" className="v2-nav">
      {link(ITEMS[0])}
      {link(ITEMS[1])}
      <button type="button" className="v2-fab" aria-label="Log a spend" onClick={log.open}>
        <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true"><path d="M12 5v14M5 12h14" /></svg>
        <span className="v2-fab-label" aria-hidden="true">Log a spend</span>
      </button>
      {link(ITEMS[2])}
      {link(ITEMS[3])}
    </nav>
  );
}
