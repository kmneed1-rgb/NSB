// ================================================================
// scripts/remove-student-auth-users.cjs
// ---------------------------------------------------------------
// Student Auth users delete karta hai — students Supabase Auth se BAHAR hain
// (unka login sirf app ke record password se hota hai; Auth mein sirf
// teacher / coordinator / principal / developer rehte hain).
//
//   node scripts/remove-student-auth-users.cjs              → DRY RUN (kuch delete nahi)
//   node scripts/remove-student-auth-users.cjs --confirm     → asli delete
//
// Filter: app_metadata.role === 'student'  YA  email '@students.nsb1.school' par khatam
// ================================================================
require('dotenv').config();

const url = process.env.VITE_SUPABASE_URL;
const key = process.env.SUPABASE_SECRET_KEY;
if (!url || !key) {
  console.error('Missing VITE_SUPABASE_URL / SUPABASE_SECRET_KEY in .env');
  process.exit(1);
}

const CONFIRM = process.argv.includes('--confirm');
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

const isStudentUser = (u) => {
  const role = String((u.app_metadata || {}).role || '').toLowerCase();
  const email = String(u.email || '').toLowerCase();
  return role === 'student' || email.endsWith('@students.nsb1.school');
};

async function deleteUser(id) {
  const r = await fetch(`${url}/auth/v1/admin/users/${id}`, { method: 'DELETE', headers });
  if (r.ok) return { ok: true };
  const j = await r.json().catch(() => ({}));
  return { ok: false, error: j.msg || j.message || JSON.stringify(j) };
}

(async () => {
  console.log('Loading Auth users...');
  const users = await listAllUsers();
  const students = users.filter(isStudentUser);
  const keep = users.filter((u) => !isStudentUser(u));

  const keepRoles = {};
  for (const u of keep) {
    const r = String((u.app_metadata || {}).role || 'none');
    keepRoles[r] = (keepRoles[r] || 0) + 1;
  }
  const stuRoles = {};
  for (const u of students) {
    const r = String((u.app_metadata || {}).role || 'none');
    stuRoles[r] = (stuRoles[r] || 0) + 1;
  }

  console.log(`TOTAL      : ${users.length}`);
  console.log(`TO DELETE  : ${students.length}   roles=${JSON.stringify(stuRoles)}`);
  console.log(`KEEP       : ${keep.length}   roles=${JSON.stringify(keepRoles)}`);
  console.log(`sample del : ${students.slice(0, 5).map((u) => `${u.email}( ${(u.app_metadata || {}).role || '?'} )`).join(', ')}`);

  if (!CONFIRM) {
    console.log('\nDRY RUN — kuch delete nahi hua.');
    console.log('Asli delete ke liye: node scripts/remove-student-auth-users.cjs --confirm');
    return;
  }

  let done = 0, failed = 0;
  const CONCURRENCY = 5;
  for (let i = 0; i < students.length; i += CONCURRENCY) {
    const batch = students.slice(i, i + CONCURRENCY);
    const res = await Promise.all(batch.map((u) => deleteUser(u.id)));
    res.forEach((r, idx) => {
      if (r.ok) done++;
      else { failed++; console.warn(`  ! delete failed ${batch[idx].email}: ${r.error}`); }
    });
    console.log(`  deleted ${done}/${students.length}${failed ? ` (failed ${failed})` : ''}`);
  }

  const after = await listAllUsers();
  const afterRoles = {};
  for (const u of after) {
    const r = String((u.app_metadata || {}).role || 'none');
    afterRoles[r] = (afterRoles[r] || 0) + 1;
  }
  console.log('\n=== Student Auth cleanup summary ===');
  console.log(`deleted: ${done} | failed: ${failed}`);
  console.log(`Auth users ab: ${after.length}   roles=${JSON.stringify(afterRoles)}`);
  console.log(`student users : ${after.filter(isStudentUser).length} (0 hona chahiye)`);
  if (failed > 0) process.exitCode = 1;
})().catch((e) => { console.error(e); process.exit(1); });