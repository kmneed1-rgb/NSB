/**
 * AUTH ADMIN — Supabase Auth users (IDs/passwords) manage karne ka browser client.
 *
 * - Asli kaam `admin-auth` edge function karta hai (service-role key SIRF function
 *   ke andar) — browser sirf apna session token bhejta hai.
 * - Aapki settings: "Confirm email" OFF (user foran active) + Signups OFF (sirf
 *   admin banata hai) → is liye `auth.admin.createUser` yahin se hota hai.
 * - Result → Dashboard -> Authentication -> Users mein ID (email) + user dikhta hai
 *   (password hashed — wahan plaintext kabhi show nahi hota).
 * - SCOPE: sirf STAFF (teacher / coordinator). **Students Auth se BAHAR hain** —
 *   unka login app ke record password se hota hai, is liye unke Auth users nahi bante.
 * - Offline/failure → false; caller apna local record sync chalta rakhe.
 */
import { supabase } from '../supabase';

export type AuthRole = 'teacher' | 'coordinator';

/**
 * Staff ka Auth email: record mein email hai to wahi, warna synthetic
 * `{id}@staff.nsb1.school` — wahi identity jo login aur migration script
 * (scripts/sync-auth-users.cjs) use karte hain (match hona zaroori hai).
 */
export const authEmailFor = (
  role: AuthRole | 'principal' | 'developer',
  email: string | undefined | null,
  id: string | number | undefined | null
): string => {
  const e = String(email || '').trim().toLowerCase();
  if (e) return e;
  const slug = String(id || '').toLowerCase().replace(/[^a-z0-9_-]/g, '') || 'user';
  return `${slug}@staff.nsb1.school`;
};

type AdminAction = 'create' | 'updatePassword' | 'delete';

async function callAdminAuth(action: AdminAction, payload: Record<string, any>): Promise<boolean> {
  try {
    const base = (import.meta.env.VITE_SUPABASE_URL as string) || '';
    if (!base) return false;

    const { data, error } = await supabase.auth.getSession();
    const token = data.session?.access_token;
    if (error || !token) {
      console.warn(`[AuthAdmin] ${action} skipped — no Auth session (principal/developer login zaroori hai)`);
      return false;
    }

    const res = await fetch(`${base}/functions/v1/admin-auth`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        apikey: (import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string) || '',
      },
      body: JSON.stringify({ action, ...payload }),
    });

    if (!res.ok) {
      const body = await res.json().catch(() => ({} as any));
      console.warn(`[AuthAdmin] ${action} failed (${res.status}):`, body?.error || res.statusText);
      return false;
    }
    return true;
  } catch (e) {
    console.warn(`[AuthAdmin] ${action} network error:`, e);
    return false;
  }
}

/**
 * Auth user create — ya existing ho to password + role metadata update (upsert).
 * Sirf principal/developer session chahiye.
 */
export const syncAuthAccount = (p: {
  email: string;
  password: string;
  role: AuthRole | string;
  linkId: string | number;
}): Promise<boolean> => callAdminAuth('create', p);

/**
 * Password update — edge function session owner ko APNE email par allow karta hai
 * (teacher khud apna badal sakta hai), warna principal/developer.
 */
export const updateAuthPassword = (p: { email: string; password: string }): Promise<boolean> =>
  callAdminAuth('updatePassword', p);

/** Auth user delete — sirf principal/developer. */
export const deleteAuthUser = (email: string): Promise<boolean> =>
  callAdminAuth('delete', { email });
