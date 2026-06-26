import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';

// GET /api/analytics/global — public platform-wide stats
export async function GET(request: NextRequest) {
  const supabase = createServerClient();

  const { data, error } = await supabase
    .from('global_stats')
    .select('*')
    .eq('id', 1)
    .single();

  if (error || !data) {
    return NextResponse.json(
      {
        total_volume_usdc: 0,
        total_swaps: 0,
        total_savings_usdc: 0,
        unique_wallets: 0,
        last_updated: new Date().toISOString(),
      },
      { status: 200 }
    );
  }

  return NextResponse.json(data, {
    headers: {
      'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=60',
    },
  });
}
