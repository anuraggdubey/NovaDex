import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';
import { isValidStellarPublicKey } from '@/lib/auth';

// POST /api/swaps/record
// Records a completed swap in Supabase after on-chain confirmation
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
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

    if (!wallet_address || !isValidStellarPublicKey(wallet_address)) {
      return NextResponse.json({ error: 'Invalid wallet address' }, { status: 400 });
    }
    if (!tx_hash) {
      return NextResponse.json({ error: 'Transaction hash required' }, { status: 400 });
    }

    const supabase = createServerClient();

    const { data, error } = await supabase
      .from('swaps')
      .insert({
        wallet_address,
        tx_hash,
        asset_in_code: asset_in_code?.toUpperCase(),
        asset_in_issuer: asset_in_issuer || null,
        asset_out_code: asset_out_code?.toUpperCase(),
        asset_out_issuer: asset_out_issuer || null,
        amount_in: Number(amount_in),
        amount_out: Number(amount_out),
        amount_out_direct_best: amount_out_direct_best ? Number(amount_out_direct_best) : null,
        savings_usdc: Number(savings_usdc) || 0,
        route_fingerprint: route_fingerprint || null,
        route_json: route_json || null,
        slippage_tolerance: Number(slippage_tolerance) || 0.5,
        price_impact: Number(price_impact) || 0,
        protocol_fee_usdc: Number(protocol_fee_usdc) || 0,
        network: network || 'testnet',
        status: status || 'completed',
        executed_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) {
      // Duplicate tx_hash is OK (idempotent)
      if (error.code === '23505') {
        return NextResponse.json({ message: 'Already recorded', duplicate: true });
      }
      console.error('Swap record error:', error);
      return NextResponse.json({ error: 'Database error' }, { status: 500 });
    }

    return NextResponse.json({ swap: data }, { status: 201 });
  } catch (error) {
    console.error('/api/swaps/record error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
