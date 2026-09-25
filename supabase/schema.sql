create extension if not exists pgcrypto;

create table if not exists outlets(
  id text primary key,
  code text unique not null,
  name text not null,
  address text default '',
  phone text default '',
  active boolean default true,
  updated_at timestamptz default now()
);

create table if not exists users(
  id text primary key,
  name text not null,
  username text unique not null,
  role text not null check (role in ('OWNER','SUPERVISOR','CASHIER')),
  outlet_id text references outlets(id),
  active boolean default true,
  updated_at timestamptz default now()
);

create table if not exists products(
  id text primary key,
  sku text unique not null,
  name text not null,
  category text not null,
  price numeric not null default 0,
  stock numeric not null default 0,
  product_cost numeric not null default 0,
  emoji text default '🍝',
  active boolean default true,
  track_stock boolean default true,
  size text,
  updated_at timestamptz default now()
);

create table if not exists ingredients(
  id text primary key,
  sku text unique not null,
  name text not null,
  category text not null,
  unit text not null,
  package_size text default '',
  purchase_price numeric not null default 0,
  yield_multiplier numeric not null default 1,
  stock numeric not null default 0,
  min_stock numeric not null default 0,
  cost_per_unit numeric not null default 0,
  include_in_hpp boolean default true,
  price_mode text default 'MANUAL' check (price_mode in ('RO','MARKET','MANUAL')),
  updated_at timestamptz default now()
);

create table if not exists recipes(
  id text primary key,
  product_id text references products(id) on delete cascade,
  items jsonb not null default '[]',
  updated_at timestamptz default now()
);

create table if not exists sales(
  id text primary key,
  invoice_no text unique not null,
  order_type text not null,
  table_number text default '',
  payment_method text not null,
  subtotal numeric not null,
  discount numeric not null default 0,
  total numeric not null,
  cash_received numeric not null default 0,
  change numeric not null default 0,
  cost_of_goods numeric not null default 0,
  items jsonb not null default '[]',
  created_at timestamptz default now(),
  outlet_id text,
  user_id text,
  synced boolean default true
);

create table if not exists suppliers(
  id text primary key,
  name text not null,
  phone text default '',
  address text default '',
  updated_at timestamptz default now()
);

create table if not exists purchases(
  id text primary key,
  invoice_no text not null,
  supplier_id text,
  ingredient_id text,
  quantity numeric not null,
  unit text not null,
  total_cost numeric not null default 0,
  unit_cost numeric not null default 0,
  created_at timestamptz default now()
);

create table if not exists stock_movements(
  id text primary key,
  ingredient_id text,
  type text not null,
  quantity numeric not null,
  reason text not null,
  reference_id text,
  created_at timestamptz default now()
);

create table if not exists shifts(
  id text primary key,
  outlet_id text,
  user_id text,
  opening_cash numeric not null,
  closing_cash numeric,
  expected_cash numeric,
  variance numeric,
  started_at timestamptz default now(),
  ended_at timestamptz,
  status text not null
);

create table if not exists expenses(
  id text primary key,
  outlet_id text,
  user_id text,
  category text not null,
  description text not null,
  amount numeric not null,
  payment_method text not null,
  created_at timestamptz default now()
);

create table if not exists audit_logs(
  id text primary key,
  user_id text,
  action text not null,
  entity text not null,
  entity_id text not null,
  detail text default '',
  created_at timestamptz default now()
);

alter table products add column if not exists product_cost numeric not null default 0;
alter table products add column if not exists size text;
alter table ingredients add column if not exists package_size text default '';
alter table ingredients add column if not exists purchase_price numeric not null default 0;
alter table ingredients add column if not exists yield_multiplier numeric not null default 1;
alter table ingredients add column if not exists include_in_hpp boolean default true;
alter table ingredients add column if not exists price_mode text default 'MANUAL';

create index if not exists idx_sales_outlet_created on sales(outlet_id, created_at);
create index if not exists idx_stock_moves_ingredient_created on stock_movements(ingredient_id, created_at);
create index if not exists idx_purchases_ingredient_created on purchases(ingredient_id, created_at);
create index if not exists idx_products_updated on products(updated_at);
create index if not exists idx_ingredients_updated on ingredients(updated_at);

-- Development/testing policies.
-- Replace these with authenticated outlet-scoped policies before production use.
alter table outlets enable row level security;
alter table users enable row level security;
alter table products enable row level security;
alter table ingredients enable row level security;
alter table recipes enable row level security;
alter table sales enable row level security;
alter table suppliers enable row level security;
alter table purchases enable row level security;
alter table stock_movements enable row level security;
alter table shifts enable row level security;
alter table expenses enable row level security;
alter table audit_logs enable row level security;

drop policy if exists dev_outlets on outlets;
create policy dev_outlets on outlets for all using (true) with check (true);
drop policy if exists dev_users on users;
create policy dev_users on users for all using (true) with check (true);
drop policy if exists dev_products on products;
create policy dev_products on products for all using (true) with check (true);
drop policy if exists dev_ingredients on ingredients;
create policy dev_ingredients on ingredients for all using (true) with check (true);
drop policy if exists dev_recipes on recipes;
create policy dev_recipes on recipes for all using (true) with check (true);
drop policy if exists dev_sales on sales;
create policy dev_sales on sales for all using (true) with check (true);
drop policy if exists dev_suppliers on suppliers;
create policy dev_suppliers on suppliers for all using (true) with check (true);
drop policy if exists dev_purchases on purchases;
create policy dev_purchases on purchases for all using (true) with check (true);
drop policy if exists dev_stock_movements on stock_movements;
create policy dev_stock_movements on stock_movements for all using (true) with check (true);
drop policy if exists dev_shifts on shifts;
create policy dev_shifts on shifts for all using (true) with check (true);
drop policy if exists dev_expenses on expenses;
create policy dev_expenses on expenses for all using (true) with check (true);
drop policy if exists dev_audit_logs on audit_logs;
create policy dev_audit_logs on audit_logs for all using (true) with check (true);
