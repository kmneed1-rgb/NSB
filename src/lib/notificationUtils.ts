/**
 * NOTIFICATIONS — cross-device (Supabase) + per-user read state + device tone.
 *
 * Fixes (pehle localStorage-only tha, is liye doosre device par kuch nahi aata tha):
 *  1. Har notification `app_settings` table ka apna row hai (id = `notif_<ts>_<rand>`)
 *     → existing realtime channel se SAB devices par pohanchti hai (naya table/SQL nahi).
 *  2. Read state per-user: `readBy: ['teacher:<id>', 'principal', …]`.
 *  3. "Clear" sirf apne view se hataata hai (per-user clearedAt) — doosron ka feed safe.
 *  4. `dedupeKey` se duplicate period-bell notifications nahi bante.
 *  5. `createdAt` ISO par sorting + 30 din baad auto-prune (cloud rows bhi).
 *  6. `filterNotificationsForUser()` — teacher/student ko sirf apni notifications.
 */
import { safeStorage } from './safeStorage';
import { sbQueueWrite, sbQueueDelete, loadCollectionFromSupabase } from './supabaseSync';
import type { Role } from '../types';

export type NotificationType =
  | 'timetable_created'
  | 'timetable_updated'
  | 'timetable_deleted'
  | 'period_bell'
  | 'fee_due'
  | 'attendance_alert'
  | 'attendance_complete'
  | 'salary_paid'
  | 'staff_attendance';

export interface PortalNotification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  timestamp: string;            // display string (legacy + naya dono)
  createdAt?: string;           // ISO — sorting / pruning ke liye
  teacherId?: string;           // Target specific teacher
  classId?: string;             // Target specific class (for students)
  role?: 'all' | 'teacher' | 'student' | 'principal' | 'coordinator';
  isUnread?: boolean;           // legacy flag (naye items readBy use karte hain)
  readBy?: string[];            // kis-kis user ne padh li
  dedupeKey?: string;           // same key wali notification duplicate nahi banti
  origin?: string;              // banane wali device id (apne tone ko suppress karta hai)
  sound?: 'bell' | 'ding' | 'none';
}

export interface NotifContext {
  role?: Role | 'developer' | '';
  userId?: string;
  teacherId?: string;
  classId?: string;
}

const LOCAL_KEY = 'acadamis_notifications';
const PUSHED_KEY = 'acadamis_notif_pushed';
const DEVICE_KEY = 'acadamis_device_id';
const CLEAR_PREFIX = 'acadamis_notif_cleared_';
const ROW_PREFIX = 'notif_';
const KEEP_MS = 30 * 24 * 60 * 60 * 1000;   // 30 din
const MAX_ITEMS = 200;

// ---------- small helpers ----------
const uuid = () => Math.random().toString(36).slice(2, 10);

const parseTime = (n: PortalNotification): number => {
  const iso = n.createdAt ? Date.parse(n.createdAt) : NaN;
  if (Number.isFinite(iso)) return iso;
  const legacy = n.timestamp ? Date.parse(n.timestamp) : NaN;
  return Number.isFinite(legacy) ? legacy : 0;
};

const sortNewestFirst = (list: PortalNotification[]) =>
  [...list].sort((a, b) => parseTime(b) - parseTime(a));

/** Is device ki unique id (tone suppression ke liye). */
export function getDeviceId(): string {
  let id = safeStorage.getItem(DEVICE_KEY);
  if (!id) {
    id = 'dev_' + uuid() + uuid();
    safeStorage.setItem(DEVICE_KEY, id);
  }
  return id;
}

/** Session se per-user key ('teacher:<id>' / 'principal' / 'student:<id>'). */
export function getUserKey(session?: { role?: string; id?: string } | null): string {
  const role = session?.role || '';
  const id = session?.id || '';
  if (role === 'teacher' && id) return `teacher:${id}`;
  if (role === 'student' && id) return `student:${id}`;
  if (role) return role;
  return 'guest';
}

// ---------- local cache ----------
export const getNotifications = (): PortalNotification[] => {
  try {
    const saved = safeStorage.getItem(LOCAL_KEY);
    const list: PortalNotification[] = saved ? JSON.parse(saved) : [];
    return sortNewestFirst(Array.isArray(list) ? list : []);
  } catch (e) {
    return [];
  }
};

function writeCache(list: PortalNotification[]): PortalNotification[] {
  const clean = sortNewestFirst(list).slice(0, MAX_ITEMS);
  safeStorage.setItem(LOCAL_KEY, JSON.stringify(clean));
  return clean;
}

export const notifyListeners = (): void => {
  if (typeof window !== 'undefined') window.dispatchEvent(new Event('acadamis_new_notification'));
};

/** Legacy API — sirf local cache likhta hai (cloud sync alag se hota hai). */
export const saveNotifications = (notifications: PortalNotification[]) => {
  writeCache(notifications);
  notifyListeners();
};

