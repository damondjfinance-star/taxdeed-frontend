import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase-server'
import { logout } from '@/app/actions/auth'

export const metadata = { title: 'Dashboard — TaxDeedFinder' }

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  return (
    <div className="min-h-full bg-zinc-50">
      <header className="bg-white shadow-sm">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <h1 className="text-lg font-semibold text-zinc-900">TaxDeedFinder</h1>
          <div className="flex items-center gap-4">
            <span className="text-sm text-zinc-500">{user.email}</span>
            <form action={logout}>
              <button
                type="submit"
                className="rounded-lg border border-zinc-200 px-3 py-1.5 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
              >
                Sign out
              </button>
            </form>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-6 py-12">
        <h2 className="text-2xl font-bold text-zinc-900">Welcome back</h2>
        <p className="mt-2 text-zinc-500">
          Your auction dashboard is being built. Check back soon.
        </p>
      </main>
    </div>
  )
}
