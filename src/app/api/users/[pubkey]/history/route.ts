import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';
import { isValidStellarPublicKey } from '@/lib/auth';

// GET /api/users/[pubkey]/history
// Returns paginated swap history for a wallet. Newest first.
export async function GET(
  request: NextRequest,
  { params }: { params: { pubkey: string } }
) {
  const { pubkey } = params;

  if (!isValidStellarPublicKey(pubkey)) {
    return NextResponse.json({ error: 'Invalid public key' }, { status: 400 });
  }

  const { searchParams } = new URL(request.url);
  const page = parseInt(searchParams.get('page') || '1', 10);
  const limit = parseInt(searchParams.get('limit') || '20', 10);
  const status = searchParams.get('status'); // 'completed' | 'reverted' | null
  const assetIn = searchParams.get('asset_in');
  const assetOut = searchParams.get('asset_out');

  const from = (page - 1) * limit;
  const to = from + limit - 1;

  const supabase = createServerClient();

  let query = supabase
    .from('swaps')
    .select('*', { count: 'exact' })
    .eq('wallet_address', pubkey)
    .order('executed_at', { ascending: false })
    .range(from, to);

  if (status) query = query.eq('status', status);
  if (assetIn) query = query.eq('asset_in_code', assetIn.toUpperCase());
  if (assetOut) query = query.eq('asset_out_code', assetOut.toUpperCase());

  const { data, error, count } = await query;

  if (error) {
    return NextResponse.json({ error: 'Database error' }, { status: 500 });
  }

  return NextResponse.json({
    swaps: data,
    total: count,
    page,
    limit,
    hasMore: (count || 0) > to + 1,
  });
}
