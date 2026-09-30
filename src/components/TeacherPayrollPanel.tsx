import React, { useMemo, useState } from 'react';
import { toast } from 'sonner';
import {
  Banknote, CalendarDays, CheckCircle2, ChevronDown, ChevronUp, Printer, Settings2, Undo2,
} from 'lucide-react';
import {
  AppSettings, Attendance, SalaryBreakdown, SalaryPayment, StaffAttendanceStatus, Teacher, TeacherSalaryConfig,
} from '../types';
import { formatAttendanceDay, monthKeyLabel, shiftMonthKey, toMonthKey } from '../lib/dateUtils';
import {
  STAFF_STATUS_LABEL, computeSalary, currentMonthKey, findSalaryPayment, formatPKR,
  monthAttendanceMap, pruneStaffAttendance, salarySettingsFromApp, setStaffAttendance,
  summarizeStaffAttendance, todayIso,
} from '../lib/salaryEngine';
import { addNotification } from '../lib/notificationUtils';

interface TeacherPayrollPanelProps {
  teachers: Teacher[];
  setTeachers: React.Dispatch<React.SetStateAction<Teacher[]>>;
  appSettings?: AppSettings;
  setAppSettings?: React.Dispatch<React.SetStateAction<AppSettings>>;
  /** Jisne mark kiya (principal/coordinator ka naam) — attendance record mein likha jata hai. */
  markedByName?: string;
  /** Student attendance logs — "is din is teacher ne attendance li" hint ke liye. */
  attendance?: Attendance[];
}

const STATUS_ORDER: StaffAttendanceStatus[] = ['present', 'absent', 'late', 'leave', 'half'];

const STATUS_CHIP: Record<StaffAttendanceStatus, string> = {
  present: 'bg-emerald-600 text-white border-emerald-600',
  absent: 'bg-rose-600 text-white border-rose-600',
  late: 'bg-amber-500 text-white border-amber-500',
  leave: 'bg-indigo-600 text-white border-indigo-600',
  half: 'bg-slate-700 text-white border-slate-700',
};

const METHODS = ['Cash', 'Bank Transfer', 'JazzCash', 'EasyPaisa'];

