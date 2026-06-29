import type { Metadata } from 'next';
import { Inter, Instrument_Serif } from 'next/font/google';
import './globals.css';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

const instrumentSerif = Instrument_Serif({
  weight: '400',
  subsets: ['latin'],
  variable: '--font-instrument-serif',
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
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${inter.variable} ${instrumentSerif.variable}`}>
      <body className="bg-slate-50 text-slate-900 font-sans antialiased">
        {children}
      </body>
    </html>
  );
}
