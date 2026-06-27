import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';

export async function GET() {
  try {
    const supabase = createServerClient();
    
    // Fallback to manual aggregation if global_stats table is not perfectly kept up
    const { data: globalStats, error: statsError } = await supabase
      .from('global_stats')
      .select('*')
      .single();

    if (statsError || !globalStats) {
      // Aggregate from users
      const { data: users, error: usersError } = await supabase
        .from('users')
        .select('swap_count, total_volume_usdc, total_savings_usdc');

      if (usersError) throw usersError;

      const aggregated = {
        total_swaps: users.reduce((acc, u) => acc + (u.swap_count || 0), 0),
        total_volume_usdc: users.reduce((acc, u) => acc + Number(u.total_volume_usdc || 0), 0),
        total_savings_usdc: users.reduce((acc, u) => acc + Number(u.total_savings_usdc || 0), 0),
        unique_wallets: users.length,
      };
      
      return NextResponse.json(aggregated);
    }
    
    return NextResponse.json(globalStats);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
