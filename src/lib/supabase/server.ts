import { createClient, type SupabaseClient } from '@supabase/supabase-js';

let client: SupabaseClient | null = null;

/**
 * The server Supabase client, created once per server process and reused across requests.
 *
 * It was previously rebuilt on every call, so one dashboard render made three of them. Nothing
 * here is request-scoped -- no auth, no cookies, just the anon key -- so a shared instance is
 * safe and skips the repeated setup. Session persistence is off for the same reason it is off
 * in the browser client: there is no sign-in to persist.
 */
export function createServerClient(): SupabaseClient {
  client ??= createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } }
  );
  return client;
}
