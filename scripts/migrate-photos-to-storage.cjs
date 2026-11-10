// =============================================================
// PHOTOS -> SUPABASE STORAGE
// Base64 (`data:image/...`) profile photos ko Supabase Storage bucket
// (`profile-photos`) mein upload karta hai aur row ke andar URL rakh deta hai.
//
// Kyun? Base64 photos ne `students` table ka payload ~25 MB bana diya tha,
// jis se PostgREST select statement timeout ho raha tha (app offline fallback
// par chali jati thi).
//
// Chalane ka tareeqa:
//   node scripts/migrate-photos-to-storage.cjs            (asli migration)
//   DRY_RUN=1 node scripts/migrate-photos-to-storage.cjs  (sirf report)
//
// Idempotent: jo photo pehle se URL hai use chhoota nahi; dobara chalana safe.
// =============================================================
require('dotenv').config();

const SB_URL = (process.env.VITE_SUPABASE_URL || '').trim();
const SB_KEY = (process.env.SUPABASE_SECRET_KEY || '').trim();
const BUCKET = (process.env.PHOTO_BUCKET || 'profile-photos').trim();
const DRY_RUN = process.env.DRY_RUN === '1';

// Sirf woh tables jinke rows app load karti hai + jinme photos ho sakti hain.
const TABLES = ['students', 'teachers', 'coordinators', 'app_settings', 'classes'];

const DATA_URL_RE = /^data:(image\/[a-z0-9.+-]+);base64,([A-Za-z0-9+/=\s]+)$/i;

const AUTH_HEADERS = { apikey: SB_KEY, Authorization: `Bearer ${SB_KEY}` };

/** Network/Cloudflare/statement-timeout jaise transient errors par retry. */
async function fetchRetry(url, init, tries = 3) {
  let lastErr;
  for (let i = 0; i < tries; i++) {
    try {
      const res = await fetch(url, init);
      if (res.status >= 500) {
        lastErr = new Error(`${res.status} ${(await res.text()).slice(0, 160)}`);
      } else {
        return res;
      }
    } catch (e) {
      lastErr = e;
    }
    await new Promise((r) => setTimeout(r, 1200 * (i + 1)));
  }
  throw lastErr;
}

function extFor(mime) {
  const m = mime.toLowerCase();
  if (m.includes('webp')) return 'webp';
  if (m.includes('png')) return 'png';
  if (m.includes('jpeg') || m.includes('jpg')) return 'jpg';
  if (m.includes('gif')) return 'gif';
  if (m.includes('svg')) return 'svg';
  return 'img';
}

function safeSegment(s) {
  return String(s).replace(/[^a-zA-Z0-9._-]+/g, '_').slice(0, 80) || 'file';
}

function publicUrlFor(path) {
  return `${SB_URL}/storage/v1/object/public/${BUCKET}/${path}`;
}

async function ensureBucket() {
  const res = await fetch(`${SB_URL}/storage/v1/bucket/${BUCKET}`, { headers: AUTH_HEADERS });
  if (res.ok) return;
  const create = await fetch(`${SB_URL}/storage/v1/bucket`, {
    method: 'POST',
    headers: { ...AUTH_HEADERS, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      id: BUCKET,
      name: BUCKET,
      public: true,
      file_size_limit: 2097152,
      allowed_mime_types: ['image/webp', 'image/png', 'image/jpeg', 'image/gif'],
    }),
  });
  if (!create.ok) {
    throw new Error(`Bucket "${BUCKET}" create failed: ${create.status} ${(await create.text()).slice(0, 200)}`);
  }
  console.log(`Bucket "${BUCKET}" created (public).`);
}

async function listIds(table) {
  const ids = [];
  let offset = 0;
  const PAGE = 1000;
  while (true) {
    const res = await fetch(
      `${SB_URL}/rest/v1/${table}?select=id&order=id&offset=${offset}&limit=${PAGE}`,
      { headers: AUTH_HEADERS }
    );
    if (!res.ok) throw new Error(`${table} list failed: ${res.status} ${(await res.text()).slice(0, 200)}`);
    const batch = await res.json();
    for (const r of batch) ids.push(r.id);
    if (batch.length < PAGE) break;
    offset += PAGE;
  }
  return ids;
}

async function getRow(table, id) {
  const res = await fetch(
    `${SB_URL}/rest/v1/${table}?select=id,data&id=eq.${encodeURIComponent(id)}`,
    { headers: AUTH_HEADERS }
  );
  if (!res.ok) throw new Error(`${table}/${id} fetch failed: ${res.status}`);
  const rows = await res.json();
  return rows[0] || null;
}

