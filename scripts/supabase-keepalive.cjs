// Supabase free-tier keepalive — ek lightweight REST ping jo project activity reset karti hai
// (Supabase free projects 1 hafte inactivity par pause ho jate hain).
// Run: node scripts/supabase-keepalive.cjs          (one-shot ping — GitHub Actions / Task Scheduler)
//     npm run keepalive
// Env: VITE_SUPABASE_URL (ya SUPABASE_URL) + VITE_SUPABASE_PUBLISHABLE_KEY (ya SUPABASE_PUBLISHABLE_KEY)
// dotenv optional hai — GitHub Actions par node_modules install nahi hota, env vars workflow se aate hain.
try { require('dotenv').config(); } catch (_) { /* CI: ignore */ }

const url = (process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '').replace(/\/+$/, '');
const key =
  process.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
  process.env.SUPABASE_PUBLISHABLE_KEY ||
  process.env.SUPABASE_ANON_KEY;

if (!url || !key) {
  console.error('Missing Supabase URL/key — set VITE_SUPABASE_URL + VITE_SUPABASE_PUBLISHABLE_KEY (local .env) ya SUPABASE_URL + SUPABASE_PUBLISHABLE_KEY (GitHub secrets)');
  process.exit(1);
}

const MAX_ATTEMPTS = 3;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Ek tiny read request — table ping karta hai; table na mile (PGRST205/404) toh
// REST root fallback (wahan bhi activity count hoti hai).
async function pingOnce() {
  let res;
  try {
    res = await fetch(url + '/rest/v1/students?select=id&limit=1', {
      headers: { apikey: key, Authorization: 'Bearer ' + key },
    });
  } catch (e) {
    return { ok: false, detail: 'network ERR: ' + e.message };
  }
  const body = await res.text();
  if (res.ok) return { ok: true, detail: 'students read ' + res.status };
  // Table missing? Root pe fallback — wahan bhi activity count hoti hai.
  if (res.status === 404 || body.includes('PGRST205')) {
    try {
      const r2 = await fetch(url + '/rest/v1/', { headers: { apikey: key, Authorization: 'Bearer ' + key } });
      return { ok: r2.ok, detail: 'rest root fallback ' + r2.status };
    } catch (e) {
      return { ok: false, detail: 'root fallback ERR: ' + e.message };
    }
  }
  return { ok: false, detail: 'HTTP ' + res.status + ' ' + body.slice(0, 160) };
}

(async () => {
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    const ts = new Date().toISOString();
    const { ok, detail } = await pingOnce();
    if (ok) {
      console.log('[' + ts + '] keepalive OK — Supabase pinged (' + detail + ')');
      process.exitCode = 0; // graceful exit — abrupt process.exit() Windows/libuv par crash karta hai
      return;
    }
    console.warn('[' + ts + '] keepalive attempt ' + attempt + '/' + MAX_ATTEMPTS + ' FAIL: ' + detail);
    if (attempt < MAX_ATTEMPTS) await sleep(attempt * 5000); // 5s, 10s backoff
  }
  console.error('[' + new Date().toISOString() + '] keepalive FAILED after ' + MAX_ATTEMPTS + ' attempts');
  process.exitCode = 1;
})();
