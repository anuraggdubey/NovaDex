import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';
import { isValidStellarPublicKey } from '@/lib/auth';

// GET /api/users/[pubkey]/analytics
// Returns personal analytics data for a wallet
export async function GET(
  request: NextRequest,
  { params }: { params: { pubkey: string } }
) {
  const { pubkey } = params;

  if (!isValidStellarPublicKey(pubkey)) {
    return NextResponse.json({ error: 'Invalid public key' }, { status: 400 });
  }

  const supabase = createServerClient();

  // Fetch user profile
  const { data: user, error: userError } = await supabase
    .from('users')
    .select('*')
    .eq('wallet_address', pubkey)
    .single();

  if (userError || !user) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }

  // Fetch recent swaps for analytics
  const { data: swaps, error: swapError } = await supabase
    .from('swaps')
    .select('asset_in_code, asset_out_code, amount_in, savings_usdc, slippage_tolerance, route_fingerprint, executed_at')
    .eq('wallet_address', pubkey)
    .eq('status', 'completed')
    .order('executed_at', { ascending: false })
    .limit(100);

  if (swapError) {
    return NextResponse.json({ error: 'Error fetching analytics' }, { status: 500 });
  }

  // Compute analytics
  const pairVolumes: Record<string, number> = {};
  const weeklyVolume: Record<string, number> = {};
  let avgSlippage = 0;

  for (const swap of swaps || []) {
    const pair = `${swap.asset_in_code}/${swap.asset_out_code}`;
    pairVolumes[pair] = (pairVolumes[pair] || 0) + Number(swap.amount_in);

    // Group by ISO week
    const week = new Date(swap.executed_at).toISOString().substring(0, 10);
    weeklyVolume[week] = (weeklyVolume[week] || 0) + Number(swap.amount_in);

    avgSlippage += Number(swap.slippage_tolerance);
  }

  if (swaps && swaps.length > 0) {
    avgSlippage = avgSlippage / swaps.length;
  }

  const mostUsedPairs = Object.entries(pairVolumes)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5)
    .map(([pair, volume]) => ({ pair, volume }));

  return NextResponse.json({
    user,
    analytics: {
      mostUsedPairs,
      weeklyVolume: Object.entries(weeklyVolume)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([date, volume]) => ({ date, volume })),
      avgSlippage: avgSlippage.toFixed(2),
      totalSwaps: user.swap_count,
      totalSavings: user.total_savings_usdc,
      totalVolume: user.total_volume_usdc,
    },
  });
}
