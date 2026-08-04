import { Teacher, Student, Class, TimetableEntry, Attendance, Mark, FeeRecord } from './types';

export const INITIAL_TEACHERS: Teacher[] = [
  {
    id: 't1',
    name: 'Sarah Jenkins',
    email: 'teacher@school.com',
    username: 'teacher1',
    password: 'password123',
    subject: 'Mathematics',
    phone: '+1-555-0101',
  },
  {
    id: 't2',
    name: 'Robert Chen',
    email: 'robert.chen@school.com',
    username: 'teacher2',
    password: 'password123',
    subject: 'Science',
    phone: '+1-555-0102',
  },
  {
    id: 't3',
    name: 'Emma Watson',
    email: 'emma.watson@school.com',
    username: 'teacher3',
    password: 'password123',
    subject: 'English Literature',
    phone: '+1-555-0103',
  }
];

export const INITIAL_CLASSES: Class[] = [
  {
    id: 'c1',
    className: 'Grade 10',
    section: 'A',
    classTeacherId: 't1', // Sarah Jenkins
  },
  {
    id: 'c2',
    className: 'Grade 11',
    section: 'B',
    classTeacherId: 't2', // Robert Chen
  }
];

export const INITIAL_STUDENTS: Student[] = [
  {
    id: 's1',
    name: 'Jane Doe',
    email: 'student@school.com',
    username: 'student1',
    password: 'password123',
    classId: 'c1',
    rollNumber: '101',
    parentPhone: '+1-555-9001',
    photo: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=80',
  },
  {
    id: 's2',
    name: 'Alex Smith',
    email: 'alex.smith@school.com',
    username: 'student2',
    password: 'password123',
    classId: 'c1',
    rollNumber: '102',
    parentPhone: '+1-555-9002',
    photo: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=200&auto=format&fit=crop&q=80',
  },
  {
    id: 's3',
    name: 'Emily Taylor',
    email: 'emily.taylor@school.com',
    username: 'student3',
    password: 'password123',
    classId: 'c1',
    rollNumber: '103',
    parentPhone: '+1-555-9003',
    photo: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=200&auto=format&fit=crop&q=80',
  },
  {
    id: 's4',
    name: 'Michael Johnson',
    email: 'michael.johnson@school.com',
    username: 'student4',
    password: 'password123',
    classId: 'c2',
    rollNumber: '201',
    parentPhone: '+1-555-9004',
    photo: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&auto=format&fit=crop&q=80',
  },
  {
    id: 's5',
    name: 'Sophia Brown',
    email: 'sophia.brown@school.com',
    username: 'student5',
    password: 'password123',
    classId: 'c2',
    rollNumber: '202',
    parentPhone: '+1-555-9005',
    photo: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200&auto=format&fit=crop&q=80',
  }
];

