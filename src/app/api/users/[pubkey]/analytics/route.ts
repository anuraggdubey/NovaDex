import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';

export async function GET(req: Request, { params }: { params: { pubkey: string } }) {
  try {
    const { pubkey } = params;
    if (!pubkey) return NextResponse.json({ error: 'pubkey required' }, { status: 400 });

    const supabase = createServerClient();
    
    // For MVP, we will just fetch swaps and aggregate here to avoid complex SQL
    const { data: swaps, error } = await supabase
      .from('swaps')
      .select('*')
      .eq('wallet_address', pubkey);

    if (error) throw error;
    
    const analytics = {
      total_swaps: swaps?.length || 0,
      total_volume_usdc: swaps?.reduce((acc, s) => acc + Number(s.amount_in || 0), 0) || 0,
      total_savings_usdc: swaps?.reduce((acc, s) => acc + Number(s.savings_usdc || 0), 0) || 0,
    };

    return NextResponse.json(analytics);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
