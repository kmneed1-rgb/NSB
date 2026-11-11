/**
 * FEE COLOR SYSTEM — fee feature ke tamam status colors EK jagah se.
 *
 * Rule (poore app mein same):
 *   EMERALD = collected / paid / clear / clear-pending
 *   AMBER   = partial  / dues + other funds pending (non-tuition pending)
 *   ROSE    = tuition unpaid / overdue / money still outstanding
 *   SLATE   = waived / future month / neutral (koi alert nahi)
 *   INDIGO  = info, receipts, actions (buttons, links)
 *
 * Pehle har screen par apna alag color tha (jaise pending due ek jagah amber,
 * doosri jagah rose) — is file se sab ek jaisa ho gaya hai.
 */

export type FeeStatusKey = 'paid' | 'partial' | 'pending' | 'unpaid' | 'waived' | 'future';

export interface FeeStatusPalette {
  /** Chhoti badge (status pill) */
  badge: string;
  /** Badge ke andar border */
  badgeBorder: string;
  /** Bada number / text */
  text: string;
  /** Avatar / dot par circle */
  dot: string;
  /** Card / chip background */
  chip: string;
  /** Card / chip border */
  chipBorder: string;
}

export const FEE_COLORS: Record<FeeStatusKey, FeeStatusPalette> = {
  paid: {
    badge: 'bg-emerald-100 text-emerald-700',
    badgeBorder: 'border-emerald-200',
    text: 'text-emerald-600',
    dot: 'bg-emerald-500',
    chip: 'bg-emerald-50',
    chipBorder: 'border-emerald-100',
  },
  partial: {
    badge: 'bg-amber-100 text-amber-700',
    badgeBorder: 'border-amber-200',
    text: 'text-amber-600',
    dot: 'bg-amber-500',
    chip: 'bg-amber-50',
    chipBorder: 'border-amber-100',
  },
  pending: {
    badge: 'bg-amber-100 text-amber-700',
    badgeBorder: 'border-amber-200',
    text: 'text-amber-600',
    dot: 'bg-amber-500',
    chip: 'bg-amber-50',
    chipBorder: 'border-amber-100',
  },
  unpaid: {
    badge: 'bg-rose-100 text-rose-700',
    badgeBorder: 'border-rose-200',
    text: 'text-rose-600',
    dot: 'bg-rose-500',
    chip: 'bg-rose-50',
    chipBorder: 'border-rose-100',
  },
  waived: {
    badge: 'bg-slate-100 text-slate-600',
    badgeBorder: 'border-slate-200',
    text: 'text-slate-500',
    dot: 'bg-slate-300',
    chip: 'bg-slate-50',
    chipBorder: 'border-slate-200',
  },
  future: {
    badge: 'bg-slate-100 text-slate-500',
    badgeBorder: 'border-slate-200',
    text: 'text-slate-400',
    dot: 'bg-slate-300',
    chip: 'bg-slate-50',
    chipBorder: 'border-slate-200',
  },
};

/** Fee status key → palette (unknown key safe fallback). */
export const feeColor = (key: FeeStatusKey | string): FeeStatusPalette =>
  FEE_COLORS[(key as FeeStatusKey)] || FEE_COLORS.future;

/** Dues status (pending / paid / waived) → palette. */
export const dueColor = (status: string): FeeStatusPalette => {
  if (status === 'paid') return FEE_COLORS.paid;
  if (status === 'waived') return FEE_COLORS.waived;
  return FEE_COLORS.pending;
};

/** Student fee state (paid / partial / unpaid) → palette. */
export const studentFeeColor = (status: string): FeeStatusPalette => {
  if (status === 'paid') return FEE_COLORS.paid;
  if (status === 'partial') return FEE_COLORS.partial;
  return FEE_COLORS.unpaid;
};

/** Info / action color (receipts, buttons, links). */
export const FEE_INFO = {
  badge: 'bg-indigo-100 text-indigo-700',
  text: 'text-indigo-600',
  chip: 'bg-indigo-50',
  chipBorder: 'border-indigo-100',
};
