// Supabase client setup - two instances as documented in Section 8
// - browserClient: uses anon key, subject to RLS (for client-side subscriptions)
// - serverClient: uses service role key, bypasses RLS (for API routes ONLY)

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// Browser client - safe to use client-side, subject to RLS
export const supabaseBrowser = createClient(supabaseUrl, supabaseAnonKey);

// Server client - NEVER use on client-side, bypasses RLS
// Only used inside src/app/api/ routes
export function createServerClient() {
  return createClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
