'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase-server'

export async function addToWatchlist(auctionId: string): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { error } = await supabase
    .from('watchlists')
    .insert({ user_id: user.id, auction_id: auctionId })

  if (error) return { error: error.message }
  revalidatePath('/auctions')
  return {}
}

export async function removeFromWatchlist(auctionId: string): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { error } = await supabase
    .from('watchlists')
    .delete()
    .eq('user_id', user.id)
    .eq('auction_id', auctionId)

  if (error) return { error: error.message }
  revalidatePath('/auctions')
  return {}
}
