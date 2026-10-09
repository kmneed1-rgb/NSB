export type Role = 'principal' | 'teacher' | 'student' | 'coordinator' | 'developer';

export interface Coordinator {
  id: string;
  name: string;
  email: string;
  username: string;
  password: string;
  phone: string;
  /** Profile photo (compressed base64 WebP) — Admin Hub upload se. */
  photo?: string;
}

/** Salary ka poora hisaab (attendance + cuts) — payment ke waqt snapshot save hota hai. */
export interface SalaryBreakdown {
  monthKey: string;        // 'YYYY-MM'
  monthName: string;       // 'Sep'
  year: number;
  baseSalary: number;
  workingDays: number;
  perDayRate: number;
  presentDays: number;
  absentDays: number;
  lateDays: number;
  leaveDays: number;
  halfDays: number;
  absentCut: number;
  lateCut: number;
  leaveCut: number;
  allowance: number;
  bonus: number;
  fixedDeduction: number;
  netPayable: number;
}

export interface SalaryPayment {
  id: string;
  month: string;
  year: number;
  amount: number;
  paidDate: string;
  method?: string;
  notes?: string;
  /** Us waqt ka hisaab snapshot (attendance + cuts) — history mein dikhta hai. */
  breakdown?: SalaryBreakdown;
}

/** Staff (teacher) attendance ke status. */
export type StaffAttendanceStatus = 'present' | 'absent' | 'late' | 'leave' | 'half';

export interface StaffAttendanceEntry {
  date: string;                  // YYYY-MM-DD
  status: StaffAttendanceStatus;
  note?: string;
  markedBy?: string;             // jisne mark kiya (principal/coordinator ka naam)
  markedAt?: string;             // ISO timestamp
}

/** Per-teacher salary rules (global SalarySettings ko override karte hain). */
export interface TeacherSalaryConfig {
  workingDaysPerMonth?: number;
  perDayRate?: number;
  absentPenaltyFactor?: number;
  latePenaltyFactor?: number;
  paidLeavesPerMonth?: number;
  allowance?: number;            // monthly allowance (transport etc.)
  bonus?: number;                // is mahine ka bonus
  fixedDeduction?: number;       // advance / loan / other deduction
  notes?: string;
}

/** Global salary rules (principal customize karta hai). */
export interface SalarySettings {
  workingDaysPerMonth: number;         // default 26
  workingDayMode: 'fixed' | 'calendar';// 'fixed' = upar wali value; 'calendar' = month ke actual working days
  weekendDays: number[];               // 0 = Sunday … 6 = Saturday
  absentPenaltyFactor: number;         // 1 = poori daily wage cut
  latePenaltyFactor: number;           // 0.5 = aadha din
  paidLeavesPerMonth: number;          // itni leaves paid
  slipNote?: string;                   // salary slip par footer note
}

export interface Teacher {
  id: string;
  name: string;
  email: string;
  username: string; // Added for login
  password: string; // Added for login
  subject: string;
  phone: string;
  monthlySalary?: number;
  salaryPayments?: SalaryPayment[];
  /** Salary rules (per-teacher override). */
  salaryConfig?: TeacherSalaryConfig;
  /** Rozana staff attendance (salary isi se calculate hoti hai). */
  staffAttendance?: StaffAttendanceEntry[];
  /** Profile photo (compressed base64 WebP) — Admin Hub upload se. */
  photo?: string;
}

export interface Student {
  id: string;
  name: string;
  email?: string;
  username: string; // Added for login
  password: string; // Added for login
  classId: string; // References Class.id
  rollNumber: string;
  parentPhone: string;
  studentPhone?: string;
  baseFee?: number;
  guardianName?: string;
  category?: string;
  academySubjects?: string[];
  enrollmentMonth?: string;
  photo?: string;
  idCardTheme?: string;
  idCardColor?: string;
}

export interface ClassFeeConfig {
  name: string;
  amount: number;
}

export interface Class {
  id: string;
  className: string; // e.g., "Grade 10", "Grade 11"
  section: string;   // e.g., "A", "B"
  classTeacherId: string; // References Teacher.id
  subjects?: string[];
  feeConfigs?: ClassFeeConfig[];
}

export type ExamType = string;

export interface Mark {
  id: string;
  studentId: string;   // References Student.id
  subject: string;
  examType: ExamType;
  marksObtained: number;
  maxMarks: number;
}

export interface Attendance {
  id: string;
  studentId: string;   // References Student.id
  date: string;        // YYYY-MM-DD
  status: 'present' | 'absent' | 'late' | 'leave';
  markedBy?: string;   // Teacher/Principal who marked the attendance
}

