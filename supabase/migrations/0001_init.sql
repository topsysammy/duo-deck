-- Duo Deck: optional accounts and sync (PRD §9). Content (decks/cards) is static JSON, not in the DB.
-- Every table has Row Level Security: a signed-in user can only read and write their own rows.
-- Deleting the auth user cascades to all their data (ON-5).

-- ---------- profiles ----------
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text check (char_length(display_name) <= 24),
  partner_name text check (char_length(partner_name) <= 24),
  relationship_stage text check (relationship_stage in ('new', 'dating', 'long_term', 'married')),
  moods text[] not null default '{}',
  -- content_filter = true hides spicy decks (CB-4)
  content_filter boolean not null default true,
  is_18_confirmed boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------- favorites ----------
-- deleted_at is a tombstone so an un-favorite on one phone removes it on the others.
create table public.favorites (
  user_id uuid not null references auth.users (id) on delete cascade,
  card_id text not null check (char_length(card_id) <= 80),
  deck_id text not null check (char_length(deck_id) <= 60),
  note text check (char_length(note) <= 500), -- EN-2 (P1)
  created_at timestamptz not null default now(),
  deleted_at timestamptz,
  updated_at timestamptz not null default now(),
  primary key (user_id, card_id)
);

-- ---------- sessions ----------
create table public.sessions (
  id uuid primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  deck_id text not null check (char_length(deck_id) <= 60),
  mode text not null default 'deck' check (mode in ('deck', 'favorites')),
  cards_seen text[] not null default '{}',
  skipped integer not null default 0 check (skipped >= 0),
  completed boolean not null default false,
  started_at timestamptz not null,
  ended_at timestamptz not null
);
create index sessions_user_started_idx on public.sessions (user_id, started_at desc);

-- rooms (remote play, GP-8) is P1 and will come in a later migration.

-- ---------- Row Level Security ----------
alter table public.profiles enable row level security;
alter table public.favorites enable row level security;
alter table public.sessions enable row level security;

create policy "profiles: owner reads" on public.profiles for select to authenticated using ((select auth.uid()) = id);
create policy "profiles: owner inserts" on public.profiles for insert to authenticated with check ((select auth.uid()) = id);
create policy "profiles: owner updates" on public.profiles for update to authenticated using ((select auth.uid()) = id) with check ((select auth.uid()) = id);

create policy "favorites: owner reads" on public.favorites for select to authenticated using ((select auth.uid()) = user_id);
create policy "favorites: owner inserts" on public.favorites for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "favorites: owner updates" on public.favorites for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "favorites: owner deletes" on public.favorites for delete to authenticated using ((select auth.uid()) = user_id);

create policy "sessions: owner reads" on public.sessions for select to authenticated using ((select auth.uid()) = user_id);
create policy "sessions: owner inserts" on public.sessions for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "sessions: owner updates" on public.sessions for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

-- Anonymous visitors get nothing.
revoke all on public.profiles, public.favorites, public.sessions from anon;