export const INITIAL_TIMETABLE: TimetableEntry[] = [
  // Grade 10 - A (c1)
  { id: 'tt1', classId: 'c1', day: 'Monday', period: 'Period 1', time: '08:30 AM - 09:30 AM', subject: 'Mathematics', teacherId: 't1' },
  { id: 'tt2', classId: 'c1', day: 'Monday', period: 'Period 2', time: '09:30 AM - 10:30 AM', subject: 'Science', teacherId: 't2' },
  { id: 'tt3', classId: 'c1', day: 'Monday', period: 'Period 3', time: '11:00 AM - 12:00 PM', subject: 'English Literature', teacherId: 't3' },
  { id: 'tt4', classId: 'c1', day: 'Tuesday', period: 'Period 1', time: '08:30 AM - 09:30 AM', subject: 'Science', teacherId: 't2' },
  { id: 'tt5', classId: 'c1', day: 'Tuesday', period: 'Period 2', time: '09:30 AM - 10:30 AM', subject: 'Mathematics', teacherId: 't1' },
  { id: 'tt6', classId: 'c1', day: 'Wednesday', period: 'Period 1', time: '08:30 AM - 09:30 AM', subject: 'Mathematics', teacherId: 't1' },
  { id: 'tt7', classId: 'c1', day: 'Wednesday', period: 'Period 3', time: '11:00 AM - 12:00 PM', subject: 'English Literature', teacherId: 't3' },
  { id: 'tt8', classId: 'c1', day: 'Thursday', period: 'Period 1', time: '08:30 AM - 09:30 AM', subject: 'Science', teacherId: 't2' },
  { id: 'tt9', classId: 'c1', day: 'Thursday', period: 'Period 2', time: '09:30 AM - 10:30 AM', subject: 'English Literature', teacherId: 't3' },
  { id: 'tt10', classId: 'c1', day: 'Friday', period: 'Period 2', time: '09:30 AM - 10:30 AM', subject: 'Mathematics', teacherId: 't1' },

  // Grade 11 - B (c2)
  { id: 'tt11', classId: 'c2', day: 'Monday', period: 'Period 1', time: '08:30 AM - 09:30 AM', subject: 'Science', teacherId: 't2' },
  { id: 'tt12', classId: 'c2', day: 'Monday', period: 'Period 2', time: '09:30 AM - 10:30 AM', subject: 'English Literature', teacherId: 't3' },
  { id: 'tt13', classId: 'c2', day: 'Tuesday', period: 'Period 1', time: '08:30 AM - 09:30 AM', subject: 'Mathematics', teacherId: 't1' },
  { id: 'tt14', classId: 'c2', day: 'Tuesday', period: 'Period 3', time: '11:00 AM - 12:00 PM', subject: 'Science', teacherId: 't2' },
  { id: 'tt15', classId: 'c2', day: 'Wednesday', period: 'Period 2', time: '09:30 AM - 10:30 AM', subject: 'Science', teacherId: 't2' },
  { id: 'tt16', classId: 'c2', day: 'Thursday', period: 'Period 1', time: '08:30 AM - 09:30 AM', subject: 'English Literature', teacherId: 't3' },
  { id: 'tt17', classId: 'c2', day: 'Friday', period: 'Period 1', time: '08:30 AM - 09:30 AM', subject: 'Mathematics', teacherId: 't1' },
  { id: 'tt18', classId: 'c2', day: 'Friday', period: 'Period 2', time: '09:30 AM - 10:30 AM', subject: 'Science', teacherId: 't2' },
];

export const INITIAL_ATTENDANCE: Attendance[] = [
  // Backfill some attendance for June 8, 2026 and June 9, 2026
  { id: 'at1', studentId: 's1', date: '2026-06-08', status: 'present' },
  { id: 'at2', studentId: 's2', date: '2026-06-08', status: 'present' },
  { id: 'at3', studentId: 's3', date: '2026-06-08', status: 'absent' },
  { id: 'at4', studentId: 's4', date: '2026-06-08', status: 'present' },
  { id: 'at5', studentId: 's5', date: '2026-06-08', status: 'present' },

  { id: 'at6', studentId: 's1', date: '2026-06-09', status: 'present' },
  { id: 'at7', studentId: 's2', date: '2026-06-09', status: 'absent' },
  { id: 'at8', studentId: 's3', date: '2026-06-09', status: 'present' },
  { id: 'at9', studentId: 's4', date: '2026-06-09', status: 'present' },
  { id: 'at10', studentId: 's5', date: '2026-06-09', status: 'present' },
];

export const INITIAL_MARKS: Mark[] = [
  // Jane Doe (s1 - Grade 10)
  { id: 'm1', studentId: 's1', subject: 'Mathematics', examType: 'Unit Test', marksObtained: 22, maxMarks: 25 },
  { id: 'm2', studentId: 's1', subject: 'Science', examType: 'Unit Test', marksObtained: 20, maxMarks: 25 },
  { id: 'm3', studentId: 's1', subject: 'English Literature', examType: 'Unit Test', marksObtained: 24, maxMarks: 25 },
  { id: 'm4', studentId: 's1', subject: 'Mathematics', examType: 'Half Yearly', marksObtained: 85, maxMarks: 100 },
  { id: 'm5', studentId: 's1', subject: 'Science', examType: 'Half Yearly', marksObtained: 78, maxMarks: 100 },

  // Alex Smith (s2)
  { id: 'm6', studentId: 's2', subject: 'Mathematics', examType: 'Unit Test', marksObtained: 18, maxMarks: 25 },
  { id: 'm7', studentId: 's2', subject: 'Science', examType: 'Unit Test', marksObtained: 19, maxMarks: 25 },
  { id: 'm8', studentId: 's2', subject: 'Mathematics', examType: 'Half Yearly', marksObtained: 70, maxMarks: 100 },

  // Emily Taylor (s3)
  { id: 'm9', studentId: 's3', subject: 'Mathematics', examType: 'Unit Test', marksObtained: 25, maxMarks: 25 },
  { id: 'm10', studentId: 's3', subject: 'Science', examType: 'Unit Test', marksObtained: 23, maxMarks: 25 },

  // Michael Johnson (s4 - Grade 11)
  { id: 'm11', studentId: 's4', subject: 'Science', examType: 'Unit Test', marksObtained: 21, maxMarks: 25 },
  { id: 'm12', studentId: 's4', subject: 'Mathematics', examType: 'Unit Test', marksObtained: 19, maxMarks: 25 },

  // Sophia Brown (s5)
  { id: 'm13', studentId: 's5', subject: 'Science', examType: 'Unit Test', marksObtained: 24, maxMarks: 25 },
  { id: 'm14', studentId: 's5', subject: 'English Literature', examType: 'Unit Test', marksObtained: 22, maxMarks: 25 },
];