export interface FeeRecord {
  id: string;
  studentId: string;   // References Student.id
  amount: number;
  dueDate: string;     // YYYY-MM-DD
  status: 'paid' | 'unpaid' | 'pending';
  paidDate?: string;   // YYYY-MM-DD
  month: string;       // e.g., "June 2026"
  paymentMethod?: string; // e.g., "Credit Card", "Bank Transfer", "Cash"
  feeType?: 'Tuition Fee' | 'Admission Fee' | 'Annual Fee' | 'Paper Fund' | 'Pending Balance' | 'Miscellaneous' | string;
  description?: string;
  /** Agar yeh payment kisi due (khata) ke collection se bani hai to us due ka id (double-count guard). */
  dueId?: string;
}

export interface DueEntry {
  id: string;
  studentId: string | number;
  desc: string;
  amount: number;
  date: string;
  month: string;
  year: number;
  status: 'pending' | 'paid' | 'waived';
  /** Partial collection support: kitna amount already PAID collect ho chuka hai (0 = kuch nahi). */
  paidAmount?: number;
  paidDate?: string;
  paymentMethod?: string;
  studentName?: string;
  studentClass?: string;
}

export type DayOfWeek = 'Monday' | 'Tuesday' | 'Wednesday' | 'Thursday' | 'Friday' | 'Saturday' | 'Sunday';

export interface TimetableEntry {
  id: string;
  classId: string;     // References Class.id
  day: DayOfWeek;
  period: string;      // e.g., "Period 1", "Period 2", etc.
  time: string;        // e.g., "09:00 AM - 10:00 AM"
  subject: string;
  teacherId: string;   // References Teacher.id
}

export interface AppSettings {
  absentTemplate: string;
  feeTemplate: string;
  resultTemplate: string;
  whatsAppAutoFee: boolean;
  whatsAppAutoAbsence: boolean;
  whatsAppAutoResult: boolean;
  autoWhatsAppRedirect: boolean;
  extraPeriods: Record<string, string[]>;
  deletedPeriods: Record<string, string[]>;
  periodColors: Record<string, string>;
  enablePaperGenerator?: boolean;
  enableTeacherSalary?: boolean;
  geminiApiKey?: string;
  /** Global salary rules (attendance-based calculation). */
  salary?: Partial<SalarySettings>;
  /** Notification tone (default ON) — device-wise override bhi hota hai. */
  notifySound?: boolean;
  /** Mobile vibration on notification (default ON). */
  notifyVibration?: boolean;
  /** Developer Control: portal (school modules) on/off — default ON. */
  portalEnabled?: boolean;
  /**
   * Developer Control: role-wise login switches (default ON).
   * false = us role ka LOGIN band (Auth attempt se pehle block + logged-in user
   * ko block screen). Developer ka apna login hamesha ON rehta hai (lockout safety).
   */
  loginControl?: {
    student?: boolean;
    teacher?: boolean;
    coordinator?: boolean;
    principal?: boolean;
  };
  /** Monthly subscription expiry date, YYYY-MM-DD. Empty = no expiry set. */
  subscriptionExpiry?: string;
  /** Principal ka profile photo (compressed base64 WebP) — Settings tab upload se. */
  principalPhoto?: string;
  /** Developer ka profile photo (compressed base64 WebP) — Developer portal upload se. */
  developerPhoto?: string;
}

export interface Assignment {
  id: string;
  classId: string;      // Target class (visible only to students of this class)
  subject: string;      // e.g. "Mathematics"
  title: string;        // Assignment title
  description: string;  // Instructions / details
  dueDate: string;      // YYYY-MM-DD deadline
  assignedById: string; // Teacher.id who created it
  assignedByName: string; // Teacher display name
  createdAt: string;    // ISO timestamp
}

export interface StudentFeeData {
  id: string | number;
  name: string;
  class: string;
  monthlyFee: number;
  enrollmentMonth?: string;
  payments: {
    id: string;
    month: string;
    year: number;
    amount: number;
    date: string;
    feeType?: string;
  }[];
  otherFunds: {
    id: string;
    desc: string;
    amount: number;
    date: string;
  }[];
  dues: DueEntry[];
}

export interface UserSession {
  role: Role;
  email: string;
  username: string;
  id?: string; // links to student or teacher, or undefined for principal
  name: string;
}

export function getStudentPhoto(student?: { id?: string; name?: string; photo?: string } | null): string {
  if (student?.photo && student.photo.trim().length > 0) {
    return student.photo;
  }
  return '';
}

