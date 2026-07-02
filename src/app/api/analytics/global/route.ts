import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';
import { computeSwapVolumeUsdc, sumSwapVolumeUsdc, SwapVolumeInput } from '@/lib/volume';
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

function formatChartDate(isoDate: string) {
  const d = new Date(isoDate);
  return d.toLocaleDateString('en-US', { month: 'short', day: '2-digit' });
}

function buildWeeklySeries(swaps: (SwapVolumeInput & { savings_usdc: number | string; executed_at: string; status?: string; asset_in_code?: string; asset_out_code?: string })[]) {
  const dayMap = new Map<string, { vol: number; sav: number }>();

  for (const swap of swaps) {
    const dayKey = new Date(swap.executed_at).toISOString().slice(0, 10);
    const existing = dayMap.get(dayKey) ?? { vol: 0, sav: 0 };
    existing.vol += computeSwapVolumeUsdc(swap);
    existing.sav += effectiveSavingsUsdc(swap);
    dayMap.set(dayKey, existing);
  }

  const sortedDays = [...dayMap.entries()].sort(([a], [b]) => a.localeCompare(b));
  const lastSeven = sortedDays.slice(-7);

  return {
    volumeData: lastSeven.map(([day, stats]) => ({
      date: formatChartDate(day),
      vol: stats.vol,
    })),
    savingsData: lastSeven.map(([day, stats]) => ({
      date: formatChartDate(day),
      sav: stats.sav,
    })),
  };
}

export async function GET() {
  try {
    const supabase = createServerClient();

    const { data: swaps, error } = await supabase
      .from('swaps')
      .select('amount_in, amount_out, asset_in_code, asset_out_code, savings_usdc, wallet_address, executed_at, status')
      .order('executed_at', { ascending: false });

    if (error) throw error;

    const allSwaps = swaps ?? [];
    const completedSwaps = allSwaps.filter((s) => s.status === 'completed');

    if (allSwaps.length > 0) {
      const uniqueWallets = new Set(allSwaps.map((s) => s.wallet_address)).size;
      const { volumeData, savingsData } = buildWeeklySeries(completedSwaps);

      return jsonNoCache({
        total_swaps: allSwaps.length,
        total_swaps_completed: completedSwaps.length,
        total_volume_usdc: sumSwapVolumeUsdc(completedSwaps),
        total_savings_usdc: completedSwaps.reduce((acc, s) => acc + effectiveSavingsUsdc(s), 0),
        unique_wallets: uniqueWallets,
        volumeData,
        savingsData,
      });
    }

    const { data: globalStats } = await supabase
      .from('global_stats')
      .select('*')
      .single();

    return jsonNoCache({
      total_volume_usdc: Number(globalStats?.total_volume_usdc || 0),
      total_swaps: Number(globalStats?.total_swaps || 0),
      total_swaps_completed: Number(globalStats?.total_swaps || 0),
      total_savings_usdc: Number(globalStats?.total_savings_usdc || 0),
      unique_wallets: Number(globalStats?.unique_wallets || 0),
      volumeData: [],
      savingsData: [],
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
