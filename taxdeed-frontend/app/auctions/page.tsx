import { createClient } from '@/lib/supabase-server'
import AuctionsClient from '@/components/auctions/AuctionsClient'

export const metadata = { title: 'Auctions — TaxDeedFinder' }

export default async function AuctionsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const isGuest = !user

  const baseQuery = supabase
    .from('auctions')
    .select('*')
    .order('auction_date', { ascending: true })

  const { data: auctions } = isGuest
    ? await baseQuery.limit(5)
    : await baseQuery

  let watchlistIds: string[] = []
  if (user) {
    const { data: watchlist } = await supabase
      .from('watchlists')
      .select('auction_id')
      .eq('user_id', user.id)
    watchlistIds = (watchlist ?? []).map((w: { auction_id: string }) => w.auction_id)
  }

  return (
    <AuctionsClient
      auctions={auctions ?? []}
      isGuest={isGuest}
      watchlistIds={watchlistIds}
    />
  )
}
