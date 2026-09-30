// ================================================================
// scripts/sync-auth-users.cjs
// ---------------------------------------------------------------
// STAFF ko Supabase Auth mein users banata hai (ID/email + password
// Dashboard -> Authentication -> Users mein dikhte hain):
//   teacher, coordinator, principal, developer
//
// STUDENTS Auth se BAHAR hain (unka login sirf app ke record password se
// hota hai) — student loop default skip hai, `--include-students` se opt-in.
//
// - Idempotent: pehle se exist karta hai to SKIP (password reset NAHI)
// - app_metadata { role, linkId } backfill karta hai (edge function authz)
// - Email na ho to wahi synthetic identity jo app use karta hai:
//     staff → {id}@staff.nsb1.school
//
// Chalane ka tareeqa:
//   node scripts/sync-auth-users.cjs
//   node scripts/sync-auth-users.cjs --set-passwords      ← record passwords force-sync
//   node scripts/sync-auth-users.cjs --include-students   ← students bhi Auth mein (default NAHI)
// ================================================================
require('dotenv').config();

const url = process.env.VITE_SUPABASE_URL;
const key = process.env.SUPABASE_SECRET_KEY;
if (!url || !key) {
  console.error('Missing VITE_SUPABASE_URL / SUPABASE_SECRET_KEY in .env');
  process.exit(1);
}

const RESET_PASSWORDS = process.argv.includes('--set-passwords');
const INCLUDE_STUDENTS = process.argv.includes('--include-students');

const slug = (s) => String(s || '').toLowerCase().replace(/[^a-z0-9_-]/g, '');
const authEmailFor = (role, email, id) => {
  const e = String(email || '').trim().toLowerCase();
  if (e) return e;
  const s = slug(id) || 'user';
  return `${s}@staff.nsb1.school`;
};

const headers = { apikey: key, Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' };

async function listAllUsers() {
  const out = [];
  for (let page = 1; page <= 50; page++) {
    const r = await fetch(`${url}/auth/v1/admin/users?page=${page}&per_page=1000`, { headers });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(`listUsers failed: ${JSON.stringify(j)}`);
    const batch = j.users || [];
    out.push(...batch);
    if (batch.length < 1000) break;
  }
  return out;
}

async function loadTable(table) {
  const r = await fetch(`${url}/rest/v1/${table}?select=id,data`, {
    headers: { apikey: key, Authorization: `Bearer ${key}` },
  });
  if (!r.ok) throw new Error(`${table}: ${await r.text()}`);
  return r.json();
}

async function createUser(job) {
  const r = await fetch(`${url}/auth/v1/admin/users`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      email: job.email,
      password: job.password,
      email_confirm: true, // "Confirm email" OFF — user foran active
      app_metadata: { role: job.role, linkId: job.linkId },
    }),
  });
  if (r.ok) return { ok: true };
  const j = await r.json().catch(() => ({}));
  return { ok: false, error: j.msg || j.message || j.error_description || JSON.stringify(j) };
}

async function updateUserPatch(id, patch) {
  const r = await fetch(`${url}/auth/v1/admin/users/${id}`, {
    method: 'PUT',
    headers,
    body: JSON.stringify(patch),
  });
  if (r.ok) return { ok: true };
  const j = await r.json().catch(() => ({}));
  return { ok: false, error: j.msg || j.message || JSON.stringify(j) };
}


(async () => {
  console.log('Loading Auth users + app records...');
  const existing = await listAllUsers();
  const byEmail = new Map(existing.map(u => [String(u.email || '').toLowerCase(), u]));

  const [teachers, coordinators, students] = await Promise.all([
    loadTable('teachers'),
    loadTable('coordinators'),
    loadTable('students'),
  ]);
  console.log(`Auth users: ${existing.length} | teachers: ${teachers.length} | coordinators: ${coordinators.length} | students: ${students.length}`);

  const jobs = [];
  for (const row of teachers) {
    const d = row.data || {};
    jobs.push({ role: 'teacher', linkId: row.id, email: authEmailFor('teacher', d.email, row.id), password: d.password || 'nsb123' });
  }
  for (const row of coordinators) {
    const d = row.data || {};
    jobs.push({ role: 'coordinator', linkId: row.id, email: authEmailFor('coordinator', d.email, row.id), password: d.password || 'nsb123' });
  }
  for (const row of students) {
    const d = row.data || {};
    if (!INCLUDE_STUDENTS) continue; // students Auth se bahar (login sirf local record se)
    jobs.push({ role: 'student', linkId: row.id, email: authEmailFor('student', d.email, row.id), password: d.password || 'nsb123' });
  }
  // Bootstrap admins — edge function (admin-auth) ka authz in par depend karta hai.
  // NOTE: hardcoded dev login '6016' (4 char) Supabase min-6 policy mein fail hota
  // hai — Auth copy '60166016' (doubled) use hoti hai; Login.tsx tryAuthSession
  // wahi bhejta hai. Principal '111222' (6 char) theek hai.
  jobs.push({ role: 'principal', linkId: 'principal', email: 'ali@nsb1.com', password: process.env.SUPABASE_ADMIN_PASSWORD || '111222' });
  jobs.push({ role: 'developer', linkId: 'developer', email: 'dev@nsb1.com', password: process.env.SUPABASE_ADMIN_PASSWORD_DEV || '60166016' });

  let created = 0, updated = 0, passwordsSynced = 0, skipped = 0, failed = 0;

  for (const job of jobs) {
    if (!job.email || !job.password) { skipped++; continue; }
    const hit = byEmail.get(job.email.toLowerCase());

    if (!hit) {
      const res = await createUser(job);
      if (res.ok) {
        created++;
        console.log(`  + created  ${String(job.role).padEnd(11)} ${job.email}`);
      } else {
        failed++;
        console.warn(`  ! create failed  ${job.email}: ${res.error}`);
      }
      continue;
    }

    const meta = hit.app_metadata || {};
    let touched = false;

    if (String(meta.role || '') !== job.role || String(meta.linkId || '') !== String(job.linkId)) {
      const res = await updateUserPatch(hit.id, {
        app_metadata: { ...meta, role: job.role, linkId: job.linkId },
      });
      if (res.ok) { touched = true; console.log(`  ~ metadata ${job.role.padEnd(11)} ${job.email}`); }
      else { failed++; console.warn(`  ! metadata failed ${job.email}: ${res.error}`); }
    }

    if (RESET_PASSWORDS) {
      const res = await updateUserPatch(hit.id, { password: job.password });
      if (res.ok) { touched = true; passwordsSynced++; }
      else { failed++; console.warn(`  ! password failed ${job.email}: ${res.error}`); }
    }

    if (touched) updated++; else skipped++;
  }

  console.log('\n=== Supabase Auth sync summary ===');
  console.log(`created: ${created} | updated: ${updated} | unchanged: ${skipped} | failed: ${failed}` +
    (RESET_PASSWORDS ? ` | passwords forced: ${passwordsSynced}` : ''));
  if (!RESET_PASSWORDS) {
    console.log('Note: existing Auth passwords untouched. Force sync: node scripts/sync-auth-users.cjs --set-passwords');
  }
  if (!INCLUDE_STUDENTS) {
    console.log(`Students Auth se bahar rakhe gaye (${students.length} records skipped). Include karne ke liye: --include-students`);
  }
  console.log('Check: Supabase Dashboard -> Authentication -> Users');
  if (failed > 0) process.exitCode = 1;
})().catch(e => { console.error(e); process.exit(1); });
