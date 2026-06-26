import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';
import { isValidStellarPublicKey } from '@/lib/auth';

// POST /api/favourites/add
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { wallet_address, asset_in_code, asset_in_issuer, asset_out_code, asset_out_issuer, label } = body;

    if (!wallet_address || !isValidStellarPublicKey(wallet_address)) {
      return NextResponse.json({ error: 'Invalid wallet address' }, { status: 400 });
    }

    const supabase = createServerClient();

    const { data, error } = await supabase
      .from('favourites')
      .insert({
        wallet_address,
        asset_in_code: asset_in_code.toUpperCase(),
        asset_in_issuer: asset_in_issuer || null,
        asset_out_code: asset_out_code.toUpperCase(),
        asset_out_issuer: asset_out_issuer || null,
        label: label || null,
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: 'Database error' }, { status: 500 });
    }

    return NextResponse.json({ favourite: data }, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
