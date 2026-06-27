import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';

export async function GET(req: Request, { params }: { params: { pubkey: string } }) {
  try {
    const { pubkey } = params;
    if (!pubkey) return NextResponse.json({ error: 'pubkey required' }, { status: 400 });

    const supabase = createServerClient();
    
    const { data: user, error } = await supabase
      .from('users')
      .select('*')
      .eq('wallet_address', pubkey)
      .single();

    if (error) throw error;
    
    return NextResponse.json({ user });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
