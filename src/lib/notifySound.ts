/**
 * NOTIFY SOUND — notification ka "tune" (Web Audio API se generate hota hai,
 * koi mp3/wav asset nahi chahiye).
 *
 * Browsers autoplay block karte hain jab tak user ne page par click na kiya ho,
 * is liye App.tsx ek dafa `unlockAudioOnFirstGesture()` call karta hai.
 *
 * On/off: pehle device-level override (localStorage) dekha jata hai, warna
 * `appSettings.notifySound` (global default).
 */
import { safeStorage } from './safeStorage';

const SOUND_KEY = 'acadamis_notify_sound';
const VIBRATE_KEY = 'acadamis_notify_vibrate';

type Ctx = AudioContext | null;
let audioCtx: Ctx = null;
let unlockBound = false;

function getCtx(): Ctx {
  if (typeof window === 'undefined') return null;
  try {
    const Ctor = (window as any).AudioContext || (window as any).webkitAudioContext;
    if (!Ctor) return null;
    if (!audioCtx) audioCtx = new Ctor();
    if (audioCtx && audioCtx.state === 'suspended') audioCtx.resume().catch(() => {});
    return audioCtx;
  } catch {
    return null;
  }
}

/** Ek dafa user ke pehle touch/click par audio context unlock karo. */
export function unlockAudioOnFirstGesture(): void {
  if (typeof window === 'undefined' || unlockBound) return;
  unlockBound = true;
  const unlock = () => {
    getCtx();
    window.removeEventListener('pointerdown', unlock);
    window.removeEventListener('keydown', unlock);
    window.removeEventListener('touchstart', unlock);
  };
  window.addEventListener('pointerdown', unlock, { once: false });
  window.addEventListener('keydown', unlock, { once: false });
  window.addEventListener('touchstart', unlock, { once: false });
}

/** Ek note bajata hai (freq Hz, duration ms, delay ms, type, gain). */
function beep(freq: number, durationMs: number, delayMs = 0, type: OscillatorType = 'sine', peak = 0.16) {
  const ctx = getCtx();
  if (!ctx) return;
  const start = ctx.currentTime + delayMs / 1000;
  const end = start + durationMs / 1000;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, start);
  gain.gain.setValueAtTime(0.0001, start);
  gain.gain.exponentialRampToValueAtTime(peak, start + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.0001, end);
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(start);
  osc.stop(end + 0.03);
}

/** Halka 2-note ding — normal notification ke liye. */
export function playNotifyTone(): void {
  if (!toneEnabledFor(true)) return;
  beep(988, 130, 0, 'sine', 0.14);      // B5
  beep(1319, 220, 110, 'sine', 0.12);   // E6
}

/** School bell — period bell / class start ke liye (3 chhoti rings). */
export function playBellTone(): void {
  if (!toneEnabledFor(true)) return;
  [0, 300, 600].forEach(d => {
    beep(880, 180, d, 'triangle', 0.18);
    beep(1320, 120, d + 40, 'sine', 0.10);
  });
}

/** Mobile vibration (device support ho to). */
export function vibrateDevice(pattern: number[] = [120, 60, 120]): void {
  if (!vibrationEnabledFor(true)) return;
  try {
    (navigator as any)?.vibrate?.(pattern);
  } catch { /* ignore */ }
}

/** Device-level override check karta hai; override na ho to `defaultOn`. */
export function toneEnabledFor(defaultOn: boolean): boolean {
  const raw = safeStorage.getItem(SOUND_KEY);
  if (raw === 'true') return true;
  if (raw === 'false') return false;
  return defaultOn !== false;
}

export function isSoundOverridden(): boolean {
  const raw = safeStorage.getItem(SOUND_KEY);
  return raw === 'true' || raw === 'false';
}

export function setToneEnabled(on: boolean): void {
  safeStorage.setItem(SOUND_KEY, on ? 'true' : 'false');
  if (typeof window !== 'undefined') window.dispatchEvent(new Event('acadamis_notify_sound_changed'));
}

export function vibrationEnabledFor(defaultOn: boolean): boolean {
  const raw = safeStorage.getItem(VIBRATE_KEY);
  if (raw === 'true') return true;
  if (raw === 'false') return false;
  return defaultOn !== false;
}

export function setVibrationEnabled(on: boolean): void {
  safeStorage.setItem(VIBRATE_KEY, on ? 'true' : 'false');
  if (typeof window !== 'undefined') window.dispatchEvent(new Event('acadamis_notify_sound_changed'));
}
