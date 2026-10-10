import React, { useMemo, useState } from 'react';
import { toast } from 'sonner';
import {
  Banknote, CheckCircle2, Printer, Save, Settings2, Undo2, X, ArrowLeft,
} from 'lucide-react';
import {
  Teacher, SalarySettings, SalaryBreakdown, SalaryPayment, TeacherSalaryConfig,
} from '../types';
import {
  computeSalary, findSalaryPayment, formatPKR,
} from '../lib/salaryEngine';
import { monthKeyLabel } from '../lib/dateUtils';

interface TeacherSalaryDetailProps {
  teacher: Teacher;
  settings: SalarySettings;
  monthKey: string;
  onSave: (patch: { monthlySalary?: number; salaryConfig?: TeacherSalaryConfig }) => void;
  onMarkPaid: (amount: number, method: string, breakdown: SalaryBreakdown) => void;
  onUndoPaid: (breakdown: SalaryBreakdown) => void;
  onSlip: () => void;
  onClose: () => void;
}

const METHODS = ['Cash', 'Bank Transfer', 'JazzCash', 'EasyPaisa'];

/**
 * Teacher Salary — Editable Detail Screen (full-screen modal).
 * Teacher select karne par poori detail + sab kuch editable + net payable LIVE preview.
 * Yeh alag component hai — mojooda TeacherPayrollPanel ke table ko touch nahi karta.
 */
