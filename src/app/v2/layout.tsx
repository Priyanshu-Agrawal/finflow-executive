import type { Metadata, Viewport } from 'next';
import { Mona_Sans } from 'next/font/google';
import '@/v2/styles/tokens.css';
import { V2Providers } from '@/v2/V2Providers';
import { AppShell } from '@/v2/shell/AppShell';
// The service worker is now registered once, from the root layout (scope "/" already covers
// /v2), so this hidden shell no longer registers it a second time.

const mona = Mona_Sans({ subsets: ['latin'], variable: '--font-mona', axes: ['wdth'] });

export const metadata: Metadata = {
  title: 'FinFlow',
  description: 'Private money cockpit on your Google Sheet.',
  appleWebApp: { capable: true, title: 'FinFlow', statusBarStyle: 'default' },
  icons: { apple: '/icons/apple-touch-icon.png' },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#EDF0F4' },
    { media: '(prefers-color-scheme: dark)', color: '#0F1218' },
  ],
};

export default function V2Layout({ children }: { children: React.ReactNode }) {
  return (
    <div className={`v2 ${mona.variable}`}>
      <V2Providers>
        <AppShell>{children}</AppShell>
      </V2Providers>
    </div>
  );
}
