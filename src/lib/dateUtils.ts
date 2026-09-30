/**
 * DATE / MONTH HELPERS — student report, monthly report aur attendance
 * day-wise breakdown sab jagah yahi helpers use hote hain taake logic
 * duplicate na ho.
 */

/** Kisi bhi date/month string se 'YYYY-MM' nikaalta hai ('' agar match na ho). */
export const toMonthKey = (raw: string): string => {
  const m = /^(\d{4})-(\d{2})/.exec(raw || '');
  return m ? `${m[1]}-${m[2]}` : '';
};

/** 'YYYY-MM' → 'September 2026'. */
export const monthKeyLabel = (key: string): string => {
  const [y, m] = (key || '').split('-').map(Number);
  if (!y || !m || m < 1 || m > 12) return key;
  return `${new Date(y, m - 1, 1).toLocaleDateString('en-GB', { month: 'long' })} ${y}`;
};

/** 'YYYY-MM' ko aage/peeche shift karta hai (month arrow buttons ke liye). */
export const shiftMonthKey = (key: string, delta: number): string => {
  const [y, m] = (key || '').split('-').map(Number);
  if (!y || !m) return key;
  const dt = new Date(y, m - 1 + delta, 1);
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}`;
};

/** 'YYYY-MM-DD' → '12 Sep 26 · Sat' — attendance day-chips ke liye compact label. */
export const formatAttendanceDay = (iso: string): string => {
  const parts = (iso || '').split('-').map(Number);
  if (parts.length !== 3 || parts.some(n => !Number.isFinite(n) || n <= 0)) return iso;
  const [y, m, d] = parts;
  const dt = new Date(y, m - 1, d);
  if (Number.isNaN(dt.getTime())) return iso;
  const month = dt.toLocaleDateString('en-GB', { month: 'short' });
  const weekday = dt.toLocaleDateString('en-GB', { weekday: 'short' });
  return `${d} ${month} ${String(y).slice(2)} · ${weekday}`;
};

/** 'YYYY-MM-DD' → '2 Tue' — chhota day + weekday label (report ki inline list ke liye). */
export const formatAttendanceDayShort = (iso: string): string => {
  const parts = (iso || '').split('-').map(Number);
  if (parts.length !== 3 || parts.some(n => !Number.isFinite(n) || n <= 0)) return iso;
  const [y, m, d] = parts;
  const dt = new Date(y, m - 1, d);
  if (Number.isNaN(dt.getTime())) return iso;
  return `${d} ${dt.toLocaleDateString('en-GB', { weekday: 'short' })}`;
};

/** Attendance logs mein se kisi status ki saari dates (latest day pehle). */
export const attendanceDaysByStatus = (
  logs: { status: string; date: string }[],
  status: string
): string[] =>
  logs
    .filter(l => l.status === status && !!l.date)
    .map(l => l.date)
    .sort((a, b) => b.localeCompare(a));

/** Attendance logs ko asli month ke hisaab se group karta hai ('YYYY-MM' → logs). */
export const groupAttendanceByMonth = (
  logs: { date: string }[]
): Record<string, any[]> => {
  const byMonth: Record<string, any[]> = {};
  logs.forEach(l => {
    const key = toMonthKey(l.date);
    if (!key) return;
    if (!byMonth[key]) byMonth[key] = [];
    byMonth[key].push(l);
  });
  return byMonth;
};
