/**
 * PROFILE PHOTO STORAGE — photos ko Supabase Storage bucket (`profile-photos`)
 * mein rakhta hai aur public URL return karta hai.
 *
 * Pehle photos base64 (`data:image/...`) ke taur par JSON rows ke andar save hoti
 * thin — is se `students` table ~25 MB ki ho gayi thi aur PostgREST load
 * statement-timeout par fail ho raha tha. Ab sirf URL save hota hai.
 *
 * Fallback: agar upload fail ho (offline / policy missing) to purani behaviour
 * ki tarah base64 hi return hota hai — app kabhi break nahi hoti.
 */
import { supabase, isSupabaseConfigured } from '../supabase';

export const PHOTO_BUCKET = 'profile-photos';

export type PhotoFolder = 'students' | 'teachers' | 'coordinators' | 'staff';

/** Kya yeh pehle se koi URL hai (base64 nahi)? */
export function isPhotoUrl(value?: string | null): boolean {
  return !!value && /^https?:\/\//i.test(value);
}

function extForMime(mime: string): string {
  const m = mime.toLowerCase();
  if (m.includes('webp')) return 'webp';
  if (m.includes('png')) return 'png';
  if (m.includes('jpeg') || m.includes('jpg')) return 'jpg';
  if (m.includes('gif')) return 'gif';
  return 'img';
}

function safeSegment(s: string): string {
  return String(s).replace(/[^a-zA-Z0-9._-]+/g, '_').slice(0, 80) || 'file';
}

/** `data:image/webp;base64,....` -> Blob (browser APIs, no network). */
export function dataUrlToBlob(dataUrl: string): Blob {
  const match = /^data:([^;,]+);base64,(.+)$/i.exec(dataUrl);
  if (!match) throw new Error('Invalid image data URL');
  const [, mime, b64] = match;
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return new Blob([bytes], { type: mime });
}

/**
 * Base64 photo ko Storage par upload karke public URL deta hai.
 * Kuch bhi ghalat ho to original dataUrl wapas (base64 fallback).
 */
export async function uploadPhotoDataUrl(
  dataUrl: string,
  folder: PhotoFolder = 'students',
  idHint?: string
): Promise<string> {
  if (!isSupabaseConfigured() || isPhotoUrl(dataUrl)) return dataUrl;
  try {
    // Storage policies sirf logged-in users ko upload dete hain — bina
    // Supabase Auth session ke request 403 hoti, is liye pehle check.
    const { data: sessionData } = await supabase.auth.getSession();
    if (!sessionData?.session) {
      console.warn('[Storage] login session nahi hai — photo base64 fallback (cloud upload nahi hua).');
      return dataUrl;
    }

    const blob = dataUrlToBlob(dataUrl);
    const ext = extForMime(blob.type);
    const name = `${safeSegment(idHint || 'photo')}-${Date.now()}.${ext}`;
    const path = `${folder}/${name}`;

    const { error } = await supabase.storage.from(PHOTO_BUCKET).upload(path, blob, {
      contentType: blob.type,
      upsert: true,
      cacheControl: '31536000',
    });
    if (error) throw error;

    const { data } = supabase.storage.from(PHOTO_BUCKET).getPublicUrl(path);
    if (!data?.publicUrl) throw new Error('public URL missing');
    return data.publicUrl;
  } catch (e: any) {
    console.warn('[Storage] photo upload failed — base64 fallback:', e?.message || e);
    return dataUrl;
  }
}
