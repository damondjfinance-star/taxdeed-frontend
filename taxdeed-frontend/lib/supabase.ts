import { createBrowserClient } from '@supabase/ssr'

/**
 * Browser (client-side) Supabase client.
 * Import this in Client Components ('use client' files).
 *
 * For Server Components, Server Actions, and Route Handlers use
 * the server client in @/lib/supabase-server — it reads session
 * cookies via next/headers and cannot be bundled for the browser.
 */
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