/** Newest-first sort + purane items drop (30 din / 200 items). */
export function pruneNotifications(list: PortalNotification[]): {
  kept: PortalNotification[];
  droppedIds: string[];
} {
  const now = Date.now();
  const kept: PortalNotification[] = [];
  const droppedIds: string[] = [];
  sortNewestFirst(list).forEach(n => {
    const t = parseTime(n);
    const tooOld = t > 0 && now - t > KEEP_MS;
    if (tooOld || kept.length >= MAX_ITEMS) droppedIds.push(n.id);
    else kept.push(n);
  });
  return { kept, droppedIds };
}

/**
 * Nayi notification — local cache + Supabase row (dono).
 * Same `dedupeKey` wali notification pehle se ho to nayi banane ke bajaye wohi return hoti hai.
 */
export const addNotification = (
  notif: Omit<PortalNotification, 'id' | 'timestamp' | 'isUnread'> & { id?: string; timestamp?: string }
): PortalNotification => {
  const current = getNotifications();

  if (notif.dedupeKey) {
    const existing = current.find(n => n.dedupeKey && n.dedupeKey === notif.dedupeKey);
    if (existing) return existing;
  }

  const created: PortalNotification = {
    ...notif,
    id: notif.id || ROW_PREFIX + Date.now() + '_' + uuid(),
    createdAt: notif.createdAt || new Date().toISOString(),
    timestamp: notif.timestamp || new Date().toLocaleString(),
    isUnread: true,
    readBy: [],
    origin: notif.origin || getDeviceId(),
  };

  writeCache([created, ...current]);
  sbQueueWrite('app_settings', created.id, created);
  markPushed(created.id);
  notifyListeners();
  return created;
};

