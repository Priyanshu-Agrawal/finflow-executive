import Link from 'next/link';
import { ArrowRight } from 'lucide-react';

/** A right-aligned "Open X" link under a Home section that has its own page. */
export function SectionLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <div className="flex justify-end">
      <Link
        href={href}
        className="inline-flex min-h-11 items-center gap-1.5 rounded-lg px-2 text-sm font-medium text-amber-400 hover:text-amber-300 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-300"
      >
        {children}
        <ArrowRight className="h-4 w-4" aria-hidden="true" />
      </Link>
    </div>
  );
}
