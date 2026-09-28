-- ===========================================================================
-- Meridian — database schema (medicine catalog + enquiries + admin)
--
-- Run in the Supabase SQL Editor (Dashboard → SQL), or:
--   supabase db execute --file supabase/schema.sql
--
-- Model: categories 1─▶∞ medicines. The public reads ACTIVE medicines and
-- submits enquiries (inserted server-side via the service role). Admins (rows
-- in `admins`) manage medicines and read the enquiries inbox.
-- ===========================================================================

create extension if not exists pgcrypto;

-- --- Admins ----------------------------------------------------------------
create table if not exists public.admins (
  id         uuid primary key references auth.users(id) on delete cascade,
  email      text,
  created_at timestamptz not null default now()
);

-- Is the CURRENT user an admin? SECURITY DEFINER so it bypasses RLS on `admins`
-- (prevents recursive policy evaluation) and can be reused in other policies.
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from public.admins a where a.id = auth.uid());
$$;

-- --- Categories ------------------------------------------------------------
create table if not exists public.categories (
  id         uuid primary key default gen_random_uuid(),
  slug       text unique not null,
  name       text not null,
  blurb      text,
  sort_order int  not null default 0,
  created_at timestamptz not null default now()
);

-- --- Medicines -------------------------------------------------------------
create table if not exists public.medicines (
  id           uuid primary key default gen_random_uuid(),
  category_id  uuid references public.categories(id) on delete set null,
  name         text not null,               -- product / brand name
  molecule     text,                        -- salt / active ingredient
  form         text,                        -- Tablet, Capsule, Injection, ...
  strengths    text,                        -- comma-separated, e.g. "50 mg, 100 mg"
  pack         text,
  moq          text,
  lead_time    text,
  availability text not null default 'in-stock'
               check (availability in ('in-stock','made-to-order')),
  description  text,
  note         text,
  image_path   text,                        -- path in the public medicine-images bucket
  is_active    boolean not null default true,
  sort_order   int not null default 0,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz
);
create index if not exists medicines_category_idx on public.medicines(category_id);
create index if not exists medicines_active_idx   on public.medicines(is_active);

-- --- Enquiries -------------------------------------------------------------
create table if not exists public.enquiries (
  id         uuid primary key default gen_random_uuid(),
  source     text not null default 'Contact Form',
  name       text not null,
  email      text not null,
  phone      text,
  country    text,
  company    text,
  product    text,                          -- which medicine the visitor asked about
  message    text,
  page       text,
  status     text not null default 'new' check (status in ('new','read','archived')),
  created_at timestamptz not null default now()
);
create index if not exists enquiries_status_idx  on public.enquiries(status);
create index if not exists enquiries_created_idx on public.enquiries(created_at desc);

-- ===========================================================================
-- Row Level Security
-- ===========================================================================
alter table public.admins     enable row level security;
alter table public.categories enable row level security;
alter table public.medicines  enable row level security;
alter table public.enquiries  enable row level security;

-- admins: a user may read only their OWN row (needed for the access gate).
drop policy if exists "admins read own" on public.admins;
create policy "admins read own" on public.admins
  for select to authenticated using (id = auth.uid());

-- categories: public read; admins manage.
drop policy if exists "categories public read" on public.categories;
create policy "categories public read" on public.categories
  for select to anon, authenticated using (true);
drop policy if exists "categories admin write" on public.categories;
create policy "categories admin write" on public.categories
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- medicines: everyone reads ACTIVE rows; admins read+write ALL (OR-combined).
drop policy if exists "medicines public read" on public.medicines;
create policy "medicines public read" on public.medicines
  for select to anon, authenticated using (is_active = true);
drop policy if exists "medicines admin all" on public.medicines;
create policy "medicines admin all" on public.medicines
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- enquiries: NO public access. Inserts happen server-side via the service role
-- (which bypasses RLS). Admins can read/update/delete from the inbox.
drop policy if exists "enquiries admin all" on public.enquiries;
create policy "enquiries admin all" on public.enquiries
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- ===========================================================================
-- Storage: public-read bucket for medicine images (writes done server-side)
-- ===========================================================================
insert into storage.buckets (id, name, public)
values ('medicine-images', 'medicine-images', true)
on conflict (id) do nothing;

drop policy if exists "medicine-images public read" on storage.objects;
create policy "medicine-images public read" on storage.objects
  for select to anon, authenticated using (bucket_id = 'medicine-images');

drop policy if exists "medicine-images admin write" on storage.objects;
create policy "medicine-images admin write" on storage.objects
  for all to authenticated
  using (bucket_id = 'medicine-images' and public.is_admin())
  with check (bucket_id = 'medicine-images' and public.is_admin());

-- ===========================================================================
-- Seed: a few starter categories (safe to edit/remove)
-- ===========================================================================
insert into public.categories (slug, name, blurb, sort_order) values
  ('general',        'General',          'General pharmaceutical formulations.',        10),
  ('antibiotics',    'Antibiotics',      'Antibacterial and anti-infective agents.',    20),
  ('pain-relief',    'Pain Relief',      'Analgesics and anti-inflammatory medicines.', 30),
  ('cardiovascular', 'Cardiovascular',   'Heart and blood-pressure therapies.',         40),
  ('diabetes',       'Diabetes Care',    'Antidiabetic medicines.',                     50)
on conflict (slug) do nothing;

-- ===========================================================================
-- Bootstrap your first admin (run AFTER creating the user in
-- Authentication → Users, replacing the email):
--
--   insert into public.admins (id, email)
--   select id, email from auth.users where email = 'you@example.com'
--   on conflict (id) do nothing;
-- ===========================================================================
