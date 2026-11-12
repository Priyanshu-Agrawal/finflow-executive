import type { Metadata, Viewport } from 'next';
import { Mona_Sans } from 'next/font/google';
import '@/v2/styles/tokens.css';
import '@/v2/styles/today.css';
import '@/v2/styles/log.css';
import { V2Providers } from '@/v2/V2Providers';
import { AppShell } from '@/v2/shell/AppShell';
import { RegisterSW } from '@/v2/pwa/RegisterSW';

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
      <RegisterSW />
      <V2Providers>
        <AppShell>{children}</AppShell>
      </V2Providers>
    </div>
  );
}
