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
        amount_out_direct_best: amount_out, // Same as amount_out if no direct comparison available
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

    if (insertError) throw insertError;
    
    // Update user stats
    // Note: A trigger on supabase might be better, but we can do it here for MVP
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('swap_count, total_volume_usdc, total_savings_usdc')
      .eq('wallet_address', wallet_address)
      .single();

    if (!userError && user) {
      await supabase
        .from('users')
        .update({
          swap_count: (user.swap_count || 0) + 1,
          total_volume_usdc: Number(user.total_volume_usdc || 0) + Number(amount_in || 0),
          total_savings_usdc: Number(user.total_savings_usdc || 0) + Number(savings_usdc || 0)
        })
        .eq('wallet_address', wallet_address);
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
