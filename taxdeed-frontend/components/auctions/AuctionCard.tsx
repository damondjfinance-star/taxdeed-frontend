'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { addToWatchlist, removeFromWatchlist } from '@/app/actions/watchlist'

export type Auction = {
  id: string
  state: string
  county: string
  auction_date: string
  parcel_id: string
  opening_bid: number
  property_address: string | null
  auction_status: string
  auction_url: string | null
  platform: string | null
  scraped_at: string | null
  created_at: string
}

const STATUS_STYLES: Record<string, string> = {
  upcoming:  'bg-blue-100 text-blue-700',
  active:    'bg-emerald-100 text-emerald-700',
  sold:      'bg-zinc-100 text-zinc-500',
  cancelled: 'bg-red-100 text-red-700',
  redeemed:  'bg-amber-100 text-amber-700',
}

function useCountdown(targetDate: string) {
  const [display, setDisplay] = useState('')
  const [urgent, setUrgent] = useState(false)

  useEffect(() => {
    function tick() {
      const diff = new Date(targetDate).getTime() - Date.now()
      if (diff <= 0) {
        setDisplay('Ended')
        setUrgent(false)
        return
      }
      const d = Math.floor(diff / 86_400_000)
      const h = Math.floor((diff % 86_400_000) / 3_600_000)
      const m = Math.floor((diff % 3_600_000) / 60_000)
      const s = Math.floor((diff % 60_000) / 1_000)
      setUrgent(diff < 86_400_000)
      setDisplay(d > 0 ? `${d}d ${h}h ${m}m ${s}s` : `${h}h ${m}m ${s}s`)
    }
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [targetDate])

  return { display, urgent }
}

interface Props {
  auction: Auction
  isWatched: boolean
  isGuest: boolean
}

export default function AuctionCard({ auction, isWatched: initialWatched, isGuest }: Props) {
  const router = useRouter()
  const [watched, setWatched] = useState(initialWatched)
  const [pending, setPending] = useState(false)
  const { display: countdown, urgent } = useCountdown(auction.auction_date)

  const formattedBid = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(auction.opening_bid)

  const formattedDate = new Date(auction.auction_date).toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })

  async function handleWatchlist() {
    if (isGuest) {
      router.push('/login')
      return
    }
    setPending(true)
    const prev = watched
    setWatched(w => !w)
    const result = prev
      ? await removeFromWatchlist(auction.id)
      : await addToWatchlist(auction.id)
    if (result.error) setWatched(prev)
    setPending(false)
  }

  return (
    <div className="flex flex-col rounded-xl border border-zinc-200 bg-white shadow-sm transition-shadow hover:shadow-md">
      {/* Card header */}
      <div className="flex items-start justify-between gap-3 px-5 pt-5">
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-zinc-900">
            {auction.property_address ?? 'Address not listed'}
          </p>
          <p className="mt-0.5 text-xs text-zinc-500">
            {auction.county}, {auction.state}
          </p>
        </div>
        <span
          className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${STATUS_STYLES[auction.auction_status] ?? 'bg-zinc-100 text-zinc-500'}`}
        >
          {auction.auction_status}
        </span>
      </div>

      {/* Card body */}
      <div className="flex flex-col gap-3 px-5 py-4">
        {/* Date + countdown */}
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs text-zinc-400">Auction date</p>
            <p className="text-sm font-medium text-zinc-800">{formattedDate}</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-zinc-400">Countdown</p>
            <p
              className={`font-mono text-sm font-semibold tabular-nums ${
                urgent ? 'text-red-600' : 'text-zinc-800'
              }`}
            >
              {countdown || '—'}
            </p>
          </div>
        </div>

        {/* Opening bid */}
        <div className="flex items-center justify-between rounded-lg bg-zinc-50 px-4 py-2.5">
          <p className="text-xs text-zinc-400">Opening bid</p>
          <p className="text-xl font-bold text-zinc-900">{formattedBid}</p>
        </div>

        {/* Parcel + platform */}
        <div className="flex items-center justify-between text-xs text-zinc-400">
          <span className="truncate">Parcel: {auction.parcel_id}</span>
          {auction.platform && (
            <span className="capitalize">{auction.platform}</span>
          )}
        </div>
      </div>

      {/* Card footer */}
      <div className="mt-auto flex items-center gap-2 border-t border-zinc-100 px-5 py-3">
        {auction.auction_url ? (
          <a
            href={auction.auction_url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 rounded-lg bg-zinc-900 px-4 py-2 text-center text-sm font-medium text-white transition-colors hover:bg-zinc-700"
          >
            View Auction ↗
          </a>
        ) : (
          <span className="flex-1 rounded-lg bg-zinc-100 px-4 py-2 text-center text-sm text-zinc-400">
            No URL available
          </span>
        )}
        <button
          onClick={handleWatchlist}
          disabled={pending}
          aria-label={watched ? 'Remove from watchlist' : 'Add to watchlist'}
          title={isGuest ? 'Sign in to save to watchlist' : watched ? 'Remove from watchlist' : 'Add to watchlist'}
          className={`flex items-center justify-center rounded-lg border px-3 py-2 text-lg leading-none transition-colors disabled:opacity-50 ${
            watched
              ? 'border-amber-300 bg-amber-50 text-amber-500 hover:bg-amber-100'
              : 'border-zinc-200 bg-white text-zinc-300 hover:border-zinc-300 hover:text-zinc-500'
          }`}
        >
          {watched ? '★' : '☆'}
        </button>
      </div>
    </div>
  )
}
