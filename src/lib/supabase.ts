import { createClient } from '@supabase/supabase-js';
export function publicSupabase() { const url = process.env.NEXT_PUBLIC_SUPABASE_URL; const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY; if (!url || !key) throw new Error('Supabase public configuration is missing'); return createClient(url, key); }
/** Server-only. Never import into client components or expose this key to browser. */
export function serviceSupabase() { const url = process.env.NEXT_PUBLIC_SUPABASE_URL; const key = process.env.SUPABASE_SERVICE_ROLE_KEY; if (!url || !key) throw new Error('Supabase server configuration is missing'); return createClient(url, key, {auth:{persistSession:false,autoRefreshToken:false}}); }
