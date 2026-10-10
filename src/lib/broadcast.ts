/**
 * BROADCAST — Developer (admin) se ek role ko bheji jaane wali FULL-SCREEN alert.
 *
 * - Data `app_settings/global` row ke andar `broadcast` field mein rehti hai
 *   → existing realtime sync se SAB devices par foran pohanchti hai (naya table/SQL nahi).
 * - "Sirf ek dafa" — har user ke liye dekhe gaye broadcast ids localStorage mein
 *   (`acadamis_broadcast_seen_<userKey>`) mehfooz hoti hain.
 * - Send/stop bas `active` flag toggle karta hai (cloud sync automatic hoti hai).
 */
import { safeStorage } from './safeStorage';
import type { Role } from '../types';

export type BroadcastTarget = Role | 'all';

export interface BroadcastMessage {
  id: string;                 // 'bc_<ts>_<rand>' — naya send = naya id (dobara dikhe)
  active: boolean;            // stop karne par false
  target: BroadcastTarget;    // kis role ko dikhe ('all' = sab)
  title: string;
  message: string;
  sentByName?: string;        // kisne bheja (developer ka naam)
  createdAt: string;          // ISO
}

export const BROADCAST_AUDIENCE_OPTIONS: { value: BroadcastTarget; label: string }[] = [
  { value: 'principal', label: 'Principal' },
  { value: 'coordinator', label: 'Coordinator' },
  { value: 'teacher', label: 'Teachers' },
  { value: 'student', label: 'Students' },
  { value: 'all', label: 'Everyone (All)' },
];

function seenKey(userKey: string): string {
  return `acadamis_broadcast_seen_${userKey}`;
}

/** Is user ne kin broadcast ids dekh liye (acknowledged). */
export function getSeenBroadcastIds(userKey: string): string[] {
  try {
    const raw = safeStorage.getItem(seenKey(userKey));
    const list = raw ? JSON.parse(raw) : [];
    return Array.isArray(list) ? list.filter(x => typeof x === 'string') : [];
  } catch {
    return [];
  }
}

/** OK dabane par is broadcast id ko "dekh liya" mark karo (per user). */
export function markBroadcastSeen(userKey: string, id: string): void {
  if (!userKey || !id) return;
  const list = getSeenBroadcastIds(userKey);
  if (list.includes(id)) return;
  safeStorage.setItem(seenKey(userKey), JSON.stringify([...list, id].slice(-100)));
}

/** User ke role + audience target match karta hai? */
function targetMatches(target: BroadcastTarget | undefined, role: Role | '' | undefined): boolean {
  const t = target || 'all';
  if (t === 'all') return true;
  return t === (role || '');
}

/**
 * Kya is broadcast ko is user ko dikhana chahiye?
 * - active hona chahiye
 * - target role se match
 * - is user ne pehle na dekha ho (sirf ek dafa)
 */
export function shouldShowBroadcast(
  broadcast: BroadcastMessage | null | undefined,
  role: Role | '' | undefined,
  userKey: string
): boolean {
  if (!broadcast || !broadcast.active) return false;
  if (!broadcast.id) return false;
  if (!targetMatches(broadcast.target, role)) return false;
  return !getSeenBroadcastIds(userKey).includes(broadcast.id);
}