export default function TeacherSalaryDetail({
  teacher, settings, monthKey, onSave, onMarkPaid, onUndoPaid, onSlip, onClose,
}: TeacherSalaryDetailProps) {
  const cfg = teacher.salaryConfig || {};

  const [salaryDraft, setSalaryDraft] = useState(String(teacher.monthlySalary || 0));
  const [method, setMethod] = useState('Cash');
  const [payDraft, setPayDraft] = useState('');
  const [cfgDraft, setCfgDraft] = useState<Record<string, string>>({
    workingDaysPerMonth: cfg.workingDaysPerMonth != null ? String(cfg.workingDaysPerMonth) : '',
    perDayRate: cfg.perDayRate != null ? String(cfg.perDayRate) : '',
    absentPenaltyFactor: cfg.absentPenaltyFactor != null ? String(cfg.absentPenaltyFactor) : '',
    latePenaltyFactor: cfg.latePenaltyFactor != null ? String(cfg.latePenaltyFactor) : '',
    paidLeavesPerMonth: cfg.paidLeavesPerMonth != null ? String(cfg.paidLeavesPerMonth) : '',
    allowance: cfg.allowance != null ? String(cfg.allowance) : '',
    bonus: cfg.bonus != null ? String(cfg.bonus) : '',
    fixedDeduction: cfg.fixedDeduction != null ? String(cfg.fixedDeduction) : '',
  });

  const previewTeacher = useMemo<Teacher>(() => {
    const nextCfg: TeacherSalaryConfig = { ...cfg };
    (Object.keys(cfgDraft) as (keyof TeacherSalaryConfig)[]).forEach(k => {
      const raw = cfgDraft[k as string];
      (nextCfg as any)[k] = raw === '' ? undefined : Math.max(0, Number(raw) || 0);
    });
    return {
      ...teacher,
      monthlySalary: Math.max(0, Number(salaryDraft) || 0),
      salaryConfig: nextCfg,
    };
  }, [teacher, salaryDraft, cfgDraft]);

  const bd = useMemo(() => computeSalary(previewTeacher, monthKey, settings), [previewTeacher, monthKey, settings]);
  const paid = findSalaryPayment(teacher, monthKey);

  const cfgFields = [
    { key: 'workingDaysPerMonth', label: 'Working days / month', ph: settings.workingDaysPerMonth, hint: 'khali = global' },
    { key: 'perDayRate', label: 'Per day rate', ph: bd.perDayRate, hint: 'khali = auto (salary ÷ days)' },
    { key: 'absentPenaltyFactor', label: 'Absent cut ×', ph: settings.absentPenaltyFactor, hint: '1 = pura din' },
    { key: 'latePenaltyFactor', label: 'Late cut ×', ph: settings.latePenaltyFactor, hint: '0.5 = aadha din' },
    { key: 'paidLeavesPerMonth', label: 'Paid leaves / month', ph: settings.paidLeavesPerMonth, hint: 'free leaves' },
    { key: 'allowance', label: 'Allowance', ph: 0, hint: 'PKR (+)' },
    { key: 'bonus', label: 'Bonus', ph: 0, hint: 'PKR (+)' },
    { key: 'fixedDeduction', label: 'Deduction', ph: 0, hint: 'PKR (−)' },
  ] as const;

  const handleSave = () => {
    const nextCfg: TeacherSalaryConfig = { ...cfg };
    (Object.keys(cfgDraft) as (keyof TeacherSalaryConfig)[]).forEach(k => {
      const raw = cfgDraft[k as string];
      (nextCfg as any)[k] = raw === '' ? undefined : Math.max(0, Number(raw) || 0);
    });
    onSave({ monthlySalary: Math.max(0, Number(salaryDraft) || 0), salaryConfig: nextCfg });
    toast.success('Salary details save ho gaye.');
  };

  const handleMarkPaid = () => {
    const amount = payDraft !== '' ? Math.max(0, Number(payDraft) || 0) : bd.netPayable;
    if (amount <= 0) { toast.error('Amount 0 hai — pehle salary set karein.'); return; }
    onMarkPaid(amount, method, bd);
    setPayDraft('');
  };

  const payments: SalaryPayment[] = (teacher.salaryPayments || []).slice().reverse();

  return (
    <div className="fixed inset-0 z-[96] bg-slate-100 overflow-y-auto">
      <div className="min-h-full">
        <div className="bg-slate-900 text-white p-5 sm:p-6 sticky top-0 z-10 print:hidden">
          <div className="max-w-3xl mx-auto flex items-center justify-between gap-4">
            <div className="flex items-center gap-3 min-w-0">
              <button type="button" onClick={onClose} className="p-2 hover:bg-white/10 rounded-lg cursor-pointer shrink-0" aria-label="Back">
                <ArrowLeft size={20} />
              </button>
              <div className="min-w-0">
                <p className="text-[10px] font-black uppercase tracking-[0.3em] text-emerald-300">Teacher Salary</p>
                <h1 className="text-lg sm:text-xl font-black uppercase tracking-tight truncate">{teacher.name}</h1>
                <p className="text-[10px] text-slate-400 uppercase tracking-widest">{teacher.subject} · {monthKeyLabel(monthKey)}</p>
              </div>
            </div>
            <button type="button" onClick={onSlip} className="px-3 py-2 bg-white/10 border border-white/20 text-[10px] font-black uppercase inline-flex items-center gap-1.5 shrink-0 cursor-pointer">
              <Printer size={14} /> Slip
            </button>
          </div>
        </div>

        <div className="max-w-3xl mx-auto p-4 sm:p-6 space-y-5">
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
            <label className="block">
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-1.5">
                <Banknote size={13} /> Monthly Salary (PKR)
              </span>
              <input
                type="number"
                min={0}
                value={salaryDraft}
                onChange={(e) => setSalaryDraft(e.target.value)}
                className="w-full mt-2 p-4 bg-slate-50 border border-slate-200 rounded-xl font-mono text-2xl font-black text-slate-900 outline-none focus:border-emerald-500"
              />
            </label>
            <p className="text-[10px] text-slate-400 mt-2">Per day {formatPKR(bd.perDayRate)} · {bd.workingDays} working days</p>
          </div>

          <div className="bg-gradient-to-br from-emerald-600 to-teal-700 text-white rounded-2xl p-5 shadow-lg">
            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-emerald-100">Net Payable (live)</p>
            <p className="text-3xl sm:text-4xl font-black tracking-tight">{formatPKR(bd.netPayable)}</p>
            <div className="flex flex-wrap gap-2 mt-3 text-[10px] font-black uppercase">
              <span className="px-2.5 py-1 bg-white/15 rounded-full">Present {bd.presentDays}</span>
              <span className="px-2.5 py-1 bg-white/15 rounded-full">Absent {bd.absentDays}</span>
              <span className="px-2.5 py-1 bg-white/15 rounded-full">Late {bd.lateDays}</span>
              <span className="px-2.5 py-1 bg-white/15 rounded-full">Leave {bd.leaveDays}</span>
              {bd.halfDays > 0 && <span className="px-2.5 py-1 bg-white/15 rounded-full">Half {bd.halfDays}</span>}
            </div>
            <p className="text-[10px] text-emerald-100 mt-2">
              Cuts: absent −{formatPKR(bd.absentCut)} · late −{formatPKR(bd.lateCut)} · leave −{formatPKR(bd.leaveCut)}
              {bd.allowance > 0 ? ` · allowance +${formatPKR(bd.allowance)}` : ''}
              {bd.bonus > 0 ? ` · bonus +${formatPKR(bd.bonus)}` : ''}
              {bd.fixedDeduction > 0 ? ` · deduction −${formatPKR(bd.fixedDeduction)}` : ''}
            </p>
          </div>
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
            <h3 className="text-xs font-black uppercase tracking-widest text-slate-500 flex items-center gap-1.5 mb-3">
              <Settings2 size={14} /> Salary Rules (per-teacher override)
            </h3>
            <div className="grid grid-cols-2 gap-3">
              {cfgFields.map(f => (
                <label key={f.key} className="block">
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">{f.label}</span>
                  <input
                    type="number"
                    min={0}
                    step="0.01"
                    value={cfgDraft[f.key as string]}
                    onChange={(e) => setCfgDraft(prev => ({ ...prev, [f.key]: e.target.value }))}
                    placeholder={String(f.ph)}
                    className="w-full mt-1 p-3 bg-slate-50 border border-slate-200 rounded-xl font-mono text-sm outline-none focus:border-emerald-500"
                  />
                  <span className="text-[9px] text-slate-400 uppercase">{f.hint}</span>
                </label>
              ))}
            </div>
          </div>

          <button
            type="button"
            onClick={handleSave}
            className="w-full py-4 bg-slate-900 text-white text-xs font-black uppercase tracking-widest hover:bg-slate-800 inline-flex items-center justify-center gap-2 cursor-pointer"
          >
            <Save size={16} /> Save Changes
          </button>

          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-3">
            <h3 className="text-xs font-black uppercase tracking-widest text-slate-500">Payment · {monthKeyLabel(monthKey)}</h3>
            {paid ? (
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <p className="text-sm font-black text-emerald-700 uppercase flex items-center gap-1.5">
                  <CheckCircle2 size={16} /> Paid {formatPKR(paid.amount)} · {paid.method || '—'} · {paid.paidDate}
                </p>
                <button type="button" onClick={() => onUndoPaid(bd)} className="px-3 py-2 border border-rose-300 text-rose-600 text-[10px] font-black uppercase inline-flex items-center gap-1 cursor-pointer">
                  <Undo2 size={12} /> Undo
                </button>
              </div>
            ) : (
              <div className="flex flex-wrap items-center gap-2">
                <input
                  type="number"
                  min={0}
                  value={payDraft}
                  onChange={(e) => setPayDraft(e.target.value)}
                  placeholder={String(bd.netPayable)}
                  className="w-32 p-3 bg-slate-50 border border-slate-200 rounded-xl font-mono text-sm"
                />
                <select value={method} onChange={(e) => setMethod(e.target.value)} className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold">
                  {METHODS.map(m => <option key={m}>{m}</option>)}
                </select>
                <button type="button" onClick={handleMarkPaid} className="px-4 py-3 bg-emerald-600 text-white text-[10px] font-black uppercase hover:bg-emerald-700 cursor-pointer">
                  Mark Paid
                </button>
              </div>
            )}
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
            <h3 className="text-xs font-black uppercase tracking-widest text-slate-500 mb-3">Payment History</h3>
            {payments.length === 0 ? (
              <p className="text-xs text-slate-400 uppercase font-bold">No payments yet</p>
            ) : (
              <ul className="space-y-2">
                {payments.map(p => (
                  <li key={p.id} className="flex justify-between border-b border-slate-100 pb-2 text-sm">
                    <span className="font-bold">{p.month} {p.year}</span>
                    <span className="font-mono text-slate-600">{formatPKR(p.amount)} · {p.method || '—'}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <button type="button" onClick={onClose} className="w-full py-3 border border-slate-300 text-slate-500 text-xs font-black uppercase tracking-widest hover:bg-slate-50 inline-flex items-center justify-center gap-2 cursor-pointer print:hidden">
            <X size={14} /> Close
          </button>
        </div>
      </div>
    </div>
  );
}

