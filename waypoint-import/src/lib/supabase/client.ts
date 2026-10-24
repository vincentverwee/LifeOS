// `import type` is erased at build time, so this file pulls in no Supabase runtime code.
import type { SupabaseClient } from '@supabase/supabase-js';

let clientPromise: Promise<SupabaseClient> | null = null;

/**
 * The browser Supabase client, created once and reused.
 *
 * Two deliberate choices here:
 *
 *  - **Loaded on demand.** `@supabase/supabase-js` is ~236kB of JavaScript. Imported statically
 *    it lands in the initial bundle of every client page (the trips list, the trip detail view,
 *    both export pages) and has to be downloaded and parsed before React can hydrate -- so the
 *    buttons on those pages stay dead until it finishes. Behind a dynamic `import()` it is
 *    fetched in parallel with hydration instead of ahead of it.
 *
 *  - **Memoised.** Every store function used to call this, so a single page could build a dozen
 *    clients, each spinning up its own auth machinery (and Supabase warns about the duplicate
 *    GoTrue instances). One client per tab is enough.
 *
 * Auth is switched off entirely: this is a single-user app on the anon key with no sign-in, so
 * session persistence and the background token-refresh timer are pure overhead.
 */
export function getBrowserClient(): Promise<SupabaseClient> {
  clientPromise ??= import('@supabase/supabase-js')
    .then(({ createClient }) =>
      createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } }
      )
    )
    .catch((err) => {
      // Don't memoise a failed chunk load (offline, a stale deploy) -- otherwise every later
      // call rejects too and the page can never recover without a reload.
      clientPromise = null;
      throw err;
    });
  return clientPromise;
}
