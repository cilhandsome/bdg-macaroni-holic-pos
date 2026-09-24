create extension if not exists pgcrypto;
create table if not exists outlets(id text primary key,code text unique not null,name text not null,address text default '',phone text default '',active boolean default true,updated_at timestamptz default now());
create table if not exists users(id text primary key,name text not null,username text unique not null,role text not null,outlet_id text references outlets(id),active boolean default true,updated_at timestamptz default now());
create table if not exists products(id text primary key,sku text unique not null,name text not null,category text not null,price numeric not null default 0,stock numeric not null default 0,emoji text default '🍝',active boolean default true,track_stock boolean default true,updated_at timestamptz default now());
create table if not exists ingredients(id text primary key,sku text unique not null,name text not null,category text not null,unit text not null,stock numeric not null default 0,min_stock numeric not null default 0,cost_per_unit numeric not null default 0,updated_at timestamptz default now());
create table if not exists recipes(id text primary key,product_id text references products(id) on delete cascade,items jsonb not null default '[]',updated_at timestamptz default now());
create table if not exists sales(id text primary key,invoice_no text unique not null,order_type text not null,table_number text default '',payment_method text not null,subtotal numeric not null,discount numeric not null default 0,total numeric not null,cash_received numeric not null default 0,change numeric not null default 0,cost_of_goods numeric not null default 0,items jsonb not null default '[]',created_at timestamptz default now(),outlet_id text,user_id text,synced boolean default true);
create table if not exists suppliers(id text primary key,name text not null,phone text default '',address text default '',updated_at timestamptz default now());
create table if not exists purchases(id text primary key,invoice_no text not null,supplier_id text,ingredient_id text,quantity numeric not null,unit text not null,total_cost numeric not null default 0,unit_cost numeric not null default 0,created_at timestamptz default now());
create table if not exists stock_movements(id text primary key,ingredient_id text,type text not null,quantity numeric not null,reason text not null,reference_id text,created_at timestamptz default now());
create table if not exists shifts(id text primary key,outlet_id text,user_id text,opening_cash numeric not null,closing_cash numeric,expected_cash numeric,variance numeric,started_at timestamptz default now(),ended_at timestamptz,status text not null);
create table if not exists expenses(id text primary key,outlet_id text,user_id text,category text not null,description text not null,amount numeric not null,payment_method text not null,created_at timestamptz default now());
create table if not exists audit_logs(id text primary key,user_id text,action text not null,entity text not null,entity_id text not null,detail text default '',created_at timestamptz default now());


-- Development-only open policies so the browser POS can sync with the anon key.
-- Replace these with authenticated, outlet-scoped policies before production use.
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
