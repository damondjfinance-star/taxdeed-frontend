import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase-server'
import { logout } from '@/app/actions/auth'

export const metadata = { title: 'Dashboard — TaxDeedFinder' }

// ─── Types ────────────────────────────────────────────────────────────────────

type SavedSearch = {
  id: string
  name: string
  filters: Record<string, unknown>
  email_alerts: boolean
  created_at: string
}

type WatchlistRow = {
  id: string
  notes: string | null
  created_at: string
  auctions: {
    id: string
    state: string
    county: string
    auction_date: string
    opening_bid: number
    property_address: string | null
    auction_status: string
    auction_url: string | null
  } | null
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function DashboardPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const [{ data: rawSearches }, { data: rawWatchlist }] = await Promise.all([
    supabase
      .from('saved_searches')
      .select('id, name, filters, email_alerts, created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false }),

    supabase
      .from('watchlists')
      .select(
        `id, notes, created_at,
         auctions (
           id, state, county, auction_date,
           opening_bid, property_address, auction_status, auction_url
         )`
      )
      .eq('user_id', user.id)
      .order('created_at', { ascending: false }),
  ])

  const searches: SavedSearch[] = (rawSearches as SavedSearch[]) ?? []
  // Supabase types the joined relation as an array; cast through unknown to our narrower type.
  const watchlist: WatchlistRow[] = ((rawWatchlist as unknown) as WatchlistRow[]) ?? []
  const alertCount = searches.filter((s) => s.email_alerts).length

  return (
    <div className="min-h-full bg-zinc-50">
      {/* Header */}
      <header className="border-b border-zinc-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-6">
            <Link
              href="/"
              className="text-lg font-semibold text-zinc-900 hover:text-zinc-600"
            >
              TaxDeedFinder
            </Link>
            <nav className="hidden items-center gap-5 sm:flex">
              <span className="text-sm font-semibold text-zinc-900">Dashboard</span>
              <Link
                href="/auctions"
                className="text-sm text-zinc-500 hover:text-zinc-900"
              >
                Browse Auctions
              </Link>
            </nav>
          </div>

          <div className="flex items-center gap-4">
            <span className="hidden max-w-[200px] truncate text-sm text-zinc-500 sm:block">
              {user.email}
            </span>
            <form action={logout}>
              <button
                type="submit"
                className="rounded-lg border border-zinc-200 px-3 py-1.5 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50"
              >
                Sign out
              </button>
            </form>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl space-y-10 px-6 py-10">
        {/* Page heading */}
        <div>
          <h1 className="text-2xl font-bold text-zinc-900">Welcome back</h1>
          <p className="mt-1 text-sm text-zinc-500">{user.email}</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <StatCard label="Watchlisted" value={watchlist.length} href="/auctions" />
          <StatCard label="Saved Searches" value={searches.length} />
          <StatCard label="Email Alerts" value={alertCount} />
          <StatCard label="Plan" value="Free" />
        </div>

        {/* ── Watchlist ── */}
        <section>
          <SectionHeader title="Watchlist" linkHref="/auctions" linkLabel="Browse auctions" />

          {watchlist.length === 0 ? (
            <EmptyState
              message="No auctions on your watchlist yet."
              cta="Browse auctions"
              href="/auctions"
            />
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {watchlist.map((item) => {
                const a = item.auctions
                if (!a) return null
                return (
                  <WatchlistCard
                    key={item.id}
                    auction={a}
                    notes={item.notes}
                    savedAt={item.created_at}
                  />
                )
              })}
            </div>
          )}
        </section>

        {/* ── Saved searches ── */}
        <section>
          <SectionHeader title="Saved Searches" />

          {searches.length === 0 ? (
            <EmptyState
              message="No saved searches yet. Use the auction browser to create one."
              cta="Search auctions"
              href="/auctions"
            />
          ) : (
            <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm">
              <table className="min-w-full divide-y divide-zinc-100">
                <thead>
                  <tr className="bg-zinc-50">
                    {['Name', 'Filters', 'Email alerts', 'Saved'].map((h) => (
                      <th
                        key={h}
                        className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-zinc-400"
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100">
                  {searches.map((s) => (
                    <tr key={s.id} className="hover:bg-zinc-50">
                      <td className="px-5 py-3 text-sm font-medium text-zinc-900">
                        {s.name}
                      </td>
                      <td className="px-5 py-3 text-sm text-zinc-500">
                        <FilterSummary filters={s.filters} />
                      </td>
                      <td className="px-5 py-3 text-sm">
                        <AlertBadge on={s.email_alerts} />
                      </td>
                      <td className="whitespace-nowrap px-5 py-3 text-sm text-zinc-400">
                        {formatDate(s.created_at)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </main>
    </div>
  )
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function StatCard({
  label,
  value,
  href,
}: {
  label: string
  value: string | number
  href?: string
}) {
  const card = (
    <div className="flex flex-col gap-1 rounded-xl border border-zinc-200 bg-white px-5 py-4 shadow-sm">
      <p className="text-2xl font-bold text-zinc-900">{value}</p>
      <p className="text-sm text-zinc-500">{label}</p>
    </div>
  )
  return href ? (
    <Link href={href} className="rounded-xl transition-shadow hover:shadow-md">
      {card}
    </Link>
  ) : (
    card
  )
}

function SectionHeader({
  title,
  linkHref,
  linkLabel,
}: {
  title: string
  linkHref?: string
  linkLabel?: string
}) {
  return (
    <div className="mb-4 flex items-center justify-between">
      <h2 className="text-lg font-semibold text-zinc-900">{title}</h2>
      {linkHref && (
        <Link
          href={linkHref}
          className="text-sm text-zinc-500 underline hover:text-zinc-800"
        >
          {linkLabel}
        </Link>
      )}
    </div>
  )
}

const STATUS_STYLES: Record<string, string> = {
  upcoming:  'bg-blue-100 text-blue-700',
  active:    'bg-emerald-100 text-emerald-700',
  sold:      'bg-zinc-100 text-zinc-500',
  cancelled: 'bg-red-100 text-red-700',
  redeemed:  'bg-amber-100 text-amber-700',
}

function WatchlistCard({
  auction,
  notes,
  savedAt,
}: {
  auction: NonNullable<WatchlistRow['auctions']>
  notes: string | null
  savedAt: string
}) {
  const formattedBid = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(auction.opening_bid)

  return (
    <div className="flex flex-col rounded-xl border border-zinc-200 bg-white shadow-sm">
      {/* Header */}
      <div className="flex items-start justify-between gap-2 px-5 pt-5">
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-zinc-900">
            {auction.property_address ?? 'Address not listed'}
          </p>
          <p className="mt-0.5 text-xs text-zinc-500">
            {auction.county}, {auction.state}
          </p>
        </div>
        <span
          className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${
            STATUS_STYLES[auction.auction_status] ?? 'bg-zinc-100 text-zinc-500'
          }`}
        >
          {auction.auction_status}
        </span>
      </div>

      {/* Body */}
      <div className="flex flex-col gap-2 px-5 py-4">
        <div className="flex items-center justify-between">
          <p className="text-xs text-zinc-400">
            {new Date(auction.auction_date).toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
              year: 'numeric',
            })}
          </p>
          <p className="text-base font-bold text-zinc-900">{formattedBid}</p>
        </div>
        {notes && (
          <p className="text-xs italic text-zinc-500">"{notes}"</p>
        )}
        <p className="text-xs text-zinc-400">
          Saved {new Date(savedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
        </p>
      </div>

      {/* Footer */}
      <div className="mt-auto border-t border-zinc-100 px-5 py-3">
        {auction.auction_url ? (
          <a
            href={auction.auction_url}
            target="_blank"
            rel="noopener noreferrer"
            className="block rounded-lg bg-zinc-900 px-4 py-2 text-center text-sm font-medium text-white transition-colors hover:bg-zinc-700"
          >
            View Auction ↗
          </a>
        ) : (
          <span className="block rounded-lg bg-zinc-100 px-4 py-2 text-center text-sm text-zinc-400">
            No URL available
          </span>
        )}
      </div>
    </div>
  )
}

function FilterSummary({ filters }: { filters: Record<string, unknown> }) {
  const entries = Object.entries(filters).filter(
    ([, v]) => v !== '' && v !== null && v !== undefined,
  )
  if (entries.length === 0) return <span className="text-zinc-400">No filters</span>
  return (
    <span>
      {entries.map(([k, v]) => `${k}: ${String(v)}`).join(' · ')}
    </span>
  )
}

function AlertBadge({ on }: { on: boolean }) {
  return on ? (
    <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-700">
      On
    </span>
  ) : (
    <span className="rounded-full bg-zinc-100 px-2.5 py-0.5 text-xs font-medium text-zinc-500">
      Off
    </span>
  )
}

function EmptyState({
  message,
  cta,
  href,
}: {
  message: string
  cta: string
  href: string
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-zinc-200 bg-white py-12 text-center">
      <p className="text-sm text-zinc-500">{message}</p>
      <Link
        href={href}
        className="mt-3 rounded-lg border border-zinc-200 px-4 py-2 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50"
      >
        {cta}
      </Link>
    </div>
  )
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}
