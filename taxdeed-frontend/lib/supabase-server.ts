import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

/**
 * Server-side Supabase client.
 * Import this in Server Components, Server Actions, and Route Handlers.
 *
 * Do NOT import in Client Components — next/headers is server-only and
 * will cause a build error if bundled for the browser. Use
 * @/lib/supabase (createClient) there instead.
 */
export async function createClient() {
  const cookieStore = await cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // Server Component — middleware handles session refresh
          }
        },
      },
    }
  )
}
