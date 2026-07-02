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
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500;600&family=Instrument+Serif:ital@0;1&family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="bg-nd-bg text-nd-ink font-sans antialiased">
        {children}
      </body>
    </html>
  );
}
