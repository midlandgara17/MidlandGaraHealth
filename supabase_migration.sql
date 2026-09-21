
-- MidlandGara Health backend schema for Supabase.
-- Run in Supabase SQL Editor after enabling Email/Password Auth.

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  phone text,
  role text not null default 'patient' check (role in ('patient','professional','admin')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  category text,
  description text,
  price numeric(12,2),
  image text,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.appointments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  name text not null,
  phone text not null,
  email text,
  service text not null,
  preferred_date date not null,
  preferred_time text,
  notes text,
  status text not null default 'pending' check (status in ('pending','confirmed','completed','cancelled')),
  created_at timestamptz not null default now()
);

create table if not exists public.cpd_records (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  activity text not null,
  provider text,
  date date not null,
  points numeric(8,2) not null default 0,
  notes text,
  created_at timestamptz not null default now()
);

create table if not exists public.articles (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  category text,
  excerpt text,
  content text,
  image text,
  url text,
  is_published boolean not null default false,
  published_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.contact_messages (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  name text not null,
  email text,
  phone text,
  subject text,
  message text not null,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;
alter table public.products enable row level security;
alter table public.appointments enable row level security;
alter table public.cpd_records enable row level security;
alter table public.articles enable row level security;
alter table public.contact_messages enable row level security;

create policy "public can read active products"
on public.products for select
using (is_active = true);

create policy "public can read published articles"
on public.articles for select
using (is_published = true);

create policy "users read own profile"
on public.profiles for select
using (auth.uid() = id);

create policy "users insert own profile"
on public.profiles for insert
with check (auth.uid() = id);

create policy "users update own profile"
on public.profiles for update
using (auth.uid() = id);

create policy "users read own appointments"
on public.appointments for select
using (auth.uid() = user_id);

create policy "users create appointments"
on public.appointments for insert
with check (user_id is null or auth.uid() = user_id);

create policy "users read own cpd"
on public.cpd_records for select
using (auth.uid() = user_id);

create policy "users create own cpd"
on public.cpd_records for insert
with check (auth.uid() = user_id);

create policy "anyone can submit contact"
on public.contact_messages for insert
with check (true);

create policy "users read own contact messages"
on public.contact_messages for select
using (auth.uid() = user_id);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name','')
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
after insert on auth.users
for each row
execute procedure public.handle_new_user();

insert into public.products
(name,category,description,price,image)
select * from (values
(
  'Digital Blood Pressure Monitor',
  'Monitoring',
  'For convenient home-blood-pressure monitoring.',
  3500::numeric,
  'Assets/images%20(1).jpeg'
),
(
  'Health Monitoring Smart Watch',
  'Wearable',
  'An everyday wearable with health-related monitoring features.',
  4500::numeric,
  'Assets/images%20(2).jpg'
),
(
  'Digital Thermometer',
  'Monitoring',
  'A simple tool for routine temperature checks.',
  650::numeric,
  'Assets/images.jpeg'
)
) as v(name,category,description,price,image)
where not exists (select 1 from public.products);
