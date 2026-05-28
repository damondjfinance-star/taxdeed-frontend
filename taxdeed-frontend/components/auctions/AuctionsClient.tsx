'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import AuctionCard, { type Auction } from './AuctionCard'

const STATUSES = ['upcoming', 'active', 'sold', 'cancelled', 'redeemed'] as const

interface Props {
  auctions: Auction[]
  isGuest: boolean
  watchlistIds: string[]
}

export default function AuctionsClient({ auctions, isGuest, watchlistIds }: Props) {
  const [stateFilter, setStateFilter]   = useState('')
  const [countyFilter, setCountyFilter] = useState('')
  const [dateFrom, setDateFrom]         = useState('')
  const [dateTo, setDateTo]             = useState('')
  const [minBid, setMinBid]             = useState('')
  const [maxBid, setMaxBid]             = useState('')
  const [statusFilter, setStatusFilter] = useState('')

  const states = useMemo(
    () => Array.from(new Set(auctions.map(a => a.state))).sort(),
    [auctions],
  )

  const filtered = useMemo(() => {
    return auctions.filter(a => {
      if (stateFilter && a.state !== stateFilter) return false
      if (countyFilter && !a.county.toLowerCase().includes(countyFilter.toLowerCase())) return false
      if (statusFilter && a.auction_status !== statusFilter) return false
      const aDate = new Date(a.auction_date)
      if (dateFrom && aDate < new Date(dateFrom)) return false
      if (dateTo) {
        const end = new Date(dateTo)
        end.setHours(23, 59, 59, 999)
        if (aDate > end) return false
      }
      if (minBid !== '' && a.opening_bid < parseFloat(minBid)) return false
      if (maxBid !== '' && a.opening_bid > parseFloat(maxBid)) return false
      return true
    })
  }, [auctions, stateFilter, countyFilter, dateFrom, dateTo, minBid, maxBid, statusFilter])

  const hasFilters = !!(stateFilter || countyFilter || dateFrom || dateTo || minBid || maxBid || statusFilter)

  function clearFilters() {
    setStateFilter('')
    setCountyFilter('')
    setDateFrom('')
    setDateTo('')
    setMinBid('')
    setMaxBid('')
    setStatusFilter('')
  }

  return (
    <div className="min-h-full bg-zinc-50">
      {/* Top nav */}
      <header className="sticky top-0 z-20 border-b border-zinc-200 bg-white shadow-sm">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <Link href="/" className="text-lg font-semibold text-zinc-900 hover:text-zinc-700">
              TaxDeedFinder
            </Link>
            <span className="hidden text-zinc-300 sm:block">|</span>
            <span className="hidden text-sm text-zinc-500 sm:block">Auctions</span>
          </div>
          <nav className="flex items-center gap-3">
            {isGuest ? (
              <>
                <Link
                  href="/login"
                  className="text-sm font-medium text-zinc-600 hover:text-zinc-900"
                >
                  Sign in
                </Link>
                <Link
                  href="/signup"
                  className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-zinc-700"
                >
                  Sign up free
                </Link>
              </>
            ) : (
              <Link
                href="/dashboard"
                className="text-sm font-medium text-zinc-600 hover:text-zinc-900"
              >
                Dashboard
              </Link>
            )}
          </nav>
        </div>
      </header>

      {/* Guest preview banner */}
      {isGuest && (
        <div className="border-b border-amber-200 bg-amber-50">
          <div className="mx-auto flex max-w-7xl flex-col items-start justify-between gap-2 px-6 py-3 sm:flex-row sm:items-center">
            <p className="text-sm text-amber-800">
              <span className="font-semibold">Showing 5 preview listings.</span>{' '}
              Sign up free to unlock all auctions, save searches, and build a watchlist.
            </p>
            <Link
              href="/signup"
              className="shrink-0 rounded-lg bg-amber-600 px-4 py-1.5 text-sm font-semibold text-white transition-colors hover:bg-amber-700"
            >
              Get full access →
            </Link>
          </div>
        </div>
      )}

      <main className="mx-auto max-w-7xl px-6 py-8">
        {/* Filter panel */}
        <div className="mb-6 rounded-xl border border-zinc-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-zinc-700">Filters</h2>
            {hasFilters && (
              <button
                onClick={clearFilters}
                className="text-xs text-zinc-400 underline hover:text-zinc-600"
              >
                Clear all
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {/* State */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-zinc-500">State</label>
              <select
                value={stateFilter}
                onChange={e => setStateFilter(e.target.value)}
                className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-800 focus:border-zinc-400 focus:outline-none"
              >
                <option value="">All states</option>
                {states.map(s => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>

            {/* County */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-zinc-500">County</label>
              <input
                type="text"
                placeholder="Search county…"
                value={countyFilter}
                onChange={e => setCountyFilter(e.target.value)}
                className="rounded-lg border border-zinc-200 px-3 py-2 text-sm text-zinc-800 placeholder:text-zinc-400 focus:border-zinc-400 focus:outline-none"
              />
            </div>

            {/* Status */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-zinc-500">Status</label>
              <select
                value={statusFilter}
                onChange={e => setStatusFilter(e.target.value)}
                className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-800 focus:border-zinc-400 focus:outline-none"
              >
                <option value="">All statuses</option>
                {STATUSES.map(s => (
                  <option key={s} value={s}>
                    {s.charAt(0).toUpperCase() + s.slice(1)}
                  </option>
                ))}
              </select>
            </div>

            {/* Date from */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-zinc-500">Date from</label>
              <input
                type="date"
                value={dateFrom}
                onChange={e => setDateFrom(e.target.value)}
                className="rounded-lg border border-zinc-200 px-3 py-2 text-sm text-zinc-800 focus:border-zinc-400 focus:outline-none"
              />
            </div>

            {/* Date to */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-zinc-500">Date to</label>
              <input
                type="date"
                value={dateTo}
                onChange={e => setDateTo(e.target.value)}
                className="rounded-lg border border-zinc-200 px-3 py-2 text-sm text-zinc-800 focus:border-zinc-400 focus:outline-none"
              />
            </div>

            {/* Min bid */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-zinc-500">Min bid ($)</label>
              <input
                type="number"
                min="0"
                placeholder="0"
                value={minBid}
                onChange={e => setMinBid(e.target.value)}
                className="rounded-lg border border-zinc-200 px-3 py-2 text-sm text-zinc-800 placeholder:text-zinc-400 focus:border-zinc-400 focus:outline-none"
              />
            </div>

            {/* Max bid */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-zinc-500">Max bid ($)</label>
              <input
                type="number"
                min="0"
                placeholder="No limit"
                value={maxBid}
                onChange={e => setMaxBid(e.target.value)}
                className="rounded-lg border border-zinc-200 px-3 py-2 text-sm text-zinc-800 placeholder:text-zinc-400 focus:border-zinc-400 focus:outline-none"
              />
            </div>
          </div>
        </div>

        {/* Result count */}
        <p className="mb-4 text-sm text-zinc-500">
          {filtered.length === 0
            ? 'No auctions match your filters'
            : `${filtered.length} ${filtered.length === 1 ? 'auction' : 'auctions'}${hasFilters ? ' matching filters' : ''}${isGuest ? ' (preview)' : ''}`}
        </p>

        {/* Auction grid */}
        {filtered.length > 0 ? (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map(auction => (
              <AuctionCard
                key={auction.id}
                auction={auction}
                isWatched={watchlistIds.includes(auction.id)}
                isGuest={isGuest}
              />
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-zinc-200 bg-white py-20 text-center">
            <p className="text-sm text-zinc-500">No auctions match your current filters.</p>
            {hasFilters && (
              <button
                onClick={clearFilters}
                className="mt-2 text-sm text-zinc-400 underline hover:text-zinc-600"
              >
                Clear filters
              </button>
            )}
          </div>
        )}

        {/* Guest bottom CTA */}
        {isGuest && (
          <div className="mt-14 overflow-hidden rounded-2xl bg-gradient-to-br from-zinc-900 to-zinc-700 px-8 py-12 text-center">
            <p className="text-xs font-semibold uppercase tracking-widest text-zinc-400">
              Limited preview
            </p>
            <h3 className="mt-2 text-2xl font-bold text-white">
              Unlock every auction listing
            </h3>
            <p className="mx-auto mt-3 max-w-md text-sm text-zinc-400">
              You're viewing 5 of hundreds of active tax deed auctions. Create a free account to
              access all listings, build a watchlist, and get email alerts when new properties
              match your criteria.
            </p>
            <div className="mt-7 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Link
                href="/signup"
                className="w-full rounded-lg bg-white px-6 py-3 text-sm font-semibold text-zinc-900 transition-colors hover:bg-zinc-100 sm:w-auto"
              >
                Create free account
              </Link>
              <Link
                href="/login"
                className="w-full rounded-lg border border-white/20 px-6 py-3 text-sm font-medium text-white transition-colors hover:bg-white/10 sm:w-auto"
              >
                Sign in
              </Link>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
