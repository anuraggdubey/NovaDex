import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const supabase = createServerClient();
    const { data: swaps, error: swapsError } = await supabase
      .from('swaps')
      .select('id, wallet_address, tx_hash');
      
    const analysis = swaps?.map(s => ({
      id: s.id,
      address: s.wallet_address,
      length: s.wallet_address.length,
      hex: Buffer.from(s.wallet_address).toString('hex')
    }));
    
    return NextResponse.json({ 
      swapsError: swapsError?.message || null,
      analysis
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
