-- ============================================================
-- TaxDeedFinder Database Schema
-- Run this in the Supabase SQL Editor
-- ============================================================

-- ============================================================
-- Tables
-- ============================================================

create table public.profiles (
  id          uuid        primary key references auth.users(id) on delete cascade,
  email       text        not null,
  full_name   text,
  avatar_url  text,
  subscription_tier text  not null default 'free'
                          check (subscription_tier in ('free', 'pro', 'enterprise')),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create table public.states (
  id            smallserial primary key,
  name          text        not null unique,
  abbreviation  char(2)     not null unique,
  auction_type  text        not null default 'tax_deed'
                            check (auction_type in ('tax_deed', 'tax_lien', 'both'))
);

create table public.counties (
  id                smallserial primary key,
  state_id          smallint    not null references public.states(id) on delete cascade,
  name              text        not null,
  auction_url       text,
  auction_frequency text,
  next_auction_date date,
  contact_info      jsonb,
  unique (state_id, name)
);

create table public.properties (
  id             uuid        primary key default gen_random_uuid(),
  county_id      integer     not null references public.counties(id) on delete cascade,
  parcel_number  text        not null,
  address        text,
  city           text,
  zip_code       text,
  property_type  text        check (property_type in ('residential', 'commercial', 'land', 'industrial', 'other')),
  assessed_value numeric(12,2),
  acreage        numeric(10,4),
  bedrooms       smallint,
  bathrooms      numeric(4,1),
  year_built     smallint,
  square_feet    integer,
  latitude       numeric(9,6),
  longitude      numeric(9,6),
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  unique (county_id, parcel_number)
);

create table public.auctions (
  id                 uuid        primary key default gen_random_uuid(),
  property_id        uuid        not null references public.properties(id) on delete cascade,
  county_id          integer     not null references public.counties(id) on delete cascade,
  auction_date       date        not null,
  opening_bid        numeric(12,2) not null,
  status             text        not null default 'upcoming'
                                 check (status in ('upcoming', 'active', 'sold', 'cancelled', 'redeemed')),
  winning_bid        numeric(12,2),
  certificate_number text,
  tax_year           smallint,
  taxes_owed         numeric(12,2),
  interest_rate      numeric(5,4),
  auction_url        text,
  notes              text,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

create table public.saved_searches (
  id           uuid        primary key default gen_random_uuid(),
  user_id      uuid        not null references auth.users(id) on delete cascade,
  name         text        not null,
  filters      jsonb       not null default '{}',
  email_alerts boolean     not null default false,
  created_at   timestamptz not null default now()
);

create table public.watchlist (
  id         uuid        primary key default gen_random_uuid(),
  user_id    uuid        not null references auth.users(id) on delete cascade,
  auction_id uuid        not null references public.auctions(id) on delete cascade,
  notes      text,
  created_at timestamptz not null default now(),
  unique (user_id, auction_id)
);

-- ============================================================
-- Indexes
-- ============================================================

create index auctions_status_idx        on public.auctions(status);
create index auctions_auction_date_idx  on public.auctions(auction_date);
create index auctions_county_id_idx     on public.auctions(county_id);
create index properties_county_id_idx   on public.properties(county_id);
create index properties_type_idx        on public.properties(property_type);
create index watchlist_user_id_idx      on public.watchlist(user_id);
create index saved_searches_user_id_idx on public.saved_searches(user_id);

-- ============================================================
-- Row Level Security
-- ============================================================

alter table public.profiles       enable row level security;
alter table public.states         enable row level security;
alter table public.counties       enable row level security;
alter table public.properties     enable row level security;
alter table public.auctions       enable row level security;
alter table public.saved_searches enable row level security;
alter table public.watchlist      enable row level security;

-- Profiles: users read/update their own row
create policy "profiles_select_own" on public.profiles
  for select using (auth.uid() = id);

create policy "profiles_update_own" on public.profiles
  for update using (auth.uid() = id);

-- States, counties, properties, auctions: public read
create policy "states_public_read" on public.states
  for select using (true);

create policy "counties_public_read" on public.counties
  for select using (true);

create policy "properties_public_read" on public.properties
  for select using (true);

create policy "auctions_public_read" on public.auctions
  for select using (true);

-- Saved searches: users manage their own
create policy "saved_searches_all_own" on public.saved_searches
  for all using (auth.uid() = user_id);

-- Watchlist: users manage their own
create policy "watchlist_all_own" on public.watchlist
  for all using (auth.uid() = user_id);

-- ============================================================
-- Functions & Triggers
-- ============================================================

-- Auto-create profile row when a new user signs up
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name, avatar_url)
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

create trigger profiles_updated_at
  before update on public.profiles
  for each row execute procedure public.update_updated_at();

create trigger properties_updated_at
  before update on public.properties
  for each row execute procedure public.update_updated_at();

create trigger auctions_updated_at
  before update on public.auctions
  for each row execute procedure public.update_updated_at();
