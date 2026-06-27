import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';

export async function GET(req: Request, { params }: { params: { txHash: string } }) {
  try {
    const { txHash } = params;
    if (!txHash) return NextResponse.json({ error: 'txHash required' }, { status: 400 });

    const supabase = createServerClient();
    
    const { data: swap, error } = await supabase
      .from('swaps')
      .select('*')
      .eq('tx_hash', txHash)
      .single();

    if (error) throw error;
    
    return NextResponse.json({ swap });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
