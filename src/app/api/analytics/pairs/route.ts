import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';
import { computeSwapVolumeUsdc } from '@/lib/volume';

export async function GET() {
  try {
    const supabase = createServerClient();
    
    const { data: swaps, error } = await supabase
      .from('swaps')
      .select('asset_in_code, asset_out_code, amount_in, amount_out, savings_usdc');

    if (error) throw error;

    const pairMap: Record<string, { volume: number, savings: number, count: number }> = {};
    
    swaps.forEach(s => {
      const pairKey = `${s.asset_in_code}-${s.asset_out_code}`;
      if (!pairMap[pairKey]) {
        pairMap[pairKey] = { volume: 0, savings: 0, count: 0 };
      }
      pairMap[pairKey].volume += computeSwapVolumeUsdc(s);
      pairMap[pairKey].savings += Number(s.savings_usdc || 0);
      pairMap[pairKey].count += 1;
    });

    const pairs = Object.entries(pairMap).map(([pair, stats]) => ({
      pair,
      volume: stats.volume,
      savings: stats.savings,
      count: stats.count
    })).sort((a, b) => b.volume - a.volume).slice(0, 10);
    
    return NextResponse.json({ pairs });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