export const INITIAL_FEES: FeeRecord[] = [
  { id: 'f1', studentId: 's1', amount: 500, dueDate: '2026-06-15', status: 'unpaid', month: 'June 2026', feeType: 'Tuition Fee', description: 'Standard monthly tuition fee' },
  { id: 'f2', studentId: 's1', amount: 500, dueDate: '2026-05-15', status: 'paid', paidDate: '2026-05-12', month: 'May 2026', paymentMethod: 'Credit Card', feeType: 'Tuition Fee' },
  { id: 'f_arr_1', studentId: 's1', amount: 250, dueDate: '2026-06-10', status: 'unpaid', month: 'June 2026', feeType: 'Pending Balance', description: 'Arrears from previous term transport' },
  { id: 'f_ann_1', studentId: 's1', amount: 1500, dueDate: '2026-04-10', status: 'paid', paidDate: '2026-04-08', month: 'April 2026', feeType: 'Annual Fee', paymentMethod: 'Cash', description: 'Annual charges for academic facilities' },
  { id: 'f_pap_1', studentId: 's1', amount: 120, dueDate: '2026-06-12', status: 'unpaid', month: 'June 2026', feeType: 'Paper Fund', description: 'Term exam print and paper sheet fund' },
  
  { id: 'f3', studentId: 's2', amount: 500, dueDate: '2026-06-15', status: 'paid', paidDate: '2026-06-02', month: 'June 2026', paymentMethod: 'Bank Transfer', feeType: 'Tuition Fee' },
  { id: 'f4', studentId: 's2', amount: 500, dueDate: '2026-05-15', status: 'paid', paidDate: '2026-05-14', month: 'May 2026', paymentMethod: 'Cash', feeType: 'Tuition Fee' },
  { id: 'f_ann_2', studentId: 's2', amount: 1500, dueDate: '2026-04-10', status: 'paid', paidDate: '2026-04-09', month: 'April 2026', feeType: 'Annual Fee', paymentMethod: 'Bank Transfer' },
  { id: 'f_arr_2', studentId: 's2', amount: 350, dueDate: '2026-06-15', status: 'unpaid', month: 'June 2026', feeType: 'Pending Balance', description: 'Pending hostel mess library fine' },

  { id: 'f5', studentId: 's3', amount: 500, dueDate: '2026-06-15', status: 'unpaid', month: 'June 2026', feeType: 'Tuition Fee' },
  { id: 'f6', studentId: 's3', amount: 500, dueDate: '2026-05-15', status: 'paid', paidDate: '2026-05-11', month: 'May 2026', paymentMethod: 'Credit Card', feeType: 'Tuition Fee' },
  { id: 'f_pap_3', studentId: 's3', amount: 120, dueDate: '2026-06-12', status: 'unpaid', month: 'June 2026', feeType: 'Paper Fund' },

  { id: 'f7', studentId: 's4', amount: 600, dueDate: '2026-06-15', status: 'paid', paidDate: '2026-06-05', month: 'June 2026', paymentMethod: 'Credit Card', feeType: 'Tuition Fee' },
  { id: 'f8', studentId: 's4', amount: 600, dueDate: '2026-05-15', status: 'paid', paidDate: '2026-05-10', month: 'May 2026', paymentMethod: 'Bank Transfer', feeType: 'Tuition Fee' },

  { id: 'f9', studentId: 's5', amount: 600, dueDate: '2026-06-15', status: 'pending', month: 'June 2026', feeType: 'Tuition Fee' },
  { id: 'f10', studentId: 's5', amount: 600, dueDate: '2026-05-15', status: 'paid', paidDate: '2026-05-13', month: 'May 2026', paymentMethod: 'Cash', feeType: 'Tuition Fee' }
];

