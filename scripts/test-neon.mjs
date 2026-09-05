import { neon } from '@neondatabase/serverless';

const sql = neon('postgresql://neondb_owner:npg_uHRTvXQ2f4zJ@ep-misty-sky-aybucjjd-pooler.c-5.us-east-2.aws.neon.tech/neondb?sslmode=require');

try {
  const r = await sql`select version()`;
  console.log('CONNECT OK:', r[0].version.slice(0, 60));
  await sql`create table if not exists app_data (collection_name text primary key, data jsonb not null, updated_at timestamptz not null default now())`;
  const t = await sql`select table_name from information_schema.tables where table_schema='public'`;
  console.log('TABLES:', t.map(x => x.table_name).join(', '));
  // quick roundtrip test
  await sql`insert into app_data (collection_name, data) values ('__test', ${JSON.stringify({ ok: true, ts: Date.now() })}::jsonb) on conflict (collection_name) do update set data = excluded.data, updated_at = now()`;
  const back = await sql`select data from app_data where collection_name = '__test'`;
  console.log('ROUNDTRIP OK:', back[0].data);
  await sql`delete from app_data where collection_name = '__test'`;
  console.log('ALL TESTS PASSED');
} catch (e) {
  console.log('ERR:', e.message);
}
