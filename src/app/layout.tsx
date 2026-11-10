import type { Metadata } from 'next';
import { Geist, JetBrains_Mono, Newsreader } from 'next/font/google';
import './globals.css';
import { Providers } from './providers';

const geist = Geist({
  subsets: ['latin'],
  variable: '--font-sans',
});

const newsreader = Newsreader({
  subsets: ['latin'],
  style: ['normal', 'italic'],
  variable: '--font-serif',
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-mono',
});

export const metadata: Metadata = {
  title: 'FinFlow Executive | Wealth & Expense OS',
  description: 'Private wealth intelligence, Google Sheets ledger tracking, and debt amortization engine.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body
        className={`${geist.variable} ${newsreader.variable} ${jetbrainsMono.variable} min-h-screen bg-[#100D0A] font-sans text-[#E9E1DB] antialiased selection:bg-[#F0A93C]/30 selection:text-[#FFC981]`}
      >
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
