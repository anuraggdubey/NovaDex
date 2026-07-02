import { NextResponse } from 'next/server';
import { fetchLiquidityPools } from '@/lib/pools';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  try {
    const pools = await fetchLiquidityPools();
    return NextResponse.json(
      { pools, network: process.env.NEXT_PUBLIC_STELLAR_NETWORK || 'testnet' },
      {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate',
          Pragma: 'no-cache',
        },
      },
    );
  } catch (error: any) {
    return NextResponse.json({ error: error.message, pools: [] }, { status: 500 });
  }
}
