#!/usr/bin/env node
/**
 * DEPLOY SCRIPT — `admin-auth` edge function ko Supabase par deploy karta hai.
 *
 *   npm run auth:deploy                        # token .env se parhta hai
 *   npm run auth:deploy -- --from-clipboard    # token clipboard se uthata hai (copy kar lein)
 *   npm run auth:deploy -- --save-login        # token ko ~/.supabase mein bhi save kar deta hai
 *   npm run auth:deploy -- --no-verify         # deploy ke baad health-check skip
 *   npm run auth:deploy -- --function foo      # doosra function deploy karne ke liye
 *
 * Token kahan se aata hai (pehla jo mile):
 *   1) SUPABASE_ACCESS_TOKEN env var
 *   2) .env file:  SUPABASE_ACCESS_TOKEN="sbp_..."   <-- VS Code editor mein paste karein
 *   3) clipboard   --from-clipboard                  <-- Dashboard se Copy kar lein
 *   4) ~/.supabase/access-token                      <-- `npx supabase login` se bana hua
 *
 * Kyun ye script? PowerShell mein `sbp_...` token paste karte waqt quoting/special chars par
 * error aata hai — ye script token khud .env se parhti hai aur CLI ko Node ke through chalati
 * hai, is liye token kabhi shell command mein nahi jaata.
 */
'use strict';

const { spawnSync } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const ENV_PATH = path.join(ROOT, '.env');
const LOG_PATH = path.join(ROOT, 'deploy-auth-out.txt');

const argv = process.argv.slice(2);
const hasFlag = (f) => argv.includes(f);
const argOf = (f, fallback) => {
  const i = argv.indexOf(f);
  return i >= 0 && argv[i + 1] ? argv[i + 1] : fallback;
};

/** .env ko bina kisi dependency ke parhta hai (quote/space tolerant). */
function readEnvFile(p) {
  const out = {};
  if (!fs.existsSync(p)) return out;
  for (const line of fs.readFileSync(p, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/);
    if (!m) continue;
    let v = m[2].trim();
    if (v.length > 1 && ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'")))) {
      v = v.slice(1, -1);
    }
    out[m[1]] = v.trim();
  }
  return out;
}

/** Token ko sanitize karta hai — paste ki galtiyan (quotes, "Bearer ", spaces) yahan saaf. */
function cleanToken(raw) {
  let t = String(raw || '').trim().replace(/^Bearer\s+/i, '').trim();
  if (t.length > 1 && ((t.startsWith('"') && t.endsWith('"')) || (t.startsWith("'") && t.endsWith("'")))) {
    t = t.slice(1, -1).trim();
  }
  return t;
}

/** Token clipboard se parhta hai — Dashboard par "Copy" kiya ho to paste karne ki zaroorat nahi. */
function readClipboardToken() {
  try {
    const res = spawnSync('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', 'Get-Clipboard -Raw'], {
      encoding: 'utf8',
      windowsHide: true,
    });
    return cleanToken(res.stdout || '');
  } catch {
    return '';
  }
}

