import type { Metadata } from 'next';
import NovaDEXApp from './client-app';

export const metadata: Metadata = {
  title: 'NovaDEX — Stellar DEX Aggregator',
  description: 'Swap any Stellar asset. Get the best price. No thinking required.',
};

export default function Page() {
  return <NovaDEXApp />;
}
