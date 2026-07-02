import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';
import { requireWalletAuth } from '@/lib/apiAuth';

export async function GET(req: Request, { params }: { params: { pubkey: string } }) {
  try {
    const authError = requireWalletAuth(req, params.pubkey);
    if (authError) return authError;

    const supabase = createServerClient();

    const { data: user, error } = await supabase
      .from('users')
      .select('*')
      .eq('wallet_address', params.pubkey)
      .single();

    if (error) throw error;

    return NextResponse.json({ user });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to load profile';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