export default function TeacherPayrollPanel({
  teachers,
  setTeachers,
  appSettings,
  setAppSettings,
  markedByName,
  attendance,
}: TeacherPayrollPanelProps) {
  const [monthKey, setMonthKey] = useState(currentMonthKey());
  const [subTab, setSubTab] = useState<'payroll' | 'staff' | 'rules'>('payroll');
  const [method, setMethod] = useState('Cash');
  const [historyId, setHistoryId] = useState<string | null>(null);
  const [configId, setConfigId] = useState<string | null>(null);
  const [attDate, setAttDate] = useState(todayIso());
  const [payDrafts, setPayDrafts] = useState<Record<string, string>>({});
  const [slipTeacherId, setSlipTeacherId] = useState<string | null>(null);

  const settings = useMemo(() => salarySettingsFromApp(appSettings), [appSettings]);

  const rows = useMemo(() => teachers.map(t => ({
    teacher: t,
    breakdown: computeSalary(t, monthKey, settings),
    paid: findSalaryPayment(t, monthKey),
  })), [teachers, monthKey, settings]);

  const totals = useMemo(() => ({
    payable: rows.reduce((s, r) => s + r.breakdown.netPayable, 0),
    paid: rows.filter(r => r.paid).reduce((s, r) => s + (r.paid?.amount || 0), 0),
  }), [rows]);

  // Is din kis teacher ne students ki attendance li (auto-hint)
  const attendanceNamesToday = useMemo(() => {
    const set = new Set<string>();
    (attendance || []).forEach(a => {
      if (a.date === attDate && a.markedBy) set.add(a.markedBy.trim().toLowerCase());
    });
    return set;
  }, [attendance, attDate]);

  const updateTeacher = (id: string, patch: Partial<Teacher>) => {
    setTeachers(prev => prev.map(t => (t.id === id ? { ...t, ...patch } : t)));
  };

  const saveSalary = (id: string, value: string) => {
    updateTeacher(id, { monthlySalary: Math.max(0, Number(value) || 0) });
    toast.success('Monthly salary updated.');
  };

  const saveConfig = (id: string, patch: Partial<TeacherSalaryConfig>) => {
    const t = teachers.find(x => x.id === id);
    if (!t) return;
    updateTeacher(id, { salaryConfig: { ...(t.salaryConfig || {}), ...patch } });
  };

  const setStatus = (teacherId: string, status: StaffAttendanceStatus, date = attDate) => {
    const t = teachers.find(x => x.id === teacherId);
    if (!t) return;
    const next = pruneStaffAttendance(
      setStaffAttendance(t.staffAttendance, date, status, { markedBy: markedByName })
    );
    updateTeacher(teacherId, { staffAttendance: next });
  };

  const markAllPresent = (date = attDate) => {
    setTeachers(prev => prev.map(t => ({
      ...t,
      staffAttendance: pruneStaffAttendance(
        setStaffAttendance(t.staffAttendance, date, 'present', { markedBy: markedByName })
      ),
    })));
    toast.success(`All staff marked present (${date}).`);
  };

  const markPaid = (teacher: Teacher, bd: SalaryBreakdown) => {
    const draft = payDrafts[teacher.id];
    const amount = draft !== undefined && draft !== '' ? Math.max(0, Number(draft) || 0) : bd.netPayable;
    if (amount <= 0) {
      toast.error('Amount 0 hai — pehle monthly salary set karein.');
      return;
    }
    const payment: SalaryPayment = {
      id: 'sal_' + Date.now(),
      month: bd.monthName,
      year: bd.year,
      amount,
      paidDate: todayIso(),
      method,
      breakdown: bd,
    };
    setTeachers(prev => prev.map(t => (
      t.id === teacher.id ? { ...t, salaryPayments: [...(t.salaryPayments || []), payment] } : t
    )));
    // Teacher ko notification (uske device par tone ke saath)
    addNotification({
      type: 'salary_paid',
      role: 'teacher',
      teacherId: teacher.id,
      sound: 'ding',
      title: `${bd.monthName} ${bd.year} Salary Paid 💵`,
      message: `${formatPKR(amount)} (${method}) pay kar di gayi hai. Attendance: ${bd.presentDays} present, ${bd.absentDays} absent, ${bd.lateDays} late. Net payable ${formatPKR(bd.netPayable)}.`,
    });
    toast.success(`${teacher.name} — ${bd.monthName} ${bd.year}: ${formatPKR(amount)} paid.`);
  };

  const undoPaid = (teacher: Teacher, bd: SalaryBreakdown) => {
    setTeachers(prev => prev.map(t => (
      t.id === teacher.id
        ? {
            ...t,
            salaryPayments: (t.salaryPayments || []).filter(
              p => !(p.month === bd.monthName && Number(p.year) === Number(bd.year))
            ),
          }
        : t
    )));
    toast.success('Is mahine ki payment hata di gayi.');
  };

  const saveGlobalRules = (patch: Partial<NonNullable<AppSettings['salary']>>) => {
    if (!setAppSettings) return;
    setAppSettings(prev => ({ ...prev, salary: { ...(prev.salary || {}), ...patch } }));
  };

  const slipTeacher = teachers.find(t => t.id === slipTeacherId) || null;
  const slipBreakdown = slipTeacher ? computeSalary(slipTeacher, monthKey, settings) : null;
  const slipPaid = slipTeacher ? findSalaryPayment(slipTeacher, monthKey) : undefined;

  const renderTeacherConfig = (t: Teacher) => {
    const cfg = t.salaryConfig || {};
    const live = computeSalary(t, monthKey, settings);
    const fields = [
      { key: 'workingDaysPerMonth', label: 'Working days', ph: settings.workingDaysPerMonth, hint: 'khali = global' },
      { key: 'perDayRate', label: 'Per day rate', ph: live.perDayRate, hint: 'khali = auto' },
      { key: 'absentPenaltyFactor', label: 'Absent cut ×', ph: settings.absentPenaltyFactor, hint: '1 = pura din' },
      { key: 'latePenaltyFactor', label: 'Late cut ×', ph: settings.latePenaltyFactor, hint: '0.5 = aadha din' },
      { key: 'paidLeavesPerMonth', label: 'Paid leaves', ph: settings.paidLeavesPerMonth, hint: 'per month' },
      { key: 'allowance', label: 'Allowance', ph: 0, hint: 'PKR (+)' },
      { key: 'bonus', label: 'Bonus', ph: 0, hint: 'PKR (+)' },
      { key: 'fixedDeduction', label: 'Deduction', ph: 0, hint: 'PKR (−)' },
    ] as const;

    return (
      <tr className="bg-slate-50 border-t border-slate-100">
        <td colSpan={6} className="px-4 py-4">
          <div className="flex items-center gap-2 mb-3">
            <Settings2 size={13} className="text-slate-500" />
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">{t.name} — salary rules</p>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {fields.map(field => (
              <label key={field.key} className="block">
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">{field.label}</span>
                <input
                  type="number"
                  min={0}
                  step="0.01"
                  defaultValue={cfg[field.key] ?? ''}
                  placeholder={String(field.ph)}
                  onBlur={(e) => {
                    const raw = e.target.value.trim();
                    saveConfig(t.id, {
                      [field.key]: raw === '' ? undefined : Math.max(0, Number(raw) || 0),
                    } as Partial<TeacherSalaryConfig>);
                  }}
                  className="w-full mt-1 p-2 bg-white border border-slate-200 font-mono text-xs"
                />
                <span className="text-[9px] text-slate-400 uppercase">{field.hint}</span>
              </label>
            ))}
          </div>
          <p className="text-[10px] text-slate-500 mt-3">
            Is mahine net payable: <b>{formatPKR(live.netPayable)}</b> · Attendance "Staff Attendance" tab se mark hoti hai.
          </p>
        </td>
      </tr>
    );
  };

  const renderSalaryRow = (t: Teacher, bd: SalaryBreakdown, paid?: SalaryPayment) => (
    <React.Fragment key={t.id}>
      <tr className="border-t border-slate-100 align-top">
        <td className="px-4 py-3">
          <p className="font-bold text-slate-900">{t.name}</p>
          <p className="text-[10px] uppercase tracking-widest text-slate-400">{t.subject}</p>
        </td>
        <td className="px-4 py-3">
          <input
            type="number"
            min={0}
            defaultValue={t.monthlySalary || 0}
            key={`sal-${t.id}-${t.monthlySalary || 0}`}
            onBlur={(e) => {
              if (String(t.monthlySalary || 0) !== e.target.value) saveSalary(t.id, e.target.value);
            }}
            className="w-28 p-2 bg-slate-50 border border-slate-200 font-mono text-xs"
          />
          <p className="text-[10px] text-slate-400 mt-1">
            Per day {formatPKR(bd.perDayRate)} · {bd.workingDays} working days
          </p>
        </td>
        <td className="px-4 py-3">
          <div className="flex flex-wrap gap-1 text-[10px] font-black uppercase">
            <span className="px-2 py-1 bg-emerald-50 text-emerald-700 border border-emerald-100">P {bd.presentDays}</span>
            <span className="px-2 py-1 bg-rose-50 text-rose-700 border border-rose-100">A {bd.absentDays}</span>
            <span className="px-2 py-1 bg-amber-50 text-amber-700 border border-amber-100">Late {bd.lateDays}</span>
            <span className="px-2 py-1 bg-indigo-50 text-indigo-700 border border-indigo-100">Lv {bd.leaveDays}</span>
            {bd.halfDays > 0 && (
              <span className="px-2 py-1 bg-slate-100 text-slate-700 border border-slate-200">Half {bd.halfDays}</span>
            )}
          </div>
          <p className="text-[10px] text-slate-500 mt-1">
            Absent −{formatPKR(bd.absentCut)} · Late −{formatPKR(bd.lateCut)} · Leave −{formatPKR(bd.leaveCut)}
            {bd.allowance > 0 ? ` · Allow +${formatPKR(bd.allowance)}` : ''}
            {bd.bonus > 0 ? ` · Bonus +${formatPKR(bd.bonus)}` : ''}
            {bd.fixedDeduction > 0 ? ` · Other −${formatPKR(bd.fixedDeduction)}` : ''}
          </p>
        </td>
        <td className="px-4 py-3 font-black text-slate-900">{formatPKR(bd.netPayable)}</td>
        <td className="px-4 py-3">
          {paid ? (
            <span className="inline-flex items-center gap-1 text-emerald-600 text-xs font-black uppercase">
              <CheckCircle2 size={14} /> Paid
            </span>
          ) : (
            <span className="text-amber-600 text-xs font-black uppercase">Pending</span>
          )}
        </td>
        <td className="px-4 py-3 text-right">
          <div className="flex flex-col items-end gap-2">
            {!paid && (
              <div className="flex items-center gap-1">
                <input
                  type="number"
                  min={0}
                  placeholder={String(bd.netPayable)}
                  value={payDrafts[t.id] ?? ''}
                  onChange={(e) => setPayDrafts(prev => ({ ...prev, [t.id]: e.target.value }))}
                  className="w-24 p-1.5 bg-white border border-slate-200 font-mono text-xs"
                />
                <button
                  type="button"
                  onClick={() => markPaid(t, bd)}
                  className="px-3 py-1.5 bg-emerald-600 text-white text-[10px] font-black uppercase hover:bg-emerald-700"
                >
                  Mark paid
                </button>
              </div>
            )}
            <div className="flex items-center gap-2 flex-wrap justify-end">
              {paid && (
                <button type="button" onClick={() => undoPaid(t, bd)} className="text-[10px] font-black uppercase text-rose-600 inline-flex items-center gap-1">
                  <Undo2 size={11} /> Undo
                </button>
              )}
              <button type="button" onClick={() => setHistoryId(historyId === t.id ? null : t.id)} className="text-[10px] font-black uppercase text-indigo-600">
                History
              </button>
              <button type="button" onClick={() => setConfigId(configId === t.id ? null : t.id)} className="text-[10px] font-black uppercase text-slate-600 inline-flex items-center gap-1">
                Settings {configId === t.id ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
              </button>
              <button type="button" onClick={() => setSlipTeacherId(t.id)} className="text-[10px] font-black uppercase text-slate-600 inline-flex items-center gap-1">
                <Printer size={11} /> Slip
              </button>
            </div>
          </div>
        </td>
      </tr>
      {configId === t.id && renderTeacherConfig(t)}
    </React.Fragment>
  );

  const renderSalarySheet = () => (
    <div className="bg-white border border-slate-200 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-[10px] font-black uppercase tracking-widest text-slate-500">
            <tr>
              <th className="text-left px-4 py-3">Teacher</th>
              <th className="text-left px-4 py-3">Monthly salary</th>
              <th className="text-left px-4 py-3">Attendance · Cuts ({monthKeyLabel(monthKey)})</th>
              <th className="text-left px-4 py-3">Net payable</th>
              <th className="text-left px-4 py-3">Status</th>
              <th className="text-right px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(r => renderSalaryRow(r.teacher, r.breakdown, r.paid))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-slate-400 text-xs font-bold uppercase">No teachers</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );

  const renderHistory = () => {
    const t = teachers.find(x => x.id === historyId);
    if (!t) return null;
    const payments = (t.salaryPayments || []).slice().reverse();
    return (
      <div className="bg-white border border-slate-200 p-5">
        <h3 className="text-xs font-black uppercase tracking-widest mb-3 flex items-center gap-2">
          <Banknote size={14} /> {t.name} — payment history
        </h3>
        <ul className="space-y-2 text-sm">
          {payments.map(p => (
            <li key={p.id} className="border-b border-slate-100 pb-2">
              <div className="flex justify-between">
                <span className="font-bold">{p.month} {p.year}</span>
                <span className="font-mono">{formatPKR(p.amount)} · {p.method || '—'} · {p.paidDate}</span>
              </div>
              {p.breakdown && (
                <p className="text-[10px] text-slate-500 mt-0.5">
                  Base {formatPKR(p.breakdown.baseSalary)} · {p.breakdown.presentDays} present, {p.breakdown.absentDays} absent,
                  {' '}{p.breakdown.lateDays} late, {p.breakdown.leaveDays} leave · Cuts {formatPKR(p.breakdown.absentCut + p.breakdown.lateCut + p.breakdown.leaveCut + p.breakdown.fixedDeduction)}
                  {p.breakdown.allowance + p.breakdown.bonus > 0 ? ` · Add ${formatPKR(p.breakdown.allowance + p.breakdown.bonus)}` : ''}
                </p>
              )}
            </li>
          ))}
          {payments.length === 0 && (
            <li className="text-slate-400 text-xs uppercase font-bold">No payments yet</li>
          )}
        </ul>
      </div>
    );
  };

  const renderStaffAttendance = () => {
    const [y, m] = monthKey.split('-').map(Number);
    const dayCount = new Date(y, m, 0).getDate();
    const monthDates = Array.from({ length: dayCount }, (_, i) => `${monthKey}-${String(i + 1).padStart(2, '0')}`);
    return (
      <div className="space-y-4">
        <div className="bg-white border border-slate-200 p-4 flex flex-wrap items-center gap-3">
          <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Date</label>
          <input
            type="date"
            value={attDate}
            onChange={(e) => setAttDate(e.target.value)}
            className="p-2 bg-slate-50 border border-slate-200 text-xs font-bold"
          />
          <button
            type="button"
            onClick={() => markAllPresent()}
            className="px-3 py-2 bg-emerald-600 text-white text-[10px] font-black uppercase hover:bg-emerald-700"
          >
            Mark all present
          </button>
          <span className="text-[10px] text-slate-500 uppercase font-bold">{formatAttendanceDay(attDate)}</span>
          {toMonthKey(attDate) !== monthKey && (
            <span className="text-[10px] font-black uppercase text-amber-600">
              ⚠ Yeh date {monthKeyLabel(monthKey)} mein nahi hai
            </span>
          )}
        </div>

        <div className="bg-white border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-[10px] font-black uppercase tracking-widest text-slate-500">
                <tr>
                  <th className="text-left px-4 py-3">Teacher</th>
                  <th className="text-left px-4 py-3">Status · {attDate}</th>
                  <th className="text-left px-4 py-3">Month · {monthKeyLabel(monthKey)}</th>
                </tr>
              </thead>
              <tbody>
                {teachers.map(t => {
                  const map = monthAttendanceMap(t.staffAttendance, monthKey);
                  const todayStatus = (t.staffAttendance || []).find(e => e.date === attDate)?.status;
                  const loggedToday = attendanceNamesToday.has((t.name || '').trim().toLowerCase());
                  const s = summarizeStaffAttendance(t.staffAttendance, monthKey);
                  return (
                    <tr key={t.id} className="border-t border-slate-100 align-top">
                      <td className="px-4 py-3">
                        <p className="font-bold text-slate-900">{t.name}</p>
                        {loggedToday && (
                          <span className="text-[9px] font-black uppercase text-emerald-600">Class attendance li ✔ present?</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-1">
                          {STATUS_ORDER.map(st => (
                            <button
                              key={st}
                              type="button"
                              onClick={() => setStatus(t.id, st)}
                              className={`px-2 py-1 text-[10px] font-black uppercase border transition-all ${
                                todayStatus === st ? STATUS_CHIP[st] : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'
                              }`}
                            >
                              {STAFF_STATUS_LABEL[st]}
                            </button>
                          ))}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-0.5 max-w-[340px]">
                          {monthDates.map(d => {
                            const st = map[d];
                            return (
                              <button
                                key={d}
                                type="button"
                                title={`${d} — ${st ? STAFF_STATUS_LABEL[st] : 'not marked'} (left-click Present, right-click Absent)`}
                                onClick={() => setStatus(t.id, 'present', d)}
                                onContextMenu={(e) => { e.preventDefault(); setStatus(t.id, 'absent', d); }}
                                className={`w-5 h-5 text-[8px] font-black border ${st ? STATUS_CHIP[st] : 'bg-slate-50 text-slate-400 border-slate-200'}`}
                              >
                                {Number(d.slice(-2))}
                              </button>
                            );
                          })}
                        </div>
                        <p className="text-[10px] text-slate-500 mt-1">
                          P {s.present} · A {s.absent} · Late {s.late} · Lv {s.leave}{s.half ? ` · Half ${s.half}` : ''}
                          {' '}— {s.marked} din mark
                        </p>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
        <p className="text-[10px] text-slate-400 uppercase font-bold">
          Tip: din par left-click = Present, right-click = Absent. Record teachers collection ke saath cloud sync hota hai.
        </p>
      </div>
    );
  };

  const renderRules = () => (
    <div className="bg-white border border-slate-200 p-5 space-y-4">
      <div>
        <h3 className="text-xs font-black uppercase tracking-widest flex items-center gap-2">
          <Settings2 size={14} /> Global salary rules
        </h3>
        <p className="text-[10px] text-slate-400 uppercase font-bold mt-1">
          Yeh rules sab teachers par lagti hain — per-teacher override us teacher ke "Settings" se hota hai.
        </p>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {([
          { key: 'workingDaysPerMonth', label: 'Working days / month', step: '1', hint: 'e.g. 26' },
          { key: 'absentPenaltyFactor', label: 'Absent cut ×', step: '0.25', hint: '1 = pura din' },
          { key: 'latePenaltyFactor', label: 'Late cut ×', step: '0.25', hint: '0.5 = aadha din' },
          { key: 'paidLeavesPerMonth', label: 'Paid leaves / month', step: '1', hint: 'e.g. 1' },
        ] as const).map(f => (
          <label key={f.key} className="block">
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">{f.label}</span>
            <input
              type="number"
              min={0}
              step={f.step}
              defaultValue={settings[f.key]}
              onBlur={(e) => {
                const v = Math.max(0, Number(e.target.value) || 0);
                if (v !== settings[f.key]) saveGlobalRules({ [f.key]: v });
              }}
              className="w-full mt-1 p-2 bg-slate-50 border border-slate-200 font-mono text-xs"
            />
            <span className="text-[9px] text-slate-400 uppercase">{f.hint}</span>
          </label>
        ))}
        <label className="block">
          <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Working day mode</span>
          <select
            value={settings.workingDayMode}
            onChange={(e) => saveGlobalRules({ workingDayMode: e.target.value as 'fixed' | 'calendar' })}
            className="w-full mt-1 p-2 bg-slate-50 border border-slate-200 text-xs font-bold"
          >
            <option value="fixed">Fixed days (upar wali value)</option>
            <option value="calendar">Calendar (month ke actual weekdays)</option>
          </select>
        </label>
        <label className="block">
          <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Slip note</span>
          <input
            type="text"
            defaultValue={settings.slipNote || ''}
            placeholder="e.g. Salary jari karne ka shukriya"
            onBlur={(e) => { if (e.target.value !== (settings.slipNote || '')) saveGlobalRules({ slipNote: e.target.value }); }}
            className="w-full mt-1 p-2 bg-slate-50 border border-slate-200 text-xs"
          />
        </label>
      </div>
      <div className="bg-slate-50 border border-slate-200 p-3 text-[10px] text-slate-500 font-bold uppercase leading-relaxed">
        Per day = monthly ÷ working days · absent cut = per day × {settings.absentPenaltyFactor} · late cut = per day × {settings.latePenaltyFactor} · paid leaves {settings.paidLeavesPerMonth}
        <br />Net = monthly + allowance + bonus − (absent + late + extra leaves + other deduction)
      </div>
    </div>
  );

  const renderSlip = (t: Teacher, bd: SalaryBreakdown, paid?: SalaryPayment) => {
    const lines: { label: string; value: string; strong?: boolean }[] = [
      { label: 'Monthly salary', value: formatPKR(bd.baseSalary) },
      { label: 'Working days', value: String(bd.workingDays) },
      { label: 'Per day rate', value: formatPKR(bd.perDayRate) },
      { label: 'Present days', value: String(bd.presentDays) },
      { label: 'Absent days', value: `${bd.absentDays} (−${formatPKR(bd.absentCut)})` },
      { label: 'Late days', value: `${bd.lateDays} (−${formatPKR(bd.lateCut)})` },
      { label: 'Leave days', value: `${bd.leaveDays} (−${formatPKR(bd.leaveCut)})` },
      ...(bd.halfDays > 0 ? [{ label: 'Half days', value: String(bd.halfDays) }] : []),
      ...(bd.allowance > 0 ? [{ label: 'Allowance', value: `+${formatPKR(bd.allowance)}` }] : []),
      ...(bd.bonus > 0 ? [{ label: 'Bonus', value: `+${formatPKR(bd.bonus)}` }] : []),
      ...(bd.fixedDeduction > 0 ? [{ label: 'Other deduction', value: `−${formatPKR(bd.fixedDeduction)}` }] : []),
      { label: 'Net payable', value: formatPKR(bd.netPayable), strong: true },
    ];
    return (
      <div className="fixed inset-0 z-[95] bg-black/70 p-3 sm:p-6 overflow-y-auto print:static print:bg-white print:p-0">
        <div className="max-w-2xl mx-auto bg-white border border-slate-200 print:border-0">
          <div className="flex items-center justify-between p-4 border-b border-slate-100 print:hidden">
            <p className="text-xs font-black uppercase tracking-widest text-slate-500">Salary Slip</p>
            <div className="flex items-center gap-2">
              <button type="button" onClick={() => window.print()} className="px-3 py-2 bg-slate-900 text-white text-[10px] font-black uppercase inline-flex items-center gap-1">
                <Printer size={12} /> Print
              </button>
              <button type="button" onClick={() => setSlipTeacherId(null)} className="px-3 py-2 border border-slate-200 text-[10px] font-black uppercase text-slate-600">
                Close
              </button>
            </div>
          </div>

          <div className="p-6 space-y-4">
            <div className="flex items-start justify-between border-b border-slate-200 pb-4">
              <div>
                <h2 className="text-lg font-black uppercase tracking-tight text-slate-900">NSB1 School</h2>
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                  Salary Slip · {monthKeyLabel(monthKey)}
                </p>
              </div>
              <div className="text-right text-xs">
                <p className="font-black text-slate-900">{t.name}</p>
                <p className="text-slate-500">{t.subject}</p>
              </div>
            </div>

            <table className="w-full text-xs">
              <tbody>
                {lines.map(line => (
                  <tr key={line.label} className="border-b border-slate-100">
                    <td className="py-2 text-slate-500 font-bold uppercase tracking-wider">{line.label}</td>
                    <td className={`py-2 text-right font-mono ${line.strong ? 'font-black text-slate-900 text-sm' : 'text-slate-700'}`}>
                      {line.value}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className={`p-3 border text-[10px] font-black uppercase tracking-widest ${paid ? 'bg-emerald-50 border-emerald-100 text-emerald-700' : 'bg-amber-50 border-amber-100 text-amber-700'}`}>
              {paid
                ? `Paid ${formatPKR(paid.amount)} · ${paid.method || '—'} · ${paid.paidDate}`
                : 'Is mahine ki salary abhi pay nahi hui'}
            </div>

            {settings.slipNote && (
              <p className="text-[10px] text-slate-400 font-bold uppercase">{settings.slipNote}</p>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="bg-slate-900 p-6 text-white print:hidden">
        <p className="text-[10px] font-black uppercase tracking-[0.3em] text-emerald-300">Payroll</p>
        <h2 className="text-2xl font-black uppercase tracking-tight">Teacher Salaries</h2>
        <p className="text-sm text-slate-300 mt-1">
          Salary ab <b>staff attendance</b> se calculate hoti hai · Cycle: {monthKeyLabel(monthKey)}
        </p>
      </div>

      {/* Sub tabs + month switcher */}
      <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
        <div className="flex bg-white border border-slate-200 p-1 rounded-xl gap-1">
          {([
            { id: 'payroll', label: 'Salary Sheet', icon: Banknote },
            { id: 'staff', label: 'Staff Attendance', icon: CalendarDays },
            { id: 'rules', label: 'Salary Rules', icon: Settings2 },
          ] as const).map(tab => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setSubTab(tab.id)}
              className={`px-3 py-2 text-[10px] font-black uppercase tracking-widest rounded-lg flex items-center gap-1.5 transition-all ${
                subTab === tab.id ? 'bg-slate-900 text-white' : 'text-slate-500 hover:bg-slate-50'
              }`}
            >
              <tab.icon size={13} /> {tab.label}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <button type="button" onClick={() => setMonthKey(shiftMonthKey(monthKey, -1))} className="px-3 py-2 border border-slate-200 bg-white text-xs font-black hover:bg-slate-50">←</button>
          <span className="px-3 py-2 bg-white border border-slate-200 text-xs font-black uppercase tracking-widest">{monthKeyLabel(monthKey)}</span>
          <button type="button" onClick={() => setMonthKey(shiftMonthKey(monthKey, 1))} className="px-3 py-2 border border-slate-200 bg-white text-xs font-black hover:bg-slate-50">→</button>
        </div>
      </div>

      {/* Totals */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-gradient-to-br from-indigo-50/70 via-white to-slate-50/40 border border-indigo-150 p-4 rounded-2xl shadow-2xs">
          <p className="text-[10px] font-black uppercase tracking-widest text-indigo-600">Staff</p>
          <p className="text-xl font-black text-slate-900">{teachers.length}</p>
        </div>
        <div className="bg-gradient-to-br from-blue-50/70 via-white to-sky-50/40 border border-blue-150 p-4 rounded-2xl shadow-2xs">
          <p className="text-[10px] font-black uppercase tracking-widest text-blue-600">Payable</p>
          <p className="text-xl font-black text-slate-900">{formatPKR(totals.payable)}</p>
        </div>
        <div className="bg-gradient-to-br from-emerald-50/70 via-white to-teal-50/40 border border-emerald-150 p-4 rounded-2xl shadow-2xs">
          <p className="text-[10px] font-black uppercase tracking-widest text-emerald-600">Paid</p>
          <p className="text-xl font-black text-emerald-700">{formatPKR(totals.paid)}</p>
        </div>
        <div className="bg-gradient-to-br from-amber-50/70 via-white to-yellow-50/40 border border-amber-150 p-4 rounded-2xl shadow-2xs">
          <p className="text-[10px] font-black uppercase tracking-widest text-amber-600">Remaining</p>
          <p className="text-xl font-black text-amber-700">{formatPKR(Math.max(0, totals.payable - totals.paid))}</p>
        </div>
      </div>

      {subTab === 'payroll' && (
        <div className="flex items-center gap-3 print:hidden">
          <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Pay method</label>
          <select
            value={method}
            onChange={(e) => setMethod(e.target.value)}
            className="p-2 bg-slate-50 border border-slate-200 text-xs font-bold"
          >
            {METHODS.map(m => <option key={m}>{m}</option>)}
          </select>
        </div>
      )}

      {subTab === 'payroll' && renderSalarySheet()}
      {subTab === 'staff' && renderStaffAttendance()}
      {subTab === 'rules' && renderRules()}

      {historyId && renderHistory()}

      {slipTeacher && slipBreakdown && renderSlip(slipTeacher, slipBreakdown, slipPaid)}
    </div>
  );
}