// ---------- push bookkeeping (sirf naye rows cloud par jate hain) ----------
function readPushed(): string[] {
  try {
    const raw = safeStorage.getItem(PUSHED_KEY);
    const list = raw ? JSON.parse(raw) : [];
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}

function markPushed(id: string) {
  const list = readPushed();
  if (!list.includes(id)) safeStorage.setItem(PUSHED_KEY, JSON.stringify([...list, id].slice(-400)));
}

/** Cloud (`app_settings` table) se sirf notification rows nikaalta hai. */
export async function loadNotificationsFromCloud(): Promise<PortalNotification[]> {
  const rows = await loadCollectionFromSupabase('app_settings');
  if (!rows) return [];
  return rows
    .filter((r: any) => String(r?.id || '').startsWith(ROW_PREFIX) && r?.title)
    .map((r: any) => ({ ...r, id: String(r.id) }) as PortalNotification);
}

/**
 * Realtime reload ke rows ko local cache mein merge karta hai.
 * Returns: naye items (tone ke liye) aur purane dropped ids (cloud se delete karne ke liye).
 */
export function absorbNotificationsFromRows(rows: any[]): {
  added: PortalNotification[];
  droppedIds: string[];
} {
  const remote: PortalNotification[] = (rows || [])
    .filter((r: any) => String(r?.id || '').startsWith(ROW_PREFIX) && r?.title)
    .map((r: any) => ({ ...r, id: String(r.id) }) as PortalNotification);

  const local = getNotifications();
  const byId = new Map<string, PortalNotification>();
  local.forEach(n => byId.set(n.id, n));
  const added: PortalNotification[] = [];
  remote.forEach(r => {
    if (!byId.has(r.id)) added.push(r);
    byId.set(r.id, { ...byId.get(r.id), ...r });   // cloud jeetta hai (readBy/share hui state)
  });

  const { kept, droppedIds } = pruneNotifications([...byId.values()]);
  writeCache(kept);
  if (added.length > 0) notifyListeners();
  return { added: sortNewestFirst(added), droppedIds };
}

/** Local notifications ko cloud par bhejo (jo abhi tak nahi bheji gayi). */
export async function pushNotificationsToCloud(force = false): Promise<void> {
  const local = getNotifications();
  const pushed = readPushed();
  const toPush = force ? local : local.filter(n => !pushed.includes(n.id));
  toPush.forEach(n => {
    sbQueueWrite('app_settings', n.id, n);
    markPushed(n.id);
  });
}

/** Purane notification rows cloud se delete karo (table saaf rahe). */
export function deleteCloudNotificationRows(ids: string[]): void {
  ids.filter(id => id.startsWith(ROW_PREFIX)).forEach(id => sbQueueDelete('app_settings', id));
}

/** Ek dafa boot par: cloud se load + merge + local ko upload. */
export async function startNotificationSync(): Promise<{ added: PortalNotification[] }> {
  const remote = await loadNotificationsFromCloud();
  const local = getNotifications();
  const byId = new Map<string, PortalNotification>();
  local.forEach(n => byId.set(n.id, n));
  const added: PortalNotification[] = [];
  remote.forEach(r => {
    if (!byId.has(r.id)) added.push(r);
    byId.set(r.id, { ...byId.get(r.id), ...r });
  });

  const { kept, droppedIds } = pruneNotifications([...byId.values()]);
  writeCache(kept);
  deleteCloudNotificationRows(droppedIds);
  await pushNotificationsToCloud();
  if (added.length > 0 || kept.length !== local.length) notifyListeners();
  return { added: sortNewestFirst(added) };
}

// ---------- read state (per-user) ----------
export function isUnreadFor(n: PortalNotification, userKey: string): boolean {
  if (Array.isArray(n.readBy)) return !n.readBy.includes(userKey);
  return n.isUnread !== false;
}

function updateNotification(id: string, patch: Partial<PortalNotification>): void {
  const list = getNotifications();
  let changed: PortalNotification | null = null;
  const next = list.map(n => {
    if (n.id !== id) return n;
    changed = { ...n, ...patch };
    return changed;
  });
  if (!changed) return;
  writeCache(next);
  sbQueueWrite('app_settings', id, changed as PortalNotification);   // row update → dusre devices par bhi read state
  markPushed(id);
  notifyListeners();
}

/** Ek notification ko is user ke liye read karo. */
export function markNotificationRead(id: string, userKey: string): void {
  const n = getNotifications().find(x => x.id === id);
  if (!n) return;
  const readBy = Array.from(new Set([...(n.readBy || []), userKey]));
  updateNotification(id, { readBy, isUnread: false });
}

/** Sirf isi user ke liye (ids optional) read mark karo. */
export function markAllReadForUser(userKey: string, ids?: string[]): void {
  const list = getNotifications();
  const targets = ids ? new Set(ids) : null;
  let touched = false;
  const next = list.map(n => {
    if (targets && !targets.has(n.id)) return n;
    if (!isUnreadFor(n, userKey)) return n;
    touched = true;
    const updated: PortalNotification = {
      ...n,
      readBy: Array.from(new Set([...(n.readBy || []), userKey])),
      isUnread: false,
    };
    sbQueueWrite('app_settings', n.id, updated);
    markPushed(n.id);
    return updated;
  });
  if (!touched) return;
  writeCache(next);
  notifyListeners();
}

// ---------- per-user "clear" (view-only, history safe) ----------
export function clearNotificationsForUser(userKey: string): void {
  safeStorage.setItem(CLEAR_PREFIX + userKey, new Date().toISOString());
  notifyListeners();
}

export function clearedAtFor(userKey: string): number {
  const raw = safeStorage.getItem(CLEAR_PREFIX + userKey);
  const t = raw ? Date.parse(raw) : NaN;
  return Number.isFinite(t) ? t : 0;
}

/** Clear ke baad wali notifications hi dikhti hain (client-side view filter). */
export function visibleForUser(list: PortalNotification[], userKey: string): PortalNotification[] {
  const cleared = clearedAtFor(userKey);
  if (!cleared) return list;
  return (list || []).filter(n => parseTime(n) > cleared);
}

// ---------- role / target filtering (bug fix: sabki notifications dikh rahi thi) ----------
export function filterNotificationsForUser(list: PortalNotification[], ctx: NotifContext): PortalNotification[] {
  const role = ctx.role || '';
  return (list || []).filter(n => {
    const target = n.role || 'all';
    if (role === 'principal' || role === 'coordinator') {
      return target === 'all' || target === 'principal' || target === 'coordinator';
    }
    if (role === 'teacher') {
      if (!(target === 'all' || target === 'teacher')) return false;
      const mine = ctx.teacherId || ctx.userId || '';
      return !n.teacherId || n.teacherId === mine;
    }
    if (role === 'student') {
      if (!(target === 'all' || target === 'student')) return false;
      return !n.classId || n.classId === (ctx.classId || '');
    }
    return target === 'all';
  });
}

/** Bell ke liye ek hi call: role filter + is user ka clear-view. */
export function notificationsForUser(
  list: PortalNotification[],
  ctx: NotifContext,
  userKey: string
): PortalNotification[] {
  return visibleForUser(filterNotificationsForUser(list, ctx), userKey);
}

export function countUnreadFor(list: PortalNotification[], userKey: string): number {
  return list.filter(n => isUnreadFor(n, userKey)).length;
}

// ---------- display helper ----------
export function notifEmoji(type: NotificationType | string): string {
  switch (type) {
    case 'period_bell': return '🔔';
    case 'fee_due': return '💰';
    case 'salary_paid': return '💵';
    case 'attendance_alert': return '⚠️';
    case 'attendance_complete': return '✅';
    case 'staff_attendance': return '🗓️';
    default: return '📅';
  }
}


