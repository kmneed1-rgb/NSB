/**
 * SUPABASE SYNC LAYER — Firestore-style per-table backend:
 *
 * Har collection ki apni table hai (id text pk, data jsonb, updated_at):
 *   students, teachers, classes, timetable, attendance, marks,
 *   fees, fee_data, coordinators, assignments, app_settings
 *
 * - sbQueueWrite('students', id, data)  → students table upsert
 * - loadCollectionFromSupabase('fees')  → fees table select
 * - subscribeRecords()                  → SARI tables par ek realtime channel
 *
 * Data Neon/Firestore se migrate karne ke liye:
 * scripts/migrate-neon-to-supabase.cjs (records + sari tables dono fill karta hai)
 *
 * Cross-device sync WebSocket realtime (postgres_changes) se hota hai —
 * koi polling/heartbeat/quota nahi.
 *
 * OFFLINE-FIRST: har pending write/delete ek persistent OUTBOX
 * (`acadamis_sync_outbox`, localStorage) mein save hota hai — tab close/reload
 * par bhi nahi khota. Internet wapas aane par outbox Supabase push hota hai
 * aur local cache (acadamis_*) KABHI delete nahi hota (offline read ke liye).
 */
import { supabase, isSupabaseConfigured } from '../supabase';
import { safeStorage } from './safeStorage';
import type { RealtimeChannel } from '@supabase/supabase-js';

let supabaseHealthy = true;
let supabaseLastError: string | null = null;
export const isSupabaseHealthy = () => supabaseHealthy;
export const getSupabaseLastError = () => supabaseLastError;

/** App ki sari collections — har ek ki apni Supabase table hai. */
export const KNOWN_TABLES = [
  'students', 'teachers', 'classes', 'timetable', 'attendance',
  'marks', 'fees', 'fee_data', 'coordinators', 'assignments', 'app_settings',
] as const;

// --- PERSISTENT OFFLINE OUTBOX (localStorage) ---
// Queue sirf memory mein rahe to tab close/reload par offline writes kho jatein.
// Is liye har change `acadamis_sync_outbox` mein persist hota hai aur app start
// par wapas load hota hai (at-least-once). Upsert/delete idempotent hain →
// duplicate safe. Internet wapas aane par outbox apne aap Supabase chala jata hai.
const OUTBOX_KEY = 'acadamis_sync_outbox';
const pendingSet: { col: string; id: string; data: any }[] = [];
const pendingDel: { col: string; id: string }[] = [];
let sbTimer: any = null;
let persistTimer: any = null;
let flushInFlight = false;

function persistOutboxNow() {
  if (typeof window === 'undefined') return;
  try {
    if (pendingSet.length === 0 && pendingDel.length === 0) {
      safeStorage.removeItem(OUTBOX_KEY);
    } else {
      safeStorage.setItem(OUTBOX_KEY, JSON.stringify({ sets: pendingSet, dels: pendingDel }));
    }
  } catch (e) {
    console.warn('[Supabase] offline outbox persist failed:', e);
  }
}

function persistOutbox() {
  if (persistTimer) clearTimeout(persistTimer);
  persistTimer = setTimeout(persistOutboxNow, 300);
}

function hydrateOutbox() {
  try {
    const raw = safeStorage.getItem(OUTBOX_KEY);
    if (!raw || raw === 'undefined' || raw === 'null') return;
    const parsed = JSON.parse(raw);
    const sets: any[] = Array.isArray(parsed?.sets) ? parsed.sets : [];
    const dels: any[] = Array.isArray(parsed?.dels) ? parsed.dels : [];
    for (const s of sets) {
      if (!s || s.col === undefined || s.id === undefined) continue;
      const col = String(s.col), id = String(s.id);
      if (!pendingSet.some(p => p.col === col && String(p.id) === id)) {
        pendingSet.push({ col, id, data: s.data });
      }
    }
    for (const d of dels) {
      if (!d || d.col === undefined || d.id === undefined) continue;
      const col = String(d.col), id = String(d.id);
      if (!pendingDel.some(p => p.col === col && String(p.id) === id)) {
        pendingDel.push({ col, id });
      }
    }
    if (pendingSet.length > 0 || pendingDel.length > 0) {
      console.log(`[Supabase] offline outbox restored: ${pendingSet.length} write(s), ${pendingDel.length} delete(s)`);
      scheduleFlush(); // internet hai to foran push
    }
  } catch (e) {
    console.warn('[Supabase] offline outbox hydrate failed:', e);
    safeStorage.removeItem(OUTBOX_KEY);
  }
}

function scheduleFlush() {
  if (sbTimer) clearTimeout(sbTimer);
  sbTimer = setTimeout(() => { flushSupabase(); }, 900);
}

