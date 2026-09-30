import { AppSettings, Role } from '../types';

export const DEFAULT_APP_SETTINGS: AppSettings = {
  absentTemplate: "Greetings, Respected Parent! We noticed that your child {student_name} (Roll: {roll_number}) has been marked ABSENT on date {date}. Kindly clarify the reason or contact the school office. Principal.",
  feeTemplate: "Dear parent, your child {name}'s fee for {month} is {amount} which is due on {date}. NSB 1 Academy.",
  resultTemplate: "Greetings, Respected Parent! Result of {student_name} (Roll: {roll_number}, {class_name}) for {exam_name}:\n{subjects}\nTotal: {total_obtained}/{total_max} ({percentage}%). Status: {status}.\n- NSB 1 Academy.",
  whatsAppAutoFee: true,
  whatsAppAutoAbsence: true,
  whatsAppAutoResult: false,
  autoWhatsAppRedirect: true,
  extraPeriods: {},
  deletedPeriods: {},
  periodColors: {},
  enablePaperGenerator: true,
  enableTeacherSalary: true,
  geminiApiKey: '',
  portalEnabled: true,
  subscriptionExpiry: '',
  loginControl: { student: true, teacher: true, coordinator: true, principal: true },
};

/** Role-wise login switches ke liye role keys (developer included nahi — uska login always ON). */
export const LOGIN_CONTROL_ROLES = ['student', 'teacher', 'coordinator', 'principal'] as const;
export type LoginControlRole = (typeof LOGIN_CONTROL_ROLES)[number];
export const LOGIN_CONTROL_LABELS: Record<LoginControlRole, string> = {
  student: 'Student Login',
  teacher: 'Teacher Login',
  coordinator: 'Coordinator Login',
  principal: 'Principal Login',
};

export function withAppControlDefaults(s?: Partial<AppSettings> | null): AppSettings {
  const merged = { ...DEFAULT_APP_SETTINGS, ...(s || {}) };
  return {
    ...merged,
    extraPeriods: merged.extraPeriods || {},
    deletedPeriods: merged.deletedPeriods || {},
    periodColors: merged.periodColors || {},
    enablePaperGenerator: merged.enablePaperGenerator !== false,
    enableTeacherSalary: merged.enableTeacherSalary !== false,
    geminiApiKey: merged.geminiApiKey || '',
    portalEnabled: merged.portalEnabled !== false,
    subscriptionExpiry: merged.subscriptionExpiry || '',
    // Role-wise login switches: sirf `false` band karta hai, baqi sab ON
    loginControl: {
      student: merged.loginControl?.student !== false,
      teacher: merged.loginControl?.teacher !== false,
      coordinator: merged.loginControl?.coordinator !== false,
      principal: merged.loginControl?.principal !== false,
    },
  };
}

export function isPaperGeneratorEnabled(settings: AppSettings): boolean {
  return settings.enablePaperGenerator !== false;
}

export function isTeacherSalaryEnabled(settings: AppSettings): boolean {
  return settings.enableTeacherSalary !== false;
}

export function isPortalEnabled(settings: AppSettings): boolean {
  return settings.portalEnabled !== false;
}

/** Subscription active hai jab tak expiry date set hai aur aaj usse pehle hai. */
export function isSubscriptionActive(settings: AppSettings): boolean {
  const expiry = (settings.subscriptionExpiry || '').trim();
  if (!expiry) return true; // koi expiry set nahi → maan lo active
  const expiryDate = new Date(expiry + 'T23:59:59');
  if (Number.isNaN(expiryDate.getTime())) return true;
  return expiryDate.getTime() >= Date.now();
}

/** Portal tabhi khula hai jab developer ne ON rakha ho AUR subscription valid ho. */
export function isPortalAccessible(settings: AppSettings): boolean {
  return isPortalEnabled(settings) && isSubscriptionActive(settings);
}

/** Login/landing screen ke liye blocking message (null = portal accessible). */
export function getPortalBlockMessage(settings: AppSettings): string | null {
  if (!isPortalEnabled(settings)) {
    return 'Portal abhi OFFLINE hai. School management system band kiya ja raha hai. Developer se rabta karein.';
  }
  if (!isSubscriptionActive(settings)) {
    return 'Monthly subscription khatam ho gayi hai. Portal renewal ke baad dobara chalega. Developer se rabta karein.';
  }
  return null;
}

/**
 * Role ka login developer ne ON rakha hai? (default ON)
 * Developer ka apna login hamesha ON — warna lockout ho jata.
 */
export function isRoleLoginEnabled(settings: AppSettings, role: Role): boolean {
  if (role === 'developer') return true;
  // loginControl missing ho (purani settings) to sab ON maano
  const ctl = settings.loginControl;
  if (!ctl) return true;
  return ctl[role] !== false;
}

/** Us role ke login par blocking message (null = login allowed). */
export function getRoleLoginBlockMessage(settings: AppSettings, role: Role): string | null {
  if (isRoleLoginEnabled(settings, role)) return null;
  const label = LOGIN_CONTROL_LABELS[role as LoginControlRole] || 'Yeh';
  return `${label} abhi developer ne BAND kar diya hai. School office / developer se rabta karein.`;
}

export function getGeminiApiKey(settings: AppSettings): string {
  const fromSettings = (settings.geminiApiKey || '').trim();
  if (fromSettings) return fromSettings;
  const env = import.meta.env as Record<string, string | undefined>;
  return (env.GEMINI_API_KEY || env.VITE_GEMINI_API_KEY || '').trim();
}
