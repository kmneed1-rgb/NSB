// ================================================================
// SUPABASE EDGE FUNCTION — admin-auth
// Supabase Auth users manage karti hai (IDs/passwords Dashboard ->
// Authentication -> Users mein dikhenge). Service-role key SIRF
// yahan aati hai (Deno.env) — browser mein kabhi nahi.
//
// Actions:
//   create         → auth.admin.createUser (existing ho to password+metadata update)
//   updatePassword → auth.admin.updateUserById (apna ya admin)
//   delete         → auth.admin.deleteUser (sirf admin)
//
// AuthZ:
//   - Bearer token (logged-in session) jiska app_metadata.role
//     principal/developer ho, ya
//   - session email admin allowlist (ADMIN_EMAILS) mein ho, ya
//   - updatePassword: session ka email TARGET email = apna password (self-service)
//
// Deploy: supabase functions deploy admin-auth
// ================================================================
import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const { action, email, password, role, linkId } = await req.json();
    if (!email || typeof email !== 'string') return json({ error: 'email required' }, 400);

    const targetEmail = email.trim().toLowerCase();

    const admin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    // ---------------- AuthZ ----------------
    const token = (req.headers.get('Authorization') || '').replace(/^Bearer\s+/i, '');
    const allowlist = (Deno.env.get('ADMIN_EMAILS') || 'ali@nsb1.com,dev@nsb1.com')
      .split(',').map(s => s.trim().toLowerCase()).filter(Boolean);

    let authorized = false;
    let sessionEmail = '';
    if (token) {
      const { data, error } = await admin.auth.getUser(token);
      const u = data?.user;
      if (!error && u) {
        sessionEmail = String(u.email || '').toLowerCase();
        const r = String(u.app_metadata?.role || '').toLowerCase();
        if (r === 'principal' || r === 'developer') authorized = true;
        else if (sessionEmail && allowlist.includes(sessionEmail)) authorized = true;
        // Self-service: apna hi password update kar raha ho
        else if (action === 'updatePassword' && sessionEmail === targetEmail) authorized = true;
      }
    }
    if (!authorized) {
      return json({ error: 'Not authorized — principal/developer session required.' }, 403);
    }

    // Scope: sirf 'create' (upsert) — updatePassword/delete client se allow nahi
    const ALLOWED_ROLES = ['teacher', 'coordinator', 'principal', 'developer'];
    if (action === 'create') {
      if (!password || typeof password !== 'string') return json({ error: 'password required' }, 400);
      const wantedRole = String(role || '').toLowerCase();
      // Students Auth se BAHAR hain — koi bhi non-staff role reject (defense in depth)
      if (!ALLOWED_ROLES.includes(wantedRole)) {
        return json({ error: `Auth role "${role}" allowed nahi hai. Sirf staff (teacher/coordinator/principal/developer) Auth mein rehte hain.` }, 400);
      }
      const meta = { role: wantedRole, linkId: linkId || null };

      const { data, error } = await admin.auth.admin.createUser({
        email: targetEmail,
        password,
        email_confirm: true, // dashboard par "Confirm email" OFF — user foran active
        app_metadata: meta,
      });
      if (!error) return json({ ok: true, id: data.user?.id, created: true });

      const code = (error as any).code || '';
      const msg = String(error.message || '');
      if (code === 'user_already_exists' || /already.*(registered|exists)/i.test(msg)) {
        const found = await findUserByEmail(admin, targetEmail);
        if (!found) return json({ error: msg || 'exists but lookup failed' }, 400);
        const { error: uerr } = await admin.auth.admin.updateUserById(found.id, {
          password,
          app_metadata: { ...(found.app_metadata || {}), ...meta },
        });
        if (uerr) return json({ error: uerr.message }, 400);
        return json({ ok: true, id: found.id, updated: true });
      }
      return json({ error: msg }, 400);
    }

    // ---------------- updatePassword ----------------
    if (action === 'updatePassword') {
      if (!password || typeof password !== 'string') return json({ error: 'password required' }, 400);
      const found = await findUserByEmail(admin, targetEmail);
      if (!found) return json({ error: 'User not found in Auth — pehle create karein (sync script).' }, 404);
      const { error: uerr } = await admin.auth.admin.updateUserById(found.id, { password });
      if (uerr) return json({ error: uerr.message }, 400);
      return json({ ok: true, updated: true });
    }

    // ---------------- delete ----------------
    if (action === 'delete') {
      const found = await findUserByEmail(admin, targetEmail);
      if (!found) return json({ ok: true, skipped: true });
      const { error: derr } = await admin.auth.admin.deleteUser(found.id);
      if (derr) return json({ error: derr.message }, 400);
      return json({ ok: true, deleted: true });
    }

    return json({ error: 'Unknown action' }, 400);
  } catch (e) {
    return json({ error: e?.message || 'Server error' }, 500);
  }
});

/** GoTrue admin API mein email-based direct lookup nahi — list + find (school scale ke liye enough). */
async function findUserByEmail(admin: ReturnType<typeof createClient>, email: string) {
  const { data, error } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
  if (error || !data?.users) return null;
  return data.users.find(u => String(u.email || '').toLowerCase() === email) || null;
}