export function sbQueueWrite(col: string, id: string, data: any) {
  const sid = String(id);
  const existing = pendingSet.findIndex(p => p.col === col && String(p.id) === sid);
  if (existing >= 0) pendingSet[existing] = { col, id: sid, data }; // latest wins — duplicate nahi
  else pendingSet.push({ col, id: sid, data });
  const delIdx = pendingDel.findIndex(p => p.col === col && String(p.id) === sid);
  if (delIdx >= 0) pendingDel.splice(delIdx, 1); // delete ke baad dobara write = row wapas
  persistOutbox();
  scheduleFlush();
}

export function sbQueueDelete(col: string, id: string) {
  const sid = String(id);
  const setIdx = pendingSet.findIndex(p => p.col === col && String(p.id) === sid);
  if (setIdx >= 0) pendingSet.splice(setIdx, 1); // pending write tha — delete hi final hai
  if (!pendingDel.some(p => p.col === col && String(p.id) === sid)) pendingDel.push({ col, id: sid });
  persistOutbox();
  scheduleFlush();
}

/** Kitne changes abhi offline pending hain (banner/badge ke liye). */
export const getPendingCount = () => pendingSet.length + pendingDel.length;
export const hasPendingWrites = () => getPendingCount() > 0;

/** Row par koi pending offline change hai? (cloud apply karte waqt local rows protect) */
export function isRowPending(col: string, id: string): boolean {
  const sid = String(id);
  return (
    pendingSet.some(p => p.col === col && String(p.id) === sid) ||
    pendingDel.some(p => p.col === col && String(p.id) === sid)
  );
}

/**
 * Cloud list mein se pending rows hata kar unhein LOCAL (outbox) version se
 * replace karta hai — offline edit kabhi cloud ke stale copy se overwrite nahi hote.
 */
export function mergePendingRows(col: string, list: any[]): any[] {
  const src = list || [];
  if (!hasPendingWrites()) return src;
  const delIds = new Set(pendingDel.filter(p => p.col === col).map(p => String(p.id)));
  const writes = new Map<string, any>();
  for (const p of pendingSet) if (p.col === col) writes.set(String(p.id), p.data);
  if (delIds.size === 0 && writes.size === 0) return src;
  const out: any[] = [];
  for (const row of src) {
    const rid = String((row as any)?.id ?? '');
    if (delIds.has(rid) || writes.has(rid)) continue; // pending version neeche se aayega
    out.push(row);
  }
  for (const data of writes.values()) out.push(data);
  return out;
}

hydrateOutbox();

/** Pending queue ko foran flush karta hai. Success = true. Fail par data re-queue hota hai. */
export async function flushSupabase(): Promise<boolean> {
  if (flushInFlight) return true;
  if (pendingSet.length === 0 && pendingDel.length === 0) return true;
  flushInFlight = true;
  const sets = pendingSet.splice(0);
  const dels = pendingDel.splice(0);
  try {
    // Upserts — per-table groups (har collection ki apni table, onConflict: id)
    const byTable: Record<string, { id: string; data: any }[]> = {};
    for (const { col, id, data } of sets) {
      if (!byTable[col]) byTable[col] = [];
      byTable[col].push({ id: String(id), data: data === undefined ? null : data });
    }
    for (const [table, rows] of Object.entries(byTable)) {
      for (let i = 0; i < rows.length; i += 100) {
        const chunk = rows.slice(i, i + 100);
        const { error } = await supabase
          .from(table)
          .upsert(chunk, { onConflict: 'id' });
        if (error) throw error;
      }
    }
    // Deletes — per-table batched (ek request mein saari ids)
    const delsByTable: Record<string, string[]> = {};
    for (const { col, id } of dels) {
      if (!delsByTable[col]) delsByTable[col] = [];
      delsByTable[col].push(String(id));
    }
    for (const [table, ids] of Object.entries(delsByTable)) {
      const { error } = await supabase
        .from(table)
        .delete()
        .in('id', ids);
      if (error) throw error;
    }
    supabaseHealthy = true;
    supabaseLastError = null;
    persistOutboxNow(); // flush success → outbox ka latest state disk par
    return true;
  } catch (e: any) {
    supabaseHealthy = false;
    supabaseLastError = e?.message || 'Supabase write failed';
    console.warn('[Supabase] flush failed (data re-queued):', supabaseLastError);
    // Re-queue — lekin is dauran queue mein aa chuke naye (same row) versions KO hi rehne dein
    const liveSet = new Set(pendingSet.map(p => `${p.col} ${p.id}`));
    const liveDel = new Set(pendingDel.map(p => `${p.col} ${p.id}`));
    pendingSet.unshift(...sets.filter(s => !liveSet.has(`${s.col} ${s.id}`)));
    pendingDel.unshift(...dels.filter(d => !liveDel.has(`${d.col} ${d.id}`)));
    persistOutbox();
    return false;
  } finally {
    flushInFlight = false;
  }
}

