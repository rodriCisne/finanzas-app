-- Create valentine_stories table
create table if not exists public.valentine_stories (
  id uuid primary key default gen_random_uuid(),
  order_index int2 not null,
  title text not null,
  description text not null,
  image_path text not null,
  year int2 not null default 2026,
  created_at timestamptz default now()
);

-- Enable RLS for stories
alter table public.valentine_stories enable row level security;

-- Policy: Everyone can read stories (Public/Authenticated)
create policy "Anyone can read valentine stories"
  on public.valentine_stories for select
  using (true);

-- Create valentine_impressions table
create table if not exists public.valentine_impressions (
  user_id uuid references auth.users(id) on delete cascade,
  year int2 not null,
  seen_at timestamptz default now(),
  primary key (user_id, year)
);

-- Enable RLS for impressions
alter table public.valentine_impressions enable row level security;

-- Policy: Users can insert their own impression
create policy "Users can insert own impression"
  on public.valentine_impressions for insert
  with check (auth.uid() = user_id);

-- Policy: Users can read their own impression
create policy "Users can read own impression"
  on public.valentine_impressions for select
  using (auth.uid() = user_id);

-- Create storage bucket for valentine assets
insert into storage.buckets (id, name, public)
values ('valentine-assets', 'valentine-assets', true)
on conflict (id) do nothing;

-- Storage Policy: Public Read Access
create policy "Public Access to Valentine Assets"
  on storage.objects for select
  using ( bucket_id = 'valentine-assets' );
;
