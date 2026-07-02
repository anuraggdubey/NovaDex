import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';
import { computeSwapVolumeUsdc } from '@/lib/volume';
import fs from 'fs';

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

    // Ensure user row exists (required FK for swaps — second wallet may skip connect)
    await supabase
      .from('users')
      .upsert(
        { wallet_address, last_seen: new Date().toISOString() },
        { onConflict: 'wallet_address' },
      );
    
    // Insert swap record
    const { error: insertError } = await supabase
      .from('swaps')
      .insert([{
        wallet_address,
        tx_hash,
        asset_in_code,
        asset_in_issuer,
        asset_out_code,
        asset_out_issuer,
        amount_in,
        amount_out,
        amount_out_direct_best: amount_out_direct_best ?? Math.max(0, Number(amount_out) - Number(savings_usdc || 0)),
        savings_usdc,
        route_fingerprint,
        route_json,
        slippage_tolerance,
        price_impact,
        protocol_fee_usdc,
        network,
        status,
        executed_at: new Date().toISOString()
      }]);

    if (insertError) {
      try { fs.appendFileSync('debug.log', JSON.stringify({ error: insertError, body }) + '\n'); } catch (e) {}
      throw insertError;
    }
    
    // Update user stats
    // Note: A trigger on supabase might be better, but we can do it here for MVP
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('swap_count, total_volume_usdc, total_savings_usdc')
      .eq('wallet_address', wallet_address)
      .single();

    if (!userError && user) {
      const volumeUsdc = computeSwapVolumeUsdc({
        asset_in_code,
        asset_out_code,
        amount_in,
        amount_out,
      });

      await supabase
        .from('users')
        .update({
          swap_count: (user.swap_count || 0) + 1,
          total_volume_usdc: Number(user.total_volume_usdc || 0) + volumeUsdc,
          total_savings_usdc: Number(user.total_savings_usdc || 0) + Number(savings_usdc || 0)
        })
        .eq('wallet_address', wallet_address);
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    try { fs.appendFileSync('debug.log', JSON.stringify({ globalError: error.message, stack: error.stack }) + '\n'); } catch (e) {}
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
