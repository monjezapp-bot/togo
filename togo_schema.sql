-- ToGo: make the database match what the app reads and writes.
-- Safe to run more than once. Run it in the Neon SQL editor.

-- 1) missing columns (existing ones are left alone)
alter table stops
  add column if not exists lat double precision,
  add column if not exists lng double precision,
  add column if not exists customer_name text,
  add column if not exists phone text,
  add column if not exists order_details text,
  add column if not exists address text,
  add column if not exists building text,
  add column if not exists apartment text,
  add column if not exists invoice_no text,
  add column if not exists tracking_no text,
  add column if not exists amount numeric,
  add column if not exists cash boolean default true,
  add column if not exists done boolean default false,
  add column if not exists done_at timestamptz,
  add column if not exists receipt_kept boolean,
  add column if not exists cash_collected boolean,
  add column if not exists received numeric,
  add column if not exists delivery_date date;

alter table courier_state
  add column if not exists working boolean default false,
  add column if not exists full_name text,
  add column if not exists phone text,
  add column if not exists rate numeric,
  add column if not exists updated_at timestamptz default now();

-- 2) CHECK: should return no rows
with need(t,c) as (values
 ('stops','id'),('stops','lat'),('stops','lng'),('stops','customer_name'),('stops','phone'),('stops','order_details'),
 ('stops','address'),('stops','building'),('stops','apartment'),('stops','invoice_no'),('stops','amount'),('stops','cash'),
 ('stops','done'),('stops','done_at'),('stops','delivery_date'),('stops','receipt_kept'),('stops','cash_collected'),('stops','received'),
 ('courier_state','courier_id'),('courier_state','working'),('courier_state','full_name'),('courier_state','phone'),
 ('courier_state','rate'),('courier_state','updated_at'))
select n.t as table_name, n.c as missing_column
from need n left join information_schema.columns i
  on i.table_schema='public' and i.table_name=n.t and i.column_name=n.c
where i.column_name is null;

-- 3) CHECK: courier_state must have courier_id as primary key or unique (the app upserts on it). Expect one row.
select tc.constraint_type, kcu.column_name
from information_schema.table_constraints tc
join information_schema.key_column_usage kcu using (constraint_name, table_schema)
where tc.table_name='courier_state' and kcu.column_name='courier_id'
  and tc.constraint_type in ('PRIMARY KEY','UNIQUE');

-- 4) CHECK: column types (eyeball: amount/received numeric, done_at timestamptz, delivery_date date)
select table_name, column_name, data_type
from information_schema.columns
where table_schema='public' and table_name in ('stops','courier_state')
order by table_name, column_name;

-- 5) CHECK: who can read what
select tablename, rowsecurity from pg_tables where schemaname='public' and tablename in ('stops','courier_state');
select tablename, policyname, cmd, qual from pg_policies where schemaname='public' and tablename in ('stops','courier_state');
