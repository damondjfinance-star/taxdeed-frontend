-- ============================================================
-- TaxDeedFinder Database Schema
-- Run this in the Supabase SQL Editor
-- ============================================================

-- ============================================================
-- Tables
-- ============================================================

create table public.auctions (
  id               uuid          primary key default gen_random_uuid(),
  state            text          not null,
  county           text          not null,
  auction_date     timestamptz   not null,
  parcel_id        text          not null unique,
  opening_bid      numeric(12,2) not null,
  property_address text,
  auction_status   text          not null default 'upcoming'
                                 check (auction_status in ('upcoming', 'active', 'sold', 'cancelled', 'redeemed')),
  auction_url      text,
  platform         text,
  scraped_at       timestamptz,
  created_at       timestamptz   not null default now()
);

create table public.users (
  id                uuid        primary key references auth.users(id) on delete cascade,
  email             text        not null unique,
  full_name         text,
  avatar_url        text,
  subscription_tier text        not null default 'free'
                                check (subscription_tier in ('free', 'pro', 'enterprise')),
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create table public.saved_searches (
  id           uuid        primary key default gen_random_uuid(),
  user_id      uuid        not null references public.users(id) on delete cascade,
  name         text        not null,
  filters      jsonb       not null default '{}',
  email_alerts boolean     not null default false,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create table public.watchlists (
  id         uuid        primary key default gen_random_uuid(),
  user_id    uuid        not null references public.users(id) on delete cascade,
  auction_id uuid        not null references public.auctions(id) on delete cascade,
  notes      text,
  created_at timestamptz not null default now(),
  unique (user_id, auction_id)
);

create table public.scraper_logs (
  id           uuid        primary key default gen_random_uuid(),
  platform     text        not null,
  state        text,
  county       text,
  started_at   timestamptz not null default now(),
  finished_at  timestamptz,
  records_found    integer not null default 0,
  records_inserted integer not null default 0,
  records_updated  integer not null default 0,
  status       text        not null default 'running'
                           check (status in ('running', 'success', 'failed', 'partial')),
  error_message text,
  metadata     jsonb       not null default '{}'
);

-- ============================================================
-- Indexes
-- ============================================================

create index auctions_state_idx        on public.auctions(state);
create index auctions_county_idx       on public.auctions(county);
create index auctions_auction_date_idx on public.auctions(auction_date);
create index auctions_status_idx       on public.auctions(auction_status);
create index auctions_platform_idx     on public.auctions(platform);

create index saved_searches_user_id_idx on public.saved_searches(user_id);
create index watchlists_user_id_idx     on public.watchlists(user_id);
create index watchlists_auction_id_idx  on public.watchlists(auction_id);
create index scraper_logs_platform_idx  on public.scraper_logs(platform);
create index scraper_logs_started_at_idx on public.scraper_logs(started_at desc);

-- ============================================================
-- Row Level Security
-- ============================================================

alter table public.auctions       enable row level security;
alter table public.users          enable row level security;
alter table public.saved_searches enable row level security;
alter table public.watchlists     enable row level security;
alter table public.scraper_logs   enable row level security;

-- Auctions: public read, no direct writes (scraper uses service role)
create policy "auctions_public_read" on public.auctions
  for select using (true);

-- Users: read and update own row only
create policy "users_select_own" on public.users
  for select using (auth.uid() = id);

create policy "users_update_own" on public.users
  for update using (auth.uid() = id);

-- Saved searches: users manage their own rows only
create policy "saved_searches_select_own" on public.saved_searches
  for select using (auth.uid() = user_id);

create policy "saved_searches_insert_own" on public.saved_searches
  for insert with check (auth.uid() = user_id);

create policy "saved_searches_update_own" on public.saved_searches
  for update using (auth.uid() = user_id);

create policy "saved_searches_delete_own" on public.saved_searches
  for delete using (auth.uid() = user_id);

-- Watchlists: users manage their own rows only
create policy "watchlists_select_own" on public.watchlists
  for select using (auth.uid() = user_id);

create policy "watchlists_insert_own" on public.watchlists
  for insert with check (auth.uid() = user_id);

create policy "watchlists_update_own" on public.watchlists
  for update using (auth.uid() = user_id);

create policy "watchlists_delete_own" on public.watchlists
  for delete using (auth.uid() = user_id);

-- Scraper logs: no direct access from client (service role only)
-- No policies = blocked for anon/authenticated roles

-- ============================================================
-- Functions & Triggers
-- ============================================================

-- Auto-create user profile row when a new auth user signs up
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.users (id, email, full_name, avatar_url)
  values (
    new.id,
    new.email,
    new.raw_user_meta_data ->> 'full_name',
    new.raw_user_meta_data ->> 'avatar_url'
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Keep updated_at current
create or replace function public.update_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger users_updated_at
  before update on public.users
  for each row execute procedure public.update_updated_at();

create trigger saved_searches_updated_at
  before update on public.saved_searches
  for each row execute procedure public.update_updated_at();
