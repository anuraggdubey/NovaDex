import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';
import { computeSwapVolumeUsdc, sumSwapVolumeUsdc } from '@/lib/volume';
import { effectiveSavingsUsdc } from '@/lib/savings';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

function jsonNoCache(data: unknown) {
  return NextResponse.json(data, {
    headers: {
      'Cache-Control': 'no-store, no-cache, must-revalidate',
      Pragma: 'no-cache',
    },
  });
}

export async function GET(req: Request, { params }: { params: { pubkey: string } }) {
  try {
    const { pubkey } = params;
    if (!pubkey) return NextResponse.json({ error: 'pubkey required' }, { status: 400 });

    const supabase = createServerClient();

    const { data: swaps, error } = await supabase
      .from('swaps')
      .select('amount_in, amount_out, savings_usdc, slippage_tolerance, asset_in_code, asset_out_code, status')
      .eq('wallet_address', pubkey)
      .order('executed_at', { ascending: false });

    if (error) throw error;

    const allSwaps = swaps ?? [];
    const completedSwaps = allSwaps.filter((s) => s.status === 'completed');

    const total_volume_usdc = sumSwapVolumeUsdc(completedSwaps);
    const total_savings_usdc = completedSwaps.reduce((acc, s) => acc + effectiveSavingsUsdc(s), 0);
    const total_swaps = allSwaps.length;
    const total_swaps_completed = completedSwaps.length;

    const avg_slippage = completedSwaps.length > 0
      ? completedSwaps.reduce((acc, s) => acc + Number(s.slippage_tolerance || 0), 0) / completedSwaps.length
      : 0;

    const pairMap: Record<string, number> = {};
    for (const swap of completedSwaps) {
      const pair = `${swap.asset_in_code} / ${swap.asset_out_code}`;
      pairMap[pair] = (pairMap[pair] || 0) + computeSwapVolumeUsdc(swap);
    }

    const most_used_pairs = Object.entries(pairMap)
      .map(([pair, volume]) => ({ pair, volume }))
      .sort((a, b) => b.volume - a.volume)
      .slice(0, 5);

    return jsonNoCache({
      total_swaps,
      total_swaps_completed,
      total_volume_usdc,
      total_savings_usdc,
      avg_slippage,
      most_used_pairs,
      totalSwaps: total_swaps,
      totalVolume: total_volume_usdc,
      totalSavings: total_savings_usdc,
      avgSlippage: avg_slippage,
      mostUsedPairs: most_used_pairs,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
