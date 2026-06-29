import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const supabase = createServerClient();
    const { data: swaps, error: swapsError } = await supabase.from('swaps').select('*').limit(20);
    const { data: users, error: usersError } = await supabase.from('users').select('*').limit(20);
    
    return NextResponse.json({ 
      swapsError: swapsError?.message || null,
      usersError: usersError?.message || null,
      swaps: swaps,
      users: users
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