async function uploadDataUrl(dataUrl, table, id, keyPath) {
  const m = dataUrl.match(DATA_URL_RE);
  if (!m) return null;
  const [, mime, b64] = m;
  const ext = extFor(mime);
  const name = keyPath.map(safeSegment).join('-') || 'photo';
  const path = `${table}/${safeSegment(id)}/${name}.${ext}`;
  if (DRY_RUN) return { url: publicUrlFor(path), bytes: Math.round((b64.length * 3) / 4) };

  const bytes = Buffer.from(b64.replace(/\s/g, ''), 'base64');
  const res = await fetchRetry(`${SB_URL}/storage/v1/object/${BUCKET}/${path}`, {
    method: 'POST',
    headers: {
      ...AUTH_HEADERS,
      'Content-Type': mime,
      'x-upsert': 'true',
      'cache-control': 'public, max-age=31536000',
    },
    body: bytes,
  });
  if (!res.ok) throw new Error(`upload ${path} failed: ${res.status} ${(await res.text()).slice(0, 200)}`);
  return { url: publicUrlFor(path), bytes: bytes.length };
}

/** data object ko mutate karta hai; har mili base64 photo ko URL se replace. */
async function migrateValue(node, table, id, keyPath, stats) {
  if (Array.isArray(node)) {
    for (let i = 0; i < node.length; i++) {
      const v = node[i];
      if (typeof v === 'string' && DATA_URL_RE.test(v)) {
        const out = await uploadDataUrl(v, table, id, [...keyPath, String(i)]);
        if (out) { node[i] = out.url; stats.count++; stats.bytes += out.bytes; }
      } else if (v && typeof v === 'object') {
        await migrateValue(v, table, id, [...keyPath, String(i)], stats);
      }
    }
    return;
  }
  if (!node || typeof node !== 'object') return;
  for (const key of Object.keys(node)) {
    const v = node[key];
    if (typeof v === 'string' && DATA_URL_RE.test(v)) {
      const out = await uploadDataUrl(v, table, id, [...keyPath, key]);
      if (out) { node[key] = out.url; stats.count++; stats.bytes += out.bytes; }
    } else if (v && typeof v === 'object') {
      await migrateValue(v, table, id, [...keyPath, key], stats);
    }
  }
}

async function patchRow(table, id, data) {
  if (DRY_RUN) return;
  const res = await fetchRetry(`${SB_URL}/rest/v1/${table}?id=eq.${encodeURIComponent(id)}`, {
    method: 'PATCH',
    headers: { ...AUTH_HEADERS, 'Content-Type': 'application/json', Prefer: 'return=minimal' },
    body: JSON.stringify({ data }),
  });
  if (!res.ok) throw new Error(`PATCH ${table}/${id} failed: ${res.status} ${(await res.text()).slice(0, 200)}`);
}

(async () => {
  if (!SB_URL || !SB_KEY) {
    console.error('Missing VITE_SUPABASE_URL / SUPABASE_SECRET_KEY in .env');
    process.exit(1);
  }
  console.log(`Project: ${SB_URL}`);
  console.log(`Bucket : ${BUCKET}${DRY_RUN ? '   (DRY RUN — kuch bhi write nahi hoga)' : ''}`);

  if (!DRY_RUN) await ensureBucket();

  const totals = { rows: 0, changed: 0, count: 0, bytes: 0 };

  for (const table of TABLES) {
    let ids;
    try {
      ids = await listIds(table);
    } catch (e) {
      console.warn(`SKIP ${table}: ${e.message}`);
      continue;
    }
    console.log(`\n${table}: ${ids.length} rows`);

    for (const id of ids) {
      totals.rows++;
      let row;
      try {
        row = await getRow(table, id);
      } catch (e) {
        console.warn(`  ! ${id}: ${e.message}`);
        continue;
      }
      if (!row) continue;

      let data = row.data;
      if (typeof data === 'string') {
        try { data = JSON.parse(data); } catch { data = null; }
      }
      if (!data || typeof data !== 'object') continue;

      const stats = { count: 0, bytes: 0 };
      try {
        await migrateValue(data, table, id, [], stats);
      } catch (e) {
        console.error(`  ! photo migrate failed ${id}: ${e.message}`);
        continue;
      }
      if (stats.count === 0) continue;

      totals.changed++;
      totals.count += stats.count;
      totals.bytes += stats.bytes;
      console.log(`  ${id}: ${stats.count} photo(s), ${(stats.bytes / 1024).toFixed(0)} KB -> Storage`);

      try {
        await patchRow(table, id, data);
      } catch (e) {
        console.error(`  ! PATCH failed ${id}: ${e.message}`);
      }
    }
  }

  console.log('\n================ SUMMARY ================');
  console.log(`Scanned rows      : ${totals.rows}`);
  console.log(`Rows updated      : ${totals.changed}`);
  console.log(`Photos migrated   : ${totals.count}`);
  console.log(`Payload moved     : ${(totals.bytes / 1024 / 1024).toFixed(2)} MB (base64 -> Storage)`);
  console.log(DRY_RUN ? 'DRY RUN complete — kuch change nahi hua.' : 'DONE — ab app ko reload karein.');
})().catch((e) => {
  console.error('FAIL:', e && e.message ? e.message : e);
  process.exit(1);
});
