import type { Metadata } from 'next';
import { Plus_Jakarta_Sans, IBM_Plex_Mono, Instrument_Serif } from 'next/font/google';
import './globals.css';

const plusJakarta = Plus_Jakarta_Sans({
  subsets: ['latin'],
  variable: '--font-sans',
  display: 'swap',
});

const ibmPlexMono = IBM_Plex_Mono({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  variable: '--font-mono',
  display: 'swap',
});

const instrumentSerif = Instrument_Serif({
  subsets: ['latin'],
  weight: ['400'],
  style: ['normal', 'italic'],
  variable: '--font-serif',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'NovaDEX - Stellar\'s First Intent-Based DEX Aggregator',
  description:
    'Swap any Stellar asset. Get the best price. NovaDEX checks every source of liquidity on Stellar - order books, AMM pools, and anchor rates - and routes your swap through the best path automatically.',
  keywords: ['Stellar', 'DEX', 'aggregator', 'swap', 'XLM', 'USDC', 'Soroban', 'DeFi', 'Aquarius', 'SDEX'],
  openGraph: {
    title: 'NovaDEX - Stellar DEX Aggregator',
    description: 'Swap any Stellar asset. Get the best price. No thinking required.',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'NovaDEX - Stellar DEX Aggregator',
    description: 'Swap any Stellar asset. Get the best price.',
    creator: '@anuraggdubeyy',
    site: '@anuraggdubeyy',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${plusJakarta.variable} ${ibmPlexMono.variable} ${instrumentSerif.variable}`}>
      <body className="bg-nd-bg text-nd-ink font-sans antialiased">
        {children}
      </body>
    </html>
  );
}
