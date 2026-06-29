import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function GET(req: Request, { params }: { params: { pubkey: string } }) {
  try {
    const { pubkey } = params;
    if (!pubkey) return NextResponse.json({ error: 'pubkey required' }, { status: 400 });

    const supabase = createServerClient();

    const { data: swaps, error } = await supabase
      .from('swaps')
      .select('id, tx_hash, asset_in_code, asset_out_code, amount_in, amount_out, savings_usdc, status, executed_at')
      .eq('wallet_address', pubkey)
      .order('executed_at', { ascending: false })
      .limit(50);

    if (error) throw error;
    
    return NextResponse.json({ 
      swaps: swaps || [], 
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
