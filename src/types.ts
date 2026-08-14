export type Role = 'principal' | 'teacher' | 'student' | 'coordinator' | 'developer';

export interface Coordinator {
  id: string;
  name: string;
  email: string;
  username: string;
  password: string;
  phone: string;
}

export interface Teacher {
  id: string;
  name: string;
  email: string;
  username: string; // Added for login
  password: string; // Added for login
  subject: string;
  phone: string;
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
  whatsAppAutoFee: boolean;
  whatsAppAutoAbsence: boolean;
  whatsAppAutoResult: boolean;
  autoWhatsAppRedirect: boolean;
  extraPeriods: Record<string, string[]>;
  deletedPeriods: Record<string, string[]>;
  periodColors: Record<string, string>;
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

