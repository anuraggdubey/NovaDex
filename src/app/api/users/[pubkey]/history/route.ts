import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';
import { requireWalletAuth } from '@/lib/apiAuth';

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
    const authError = requireWalletAuth(req, params.pubkey);
    if (authError) return authError;

    const supabase = createServerClient();

    const { data: swaps, error } = await supabase
      .from('swaps')
      .select('id, tx_hash, asset_in_code, asset_out_code, amount_in, amount_out, savings_usdc, route_fingerprint, status, executed_at')
      .eq('wallet_address', params.pubkey)
      .order('executed_at', { ascending: false })
      .limit(50);

    if (error) throw error;

    return jsonNoCache({ swaps: swaps || [] });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to load history';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
