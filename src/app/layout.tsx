import type { Metadata } from 'next';
import './globals.css';

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
    <html lang="en">
      <body className="bg-slate-50 text-slate-900 antialiased">
        {children}
      </body>
    </html>
  );
}
