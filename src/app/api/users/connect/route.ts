import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';
import { isValidStellarPublicKey } from '@/lib/auth';

// POST /api/users/connect
// Upserts a user on wallet connect. Creates new row if first time, updates last_seen otherwise.
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { wallet_address, preferred_network } = body;

    if (!wallet_address || !isValidStellarPublicKey(wallet_address)) {
      return NextResponse.json({ error: 'Invalid wallet address' }, { status: 400 });
    }

    const supabase = createServerClient();

    const { data, error } = await supabase
      .from('users')
      .upsert(
        {
          wallet_address,
          last_seen: new Date().toISOString(),
          preferred_network: preferred_network || 'testnet',
        },
        {
          onConflict: 'wallet_address',
          ignoreDuplicates: false,
        }
      )
      .select()
      .single();

    if (error) {
      console.error('Supabase upsert error:', error);
      return NextResponse.json({ error: 'Database error' }, { status: 500 });
    }

    return NextResponse.json({ user: data, isNew: !data.swap_count });
  } catch (error) {
    console.error('/api/users/connect error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
