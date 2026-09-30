/**
 * SALARY ENGINE — staff attendance se salary calculation (pure functions).
 *
 *   perDayRate = config.perDayRate ?? monthlySalary / workingDays
 *   absentCut  = (absentDays + halfDays/2) × perDayRate × absentPenaltyFactor
 *   lateCut    = lateDays × perDayRate × latePenaltyFactor
 *   leaveCut   = max(0, leaveDays − paidLeavesPerMonth) × perDayRate
 *   netPayable = monthlySalary + allowance + bonus − absentCut − lateCut − leaveCut − fixedDeduction
 *
 * Global rules `appSettings.salary` se aate hain, per-teacher `teacher.salaryConfig`
 * unhe override karta hai.
 */
import {
  AppSettings,
  SalaryBreakdown,
  SalaryPayment,
  SalarySettings,
  StaffAttendanceEntry,
  StaffAttendanceStatus,
  Teacher,
} from '../types';
import { MONTHS } from './feeEngine';
import { toMonthKey } from './dateUtils';

export const DEFAULT_SALARY_SETTINGS: SalarySettings = {
  workingDaysPerMonth: 26,
  workingDayMode: 'fixed',
  weekendDays: [0, 6],
  absentPenaltyFactor: 1,
  latePenaltyFactor: 0.5,
  paidLeavesPerMonth: 1,
  slipNote: '',
};

export const STAFF_STATUS_LABEL: Record<StaffAttendanceStatus, string> = {
  present: 'Present',
  absent: 'Absent',
  late: 'Late',
  leave: 'Leave',
  half: 'Half day',
};

const round2 = (n: number) => Math.round((Number(n) || 0) * 100) / 100;

/** Global salary settings ko defaults ke saath merge karta hai. */
export function withSalaryDefaults(s?: Partial<SalarySettings> | null): SalarySettings {
  const merged = { ...DEFAULT_SALARY_SETTINGS, ...(s || {}) };
  return {
    ...merged,
    workingDaysPerMonth: Number(merged.workingDaysPerMonth) > 0 ? Number(merged.workingDaysPerMonth) : 26,
    workingDayMode: merged.workingDayMode === 'calendar' ? 'calendar' : 'fixed',
    weekendDays: Array.isArray(merged.weekendDays) ? merged.weekendDays : [0, 6],
    absentPenaltyFactor: Number.isFinite(Number(merged.absentPenaltyFactor)) ? Number(merged.absentPenaltyFactor) : 1,
    latePenaltyFactor: Number.isFinite(Number(merged.latePenaltyFactor)) ? Number(merged.latePenaltyFactor) : 0.5,
    paidLeavesPerMonth: Number.isFinite(Number(merged.paidLeavesPerMonth)) ? Number(merged.paidLeavesPerMonth) : 1,
    slipNote: merged.slipNote || '',
  };
}

/** AppSettings se salary rules (defaults ke saath). */
export const salarySettingsFromApp = (appSettings?: AppSettings | null): SalarySettings =>
  withSalaryDefaults(appSettings?.salary);

