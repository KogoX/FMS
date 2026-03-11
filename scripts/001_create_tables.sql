-- Profiles table (extends auth.users)
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  phone text,
  mpesa_number text default '',
  address text default '',
  delivery_lat double precision,
  delivery_lng double precision,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.profiles enable row level security;

create policy "profiles_select_own" on public.profiles for select using (auth.uid() = id);
create policy "profiles_insert_own" on public.profiles for insert with check (auth.uid() = id);
create policy "profiles_update_own" on public.profiles for update using (auth.uid() = id);
create policy "profiles_delete_own" on public.profiles for delete using (auth.uid() = id);

-- Auto-create profile on signup
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
    coalesce(new.raw_user_meta_data ->> 'full_name', '')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
  after insert on auth.users
  for each row
  execute function public.handle_new_user();

-- Food items table
create table if not exists public.food_items (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  category text not null,
  price numeric(10,2) not null,
  image text not null,
  description text,
  calories integer,
  protein text,
  bun_type text,
  rating numeric(2,1) default 0,
  delivery_time text,
  created_at timestamptz default now()
);

alter table public.food_items enable row level security;

-- Everyone can read food items
create policy "food_items_select_all" on public.food_items for select using (true);

-- Toppings table
create table if not exists public.toppings (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  image text not null,
  sort_order integer default 0
);

alter table public.toppings enable row level security;
create policy "toppings_select_all" on public.toppings for select using (true);

-- Side options table
create table if not exists public.side_options (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  image text not null,
  sort_order integer default 0
);

alter table public.side_options enable row level security;
create policy "side_options_select_all" on public.side_options for select using (true);

-- Cart items table
create table if not exists public.cart_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  food_item_id uuid not null references public.food_items(id) on delete cascade,
  quantity integer not null default 1,
  selected_toppings text[] default '{}',
  selected_sides text[] default '{}',
  created_at timestamptz default now()
);

alter table public.cart_items enable row level security;

create policy "cart_items_select_own" on public.cart_items for select using (auth.uid() = user_id);
create policy "cart_items_insert_own" on public.cart_items for insert with check (auth.uid() = user_id);
create policy "cart_items_update_own" on public.cart_items for update using (auth.uid() = user_id);
create policy "cart_items_delete_own" on public.cart_items for delete using (auth.uid() = user_id);

-- Orders table
create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  status text not null default 'pending',
  total_amount numeric(10,2) not null,
  delivery_address text,
  delivery_lat double precision,
  delivery_lng double precision,
  mpesa_number text,
  mpesa_transaction_id text,
  payment_status text not null default 'pending',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.orders enable row level security;

create policy "orders_select_own" on public.orders for select using (auth.uid() = user_id);
create policy "orders_insert_own" on public.orders for insert with check (auth.uid() = user_id);
create policy "orders_update_own" on public.orders for update using (auth.uid() = user_id);

-- Order items table
create table if not exists public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  food_item_id uuid not null references public.food_items(id),
  food_name text not null,
  food_price numeric(10,2) not null,
  quantity integer not null default 1,
  selected_toppings text[] default '{}',
  selected_sides text[] default '{}'
);

alter table public.order_items enable row level security;

create policy "order_items_select_own" on public.order_items for select using (
  exists (select 1 from public.orders where orders.id = order_items.order_id and orders.user_id = auth.uid())
);
create policy "order_items_insert_own" on public.order_items for insert with check (
  exists (select 1 from public.orders where orders.id = order_items.order_id and orders.user_id = auth.uid())
);
