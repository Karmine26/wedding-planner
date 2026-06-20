-- ============================================================
--  Wedding Planner — Supabase / Postgres schema
--  Amin & fiancé · Palmer House, Chicago · July 10, 2027
--
--  HOW TO USE: Supabase dashboard → SQL Editor → New query →
--  paste this whole file → Run. Safe to run more than once.
--
--  Security model (matches the app):
--    • Row Level Security is ON for every table.
--    • Only signed-in users whose email is in `allowed_emails`
--      can read or write. That is the "just the two of us" gate,
--      enforced by the database itself — not just the app.
--    • The browser only ever uses the public *publishable* key.
--      The real protection is these policies. Never put a
--      service-role / secret key in the website.
-- ============================================================

-- ---- Settings: one row holding wedding-wide info ----
create table if not exists settings (
  id            int primary key default 1,
  wedding_date  date    not null default '2027-07-10',
  partner_a     text    default 'Amin',
  partner_b     text    default '',
  venue         text    default 'Palmer House Hilton, Chicago',
  ceremony_room text    default 'Empire Room',
  cocktail_room text    default 'Honoré Room',
  welcome_date  date    default '2027-07-08',
  welcome_venue text    default '',
  total_budget  numeric default 0,
  theme_color   text    default '#8a6d3b',
  updated_at    timestamptz default now(),
  constraint single_row check (id = 1)
);

-- ---- Checklist / master timeline ----
create table if not exists tasks (
  id          uuid primary key default gen_random_uuid(),
  title       text not null,
  category    text,
  due_date    date,
  owner       text,                 -- 'Amin' | partner | 'Both'
  status      text default 'todo',  -- todo | doing | done
  notes       text,
  sort        int  default 0,
  created_at  timestamptz default now()
);

-- ---- Budget line items (optionally linked to a vendor) ----
create table if not exists budget_items (
  id          uuid primary key default gen_random_uuid(),
  category    text,
  label       text not null,
  estimated   numeric default 0,
  actual      numeric default 0,
  deposit_paid numeric default 0,
  due_date    date,
  paid        boolean default false,
  vendor_id   uuid,
  notes       text,
  created_at  timestamptz default now()
);

-- ---- Guests + RSVP ----
create table if not exists guests (
  id           uuid primary key default gen_random_uuid(),
  name         text not null,
  party        text,
  email        text,
  phone        text,
  address      text,                -- for invitations
  side         text,                -- 'Amin' | partner | 'Both'
  plus_one     boolean default false,
  rsvp         text default 'pending', -- pending | yes | no | maybe
  attending_count int default 1,
  meal         text,
  dietary      text,
  table_id     uuid,
  invited_welcome boolean default true,
  notes        text,
  created_at   timestamptz default now()
);

-- ---- Vendors ----
create table if not exists vendors (
  id           uuid primary key default gen_random_uuid(),
  name         text,
  category     text,
  contact_name text,
  email        text,
  phone        text,
  status       text default 'researching', -- researching | contacted | booked | declined
  cost         numeric default 0,
  contract_signed boolean default false,
  notes        text,
  created_at   timestamptz default now()
);

-- ---- Seating tables ----
create table if not exists tables_seating (
  id          uuid primary key default gen_random_uuid(),
  name        text,
  capacity    int default 10,
  sort        int default 0
);

-- ---- Day-of run-of-show (welcome party reuses this via event_day) ----
create table if not exists timeline_events (
  id          uuid primary key default gen_random_uuid(),
  event_day   text default 'wedding', -- 'wedding' | 'welcome'
  time        text,                   -- '15:30'
  title       text not null,
  location    text,
  responsible text,
  vendor_id   uuid,
  notes       text,
  sort        int default 0
);

-- ---- Registry / gifts ----
create table if not exists registry (
  id          uuid primary key default gen_random_uuid(),
  item        text not null,
  store       text,
  url         text,
  price       numeric default 0,
  received    boolean default false,
  thank_you_sent boolean default false,
  from_guest  text
);

-- ---- Inspiration board ----
create table if not exists inspiration (
  id          uuid primary key default gen_random_uuid(),
  title       text,
  theme       text,
  url         text,
  image_url   text,
  notes       text,
  created_at  timestamptz default now()
);

-- ---- Documents (links or Supabase Storage paths) ----
create table if not exists documents (
  id          uuid primary key default gen_random_uuid(),
  title       text,
  category    text,
  url         text,
  notes       text,
  created_at  timestamptz default now()
);

-- ---- Payment schedule (multiple dated installments per vendor/budget item) ----
create table if not exists payments (
  id             uuid primary key default gen_random_uuid(),
  budget_item_id uuid references budget_items(id) on delete set null,
  vendor_id      uuid references vendors(id) on delete set null,
  payee          text,            -- display label, e.g. 'Palmer House Hilton'
  label          text not null,   -- e.g. '1st Deposit'
  amount         numeric default 0,
  due_date       date,
  paid           boolean default false,
  paid_date      date,
  method         text,            -- e.g. 'AmEx', 'check', 'Zelle'
  notes          text,
  sort           int default 0,
  created_at     timestamptz default now()
);

-- ============================================================
--  ACCESS CONTROL — "just the two of us"
-- ============================================================

-- Who is allowed in. Add or remove a partner by editing this table.
-- RLS is ON with NO policies, so this list is NOT exposed through the API.
create table if not exists allowed_emails ( email text primary key );
alter table allowed_emails enable row level security;

-- >>> PUT YOUR TWO LOGIN EMAILS HERE <<<
-- (lower-case is fine; the check is case-insensitive)
insert into allowed_emails (email) values
  ('you@example.com')               -- replace with your login email
  -- , ('partner@example.com')      -- add your partner's login email
on conflict (email) do nothing;

-- Returns true only when the caller is signed in AND on the list.
-- SECURITY DEFINER lets it read allowed_emails past that table's RLS.
create or replace function public.is_allowed() returns boolean
  language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from allowed_emails
    where lower(email) = lower(coalesce(auth.jwt() ->> 'email', ''))
  );
$$;
revoke all on function public.is_allowed() from public, anon;
grant execute on function public.is_allowed() to authenticated;

-- ---- Realtime: broadcast changes to every connected device ----
do $$
declare t text;
begin
  foreach t in array array[
    'settings','tasks','budget_items','guests','vendors',
    'tables_seating','timeline_events','registry','inspiration','documents','payments'
  ] loop
    if not exists (
      select 1 from pg_publication_tables
      where pubname='supabase_realtime' and schemaname='public' and tablename=t
    ) then
      execute format('alter publication supabase_realtime add table public.%I;', t);
    end if;
  end loop;
end $$;

-- ---- Row Level Security: enable + (re)create the allowlist policy ----
do $$
declare t text;
begin
  foreach t in array array[
    'settings','tasks','budget_items','guests','vendors',
    'tables_seating','timeline_events','registry','inspiration','documents','payments'
  ] loop
    execute format('alter table public.%I enable row level security;', t);
    execute format('drop policy if exists "allowed users full access" on public.%I;', t);
    execute format($p$create policy "allowed users full access" on public.%I
        for all to authenticated
        using (public.is_allowed()) with check (public.is_allowed());$p$, t);
  end loop;
end $$;

-- Seed the single settings row (filled with the wedding details).
insert into settings (id) values (1) on conflict (id) do nothing;
