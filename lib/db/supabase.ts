import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '';

/** Cloud sync is optional: without credentials the archive stays in the browser. */
export const isCloudEnabled = url.length > 0 && anonKey.length > 0;

let client: SupabaseClient | null = null;

/** Lazily creates the browser client; returns null when Supabase isn't configured. */
export function getSupabase(): SupabaseClient | null {
  if (!isCloudEnabled) return null;
  client ??= createClient(url, anonKey, {
    auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
  });
  return client;
}