/** cmd.exe ke liye ek argument quote karta hai (shell:true ke baghair, safely). */
function quoteArg(a) {
  return /[\s&^|<>()",]/.test(a) ? '"' + a.replace(/"/g, '') + '"' : a;
}

const env = readEnvFile(ENV_PATH);
const envToken = cleanToken(process.env.SUPABASE_ACCESS_TOKEN);
const fileToken = cleanToken(env.SUPABASE_ACCESS_TOKEN);
/** Token file — macOS/Linux par `npx supabase login` isi ko likhta hai. */
const savedTokenPaths = [
  path.join(os.homedir(), '.supabase', 'access-token'),
  path.join(os.homedir(), '.config', 'supabase', 'access-token'),
];
const savedToken = savedTokenPaths.reduce(
  (acc, p) => acc || (fs.existsSync(p) ? cleanToken(fs.readFileSync(p, 'utf8')) : ''),
  ''
);
/** Windows par login file mein nahi, Windows Credential Manager mein jata hai (cmdkey se pata chalta hai). */
const hasCredStoreLogin = () => {
  if (process.platform !== 'win32') return false;
  try {
    const r = spawnSync('cmdkey', ['/list'], { encoding: 'utf8', windowsHide: true });
    return /supabase/i.test((r.stdout || '') + (r.stderr || ''));
  } catch {
    return false;
  }
};
const clipToken = hasFlag('--from-clipboard') ? readClipboardToken() : '';
const token = envToken || fileToken || clipToken;
const tokenSource = envToken ? 'env var' : (fileToken ? '.env' : (clipToken ? 'clipboard' : ''));

const projectRef = argOf('--project-ref', '') ||
  (String(env.VITE_SUPABASE_URL || '').match(/https:\/\/([a-z0-9-]+)\.supabase\.co/i) || [])[1] || '';
const fnName = argOf('--function', 'admin-auth');
const baseUrl = String(env.VITE_SUPABASE_URL || '').replace(/\/+$/, '');
const pubKey = String(env.VITE_SUPABASE_PUBLISHABLE_KEY || '').trim();
const adminEmails = String(env.SUPABASE_ADMIN_EMAILS || '').trim();

const log = [];
const say = (s) => { log.push(s); console.log(s); };

/** Log/output mein token kabhi plaintext na aaye. */
const redact = (s) => (token ? String(s).split(token).join('sbp_***HIDDEN***') : String(s));

/** CLI command chalata hai; output log mein jama karta hai. */
function runCli(args, label, { required = true } = {}) {
  const cmd = ['npx.cmd', 'supabase', ...args].map(quoteArg).join(' ');
  say('> ' + label + ':  ' + redact(cmd));
  const res = spawnSync('cmd.exe', ['/d', '/s', '/c', cmd], {
    cwd: ROOT,
    env: { ...process.env, ...(token ? { SUPABASE_ACCESS_TOKEN: token } : {}) },
    encoding: 'utf8',
    windowsHide: true,
  });
  const out = redact((res.stdout || '') + (res.stderr || ''));
  if (out.trim()) say(out.replace(/\s+$/, ''));
  if (res.status !== 0 && required) {
    fs.writeFileSync(LOG_PATH, log.join('\n') + '\n');
    say('');
    say('X  ' + label + ' fail hui (exit ' + res.status + '). Poora log: ' + LOG_PATH);
    if (/401|Unauthorized|Invalid.*token|invalid.*jwt/i.test(out)) {
      say('   -> Token ghalat / expire / revoke ho chuka hai. Dashboard se naya token banayein.');
    } else if (/403|permission/i.test(out)) {
      say('   -> Token ke paas permission nahi. Scoped token ho to "Edge Functions (Read-write)" grant karein.');
    }
    process.exit(res.status || 1);
  }
  return out;
}

/** Token file na mile to CLI khud logged-in hai ya nahi — ye probe batata hai (ground truth). */
function cliSavedLoginWorks() {
  const out = runCli(['projects', 'list'], 'saved-login check (bina token)', { required: false });
  if (!out.trim()) return false;
  if (/Access token not provided|not logged in|401|Unauthorized|Invalid.*token/i.test(out)) return false;
  return true;
}

say('=== admin-auth DEPLOY ===');
say('Function : ' + fnName);
say('Project  : ' + (projectRef || '(missing!)'));
say('Token    : ' + (token
  ? 'mila (' + tokenSource + ', ' + token.slice(0, 8) + '...' + token.slice(-4) + ')'
  : (savedToken ? 'nahi mila — CLI ka saved login (access-token file) use hoga' : 'nahi mila — CLI ka saved login check kiya jayega')));
say('');

if (!projectRef) {
  say('X  Project ref nahi mila. .env mein VITE_SUPABASE_URL set karein ya --project-ref dein.');
  process.exit(2);
}

if (token && !/^sbp_[A-Za-z0-9_-]{20,}$/.test(token)) {
  say('X  Token ka format ghalat lagta hai (sbp_ se start ho kar ~40 chars hone chahiye).');
  say('   Dashboard -> Account -> Access Tokens -> "Generate new token" -> copy -> .env mein paste.');
  process.exit(2);
}

if (!token && !savedToken) {
  // Windows par `supabase login` token Credential Manager mein rakhta hai (file nahi banti) —
  // is liye pehle wahan dekho, warna CLI se seedha confirm karo.
  if (hasCredStoreLogin() || cliSavedLoginWorks()) {
    say('OK  Token ki zaroorat nahi — CLI ka saved login mil gaya, usi se deploy hoga.');
    say('');
  } else {
    say('-- Token dene ka tareeqa (editor ke through):');
    say('   1) VS Code mein ".env" file kholein');
    say('   2) SUPABASE_ACCESS_TOKEN="" line ke andar apna token paste karein  ->  "sbp_xxxx..."');
    say('   3) File save karein (Ctrl+S), phir yahan chalayein:  npm run auth:deploy');
    say('   (Token: Dashboard -> Account -> Access Tokens -> Generate new token -> "Never expire")');
    say('   Asaan tareeqa: token copy karein (clipboard mein ho), phir chalayein:');
    say('     npm run auth:deploy -- --from-clipboard --save-login');
    say('   Ya ek dafa terminal mein:  npx supabase login --token sbp_xxxx');
    process.exit(3);
  }
}

/** Deploy ke baad health-check: bina session call 400/401/403 = function live + auth guard kaam kar raha. */
async function verify() {
  if (!baseUrl || !pubKey) {
    say('-- Verify skip: VITE_SUPABASE_URL / VITE_SUPABASE_PUBLISHABLE_KEY .env mein nahi mile.');
    return;
  }
  const url = baseUrl + '/functions/v1/' + fnName;
  for (let i = 1; i <= 3; i++) {
    try {
      const r = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', apikey: pubKey },
        body: JSON.stringify({ action: 'health' }),
      });
      if ([400, 401, 403].includes(r.status)) {
        say('OK  Function live hai — bina session call par status ' + r.status +
            ' (= auth guard kaam kar raha hai). ' + url);
        return;
      }
      if (r.status === 404) {
        say('... propagation ka intezar — attempt ' + i + '/3 par status 404');
      } else {
        say('!  Health-check status ' + r.status + ': ' + String(await r.text()).slice(0, 200));
        return;
      }
    } catch (e) {
      say('!  Health-check network error: ' + (e && e.message ? e.message : e));
      return;
    }
    await new Promise((res) => setTimeout(res, 4000));
  }
  say('!  3 attempts ke baad bhi 404 — thodi der baad dobara check karein.');
}

(async () => {
  if (hasFlag('--save-login')) {
    runCli(['login', '--token', token], 'token ko ~/.supabase mein save', { required: false });
  }

  if (adminEmails && !hasFlag('--skip-secrets')) {
    runCli(['secrets', 'set', 'ADMIN_EMAILS=' + adminEmails, '--project-ref', projectRef],
      'ADMIN_EMAILS secret (best-effort)', { required: false });
  }

  const deployOut = runCli(
    ['functions', 'deploy', fnName, '--project-ref', projectRef,
      ...(hasFlag('--no-verify-jwt') ? ['--no-verify-jwt'] : [])],
    'functions deploy'
  );

  if (/Docker is not running/i.test(deployOut)) {
    say('(note: "Docker is not running" warning harmless hai — sirf local serve/build ke liye hoti hai.)');
  }

  if (!hasFlag('--no-verify')) await verify();

  say('');
  say('HO GAYA - Dashboard -> Edge Functions mein "' + fnName + '" aur Authentication -> Users mein users.');
  fs.writeFileSync(LOG_PATH, log.join('\n') + '\n');
})();
