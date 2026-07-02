import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      wallet_address,
      tx_hash,
      asset_in_code,
      asset_in_issuer,
      asset_out_code,
      asset_out_issuer,
      amount_in,
      amount_out,
      amount_out_direct_best,
      savings_usdc,
      route_fingerprint,
      route_json,
      slippage_tolerance,
      price_impact,
      protocol_fee_usdc,
      network,
      status,
    } = body;

    if (!wallet_address || !tx_hash) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const supabase = createServerClient();

    await supabase
      .from('users')
      .upsert(
        { wallet_address, last_seen: new Date().toISOString() },
        { onConflict: 'wallet_address' },
      );

    const { error: insertError } = await supabase.from('swaps').insert([
      {
        wallet_address,
        tx_hash,
        asset_in_code,
        asset_in_issuer,
        asset_out_code,
        asset_out_issuer,
        amount_in,
        amount_out,
        amount_out_direct_best:
          amount_out_direct_best ?? Math.max(0, Number(amount_out) - Number(savings_usdc || 0)),
        savings_usdc,
        route_fingerprint,
        route_json,
        slippage_tolerance,
        price_impact,
        protocol_fee_usdc,
        network,
        status,
        executed_at: new Date().toISOString(),
      },
    ]);

    if (insertError) throw insertError;

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to record swap';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
