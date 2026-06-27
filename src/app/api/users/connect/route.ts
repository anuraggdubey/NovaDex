import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';

export async function POST(req: Request) {
  try {
    const { wallet_address } = await req.json();
    if (!wallet_address) return NextResponse.json({ error: 'wallet_address required' }, { status: 400 });

    const supabase = createServerClient();
    
    const { data: user } = await supabase
      .from('users')
      .select('wallet_address')
      .eq('wallet_address', wallet_address)
      .single();

    if (!user) {
      const { error: insertError } = await supabase
        .from('users')
        .insert([{ wallet_address }]);
      if (insertError) throw insertError;
      return NextResponse.json({ success: true, isNewUser: true });
    } else {
      const { error: updateError } = await supabase
        .from('users')
        .update({ last_seen: new Date().toISOString() })
        .eq('wallet_address', wallet_address);
      if (updateError) throw updateError;
      return NextResponse.json({ success: true, isNewUser: false });
    }
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