/** Aaj ki local date 'YYYY-MM-DD' (UTC off-by-one se bachne ke liye). */
export function todayIso(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** Current month ka 'YYYY-MM' key. */
export function currentMonthKey(): string {
  return toMonthKey(todayIso());
}

/** Mahine ke actual working days (weekend hata kar). */
export function countWorkingDays(year: number, monthIndex: number, weekendDays: number[] = [0, 6]): number {
  const days = new Date(year, monthIndex + 1, 0).getDate();
  let count = 0;
  for (let d = 1; d <= days; d++) {
    if (!weekendDays.includes(new Date(year, monthIndex, d).getDay())) count++;
  }
  return count;
}

/** Kisi mahine ke staff attendance counts. */
export function summarizeStaffAttendance(
  entries: StaffAttendanceEntry[] | undefined,
  monthKey: string
): { present: number; absent: number; late: number; leave: number; half: number; marked: number } {
  const out = { present: 0, absent: 0, late: 0, leave: 0, half: 0, marked: 0 };
  (entries || []).forEach(e => {
    if (!e?.date || toMonthKey(e.date) !== monthKey) return;
    if (e.status === 'present') out.present++;
    else if (e.status === 'absent') out.absent++;
    else if (e.status === 'late') out.late++;
    else if (e.status === 'leave') out.leave++;
    else if (e.status === 'half') out.half++;
    else return;
    out.marked++;
  });
  return out;
}

/** Mahine ka date → status map (calendar grid ke liye). */
export function monthAttendanceMap(
  entries: StaffAttendanceEntry[] | undefined,
  monthKey: string
): Record<string, StaffAttendanceStatus> {
  const map: Record<string, StaffAttendanceStatus> = {};
  (entries || []).forEach(e => {
    if (e?.date && toMonthKey(e.date) === monthKey) map[e.date] = e.status;
  });
  return map;
}


/** Salary ka poora breakdown — attendance + rules se. */
export function computeSalary(
  teacher: Teacher,
  monthKey: string,
  salarySettings?: Partial<SalarySettings> | null
): SalaryBreakdown {
  const s = withSalaryDefaults(salarySettings);
  const cfg = teacher.salaryConfig || {};
  const [y, m] = (monthKey || '').split('-').map(Number);
  const year = y || new Date().getFullYear();
  const monthIndex = (m || new Date().getMonth() + 1) - 1;
  const monthName = MONTHS[monthIndex] || String(monthIndex + 1);

  const baseSalary = Math.max(0, Number(teacher.monthlySalary) || 0);
  const workingDays = Number(cfg.workingDaysPerMonth) > 0
    ? Number(cfg.workingDaysPerMonth)
    : (s.workingDayMode === 'calendar'
      ? countWorkingDays(year, monthIndex, s.weekendDays) || s.workingDaysPerMonth
      : s.workingDaysPerMonth);

  const perDayRate = Number(cfg.perDayRate) > 0
    ? Number(cfg.perDayRate)
    : (workingDays > 0 ? baseSalary / workingDays : 0);

  const counts = summarizeStaffAttendance(teacher.staffAttendance, monthKey);
  const absentFactor = Number.isFinite(Number(cfg.absentPenaltyFactor)) ? Number(cfg.absentPenaltyFactor) : s.absentPenaltyFactor;
  const lateFactor = Number.isFinite(Number(cfg.latePenaltyFactor)) ? Number(cfg.latePenaltyFactor) : s.latePenaltyFactor;
  const paidLeaves = Number.isFinite(Number(cfg.paidLeavesPerMonth)) ? Number(cfg.paidLeavesPerMonth) : s.paidLeavesPerMonth;

  const absentCut = round2((counts.absent + counts.half * 0.5) * perDayRate * absentFactor);
  const lateCut = round2(counts.late * perDayRate * lateFactor);
  const leaveCut = round2(Math.max(0, counts.leave - paidLeaves) * perDayRate);
  const allowance = Math.max(0, Number(cfg.allowance) || 0);
  const bonus = Math.max(0, Number(cfg.bonus) || 0);
  const fixedDeduction = Math.max(0, Number(cfg.fixedDeduction) || 0);
  const netPayable = Math.max(0, round2(baseSalary + allowance + bonus - absentCut - lateCut - leaveCut - fixedDeduction));

  return {
    monthKey,
    monthName,
    year,
    baseSalary,
    workingDays,
    perDayRate: round2(perDayRate),
    presentDays: counts.present,
    absentDays: counts.absent,
    lateDays: counts.late,
    leaveDays: counts.leave,
    halfDays: counts.half,
    absentCut,
    lateCut,
    leaveCut,
    allowance,
    bonus,
    fixedDeduction,
    netPayable,
  };
}

/** Is mahine ki payment (agar ho chuki ho). */
export function findSalaryPayment(teacher: Teacher, monthKey: string): SalaryPayment | undefined {
  const [y, m] = (monthKey || '').split('-').map(Number);
  const monthName = MONTHS[(m || 1) - 1];
  return (teacher.salaryPayments || []).find(p => p.month === monthName && Number(p.year) === Number(y));
}

/** Attendance entry set/update karta hai (ek date ka ek hi record rehta hai). */
export function setStaffAttendance(
  entries: StaffAttendanceEntry[] | undefined,
  date: string,
  status: StaffAttendanceStatus,
  meta?: { markedBy?: string; note?: string }
): StaffAttendanceEntry[] {
  const list = (entries || []).filter(e => e?.date !== date);
  list.push({
    date,
    status,
    note: meta?.note,
    markedBy: meta?.markedBy,
    markedAt: new Date().toISOString(),
  });
  return list.sort((a, b) => a.date.localeCompare(b.date));
}

/** Purane mahine hata kar entries chhoti rakhta hai (doc size control). */
export function pruneStaffAttendance(entries: StaffAttendanceEntry[] | undefined, monthsToKeep = 14): StaffAttendanceEntry[] {
  const cutoff = new Date();
  cutoff.setMonth(cutoff.getMonth() - monthsToKeep);
  const cutoffKey = toMonthKey(`${cutoff.getFullYear()}-${String(cutoff.getMonth() + 1).padStart(2, '0')}-01`);
  return (entries || []).filter(e => !!e?.date && toMonthKey(e.date) >= cutoffKey);
}

/** Currency format — PKR. */
export const formatPKR = (n: number): string => `PKR ${Math.round(Number(n) || 0).toLocaleString()}`;
