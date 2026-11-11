/**
 * ADMISSION APPLICATIONS — landing page form ka storage layer.
 *
 * - Local-first: har application pehle localStorage mein save hoti hai.
 * - Cloud: Supabase ke legacy `records` table mein `collection_name = 'admissions'`
 *   ke saath upsert hoti hai (idempotent, naya table/schema chahiye nahi).
 * - Network fail ho to bhi application local copy ke saath success milti hai;
 *   principal dashboard local + cloud dono ko merge karke dikhata hai.
 */
import { supabase, isSupabaseConfigured } from '../supabase';
import { safeStorage } from './safeStorage';
import type { AdmissionApplication, AdmissionApplicationInput, AdmissionStatus } from '../types';

export const ADMISSIONS_STORAGE_KEY = 'nsb_admission_applications';
export const ADMISSIONS_COLLECTION = 'admissions';

const MAX_LOCAL_APPLICATIONS = 500;
const CLOUD_TIMEOUT_MS = 10000;

/** Network hang par form ko indefinite "Submitting..." se bachata hai. */
function withTimeout<T>(thenable: PromiseLike<T>, ms = CLOUD_TIMEOUT_MS): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('Cloud request timed out')), ms);
    Promise.resolve(thenable).then(
      value => {
        clearTimeout(timer);
        resolve(value);
      },
      error => {
        clearTimeout(timer);
        reject(error);
      }
    );
  });
}

function normalize(raw: unknown): AdmissionApplication | null {
  if (!raw || typeof raw !== 'object') return null;
  const a = raw as Partial<AdmissionApplication>;
  if (!a.id || !a.studentName) return null;
  return {
    id: String(a.id),
    applicationNo: String(a.applicationNo || a.id),
    studentName: String(a.studentName || ''),
    dob: String(a.dob || ''),
    gender: String(a.gender || ''),
    bformNo: String(a.bformNo || ''),
    bloodGroup: String(a.bloodGroup || ''),
    nationality: String(a.nationality || ''),
    religion: String(a.religion || ''),
    studentPhone: String(a.studentPhone || ''),
    photo: a.photo ? String(a.photo) : undefined,
    grade: String(a.grade || ''),
    sectionPreference: String(a.sectionPreference || ''),
    session: String(a.session || ''),
    category: String(a.category || ''),
    academySubjects: String(a.academySubjects || ''),
    previousSchool: String(a.previousSchool || ''),
    previousClass: String(a.previousClass || ''),
    lastResult: String(a.lastResult || ''),
    transferCertificate: String(a.transferCertificate || ''),
    fatherName: String(a.fatherName || ''),
    motherName: String(a.motherName || ''),
    guardianName: String(a.guardianName || ''),
    relationship: String(a.relationship || ''),
    parentPhone: String(a.parentPhone || ''),
    alternatePhone: String(a.alternatePhone || ''),
    parentEmail: String(a.parentEmail || ''),
    parentCnic: String(a.parentCnic || ''),
    occupation: String(a.occupation || ''),
    address: String(a.address || ''),
    city: String(a.city || ''),
    emergencyName: String(a.emergencyName || ''),
    emergencyPhone: String(a.emergencyPhone || ''),
    emergencyRelation: String(a.emergencyRelation || ''),
    medicalConditions: String(a.medicalConditions || ''),
    transportRequired: String(a.transportRequired || ''),
    pickupArea: String(a.pickupArea || ''),
    siblingAtSchool: String(a.siblingAtSchool || ''),
    siblingNames: String(a.siblingNames || ''),
    hearAboutUs: String(a.hearAboutUs || ''),
    notes: String(a.notes || ''),
    consent: Boolean(a.consent),
    status: (['pending', 'approved', 'rejected', 'waitlisted'].includes(String(a.status))
      ? a.status
      : 'pending') as AdmissionStatus,
    submittedAt: String(a.submittedAt || new Date().toISOString()),
    reviewedAt: a.reviewedAt ? String(a.reviewedAt) : undefined,
    reviewNote: a.reviewNote ? String(a.reviewNote) : undefined,
  };
}

