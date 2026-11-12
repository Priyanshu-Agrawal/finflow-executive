import { CreditCard, FileSpreadsheet, Gauge, Home, TableProperties, Users, type LucideIcon } from 'lucide-react';

export type NavLabel = 'Home' | 'Ledger' | 'Excel' | 'Loans' | 'Splits' | 'Budget';

export interface NavItem {
  label: NavLabel;
  href: string;
  icon: LucideIcon;
  /** Shown in the phone bottom bar; the rest live in the "More" menu. */
  phone: boolean;
}

/**
 * The one list every navigation (laptop top menu, phone bottom bar, More menu) is built from.
 * A page's title is the label of its entry. URLs are older than the names: /expenses is the
 * Ledger and /ledger is Splits.
 */
export const NAV_ITEMS: readonly NavItem[] = [
  { label: 'Home', href: '/', icon: Home, phone: true },
  { label: 'Ledger', href: '/expenses', icon: FileSpreadsheet, phone: true },
  { label: 'Excel', href: '/excel', icon: TableProperties, phone: true },
  { label: 'Loans', href: '/loans', icon: CreditCard, phone: true },
  { label: 'Splits', href: '/ledger', icon: Users, phone: false },
  { label: 'Budget', href: '/budget', icon: Gauge, phone: false },
];
