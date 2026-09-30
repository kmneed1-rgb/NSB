-- =============================================================
-- SUPABASE SCHEMA for NSB1 School
-- Chalane ka tareeqa (koi ek):
--   A) Supabase Dashboard -> SQL Editor -> ye file paste karke Run
--   B) node scripts/setup-supabase-tables.cjs  (SUPABASE_DB_URL se)
-- Phir data migrate: node scripts/migrate-neon-to-supabase.cjs
--
-- App ka sync layer (src/lib/supabaseSync.ts) har collection ke liye
-- ALAG table use karta hai — id text PK + data jsonb + updated_at.
-- KNOWN_TABLES: students, teachers, classes, timetable, attendance,
--               marks, fees, fee_data, coordinators, assignments, app_settings
-- =============================================================

-- 1) App tables (Firestore-style per-table, idempotent) -------
do $$
declare t text;
begin
  foreach t in array array[
    'students', 'teachers', 'classes', 'timetable', 'attendance',
    'marks', 'fees', 'fee_data', 'coordinators', 'assignments', 'app_settings'
  ] loop
    execute format(
      'create table if not exists public.%I (
         id         text primary key,
         data       jsonb,
         updated_at timestamptz not null default now()
       )', t);
    execute format(
      'create index if not exists %I_updated_at_idx on public.%I (updated_at)', t, t);
  end loop;
end $$;

-- 2) Legacy records table (purana mirror: migration/backup) ---
create table if not exists public.records (
  collection_name text not null,
  record_id       text not null,
  data            jsonb,
  updated_at      timestamptz not null default now(),
  primary key (collection_name, record_id)
);
create index if not exists records_col_idx on public.records (collection_name);

-- 3) updated_at trigger — PostgREST upsert par default kabhi
--    chalta nahi, warna updated_at hamesha insert-time reh jaata hai.
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

do $$
declare t text;
begin
  foreach t in array array[
    'students', 'teachers', 'classes', 'timetable', 'attendance',
    'marks', 'fees', 'fee_data', 'coordinators', 'assignments', 'app_settings',
    'records'
  ] loop
    execute format('drop trigger if exists set_updated_at on public.%I', t);
    execute format(
      'create trigger set_updated_at before update on public.%I
         for each row execute function public.set_updated_at()', t);
  end loop;
end $$;

-- 4) Realtime (cross-device sync): har table publication mein add
do $$
declare t text;
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    foreach t in array array[
      'students', 'teachers', 'classes', 'timetable', 'attendance',
      'marks', 'fees', 'fee_data', 'coordinators', 'assignments', 'app_settings',
      'records'
    ] loop
      if not exists (
        select 1 from pg_publication_tables
        where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = t
      ) then
        execute format('alter publication supabase_realtime add table public.%I', t);
      end if;
    end loop;
  end if;
end $$;

-- 5) Row Level Security: open access (current public-app behaviour).
--    Production deploy se pehle auth-required policy se replace karein.
do $$
declare t text;
begin
  foreach t in array array[
    'students', 'teachers', 'classes', 'timetable', 'attendance',
    'marks', 'fees', 'fee_data', 'coordinators', 'assignments', 'app_settings',
    'records'
  ] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('drop policy if exists %I_all_access on public.%I', t, t);
    execute format(
      'create policy %I_all_access on public.%I
         for all to anon, authenticated
         using (true) with check (true)', t, t);
  end loop;
end $$;
-- =============================================================
-- END — 11 app tables + records ready. Verify: node scripts/check-supabase.cjs
-- =============================================================