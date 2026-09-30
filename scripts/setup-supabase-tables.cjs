// SETUP: scripts/supabase-schema.sql ko Supabase DB par khud run karta hai
// + maujooda 12 tables ka verify report deta hai.
// Pehle .env mein SUPABASE_DB_URL bharein (Dashboard -> Connect -> Session pooler),
// phir:  node scripts/setup-supabase-tables.cjs   (ya: npm run db:setup)
// Idempotent hai — dobara chalana safe; existing data nahi chhootta.
require('dotenv').config();
const fs = require('fs');
const path = require('path');

const KNOWN = ['students', 'teachers', 'classes', 'timetable', 'attendance',
  'marks', 'fees', 'fee_data', 'coordinators', 'assignments', 'app_settings'];
const URL_ = process.env.VITE_SUPABASE_URL;
const PUB = process.env.VITE_SUPABASE_PUBLISHABLE_KEY;
const SEC = process.env.SUPABASE_SECRET_KEY;
const DB_URL = process.env.SUPABASE_DB_URL;

// ---------- Part 1: REST verify (DDL ke baghair bhi chalta hai) ----------
async function verifyRest() {
  if (!URL_ || !PUB || URL_.includes('YOUR-')) {
    console.log('SKIP verify — .env mein VITE_SUPABASE_URL / keys nahi hain.');
    return;
  }
  console.log('=== REST VERIFY:', URL_, '===');
  const H = { apikey: SEC || PUB, Authorization: 'Bearer ' + (SEC || PUB), Prefer: 'count=exact', Range: '0-0' };
  let total = 0;
  for (const t of KNOWN) {
    try {
      const r = await fetch(`${URL_}/rest/v1/${t}?select=id`, { headers: H });
      const cr = r.headers.get('content-range') || '';
      const n = cr.split('/')[1] || '?';
      total += Number(n) || 0;
      console.log(`  ${t.padEnd(14)} ${r.status}  ${n} rows`);
    } catch (e) { console.log(`  ${t.padEnd(14)} ERR ${e.message}`); }
  }
  try {
    const r = await fetch(`${URL_}/rest/v1/records?select=collection_name`, { headers: H });
    const cr = r.headers.get('content-range') || '';
    console.log(`  ${'records'.padEnd(14)} ${r.status}  ${cr.split('/')[1] || '?'} rows (legacy mirror)`);
  } catch (e) { console.log('  records ERR ' + e.message); }
  console.log(`  11 app tables TOTAL: ${total} rows`);
}

// ---------- Part 2: SQL schema (SUPABASE_DB_URL chahiye) ----------
async function runSchema() {
  if (!DB_URL || DB_URL.includes('YOUR-') || DB_URL.includes('...')) {
    console.log('\nSKIP schema — .env mein SUPABASE_DB_URL nahi hai.');
    console.log('DDL chalane ke liye Dashboard -> Connect -> Session pooler string dalein,');
    console.log('warna scripts/supabase-schema.sql khud SQL Editor mein run karein.');
    return;
  }
  const { Client } = require('pg');
  const sql = fs.readFileSync(path.join(__dirname, 'supabase-schema.sql'), 'utf8');
  const client = new Client({ connectionString: DB_URL, ssl: { rejectUnauthorized: false } });
  await client.connect();
  try {
    await client.query(sql);
    console.log('SCHEMA OK — tables + trigger + realtime publication + RLS ready.');
  } finally { await client.end(); }
}

(async () => {
  await verifyRest();
  await runSchema();
  console.log('DONE');
})().catch((e) => { console.error('FAIL:', e.message || e); process.exit(1); });