export function loadLocalAdmissionApplications(): AdmissionApplication[] {
  try {
    const raw = safeStorage.getItem(ADMISSIONS_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    const list = Array.isArray(parsed) ? parsed : [];
    return list.map(normalize).filter((x): x is AdmissionApplication => Boolean(x));
  } catch {
    return [];
  }
}

export function saveLocalAdmissionApplications(list: AdmissionApplication[]): void {
  const trimmed = [...list]
    .sort((a, b) => String(b.submittedAt).localeCompare(String(a.submittedAt)))
    .slice(0, MAX_LOCAL_APPLICATIONS);
  safeStorage.setItem(ADMISSIONS_STORAGE_KEY, JSON.stringify(trimmed));
}

/** Dedupe by id; newest version (submitted/reviewed) jeet jata hai. */
export function mergeAdmissionApplications(...lists: AdmissionApplication[][]): AdmissionApplication[] {
  const map = new Map<string, AdmissionApplication>();
  for (const list of lists) {
    for (const app of list) {
      const existing = map.get(app.id);
      if (!existing) {
        map.set(app.id, app);
        continue;
      }
      const existingTime = Date.parse(existing.reviewedAt || existing.submittedAt) || 0;
      const incomingTime = Date.parse(app.reviewedAt || app.submittedAt) || 0;
      if (incomingTime >= existingTime) map.set(app.id, app);
    }
  }
  return [...map.values()].sort(
    (a, b) => (Date.parse(b.submittedAt) || 0) - (Date.parse(a.submittedAt) || 0)
  );
}

export function createApplicationNumber(date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  const rand = String(Math.floor(1000 + Math.random() * 9000));
  return `NSB-ADM-${y}${m}${d}-${rand}`;
}

/** Local save + best-effort cloud upsert. Kabhi throw nahi karta. */
export async function submitAdmissionApplication(
  input: AdmissionApplicationInput
): Promise<{ application: AdmissionApplication; cloudSynced: boolean; error?: string }> {
  const now = new Date();
  const application: AdmissionApplication = {
    ...input,
    id: `adm_${now.getTime()}_${Math.random().toString(36).slice(2, 8)}`,
    applicationNo: createApplicationNumber(now),
    status: 'pending',
    submittedAt: now.toISOString(),
  };

  const local = loadLocalAdmissionApplications();
  saveLocalAdmissionApplications([application, ...local]);

  if (!isSupabaseConfigured()) return { application, cloudSynced: false, error: 'Cloud not configured' };

  try {
    const { error } = await withTimeout(
      supabase
        .from('records')
        .upsert(
          {
            collection_name: ADMISSIONS_COLLECTION,
            record_id: application.id,
            data: application,
          },
          { onConflict: 'collection_name,record_id' }
        )
    );
    if (error) return { application, cloudSynced: false, error: error.message };
    return { application, cloudSynced: true };
  } catch (e: any) {
    return { application, cloudSynced: false, error: e?.message || String(e) };
  }
}

/** Cloud se saari applications (principal dashboard ke liye). */
export async function fetchCloudAdmissionApplications(): Promise<AdmissionApplication[]> {
  if (!isSupabaseConfigured()) return [];
  const { data, error } = await withTimeout(
    supabase
      .from('records')
      .select('data')
      .eq('collection_name', ADMISSIONS_COLLECTION)
  );
  if (error) throw new Error(error.message);
  return (data || [])
    .map((row: any) => normalize(row?.data))
    .filter((x): x is AdmissionApplication => Boolean(x));
}

/** Status/review update — local + cloud dono. */
export async function updateAdmissionApplication(
  application: AdmissionApplication
): Promise<{ cloudSynced: boolean; error?: string }> {
  const local = loadLocalAdmissionApplications();
  const exists = local.some(a => a.id === application.id);
  saveLocalAdmissionApplications(
    exists ? local.map(a => (a.id === application.id ? application : a)) : [application, ...local]
  );

  if (!isSupabaseConfigured()) return { cloudSynced: false, error: 'Cloud not configured' };

  try {
    const { error } = await withTimeout(
      supabase
        .from('records')
        .upsert(
          {
            collection_name: ADMISSIONS_COLLECTION,
            record_id: application.id,
            data: application,
          },
          { onConflict: 'collection_name,record_id' }
        )
    );
    if (error) return { cloudSynced: false, error: error.message };
    return { cloudSynced: true };
  } catch (e: any) {
    return { cloudSynced: false, error: e?.message || String(e) };
  }
}

/** Realtime: cloud mein koi bhi admission change aaye to callback. */
export function subscribeAdmissionApplications(onChange: () => void): () => void {
  if (!isSupabaseConfigured()) return () => {};
  const channel = supabase
    .channel('nsb-admissions-realtime')
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'records', filter: `collection_name=eq.${ADMISSIONS_COLLECTION}` },
      () => onChange()
    )
    .subscribe();
  return () => {
    try {
      supabase.removeChannel(channel);
    } catch {
      /* ignore */
    }
  };
}
