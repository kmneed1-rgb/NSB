/**
 * GEO — location helpers for teacher self-attendance (geo-fenced).
 *
 * - haversineDistance: do lat/lng ke darmiyan fasla (meters).
 * - isWithinFence: kya user school ki set-location (radius) ke andar hai?
 * - getCurrentPosition: browser geolocation wrapper (Promise).
 *
 * Koi external library nahi — sab native browser APIs + pure math.
 */

export interface LatLng {
  lat: number;
  lng: number;
}

export interface GeoFence {
  enabled: boolean;
  lat: number;
  lng: number;
  radiusM: number;   // meters
}

const R_EARTH_M = 6371000; // Earth radius (meters)
const toRad = (deg: number) => (deg * Math.PI) / 180;

/** Do points ke darmiyan fasla meters mein (haversine formula). */
export function haversineDistance(a: LatLng, b: LatLng): number {
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return Math.round(2 * R_EARTH_M * Math.asin(Math.min(1, Math.sqrt(h))));
}

export interface FenceCheck {
  ok: boolean;
  distanceM: number;
  reason?: 'no_fence' | 'outside' | 'inside';
}

/**
 * Kya `here` school ki set-location ke andar hai?
 * - fence off / set nahi → { ok: true, reason: 'no_fence' } (geo enforce nahi).
 * - andar → { ok: true, reason: 'inside' }.
 * - bahar → { ok: false, reason: 'outside', distanceM }.
 */
export function isWithinFence(here: LatLng, fence?: GeoFence | null): FenceCheck {
  if (!fence || !fence.enabled) return { ok: true, distanceM: 0, reason: 'no_fence' };
  const school: LatLng = { lat: Number(fence.lat), lng: Number(fence.lng) };
  if (!Number.isFinite(school.lat) || !Number.isFinite(school.lng)) {
    return { ok: true, distanceM: 0, reason: 'no_fence' };
  }
  const distanceM = haversineDistance(here, school);
  const radius = Number(fence.radiusM) > 0 ? Number(fence.radiusM) : 100;
  if (distanceM <= radius) return { ok: true, distanceM, reason: 'inside' };
  return { ok: false, distanceM, reason: 'outside' };
}

export interface GeoPosition {
  lat: number;
  lng: number;
  accuracy: number;   // meters
}

/** Browser se current location (Promise). Error throw karta hai agar deny/timeout. */
export function getCurrentPosition(timeoutMs = 12000): Promise<GeoPosition> {
  return new Promise((resolve, reject) => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      reject(new Error('Is device par location support nahi.'));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        resolve({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          accuracy: pos.coords.accuracy || 0,
        });
      },
      (err) => {
        const msg =
          err.code === 1
            ? 'Location permission deny ho gayi. Browser settings mein location allow karein.'
            : err.code === 3
            ? 'Location timeout — dobara koshish karein (GPS/outdoor behtar).'
            : 'Location hasil nahi ho saki.';
        reject(new Error(msg));
      },
      { enableHighAccuracy: true, timeout: timeoutMs, maximumAge: 0 }
    );
  });
}