// Flush pending writes before tab close/hide + outbox ko foran disk par likho,
// aur internet wapas aate hi offline outbox apne aap Supabase push ho jaye.
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => { flushSupabase(); });
  window.addEventListener('pagehide', () => { persistOutboxNow(); flushSupabase(); });
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') { persistOutboxNow(); flushSupabase(); }
  });
  window.addEventListener('online', () => {
    console.log('[Supabase] network online — flushing offline outbox');
    flushSupabase();
  });
}

export type SupabaseLoadResult = { ok: boolean; tables: Record<string, any[]> };

/**
 * Sari known tables load karke collection ke hisaab se group karta hai (App init + realtime merge).
 *
 * ok = false → network/config problem; tables ghalat ya khali ho sakte hain —
 * caller ko LOCAL data ko overwrite NAHI karna chahiye (offline fallback).
 * ok = true + khali list → cloud sach mein khali hai (local data se seed/push karo).
 */
export async function loadAllFromSupabase(): Promise<SupabaseLoadResult> {
  const out: Record<string, any[]> = {};
  if (!isSupabaseConfigured()) {
    supabaseHealthy = false;
    supabaseLastError = 'Supabase keys not configured (.env check karein)';
    return { ok: false, tables: out };
  }
  let ok = true;
  try {
    await Promise.all(KNOWN_TABLES.map(async (table) => {
      const { data, error } = await supabase.from(table).select('id,data');
      if (error) {
        if ((error as any)?.code === 'PGRST205') {
          console.warn(`[Supabase] table "${table}" missing — SQL Editor mein scripts/supabase-schema.sql chalayein.`);
          out[table] = [];
        } else {
          // Network/server failure — data ghalat ya incomplete ho sakta hai.
          console.warn(`[Supabase] load "${table}" failed:`, (error as any).message);
          out[table] = [];
          ok = false;
        }
        return;
      }
      out[table] = (data || []).map((r: any) => {
        let rowData = r.data;
        if (typeof rowData === 'string') { try { rowData = JSON.parse(rowData); } catch { rowData = {}; } }
        rowData = rowData || {};
        return { ...rowData, id: rowData.id !== undefined ? rowData.id : r.id };
      });
    }));
    supabaseHealthy = ok;
    supabaseLastError = ok ? null : 'Supabase load failed (partial/network)';
    return { ok, tables: out };
  } catch (e: any) {
    supabaseHealthy = false;
    supabaseLastError = e?.message || 'Supabase load failed';
    console.warn('[Supabase] loadAllFromSupabase failed:', supabaseLastError);
    return { ok: false, tables: out };
  }
}

/** Kisi ek collection (= apni table) ka data load karo (null agar fail). */
export async function loadCollectionFromSupabase(col: string): Promise<any[] | null> {
  try {
    const { data, error } = await supabase
      .from(col)
      .select('id,data');
    if (error) throw error;
    return (data || []).map((r: any) => {
      let rowData = r.data;
      if (typeof rowData === 'string') { try { rowData = JSON.parse(rowData); } catch { rowData = {}; } }
      rowData = rowData || {};
      return { ...rowData, id: rowData.id !== undefined ? rowData.id : r.id } as any;
    });
  } catch (e: any) {
    supabaseHealthy = false;
    supabaseLastError = e?.message || 'Supabase load failed';
    console.warn('[Supabase] loadCollectionFromSupabase failed:', supabaseLastError);
    return null;
  }
}

/**
 * ONE realtime channel — SARI tables par koi bhi INSERT/UPDATE/DELETE
 * sab connected devices ko push hota hai (WebSocket). Firebase ki 20s polling
 * / heartbeat ka koi sahara nahi chahiye.
 */
let channelSeq = 0;
export function subscribeRecords(onEvent: (payload: any) => void): () => void {
  // Har call ka APNA channel — same naam par supabase-js channel reuse karta hai
  // aur pehli subscribe ke baad naye .on() callbacks par throw karta hai.
  const channel: RealtimeChannel = supabase.channel(`nsb1-school-${++channelSeq}`);
  for (const table of KNOWN_TABLES) {
    channel.on(
      'postgres_changes',
      { event: '*', schema: 'public', table } as any,
      (payload: any) => {
        try { onEvent({ ...payload, table }); } catch (e) { console.warn('[Supabase] realtime handler error:', e); }
      }
    );
  }
  channel.subscribe((status) => {
    if (status === 'SUBSCRIBED') console.log('[Sync:RT] Supabase realtime channel subscribed (all tables)');
    else if (status === 'CHANNEL_ERROR') console.warn('[Sync:RT] Supabase realtime channel error');
  });
  return () => { supabase.removeChannel(channel).catch(() => {}); };
}