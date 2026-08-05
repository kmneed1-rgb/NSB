import { db } from '../firebase';
import { collection, getDocs, doc, setDoc, deleteDoc, getDoc } from 'firebase/firestore';
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'sonner';
import { BarChart2, CheckCircle2, ChevronDown, ChevronUp, CreditCard, Database, Download, Edit2, LogOut, Mail, Menu, MessageSquare, Moon, Percent, Phone, Plus, PlusCircle, RefreshCw, Save, Search, Shield, ShieldAlert, Sparkles, Sun, Trash2, TrendingUp, User, Users, X, ArrowUpRight, Award, Bell, BookOpen, Calendar, CalendarDays, AlertCircle, DownloadCloud, UploadCloud, Upload, ArrowLeft, ArrowRight, Fingerprint, Send, Zap, FileText, Printer, Filter, Receipt, Clock, AlertTriangle, School } from 'lucide-react';
import { getPeriodStatus, getStatusColor } from '../lib/periodUtils';
import { addNotification } from '../lib/notificationUtils';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, Cell } from 'recharts';
import { Teacher, Student, Coordinator, Class, TimetableEntry, DayOfWeek, UserSession, FeeRecord, Attendance, Mark, AppSettings, StudentFeeData, getStudentPhoto } from '../types';
import { 
  addPayment, 
  getMonthlySummary, 
  getYearlySummary, 
  getTotalPending, 
  getTotalCollected, 
  addOtherFund, 
  getTotalOtherFunds, 
  getStudentFullAccount, 
  getGlobalStats, 
  deleteOtherFund,
  editOtherFund,
  deletePayment,
  editPayment,
  MONTHS,
  Month
} from '../lib/feeEngine';

interface PrincipalDashboardProps {
  userSession: UserSession;
  teachers: Teacher[];
  setTeachers: React.Dispatch<React.SetStateAction<Teacher[]>>;
  students: Student[];
  setStudents: React.Dispatch<React.SetStateAction<Student[]>>;
  coordinators: Coordinator[];
  setCoordinators: React.Dispatch<React.SetStateAction<Coordinator[]>>;
  classes: Class[];
  setClasses: React.Dispatch<React.SetStateAction<Class[]>>;
  timetable: TimetableEntry[];
  setTimetable: React.Dispatch<React.SetStateAction<TimetableEntry[]>>;
  fees: FeeRecord[];
  setFees: React.Dispatch<React.SetStateAction<FeeRecord[]>>;
  attendance: Attendance[];
  setAttendance: React.Dispatch<React.SetStateAction<Attendance[]>>;
  marks: Mark[];
  setMarks: React.Dispatch<React.SetStateAction<Mark[]>>;
  feeStudents: StudentFeeData[];
  setFeeStudents: React.Dispatch<React.SetStateAction<StudentFeeData[]>>;
  appSettings: AppSettings;
  setAppSettings: React.Dispatch<React.SetStateAction<AppSettings>>;
  onLogout: () => void;
  installPromptEvent: any;
  onInstallApp: () => void;
}

type TabType = 'dashboard' | 'management_hub' | 'timetable' | 'alerts' | 'settings' | 'fees' | 'registers' | 'monthly_report';

const STANDARD_SUBJECTS_LIST = [
  'Mathematics', 'English', 'Urdu', 'Science', 'Physics', 'Chemistry', 'Biology', 
  'Computer Science', 'Islamiyat', 'Pak Studies', 'Social Studies', 'Geography', 
  'History', 'General Science', 'Art', 'Physical Education'
];

import { safeStorage } from '../lib/safeStorage';

export default function PrincipalDashboard({
  userSession,
  teachers,
  setTeachers,
  students,
  setStudents,
  coordinators,
  setCoordinators,
  classes,
  setClasses,
  timetable,
  setTimetable,
  fees,
  setFees,
  attendance,
  setAttendance,
  marks,
  setMarks,
  feeStudents,
  setFeeStudents,
  appSettings,
  setAppSettings,
  onLogout,
  installPromptEvent,
  onInstallApp
}: PrincipalDashboardProps) {
  const [activeTab, setActiveTab] = useState<TabType>('dashboard');

  // Browser Back Button Support for Tabs
  useEffect(() => {
    // Sync initial state
    window.history.replaceState({ tab: activeTab }, '', '');

    const handlePopState = (event: PopStateEvent) => {
      if (event.state && event.state.tab) {
        setActiveTab(event.state.tab);
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // Update history when tab changes
  const handleTabChange = (tab: TabType) => {
    if (tab !== activeTab) {
      window.history.pushState({ tab }, '', '');
      setActiveTab(tab);
    }
  };
  const [reportClassFilter, setReportClassFilter] = useState<string>('all');
  const [selectedStudentReport, setSelectedStudentReport] = useState<Student | null>(null);
  const [reportMonth, setReportMonth] = useState<Month>(MONTHS[new Date().getMonth()]);
  const [managementSubTab, setManagementSubTab] = useState<'teachers' | 'students' | 'classes' | 'coordinators'>('teachers');
  const [registersSubTab, setRegistersSubTab] = useState<'fees' | 'attendance'>('fees');
  const [broadcastLogs, setBroadcastLogs] = useState<any[]>([]);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const updateSetting = <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => {
    setAppSettings(prev => ({ ...prev, [key]: value }));
  };

  // Theme support
  const [darkTheme, setDarkTheme] = useState<boolean>(() => {
    return safeStorage.getItem('acadamis_dark_theme') === 'true';
  });

  // Track global theme triggers in case theme toggles else where
  useEffect(() => {
    const syncTheme = () => {
      setDarkTheme(safeStorage.getItem('acadamis_dark_theme') === 'true');
    };
    window.addEventListener('acadamis_toggle_theme', syncTheme);
    return () => window.removeEventListener('acadamis_toggle_theme', syncTheme);
  }, []);

  const handleToggleTheme = () => {
    const nextVal = !darkTheme;
    setDarkTheme(nextVal);
    safeStorage.setItem('acadamis_dark_theme', String(nextVal));
    window.dispatchEvent(new Event('acadamis_toggle_theme'));
    toast.success(nextVal ? "🌙 Dark theme ho gya!" : "☀️ Light theme ho gya!");
  };

  // Search/Filter States
  const [teacherSearch, setTeacherSearch] = useState('');
  const [studentSearch, setStudentSearch] = useState('');
  const [coordinatorSearch, setCoordinatorSearch] = useState('');
  const [studentClassFilter, setStudentClassFilter] = useState('all');
  const [classSearch, setClassSearch] = useState('');
  const [attendanceFilterClass, setAttendanceFilterClass] = useState('all');
  const [attendanceFilterDate, setAttendanceFilterDate] = useState(new Date().toISOString().split('T')[0]);
  const [attendanceShowAllDates, setAttendanceShowAllDates] = useState(true);
  const [attendanceSearch, setAttendanceSearch] = useState('');
  const [recordsFeeSearch, setRecordsFeeSearch] = useState('');
  const [recordsFeeClassFilter, setRecordsFeeClassFilter] = useState('all');
  const [recordsFeeViewMode, setRecordsFeeViewMode] = useState<'roster' | 'receipts'>('roster');
  const [showQuickCollectModal, setShowQuickCollectModal] = useState(false);
  const [quickCollectStudentId, setQuickCollectStudentId] = useState('');
  const [quickCollectMonth, setQuickCollectMonth] = useState(`${MONTHS[new Date().getMonth()]} ${new Date().getFullYear()}`);
  const [quickCollectAmount, setQuickCollectAmount] = useState<string>('5500');
  const [quickCollectPaymentMethod, setQuickCollectPaymentMethod] = useState('Cash');
  const [quickCollectFeeType, setQuickCollectFeeType] = useState('Tuition Fee');
  const [quickCollectNotes, setQuickCollectNotes] = useState('');
  const [expandedStudentFeeId, setExpandedStudentFeeId] = useState<string | null>(null);

  const [showMarkAttendanceModal, setShowMarkAttendanceModal] = useState(false);
  const [markAttendanceClassId, setMarkAttendanceClassId] = useState('');
  const [markAttRecords, setMarkAttRecords] = useState<{studentId: string, status: 'present' | 'absent' | 'late' | 'leave'}[]>([]);
  const [attendanceMode, setAttendanceMode] = useState<'grid' | 'list' | 'swipe'>('grid');
  const [activeSwipeIndex, setActiveSwipeIndex] = useState<number>(0);
  const [attendanceDisplayLimit, setAttendanceDisplayLimit] = useState(50);
  const [feesDisplayLimit, setFeesDisplayLimit] = useState(50);

  // Memoized Data & Optimized Lookups for performance
  const studentsMap = React.useMemo(() => {
    const map = new Map<string, Student>();
    students.forEach(s => map.set(String(s.id), s));
    return map;
  }, [students]);

  const teachersMap = React.useMemo(() => {
    const map = new Map<string, Teacher>();
    teachers.forEach(t => map.set(String(t.id), t));
    return map;
  }, [teachers]);

  const coordinatorsMap = React.useMemo(() => {
    const map = new Map<string, Coordinator>();
    coordinators.forEach(c => map.set(String(c.id), c));
    return map;
  }, [coordinators]);

  const timetableMap = React.useMemo(() => {
    const map = new Map<string, TimetableEntry>();
    timetable.forEach(tt => map.set(String(tt.id), tt));
    return map;
  }, [timetable]);

  const feeStudentsMap = React.useMemo(() => {
    const map = new Map<string, StudentFeeData>();
    feeStudents.forEach(fs => map.set(String(fs.id), fs));
    return map;
  }, [feeStudents]);

  const classesMap = React.useMemo(() => {
    const map = new Map<string, Class>();
    classes.forEach(c => map.set(String(c.id), c));
    return map;
  }, [classes]);

  const filteredAttendance = React.useMemo(() => {
    return attendance.filter(record => {
      const student = studentsMap.get(String(record.studentId));
      const sName = (student?.name || (record as any).studentName || '').toLowerCase();
      const matchesClass = attendanceFilterClass === 'all' || student?.classId === attendanceFilterClass;
      const matchesDate = attendanceShowAllDates || record.date === attendanceFilterDate;
      const matchesSearch = !attendanceSearch || sName.includes(attendanceSearch.toLowerCase());
      return matchesClass && matchesDate && matchesSearch;
    }).slice().reverse();
  }, [attendance, studentsMap, attendanceFilterClass, attendanceFilterDate, attendanceShowAllDates, attendanceSearch]);

  const filteredFeesRoster = React.useMemo(() => {
    return students.filter(s => {
      if (recordsFeeClassFilter !== 'all' && s.classId !== recordsFeeClassFilter) return false;
      if (recordsFeeSearch.trim()) {
        const q = recordsFeeSearch.toLowerCase();
        const classObj = classesMap.get(String(s.classId));
        const classNameStr = classObj ? `${classObj.className} ${classObj.section}`.toLowerCase() : '';
        return s.name.toLowerCase().includes(q) || (s.rollNumber && s.rollNumber.toLowerCase().includes(q)) || classNameStr.includes(q);
      }
      return true;
    });
  }, [students, classesMap, recordsFeeClassFilter, recordsFeeSearch]);

  const filteredFeesReceipts = React.useMemo(() => {
    return fees.filter(f => {
      const student = studentsMap.get(String(f.studentId));
      if (recordsFeeClassFilter !== 'all' && student && student.classId !== recordsFeeClassFilter) return false;
      if (!recordsFeeSearch.trim()) return true;

      const feeStudent = feeStudentsMap.get(String(f.studentId));
      const sName = (student?.name || feeStudent?.name || (f as any).studentName || '').toLowerCase();
      const sMonth = (f.month || '').toLowerCase();
      const sId = String(f.id).toLowerCase();
      const q = recordsFeeSearch.toLowerCase();
      return sName.includes(q) || sMonth.includes(q) || sId.includes(q);
    }).slice().reverse();
  }, [fees, studentsMap, feeStudentsMap, recordsFeeClassFilter, recordsFeeSearch]);

  const visibleAttendance = React.useMemo(() => {
    return filteredAttendance.slice(0, attendanceDisplayLimit);
  }, [filteredAttendance, attendanceDisplayLimit]);

  const visibleFeesReceipts = React.useMemo(() => {
    return filteredFeesReceipts.slice(0, feesDisplayLimit);
  }, [filteredFeesReceipts, feesDisplayLimit]);

  const handleRecordQuickFee = () => {
    if (!quickCollectStudentId) {
      toast.error("Please select a student first.");
      return;
    }
    const amountNum = Number(quickCollectAmount);
    if (!amountNum || amountNum <= 0) {
      toast.error("Please enter a valid fee amount.");
      return;
    }

    const studentObj = students.find(s => String(s.id) === String(quickCollectStudentId));
    const feeStudentObj = feeStudents.find(fs => String(fs.id) === String(quickCollectStudentId));
    const studentName = studentObj?.name || feeStudentObj?.name || 'Student';

    const newFeeRecord: FeeRecord = {
      id: 'REC_' + Date.now().toString(36).toUpperCase(),
      studentId: quickCollectStudentId,
      amount: amountNum,
      dueDate: new Date().toISOString().split('T')[0],
      status: 'paid',
      paidDate: new Date().toISOString().split('T')[0],
      month: quickCollectMonth || `${MONTHS[new Date().getMonth()]} ${new Date().getFullYear()}`,
      paymentMethod: quickCollectPaymentMethod,
      feeType: quickCollectFeeType,
      description: quickCollectNotes || undefined,
    };

    setFees(prev => [newFeeRecord, ...prev]);

    if (feeStudentObj) {
      setFeeStudents(prev => prev.map(fs => {
        if (String(fs.id) === String(quickCollectStudentId)) {
          return {
            ...fs,
            payments: [
              ...(fs.payments || []),
              {
                id: newFeeRecord.id,
                month: quickCollectMonth,
                year: new Date().getFullYear(),
                amount: amountNum,
                date: new Date().toISOString().split('T')[0],
              }
            ]
          };
        }
        return fs;
      }));
    }

    setShowQuickCollectModal(false);
    setQuickCollectNotes('');
    toast.success(`Fee Rs. ${amountNum.toLocaleString()} collected for ${studentName} (${quickCollectMonth})! Receipt #${newFeeRecord.id}`);
  };

  // PRINCIPAL ATTENDANCE MARKING ENGINE
  useEffect(() => {
    if (showMarkAttendanceModal && markAttendanceClassId) {
      const classStudents = students.filter(s => s.classId === markAttendanceClassId);
      setMarkAttRecords(classStudents.map(s => ({
        studentId: s.id,
        status: 'present'
      })));
    }
  }, [markAttendanceClassId, showMarkAttendanceModal, students]);

  const handleExportJSON = () => {
    const exportData = {
      version: "1.1",
      schoolName: "NSB Academic System",
      exportDate: new Date().toISOString(),
      teachers,
      classes,
      students,
      attendance,
      fees,
      coordinators,
      marks,
      timetable,
      feeStudents,
      appSettings
    };
    
    const jsonString = JSON.stringify(exportData, null, 2);
    const blob = new Blob([jsonString], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    
    // Formatting current date for filename as requested
    const now = new Date();
    const dateStr = now.toLocaleDateString('en-GB').split('/').join('-'); // DD-MM-YYYY
    const fileName = `nsb1_school_${dateStr}.json`;
    
    const link = document.createElement("a");
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    
    toast.success(`Data exported to ${fileName}`);
  };

  const handleImportJSON = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        const data = JSON.parse(content);

        // Basic validation
        if (!data.students || !data.teachers || !data.classes) {
          throw new Error("Invalid backup file format. Essential data missing.");
        }

        // Confirm with user
        const confirmResult = window.confirm("WARNING: Uploading this backup will overwrite ALL current school records. Are you sure you want to proceed?");
        if (!confirmResult) return;

        // Systematic update
        if (data.students) setStudents(data.students);
        if (data.teachers) setTeachers(data.teachers);
        if (data.classes) setClasses(data.classes);
        if (data.attendance) setAttendance(data.attendance);
        if (data.fees) setFees(data.fees);
        if (data.coordinators) setCoordinators(data.coordinators);
        if (data.marks) setMarks(data.marks);
        if (data.timetable) setTimetable(data.timetable);
        if (data.feeStudents) setFeeStudents(data.feeStudents);
        if (data.appSettings) setAppSettings(data.appSettings);

        toast.success("System database restored successfully from backup!");
      } catch (err: any) {
        toast.error(`Import Failed: ${err.message || 'Unknown error'}`);
        console.error("Import error:", err);
      }
    };
    reader.readAsText(file);
    // Reset input so same file can be uploaded again
    event.target.value = '';
  };

  const handlePrincipalMarkAttendance = () => {
    if (!markAttendanceClassId) {
      toast.error("Please select a class first.");
      return;
    }

    const newRecords: Attendance[] = markAttRecords.map(rec => ({
      id: Date.now() + Math.random().toString(36).substr(2, 9),
      studentId: rec.studentId,
      status: rec.status,
      date: attendanceFilterDate,
    }));

    // Remove existing records for same date/students to avoid duplicates
    const studentIds = markAttRecords.map(r => r.studentId);
    setAttendance(prev => [
      ...prev.filter(a => !(a.date === attendanceFilterDate && studentIds.includes(a.studentId))),
      ...newRecords
    ]);
    
    setShowMarkAttendanceModal(false);
    toast.success(`Attendance marked for ${markAttendanceClassId} on ${attendanceFilterDate}`);
  };

  const handleSendIndividualWhatsApp = (student: Student, date: string) => {
    const sClass = classes.find(c => c.id === student.classId);
    const className = sClass ? `${sClass.className} - ${sClass.section}` : 'N/A';

    const template = appSettings.absentTemplate || 
      "Greetings, Respected Parent! We noticed that your child {student_name} (Roll: {roll_number}) has been marked ABSENT on date {date}. Kindly clarify the reason or contact the school office. Principal.";
    
    const message = template
      .replace(/{student_name}/g, student.name)
      .replace(/{name}/g, student.name)
      .replace(/{class_name}/g, className)
      .replace(/{roll_number}/g, student.rollNumber || 'N/A')
      .replace(/{date}/g, date);

    const phone = student.parentPhone || student.studentPhone || '';
    const cleanPhone = phone.replace(/\D/g, '');
    
    if (!cleanPhone) {
      toast.error(`No phone number found for ${student.name}. Please add it in student profile.`);
      return;
    }

    let countryCodePhone = cleanPhone;
    if (countryCodePhone.startsWith('0')) {
      countryCodePhone = '92' + countryCodePhone.substring(1);
    } else if (!countryCodePhone.startsWith('92') && countryCodePhone.length === 10) {
      countryCodePhone = '92' + countryCodePhone;
    }

    const waUrl = `https://wa.me/${countryCodePhone}?text=${encodeURIComponent(message)}`;
    
    if (appSettings.autoWhatsAppRedirect) {
      window.open(waUrl, '_blank');
      toast.success(`Opening WhatsApp for ${student.name}'s parent`);
    } else {
      toast.custom(
        (t) => (
          <div className="flex items-center gap-3 bg-white text-slate-900 p-4 rounded-xl shadow-xl border border-slate-200">
            <span className="text-xs font-bold">Message ready for {student.name}</span>
            <button 
              onClick={() => {
                window.open(waUrl, '_blank');
                toast.dismiss(t);
              }}
              className="bg-emerald-600 text-white px-3 py-1 rounded-md text-[10px] font-black uppercase cursor-pointer"
            >
              Send
            </button>
          </div>
        )
      );
    }
  };

  const handlePrintSummary = () => {
    window.print();
  };

  const handleDownloadSummary = () => {
    const filtered = students.filter(s => reportClassFilter === 'all' || s.classId === reportClassFilter);
    
    let csv = "Student Name,Roll Number,Class,Fee Status,Test Average,Pending Amount\n";
    
    filtered.forEach(s => {
      const sClass = classes.find(c => c.id === s.classId);
      const feeData = feeStudents.find(fs => String(fs.id) === String(s.id));
      const feeSummary = feeData ? getMonthlySummary(feeData, reportMonth, new Date().getFullYear()) : null;
      const totalPending = feeData ? getTotalPending(feeData) + getTotalOtherFunds(feeData) : 0;
      
      const studentMarks = marks.filter(m => m.studentId === s.id);
      const avg = studentMarks.length > 0 
        ? Math.round(studentMarks.reduce((sum, m) => sum + Number(m.marksObtained), 0) / studentMarks.length)
        : 0;

      const feeStatus = feeSummary?.pending === 0 ? "Paid" : "Unpaid";
      
      csv += `"${s.name}","${s.rollNumber || 'N/A'}","${sClass?.className || 'N/A'}","${feeStatus}","${avg}%","Rs. ${totalPending}"\n`;
    });

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `NSB1_School_Summary_${reportMonth}_${new Date().getFullYear()}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("Summary report downloaded successfully.");
  };

  const handleSendFeeNotification = (student: Student | StudentFeeData, type: 'payment' | 'charge' | 'reminder', amount: number, details: string) => {
    // Find fee data to get total pending
    const fStudent = feeStudents.find(fs => String(fs.id) === String(student.id));
    let totalPending = fStudent ? getTotalPending(fStudent) + getTotalOtherFunds(fStudent) : 0;
    
    // Adjust pending balance based on the current action because state updates are async
    if (type === 'payment') {
      totalPending = Math.max(0, totalPending - amount);
    } else if (type === 'charge') {
      totalPending = totalPending + amount;
    }

    const classId = (student as any).classId;
    const sClass = classId ? classes.find(c => c.id === classId) : null;
    const className = sClass ? `${sClass.className} - ${sClass.section}` : ((student as any).class || 'N/A');

    const template = type === 'payment' 
      ? `Greetings! We have received a payment of Rs. ${amount} for ${details} from ${student.name} (${className}). Your remaining balance is Rs. ${totalPending}. Thank you for your cooperation. NSB1 School.`
      : type === 'charge'
      ? `Greetings! A charge of Rs. ${amount} has been added for ${details} to ${student.name}'s (${className}) school account. Your total pending balance is Rs. ${totalPending}. Please contact office for details. NSB1 School.`
      : `Greetings! This is a reminder regarding the pending school fees for ${student.name} (${className}). Total outstanding balance is Rs. ${totalPending}. Please settle the dues at your earliest convenience. NSB1 School.`;
    
    // Check both potential phone fields
    const phone = (student as any).parentPhone || (student as any).studentPhone || (student as any).phone || '';
    const cleanPhone = phone.replace(/\D/g, '');
    
    if (!cleanPhone) {
      toast.error(`No phone number found for ${student.name}. Notification skipped.`);
      return;
    }

    let countryCodePhone = cleanPhone;
    if (countryCodePhone.startsWith('0')) {
      countryCodePhone = '92' + countryCodePhone.substring(1);
    } else if (!countryCodePhone.startsWith('92') && countryCodePhone.length === 10) {
      countryCodePhone = '92' + countryCodePhone;
    }

    const waUrl = `https://wa.me/${countryCodePhone}?text=${encodeURIComponent(template)}`;
    
    if (appSettings.autoWhatsAppRedirect) {
      window.open(waUrl, '_blank');
      toast.success(`Opening WhatsApp for ${student.name}'s fee notification`);
    } else {
      toast.custom(
        (t) => (
          <div className="flex items-center gap-3 bg-white text-slate-900 p-4 rounded-xl shadow-xl border border-slate-200">
            <span className="text-xs font-bold">Fee alert ready for {student.name}</span>
            <button 
              onClick={() => {
                window.open(waUrl, '_blank');
                toast.dismiss(t);
              }}
              className="bg-indigo-600 text-white px-3 py-1 rounded-md text-[10px] font-black uppercase cursor-pointer"
            >
              Send
            </button>
          </div>
        )
      );
    }
  };

  const [bulkWAModal, setBulkWAModal] = useState<{ isOpen: boolean; absents: (Student & { attendanceDate: string })[] }>({ isOpen: false, absents: [] });
  const [bulkWAClassFilter, setBulkWAClassFilter] = useState('all');

  const handleSendBulkAbsenceWhatsApp = () => {
    const recordsForDate = attendance.filter(a => {
      const matchesDate = a.date === attendanceFilterDate;
      const student = students.find(s => s.id === a.studentId);
      const matchesClass = attendanceFilterClass === 'all' || student?.classId === attendanceFilterClass;
      return matchesDate && matchesClass && a.status === 'absent';
    });
    
    if (recordsForDate.length === 0) {
      toast.error(`No absent students found for ${attendanceFilterClass === 'all' ? 'any class' : 'this class'} on ${attendanceFilterDate}.`);
      return;
    }

    const absentStudentsWithMetadata = recordsForDate.map(rec => {
      const student = students.find(s => s.id === rec.studentId);
      return { ...student!, attendanceDate: rec.date };
    }).filter(s => !!s);

    setBulkWAModal({ isOpen: true, absents: absentStudentsWithMetadata });
  };

  const [feeSearch, setFeeSearch] = useState('');
  const [feeClassFilter, setFeeClassFilter] = useState('all');
  const [selectedStudentForFee, setSelectedStudentForFee] = useState<string>(() => String(feeStudents[0]?.id || ''));
  const [isCashPayment, setIsCashPayment] = useState(true);
  const [selectedStudentForLedger, setSelectedStudentForLedger] = useState('');
  
  const [feePaymentModal, setFeePaymentModal] = useState<{isOpen: boolean; studentId: string; month: string; pending: number; previousArrears: number; amount: string; year: number}>({ isOpen: false, studentId: '', month: '', pending: 0, previousArrears: 0, amount: '', year: 2026 });
  
  const [feeEditModal, setFeeEditModal] = useState<{isOpen: boolean; type: 'payment' | 'other'; recordId: string; studentId: string; amount: string; desc: string}>({ isOpen: false, type: 'payment', recordId: '', studentId: '', amount: '', desc: '' });

  const [deleteConfirmModal, setDeleteConfirmModal] = useState<{isOpen: boolean, type: string, id: string, message: string}>({ isOpen: false, type: '', id: '', message: '' });

  // SATH HI Parent Notification Popup / Modal states
  const [feeNotificationPopup, setFeeNotificationPopup] = useState<{
    studentName: string;
    parentPhone: string;
    guardianName: string;
    amount: number;
    feeType: string;
    month: string;
    dueDate: string;
    messageText: string;
  } | null>(null);

  // --- INTERACTIVE CLASS INSIGHTS STATE ---
  const [selectedClassForDetails, setSelectedClassForDetails] = useState<Class | null>(null);
  const [isClassDetailModalOpen, setIsClassDetailModalOpen] = useState(false);

  // 2nd, 5th, 7th monthly notifications cockpit states
  const [reminderSelectedDate, setReminderSelectedDate] = useState<'2' | '5' | '7'>('2');
  const [reminderSendingProgress, setReminderSendingProgress] = useState<boolean>(false);
  const [reminderReport, setReminderReport] = useState<Array<{
    studentName: string;
    parentPhone: string;
    amount: number;
    text: string;
    status: string;
  }> | null>(null);

  // custom values for each category
  const [paperFundVal, setPaperFundVal] = useState('150');
  const [annualFeeVal, setAnnualFeeVal] = useState('500');
  const [miscFeeVal, setMiscFeeVal] = useState('200');

  // Modals / Form editing state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalType, setModalType] = useState<'teacher' | 'student' | 'class' | 'timetable' | 'coordinator'>('teacher');
  const [modalMode, setModalMode] = useState<'add' | 'edit'>('add');
  const [currentId, setCurrentId] = useState<string | null>(null);

  // Validation state
  const [formErrors, setFormErrors] = useState<string[]>([]);
  const [formStep, setFormStep] = useState(1);

  // Individual Form Fields
  // Teacher
  const [tName, setTName] = useState('');
  const [tEmail, setTEmail] = useState('');
  const [tSubject, setTSubject] = useState('');
  const [tPhone, setTPhone] = useState('');
  const [tPassword, setTPassword] = useState('nsb123');
  const [tUsername, setTUsername] = useState('');

  // Student
  const [sName, setSName] = useState('');
  const [sEmail, setSEmail] = useState('');
  const [sClassId, setSClassId] = useState('');
  const [sRoll, setSRoll] = useState('');
  const [sParentPhone, setSParentPhone] = useState('');
  const [sStudentPhone, setSStudentPhone] = useState('');
  const [sBaseFee, setSBaseFee] = useState('0');
  const [sEnrollmentMonth, setSEnrollmentMonth] = useState('January');
  const [sPassword, setSPassword] = useState('nsb123');
  const [sUsername, setSUsername] = useState('');
  const [sIsAcademy, setSIsAcademy] = useState(false);
  const [sAcademySubjects, setSAcademySubjects] = useState('');
  const [sPhoto, setSPhoto] = useState<string | undefined>(undefined);
  const [isConvertingPhoto, setIsConvertingPhoto] = useState(false);

  // Class
  const [cClassName, setCClassName] = useState('');
  const [cSection, setCSection] = useState('');
  const [cTeacherId, setCTeacherId] = useState('');
  const [cSubjects, setCSubjects] = useState<string[]>([]);
  const [showOtherSubjectInput, setShowOtherSubjectInput] = useState(false);
  const [manualSubjectName, setManualSubjectName] = useState('');

  // Timetable Form
  const [ttClassId, setTtClassId] = useState('');
  const [ttDay, setTtDay] = useState<DayOfWeek>('Monday');
  const [ttPeriod, setTtPeriod] = useState('Period 1');
  const [ttTime, setTtTime] = useState('08:30 AM - 09:30 AM');
  const [ttSubject, setTtSubject] = useState('');
  const [ttTeacherId, setTtTeacherId] = useState('');
  const [isCustomPeriod, setIsCustomPeriod] = useState(false);

  // Active Timetable View Filter
  const [selectedTimetableClass, setSelectedTimetableClass] = useState<string>(classes[0]?.id || '');
  const [selectedSlot, setSelectedSlot] = useState<{period: string, day: string} | null>(null);
  const [periodToDeletePending, setPeriodToDeletePending] = useState<{period: string, day: string} | null>(null);
  const [draggedSlot, setDraggedSlot] = useState<{day: DayOfWeek, period: string, entry: TimetableEntry | undefined} | null>(null);

  const handleDragStart = (e: React.DragEvent, slotInfo: {day: DayOfWeek, period: string, entry: TimetableEntry | undefined}) => {
    setDraggedSlot(slotInfo);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault(); // Necessary to allow drop
  };

  const handleDrop = (e: React.DragEvent, targetSlotInfo: {day: DayOfWeek, period: string}) => {
    e.preventDefault();
    if (!draggedSlot) return;

    const { day: sourceDay, period: sourcePeriod, entry: sourceEntry } = draggedSlot;
    const { day: targetDay, period: targetPeriod } = targetSlotInfo;

    if (sourceDay === targetDay && sourcePeriod === targetPeriod) return;

    // Perform swap/move
    setTimetable(prev => {
      let updated = [...prev];
      
      // Remove source entry
      updated = updated.filter(tt => !(tt.classId === selectedTimetableClass && tt.day === sourceDay && tt.period === sourcePeriod));
      
      // Remove target entry if exists (overwriting)
      updated = updated.filter(tt => !(tt.classId === selectedTimetableClass && tt.day === targetDay && tt.period === targetPeriod));
      
      // Add moved entry
      if (sourceEntry) {
        updated.push({
          ...sourceEntry,
          day: targetDay,
          period: targetPeriod
        });
      }

      return updated;
    });

    setDraggedSlot(null);
  };

  const getPeriodColor = (period: string) => {
    const key = `${selectedTimetableClass}_${period}`;
    return appSettings.periodColors[key] || '#4f46e5'; // default Indigo color
  };

  const convertToWebP = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');
          if (!ctx) return reject('Failed to get canvas context');

          // Limit size to save Firestore bandwidth and storage
          const maxWidth = 300;
          const scale = Math.min(1, maxWidth / img.width);
          canvas.width = img.width * scale;
          canvas.height = img.height * scale;

          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          // 0.7 quality is excellent for mobile displays while keeping size minimal
          const webpBase64 = canvas.toDataURL('image/webp', 0.7);
          resolve(webpBase64);
        };
        img.onerror = () => reject('Image load error');
        img.src = e.target?.result as string;
      };
      reader.onerror = () => reject('File read error');
      reader.readAsDataURL(file);
    });
  };

  const handlePhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image size must be less than 5MB");
      return;
    }

    try {
      setIsConvertingPhoto(true);
      const webpData = await convertToWebP(file);
      setSPhoto(webpData);
      toast.success("Photo compressed and converted to WebP successfully!");
    } catch (err) {
      console.error(err);
      toast.error("Failed to process image");
    } finally {
      setIsConvertingPhoto(false);
    }
  };

  const defaultPeriods = ['Period 1', 'Period 2', 'Period 3', 'Period 4', 'Period 5'];
  const allPeriods = [...defaultPeriods, ...(appSettings.extraPeriods[selectedTimetableClass] || [])].filter(
    p => !(appSettings.deletedPeriods[selectedTimetableClass] || []).includes(p)
  );

  const handleBackupDatabase = () => {
    try {
      const backupData = {
        timestamp: new Date().toISOString(),
        appName: "AcadaMis - NSB1 School System",
        data: {
          teachers,
          classes,
          students,
          coordinators,
          timetable,
          fees,
          broadcastLogs,
          appSettings
        }
      };

      const dataStr = JSON.stringify(backupData, null, 2);
      const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);
      
      const exportFileDefaultName = `nsb1_school_backup_${new Date().toISOString().split('T')[0]}.json`;
      
      const linkElement = document.createElement('a');
      linkElement.setAttribute('href', dataUri);
      linkElement.setAttribute('download', exportFileDefaultName);
      linkElement.click();
      
      toast.success("Database backup generated and download started!");
    } catch (error) {
      console.error("Backup failed:", error);
      toast.error("Failed to generate database backup.");
    }
  };

  const handleDeletePeriod = (periodToDelete: string, day: string) => {
    // We only need to check if we should block deletion based on total slots if really necessary,
    // but the user's request focused on *per-day* deletion.
    setPeriodToDeletePending({period: periodToDelete, day});
  };

  const executeDeletePeriod = (periodToDelete: string, day: string) => {
    // Only remove timetable entries for this period for this class AND day.
    const updatedTimetable = timetable.filter(
      tt => !(tt.classId === selectedTimetableClass && tt.period === periodToDelete && tt.day === day)
    );
    setTimetable(updatedTimetable);

    toast.success(`Removed "${periodToDelete}" from ${day}'s timetable.`);
    setPeriodToDeletePending(null);
  };

  // Compact list expanded states for responsive mobile optimization
  const [expandedTeachers, setExpandedTeachers] = useState<Record<string, boolean>>({});
  const [expandedStudents, setExpandedStudents] = useState<Record<string, boolean>>({});
  const [expandedClasses, setExpandedClasses] = useState<Record<string, boolean>>({});
  const [expandedCoordinators, setExpandedCoordinators] = useState<Record<string, boolean>>({});

  const toggleTeacherExpanded = (id: string) => {
    setExpandedTeachers(prev => ({ ...prev, [id]: !prev[id] }));
  };
  const toggleCoordinatorExpanded = (id: string) => {
    setExpandedCoordinators(prev => ({ ...prev, [id]: !prev[id] }));
  };
  const toggleStudentExpanded = (id: string) => {
    setExpandedStudents(prev => ({ ...prev, [id]: !prev[id] }));
  };
  const toggleClassExpanded = (id: string) => {
    setExpandedClasses(prev => ({ ...prev, [id]: !prev[id] }));
  };

  // Reset forms helper
  const resetFormFields = () => {
    setTName('');
    setTEmail('');
    setTSubject('');
    setTPhone('');
    setTPassword('nsb123');
    setTUsername('');

    setSName('');
    setSEmail('');
    setSClassId(classes[0]?.id || '');
    setSRoll('');
    setSParentPhone('');
    setSStudentPhone('');
    setSBaseFee('0');
    setSEnrollmentMonth('January');
    setSPassword('nsb123');
    setSUsername('');
    setSIsAcademy(false);
    setSAcademySubjects('');
    setSPhoto(undefined);
    setIsConvertingPhoto(false);

    setCClassName('');
    setCSection('');
    setCTeacherId(teachers[0]?.id || '');
    setCSubjects([]);
    setShowOtherSubjectInput(false);
    setManualSubjectName('');

    setTtClassId(classes[0]?.id || selectedTimetableClass || '');
    setTtDay('Monday');
    setTtPeriod('Period 1');
    setTtTime('08:30 AM - 09:30 AM');
    setTtSubject('');
    setTtTeacherId(teachers[0]?.id || '');

    setFormErrors([]);
    setCurrentId(null);
    setIsCustomPeriod(false);
  };

  const openAddModal = (type: 'teacher' | 'student' | 'class' | 'timetable' | 'coordinator') => {
    setModalType(type);
    setModalMode('add');
    resetFormFields();

    // Auto-pre-populate dropdown variables based on latest loads
    if (type === 'student' && classes.length > 0) {
      setSClassId(classes[0].id);
    }
    if (type === 'class' && teachers.length > 0) {
      setCTeacherId(teachers[0].id);
    }
    if (type === 'timetable') {
      if (classes.length > 0) {
        setTtClassId(selectedTimetableClass || classes[0].id);
      }
      if (teachers.length > 0) {
        setTtTeacherId(teachers[0].id);
      }
    }
    setIsModalOpen(true);
  };

  const openEditModal = (type: 'teacher' | 'student' | 'class' | 'timetable' | 'coordinator', id: string) => {
    setModalType(type);
    setModalMode('edit');
    setCurrentId(id);
    setFormErrors([]);

    if (type === 'teacher') {
      const match = teachers.find(t => t.id === id);
      if (match) {
        setTName(match.name);
        setTEmail(match.email);
        setTSubject(match.subject);
        setTPhone(match.phone);
        setTPassword(match.password || 'nsb123');
        setTUsername(match.username || '');
      }
    } else if (type === 'coordinator') {
      const match = coordinators.find(c => c.id === id);
      if (match) {
        setTName(match.name);
        setTEmail(match.email || '');
        setTSubject('Academic Coordinator');
        setTPhone(match.phone || '');
        setTPassword(match.password || 'nsb123');
        setTUsername(match.username || '');
      }
    } else if (type === 'student') {
      const match = students.find(s => s.id === id);
      if (match) {
        setSName(match.name);
        setSEmail(match.email);
        setSClassId(match.classId);
        setSRoll(match.rollNumber);
        setSParentPhone(match.parentPhone);
        setSStudentPhone(match.studentPhone || '');
        setSBaseFee(match.baseFee?.toString() || '0');
        setSEnrollmentMonth(match.enrollmentMonth || 'January');
        setSPassword(match.password || 'nsb123');
        setSUsername(match.username || '');
        setSIsAcademy(match.category === 'Academy');
        setSAcademySubjects(match.academySubjects?.join(', ') || '');
        setSPhoto(match.photo);
      }
    } else if (type === 'class') {
      const match = classes.find(c => c.id === id);
      if (match) {
        setCClassName(match.className);
        setCSection(match.section);
        setCTeacherId(match.classTeacherId);
        setCSubjects(match.subjects || []);
      }
    } else if (type === 'timetable') {
      const match = timetable.find(tt => tt.id === id);
      if (match) {
        setTtClassId(match.classId);
        setTtDay(match.day);
        setTtPeriod(match.period);
        setTtTime(match.time);
        setTtSubject(match.subject);
        setTtTeacherId(match.teacherId);
        const defaultPeriods = ['Period 1', 'Period 2', 'Period 3', 'Period 4', 'Period 5'];
        setIsCustomPeriod(!defaultPeriods.includes(match.period));
      }
    }
    setIsModalOpen(true);
  };

  // Validators
  const validateForm = (): boolean => {
    const errors: string[] = [];
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (modalType === 'teacher') {
      if (!tName.trim()) errors.push('Name is required.');
      if (tEmail.trim() && !emailRegex.test(tEmail)) errors.push('A valid email is required if provided.');
      if (!tSubject.trim()) errors.push('Teaching subject is required.');
      if (!tPhone.trim()) errors.push('Phone is required.');
      if (!tPassword.trim()) errors.push('Password is required.');

      // Check unique email except current editing
      const emailTaken = tEmail.trim() && teachers.some(t => t.email?.toLowerCase() === tEmail.toLowerCase().trim() && t.id !== currentId);
      if (emailTaken) errors.push('This email is already taken by another teacher.');
    } 
    
    else if (modalType === 'coordinator') {
      if (!tName.trim()) errors.push('Name is required.');
      if (tEmail.trim() && !emailRegex.test(tEmail)) errors.push('A valid email is required if provided.');
      if (!tPassword.trim()) errors.push('Password is required.');

      // Check unique email except current editing
      const emailTaken = tEmail.trim() && coordinators.some(c => c.email?.toLowerCase() === tEmail.toLowerCase().trim() && c.id !== currentId);
      if (emailTaken) errors.push('This email is already taken by another coordinator.');
    } 
    
    else if (modalType === 'student') {
      if (!sName.trim()) errors.push('Student name is required.');
      if (sEmail.trim() && !emailRegex.test(sEmail)) errors.push('A valid email is required if provided.');
      if (!sClassId) errors.push('Class must be selected.');
      if (!sRoll.trim()) errors.push('Roll number is required.');
      if (!sParentPhone.trim()) errors.push('Parent contact phone is required.');
      if (!sPassword.trim()) errors.push('Password is required.');

      // Check unique email
      const emailTaken = sEmail.trim() && students.some(s => s.email?.toLowerCase() === sEmail.toLowerCase().trim() && s.id !== currentId);
      if (emailTaken) errors.push('This email is already taken by another student.');

      // Check unique roll number within same class
      const rollTaken = students.some(
        s => s.classId === sClassId && 
             (s.rollNumber || '').trim() === sRoll.trim() && 
             s.id !== currentId
      );
      if (rollTaken) errors.push('This roll number is already assigned to a student in this class.');
    } 
    
    else if (modalType === 'class') {
      if (!cClassName.trim()) errors.push('Class name (e.g. Grade 10) is required.');
      if (!cSection.trim()) errors.push('Section (e.g. A) is required.');
      if (!cTeacherId) errors.push('A class teacher must be assigned.');

      // Check duplicate Class + Section
      const classExists = classes.some(
        c => (c.className?.toLowerCase() || '') === cClassName.toLowerCase().trim() &&
             (c.section?.toLowerCase() || '') === cSection.toLowerCase().trim() &&
             c.id !== currentId
      );
      if (classExists) errors.push('This Class Name & Section combination already exists.');
    } 
    
    else if (modalType === 'timetable') {
      if (!ttClassId) errors.push('Class is required.');
      if (!ttSubject.trim()) errors.push('Subject name is required.');
      if (!ttTeacherId) errors.push('Assigned teacher is required.');
      if (!ttPeriod) errors.push('Period selection is required.');
      
      // Check if teacher is double booked at the same day/period
      const doubleBooked = timetable.some(
        tt => tt.day === ttDay &&
             tt.period === ttPeriod &&
             tt.teacherId === ttTeacherId &&
             tt.id !== currentId
      );
      if (doubleBooked) {
        const teacherObj = teachers.find(t => t.id === ttTeacherId);
        errors.push(`${teacherObj?.name || 'Assigned Teacher'} is already scheduled to teach some other class during ${ttDay} ${ttPeriod}.`);
      }

      // Check if class itself is double booked at the same day/period
      const classDoubleBooked = timetable.some(
        tt => tt.day === ttDay &&
             tt.period === ttPeriod &&
             tt.classId === ttClassId &&
             tt.id !== currentId
      );
      if (classDoubleBooked) {
        errors.push(`This class already has a scheduled subject during ${ttDay} ${ttPeriod}.`);
      }
    }

    setFormErrors(errors);
    return errors.length === 0;
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    if (modalType === 'teacher') {
      if (modalMode === 'add') {
        const id = 't_' + Date.now();
        const newTeacher: Teacher = {
          id,
          name: tName.trim(),
          email: tEmail.toLowerCase().trim(),
          username: tName.trim(), 
          password: tPassword,
          subject: tSubject.trim(),
          phone: tPhone.trim(),
        };
        setTeachers([...teachers, newTeacher]);
        toast.success("Teacher profile added successfully!");
      } else {
        setTeachers(teachers.map(t => t.id === currentId ? {
          ...t,
          name: tName.trim(),
          email: tEmail.toLowerCase().trim(),
          subject: tSubject.trim(),
          phone: tPhone.trim(),
          password: tPassword,
          username: tName.trim(),
        } : t));
        toast.success("Teacher profile updated successfully!");
      }
    } 
    
    else if (modalType === 'coordinator') {
      if (modalMode === 'add') {
        const id = 'c_' + Date.now();
        const newCoordinator: Coordinator = {
          id,
          name: tName.trim(),
          email: tEmail.toLowerCase().trim(),
          username: tName.trim(), 
          password: tPassword,
          phone: tPhone.trim(),
        };
        setCoordinators([...coordinators, newCoordinator]);
        toast.success("Coordinator profile added successfully!");
      } else {
        setCoordinators(coordinators.map(c => c.id === currentId ? {
          ...c,
          name: tName.trim(),
          email: tEmail.toLowerCase().trim(),
          phone: tPhone.trim(),
          password: tPassword,
          username: tName.trim(),
        } : c));
        toast.success("Coordinator profile updated successfully!");
      }
    } 
    
    else if (modalType === 'student') {
      if (modalMode === 'add') {
        const id = 's_' + Date.now();
        const newStudent: Student = {
          id,
          name: sName.trim(),
          email: sEmail.toLowerCase().trim(),
          username: sUsername || sName.trim(),
          password: sPassword,
          classId: sClassId,
          rollNumber: sRoll.trim(),
          parentPhone: sParentPhone.trim(),
          studentPhone: sStudentPhone.trim(),
          baseFee: Number(sBaseFee) || 0,
          category: sIsAcademy ? 'Academy' : 'Regular',
          academySubjects: sIsAcademy ? sAcademySubjects.split(',').map(s => s.trim()).filter(s => s !== '') : [],
          enrollmentMonth: sEnrollmentMonth,
          photo: sPhoto,
        };
        setStudents([...students, newStudent]);
        toast.success("Student profile added successfully!");
      } else {
        setStudents(students.map(s => s.id === currentId ? {
          ...s,
          name: sName.trim(),
          email: sEmail.toLowerCase().trim(),
          classId: sClassId,
          rollNumber: sRoll.trim(),
          parentPhone: sParentPhone.trim(),
          studentPhone: sStudentPhone.trim(),
          baseFee: Number(sBaseFee) || 0,
          password: sPassword,
          username: sUsername,
          category: sIsAcademy ? 'Academy' : 'Regular',
          academySubjects: sIsAcademy ? sAcademySubjects.split(',').map(s => s.trim()).filter(s => s !== '') : [],
          enrollmentMonth: sEnrollmentMonth,
          photo: sPhoto,
        } : s));
        toast.success("Student profile updated successfully!");
      }
    }     
    else if (modalType === 'class') {
      if (modalMode === 'add') {
        const newClass: Class = {
          id: 'c_' + Date.now(),
          className: cClassName.trim(),
          section: cSection.toUpperCase().trim(),
          classTeacherId: cTeacherId,
          subjects: cSubjects
        };
        setClasses([...classes, newClass]);
        // Set view class for visual sanity if it was empty
        if (!selectedTimetableClass) {
          setSelectedTimetableClass(newClass.id);
        }
      } else {
        setClasses(classes.map(c => c.id === currentId ? {
          ...c,
          className: cClassName.trim(),
          section: cSection.toUpperCase().trim(),
          classTeacherId: cTeacherId,
          subjects: cSubjects
        } : c));
      }
    } 
    
    else if (modalType === 'timetable') {
      if (modalMode === 'add') {
        const newTT: TimetableEntry = {
          id: 'tt_' + Date.now(),
          classId: ttClassId,
          day: ttDay,
          period: ttPeriod,
          time: ttTime,
          subject: ttSubject.trim(),
          teacherId: ttTeacherId
        };
        setTimetable([...timetable, newTT]);

        // Push real-time notification
        const matchClass = classes.find(c => c.id === ttClassId);
        const classLabel = matchClass ? `${matchClass.className}-${matchClass.section}` : `Class ID ${ttClassId}`;
        const matchTeacher = teachers.find(t => t.id === ttTeacherId);
        const teacherLabel = matchTeacher ? matchTeacher.name : 'Unassigned';

        addNotification({
          type: 'timetable_created',
          title: 'New Lecture Scheduled 📅',
          message: `${ttPeriod} (${ttSubject.trim()}) is scheduled on ${ttDay} [${ttTime}] for Class ${classLabel} under ${teacherLabel}.`,
          teacherId: ttTeacherId,
          classId: ttClassId,
          role: 'all'
        });

        // If the period was marked as deleted, clear it from deleted list
        const currentDeletedAdd = appSettings.deletedPeriods[ttClassId] || [];
        if (currentDeletedAdd.includes(ttPeriod)) {
          updateSetting('deletedPeriods', {
            ...appSettings.deletedPeriods,
            [ttClassId]: currentDeletedAdd.filter(p => p !== ttPeriod)
          });
        }

        // Automatically register period in extraPeriods if it is custom
        const defaultPeriods = ['Period 1', 'Period 2', 'Period 3', 'Period 4', 'Period 5'];
        if (ttPeriod && !defaultPeriods.includes(ttPeriod)) {
          const classList = appSettings.extraPeriods[ttClassId] || [];
          if (!classList.includes(ttPeriod)) {
            updateSetting('extraPeriods', {
              ...appSettings.extraPeriods,
              [ttClassId]: [...classList, ttPeriod]
            });
          }
        }
      } else {
        setTimetable(timetable.map(tt => tt.id === currentId ? {
          ...tt,
          classId: ttClassId,
          day: ttDay,
          period: ttPeriod,
          time: ttTime,
          subject: ttSubject.trim(),
          teacherId: ttTeacherId
        } : tt));

        // Push real-time notification
        const matchClass = classes.find(c => c.id === ttClassId);
        const classLabel = matchClass ? `${matchClass.className}-${matchClass.section}` : `Class ID ${ttClassId}`;
        const matchTeacher = teachers.find(t => t.id === ttTeacherId);
        const teacherLabel = matchTeacher ? matchTeacher.name : 'Unassigned';

        addNotification({
          type: 'timetable_updated',
          title: 'Timetable Session Updated 🔄',
          message: `${ttPeriod} [${ttTime}] on ${ttDay} changed to "${ttSubject.trim()}" with assigned instructor ${teacherLabel} for Class ${classLabel}.`,
          teacherId: ttTeacherId,
          classId: ttClassId,
          role: 'all'
        });

        // If the period was marked as deleted, clear it from deleted list
        const currentDeletedEdit = appSettings.deletedPeriods[ttClassId] || [];
        if (currentDeletedEdit.includes(ttPeriod)) {
          updateSetting('deletedPeriods', {
            ...appSettings.deletedPeriods,
            [ttClassId]: currentDeletedEdit.filter(p => p !== ttPeriod)
          });
        }

        // Automatically register period in extraPeriods if it is custom
        if (ttPeriod && !defaultPeriods.includes(ttPeriod)) {
          const classList = appSettings.extraPeriods[ttClassId] || [];
          if (!classList.includes(ttPeriod)) {
            updateSetting('extraPeriods', {
              ...appSettings.extraPeriods,
              [ttClassId]: [...classList, ttPeriod]
            });
          }
        }
      }
    }

    setIsModalOpen(false);
    resetFormFields();
  };

  // Delete Handlers
  const confirmAction = () => {
    const { type, id } = deleteConfirmModal;
    if (type === 'teacher') {
      setTeachers(teachers.filter(t => t.id !== id));
      setClasses(classes.map(c => c.classTeacherId === id ? { ...c, classTeacherId: '' } : c));
      setTimetable(timetable.filter(tt => tt.teacherId !== id));
      toast.success("Teacher deleted successfully.");
    } else if (type === 'coordinator') {
      setCoordinators(coordinators.filter(c => c.id !== id));
      toast.success("Coordinator deleted successfully.");
    } else if (type === 'student') {
      setStudents(students.filter(s => s.id !== id));
      toast.success("Student deleted successfully.");
    } else if (type === 'class') {
      setClasses(classes.filter(c => c.id !== id));
      setStudents(students.map(s => s.classId === id ? { ...s, classId: '' } : s));
      setTimetable(timetable.filter(tt => tt.classId !== id));
      if (selectedTimetableClass === id) {
        const remaining = classes.filter(c => c.id !== id);
        setSelectedTimetableClass(remaining[0]?.id || '');
      }
      toast.success("Class deleted successfully.");
    } else if (type === 'timetable') {
      const entry = timetable.find(t => t.id === id);
      if (entry) {
        const matchClass = classes.find(c => c.id === entry.classId);
        const classLabel = matchClass ? `${matchClass.className}-${matchClass.section}` : `Class ID ${entry.classId}`;
        
        addNotification({
          type: 'timetable_deleted',
          title: 'Lecture Cancelled ❌',
          message: `${entry.period} (${entry.subject}) on ${entry.day} for Class ${classLabel} has been removed or cancelled.`,
          teacherId: entry.teacherId,
          classId: entry.classId,
          role: 'all'
        });
        setTimetable(timetable.filter(t => t.id !== id));
        toast.success("Timetable entry deleted successfully.");
      }
    }
    setDeleteConfirmModal({ isOpen: false, type: '', id: '', message: '' });
  };

  const handleDeleteTeacher = (id: string) => {
    setDeleteConfirmModal({ isOpen: true, type: 'teacher', id, message: 'Are you sure you want to delete this teacher? This will vacate teachers from assigned classes and timetables.' });
  };

  const handleDeleteCoordinator = (id: string) => {
    setDeleteConfirmModal({ isOpen: true, type: 'coordinator', id, message: 'Are you sure you want to delete this coordinator profile?' });
  };

  const handleDeleteStudent = (id: string) => {
    setDeleteConfirmModal({ isOpen: true, type: 'student', id, message: 'Are you sure you want to delete this student profile?' });
  };

  const handleDeleteClass = (id: string) => {
    setDeleteConfirmModal({ isOpen: true, type: 'class', id, message: 'Are you sure you want to delete this class? This will dissociate linked students and delete associated timetables.' });
  };

  const handleDeleteTimetableEntry = (id: string) => {
    setDeleteConfirmModal({ isOpen: true, type: 'timetable', id, message: 'Delete this timetable session?' });
  };

  // Helpers for display resolution
  const getTeacherName = (tId: string) => {
    const t = teachers.find(item => item.id === tId);
    return t ? t.name : 'Unassigned';
  };

  const handleUpdateClassFeeConfigs = (classId: string, configs: any[]) => {
    setClasses(prev => prev.map(c => c.id === classId ? { ...c, feeConfigs: configs } : c));
    toast.success("Fee configurations updated successfully!");
  };

  const getClassName = (cId: string) => {
    const c = classesMap.get(String(cId));
    return c ? `${c.className} - ${c.section}` : 'N/A';
  };

  // Filtering variables
  const filteredTeachers = teachers.filter(t => 
    (t.name?.toLowerCase() || '').includes(teacherSearch.toLowerCase()) ||
    (t.email?.toLowerCase() || '').includes(teacherSearch.toLowerCase()) ||
    (t.subject?.toLowerCase() || '').includes(teacherSearch.toLowerCase())
  );

  const filteredStudents = students.filter(s => {
    const matchesSearch = (s.name?.toLowerCase() || '').includes(studentSearch.toLowerCase()) ||
                          (s.email?.toLowerCase() || '').includes(studentSearch.toLowerCase()) ||
                          (s.rollNumber || '').includes(studentSearch);
    const matchesClass = studentClassFilter === 'all' ? true : s.classId === studentClassFilter;
    return matchesSearch && matchesClass;
  });

  const filteredClasses = classes.filter(c => 
    (c.className?.toLowerCase() || '').includes(classSearch.toLowerCase()) ||
    (c.section?.toLowerCase() || '').includes(classSearch.toLowerCase())
  );

  const filteredCoordinators = coordinators.filter(c => 
    (c.name?.toLowerCase() || '').includes(coordinatorSearch.toLowerCase()) ||
    (c.email?.toLowerCase() || '').includes(coordinatorSearch.toLowerCase()) ||
    (c.username?.toLowerCase() || '').includes(coordinatorSearch.toLowerCase()) ||
    (c.id?.toLowerCase() || '').includes(coordinatorSearch.toLowerCase())
  );

  // Group Timetable elements neatly
  const DAYS: DayOfWeek[] = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
  const PERIODS = ['Period 1', 'Period 2', 'Period 3', 'Period 4', 'Period 5'];

  return (
    <div id="principal-dashboard-root" className="min-h-screen bg-gray-50 flex flex-col md:flex-row pb-16 md:pb-0 relative">
      
      {/* Mobile Top Header Indicator */}
      <div id="mobile-top-bar" className={`md:hidden flex items-center justify-between px-4 py-3 bg-white border-b border-gray-200 shadow-sm z-20 ${selectedStudentReport ? 'print:hidden' : ''}`}>
        <div className="flex items-center gap-2">
          <img src="/logo.png" alt="NSB1 Logo" className="w-8 h-8 object-contain" referrerPolicy="no-referrer" />
          <span className="font-bold text-gray-900 tracking-tight uppercase tracking-[0.1em] text-xs">NSB1 School</span>
        </div>
        <div className="flex items-center gap-2">
          <button 
             onClick={onLogout}
             className="px-3 py-1.5 rounded-lg border border-rose-200 text-rose-600 bg-rose-50 hover:bg-rose-600 hover:text-white flex items-center gap-1.5 font-black text-[10px] uppercase transition-all"
             title="Logout"
          >
            <LogOut size={16} />
            EXIT
          </button>
          <button 
            id="sidebar-toggle-mobile" 
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-1.5 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-100"
          >
            <Menu size={20} />
          </button>
        </div>
      </div>

      {/* Sidebar Overlay behind Drawer */}
      {sidebarOpen && (
        <div 
          onClick={() => setSidebarOpen(false)} 
          className="fixed inset-0 bg-black/40 z-30 md:hidden"
        />
      )}

      {/* Principal Sidebar */}
      <div 
        id="sidebar-principal" 
        className={`fixed md:sticky top-0 left-0 h-screen w-60 bg-white border-r border-slate-100 text-slate-900 flex flex-col justify-between z-40 transition-transform duration-300 transform md:transform-none ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        } font-sans print:hidden`}
      >
        <div>
          {/* Brand header - Minimalist */}
          <div className="p-8 pb-10 flex flex-col items-center border-b border-slate-50 mb-6">
            <div className="mb-4">
              <img src="/logo.png" alt="NSB1 Logo" className="h-16 w-auto object-contain" referrerPolicy="no-referrer" />
            </div>
            <div className="flex flex-col items-center gap-1">
              <h1 className="text-slate-900 font-black text-xs tracking-[0.2em] uppercase">NSB1 School</h1>
              <span className="text-[8px] font-black text-indigo-600 uppercase tracking-[0.4em]">Principal Office</span>
            </div>
          </div>

          {/* Minimalist Nav */}
          <nav className="px-5 space-y-1">
            {[
              { id: 'dashboard', label: 'Home', icon: BarChart2 },
              { id: 'registers', label: 'Records', icon: Database },
              { id: 'management_hub', label: 'Admin Hub', icon: Shield },
              { id: 'timetable', label: 'Schedules', icon: Calendar },
              { id: 'monthly_report', label: 'Reports', icon: FileText, color: 'text-indigo-600' },
              { id: 'alerts', label: 'Alert Center', icon: AlertCircle, color: 'text-rose-600' },
              { id: 'settings', label: 'Cloud Config', icon: Sparkles },
            ].map(link => {
              const Icon = link.icon;
              const isActive = activeTab === link.id;
              return (
                <button
                  key={link.id}
                  onClick={() => { handleTabChange(link.id as any); setSidebarOpen(false); }}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 text-[10px] font-bold uppercase tracking-[0.2em] transition-all text-left group rounded-xl ${
                    isActive 
                      ? 'text-white bg-emerald-600 shadow-lg shadow-emerald-200' 
                      : 'text-slate-400 hover:text-slate-900 hover:bg-slate-50'
                  }`}
                >
                  <Icon size={14} className={isActive ? 'text-white' : 'text-slate-300 group-hover:text-slate-500'} />
                  {link.label}
                </button>
              );
            })}

            {/* Install Button in Sidebar */}
            <button
              onClick={onInstallApp}
              className="w-full flex items-center gap-3 px-3 py-2.5 text-[10px] font-bold uppercase tracking-[0.2em] transition-all text-left group rounded-xl bg-indigo-50 text-indigo-700 hover:bg-indigo-100 mt-2 border border-indigo-100"
            >
              <Download size={14} className="text-indigo-600" />
              Install App
            </button>
          </nav>
        </div>

        {/* Footer profile & logout - Minimalist */}
        <div className="p-8 border-t border-slate-50">
          <button
            onClick={onLogout}
            className="w-full py-3.5 bg-rose-600 text-white font-black text-xs uppercase tracking-[0.3em] hover:bg-rose-700 transition-all cursor-pointer flex items-center justify-center gap-2 shadow-lg shadow-rose-200"
          >
            <LogOut size={16} />
            EXIT SYSTEM
          </button>
        </div>
      </div>

      {/* Main Panel */}
      <main className={`flex-1 min-h-screen flex flex-col p-4 md:p-8 lg:p-10 max-w-7xl mx-auto w-full font-sans text-slate-800 ${selectedStudentReport ? 'print:hidden' : ''}`}>
        
        {userSession.role === 'developer' && (
          <div className="bg-amber-100 border border-amber-200 p-3 mb-6 flex items-center justify-between shadow-sm animate-pulse">
            <div className="flex items-center gap-2 text-amber-800">
              <ShieldAlert size={16} />
              <span className="text-[10px] font-black uppercase tracking-widest">Developer Mode Active: Tracking Principal Dashboard</span>
            </div>
            <div className="text-[9px] font-bold text-amber-600 uppercase">Superuser Access (KM)</div>
          </div>
        )}
        
        {/* Active Tab View rendering */}

        {/* ========== DASHBOARD OVERVIEW TABLEAUX ========== */}
        {activeTab === 'dashboard' && (
          <div id="panel-principal-dashboard" className="space-y-8 animate-fade-in bg-emerald-50/50 p-4 sm:p-6 -mx-4 sm:-mx-6 rounded-2xl border border-emerald-100 shadow-inner">
            {/* Greeting Header */}
            <div className="bg-emerald-600 p-8 -mx-4 sm:-mx-6 -mt-4 sm:-mt-6 mb-8 shadow-lg border-b border-emerald-700/50">
              <h1 className="text-3xl sm:text-4xl md:text-5xl font-black text-white tracking-tighter font-display uppercase leading-[0.9]">
                {userSession.role === 'developer' ? 'System Tracking Dashboard' : 'Academic Command Center'}
              </h1>
            </div>

            {/* Metrics cards bar - Elegant Minimalist */}
            {(() => {
              const totalBilled = students.length * 5500 * (MONTHS.indexOf(MONTHS[new Date().getMonth()]) + 1); // rough estimate of total expected fees
              const totalCollected = fees.reduce((sum, f) => sum + Number(f.amount || 0), 0);
              const totalPending = (students.length * 5500) - fees.filter(f => f.month === MONTHS[new Date().getMonth()]).reduce((sum, f) => sum + Number(f.amount || 0), 0); 

              // Current Month Collection (June as example)
              const CURRENT_MONTH = 'JUN'; // Forcing JUN as per user request
              const juneFees = fees.filter(f => f.month === 'JUN');
              const totalCollectedJune = juneFees.reduce((sum, f) => sum + Number(f.amount || 0), 0);
              const totalExpectedJune = students.length * 5500;
              const totalPendingJune = totalExpectedJune - totalCollectedJune;

              // Fee count stats
              const paidStudentsCount = students.filter(s => juneFees.some(f => f.studentId === s.id)).length;
              const pendingStudentsCount = students.length - paidStudentsCount;

              // Attendance Avg
              const attendanceAvg = attendance.length > 0 
                ? Math.round((attendance.filter(a => a.status === 'present').length / attendance.length) * 100)
                : 94;

              return (
                <div className="space-y-8">
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-8 md:gap-14 animate-fade-in pt-8 border-t border-slate-100">
                    
                    {[
                      { label: 'Teachers', val: teachers.length, color: 'text-blue-600', bg: 'bg-blue-50/50' },
                      { label: 'Students', val: students.length, color: 'text-emerald-600', bg: 'bg-emerald-50/50' },
                      { label: 'Classes', val: classes.length, color: 'text-amber-600', bg: 'bg-amber-50/50' },
                      { label: 'Attendance Average', val: `${attendanceAvg}%`, color: 'text-indigo-600', bg: 'bg-indigo-50/50' },
                      ...(userSession.role === 'principal' ? [
                        { label: 'Fees Collected', val: `Rs. ${totalCollected.toLocaleString()}`, color: 'text-violet-600', bg: 'bg-violet-50/50' },
                        { label: 'Fees Unpaid', val: `Rs. ${totalPendingJune.toLocaleString()}`, color: 'text-rose-600', bg: 'bg-rose-50/50' }
                      ] : [
                        { label: 'Fee Paid Students', val: paidStudentsCount, color: 'text-violet-600', bg: 'bg-violet-50/50' },
                        { label: 'Fee Pending Students', val: pendingStudentsCount, color: 'text-rose-600', bg: 'bg-rose-50/50' }
                      ])
                    ].map(stat => (
                      <div key={stat.label} className={`group p-6 border border-transparent hover:border-slate-100 transition-all ${stat.bg}`}>
                        <span className={`block text-[9px] font-black uppercase tracking-[0.3em] mb-3 ${stat.color}`}>{stat.label}</span>
                        <span className="text-2xl md:text-3xl font-light tracking-tighter text-slate-900 block tabular-nums">{stat.val}</span>
                      </div>
                    ))}
                  </div>

                  {/* Fee Summary Cards */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-8 animate-fade-in">
                    {userSession.role === 'principal' || userSession.role === 'coordinator' ? (
                      <>
                        <div className="p-6 bg-violet-50/50 border border-violet-100">
                          <span className="text-[9px] font-black uppercase tracking-[0.3em] mb-3 text-violet-600 block">
                            {userSession.role === 'principal' ? 'Total JUN Collection' : 'Students Paid Fee'}
                          </span>
                          <span className="text-2xl md:text-3xl font-light tracking-tighter text-slate-900 block tabular-nums">
                            {userSession.role === 'principal' ? `Rs. ${totalCollectedJune.toLocaleString()}` : paidStudentsCount}
                          </span>
                        </div>
                        <div className="p-6 bg-emerald-50/50 border border-emerald-100">
                          <span className="text-[9px] font-black uppercase tracking-[0.3em] mb-3 text-emerald-600 block">
                            {userSession.role === 'principal' ? 'JUN Target' : 'Total Students'}
                          </span>
                          <span className="text-2xl md:text-3xl font-light tracking-tighter text-slate-900 block tabular-nums">
                            {userSession.role === 'principal' ? `Rs. ${totalExpectedJune.toLocaleString()}` : students.length}
                          </span>
                        </div>
                        <div className="p-6 bg-rose-50/50 border border-rose-100">
                          <span className="text-[9px] font-black uppercase tracking-[0.3em] mb-3 text-rose-600 block">
                            {userSession.role === 'principal' ? 'JUN Pending' : 'Students Pending Fee'}
                          </span>
                          <span className="text-2xl md:text-3xl font-light tracking-tighter text-slate-900 block tabular-nums">
                            {userSession.role === 'principal' ? `Rs. ${totalPendingJune.toLocaleString()}` : pendingStudentsCount}
                          </span>
                        </div>
                      </>
                    ) : (
                      <div className="col-span-3 p-6 bg-slate-50/50 border border-slate-100 text-center">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[.2em]">Operational Overview Active</p>
                      </div>
                    )}
                  </div>
                </div>
              );
            })()}


            {/* Quick action grid */}
            <div className="bg-white border border-slate-200 shadow-sm rounded-none p-6">
              <h2 className="text-base font-bold text-slate-900 mb-4 flex items-center gap-2 uppercase tracking-wide font-display">
                <PlusCircle size={20} className="text-blue-600" />
                {userSession.role === 'principal' ? 'Principal Fast-Track Actions' : 'Coordinator Fast-Track Actions'}
              </h2>

              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <button
                  onClick={() => openAddModal('teacher')}
                  className="flex items-center justify-center gap-2.5 p-4 rounded-xl border border-gray-200 hover:border-blue-500 hover:bg-blue-50/25 text-sm font-semibold text-gray-700 hover:text-blue-700 transition-all text-left"
                >
                  <Users size={16} />
                  Add New Teacher
                </button>

                <button
                  onClick={() => openAddModal('student')}
                  className="flex items-center justify-center gap-2.5 p-4 rounded-xl border border-gray-200 hover:border-blue-500 hover:bg-blue-50/25 text-sm font-semibold text-gray-700 hover:text-blue-700 transition-all text-left"
                >
                  <Users size={16} />
                  Add New Student
                </button>

                <button
                  onClick={() => openAddModal('class')}
                  className="flex items-center justify-center gap-2.5 p-4 rounded-xl border border-gray-200 hover:border-blue-500 hover:bg-blue-50/25 text-sm font-semibold text-gray-700 hover:text-blue-700 transition-all text-left"
                >
                  <BookOpen size={16} />
                  Add New Class
                </button>

                <button
                  onClick={() => openAddModal('timetable')}
                  className="flex items-center justify-center gap-2.5 p-4 rounded-xl border border-gray-200 hover:border-blue-500 hover:bg-blue-50/25 text-sm font-semibold text-gray-700 hover:text-blue-700 transition-all text-left"
                >
                  <Calendar size={16} />
                  Add Schedule Entry
                </button>
              </div>
            </div>

            {/* Initial configuration status indicators */}
            <div className="bg-blue-50/40 border border-blue-100 rounded-xl p-4 flex items-start gap-3">
              <Shield size={18} className="text-blue-600 shrink-0 mt-0.5" />
              <div>
                <span className="text-xs font-bold text-blue-900 uppercase tracking-wide">Data Policy Note :</span>
                <p className="text-xs text-blue-800 mt-1">All additions, edits, and deletions are saved immediately onto the local sandbox of your browser. Logouts preserve state; you can refresh safely.</p>
              </div>
            </div>
          </div>
        )}

        {/* ========== MANAGEMENT HUB (TEACHERS, STUDENTS, CLASSES) ========== */}
        {activeTab === 'management_hub' && (
          <div className="space-y-8 animate-fade-in pb-20">
            {/* Management Hub Sub-Navigation Header */}
            <div className="bg-white border border-slate-200 p-2 shadow-sm flex flex-wrap gap-2 sticky top-0 z-10">
              <button
                onClick={() => setManagementSubTab('teachers')}
                className={`flex-1 min-w-[120px] py-3.5 px-4 text-[10px] uppercase font-black tracking-[0.2em] transition-all flex items-center justify-center gap-2 ${
                  managementSubTab === 'teachers' 
                    ? 'bg-slate-900 text-white shadow-lg' 
                    : 'bg-white text-slate-400 hover:text-slate-900 hover:bg-slate-50'
                }`}
              >
                <Users size={14} />
                Teachers
              </button>
              <button
                onClick={() => setManagementSubTab('students')}
                className={`flex-1 min-w-[120px] py-3.5 px-4 text-[10px] uppercase font-black tracking-[0.2em] transition-all flex items-center justify-center gap-2 ${
                  managementSubTab === 'students' 
                    ? 'bg-slate-900 text-white shadow-lg' 
                    : 'bg-white text-slate-400 hover:text-slate-900 hover:bg-slate-50'
                }`}
              >
                <Users size={14} />
                Students
              </button>
              <button
                onClick={() => setManagementSubTab('classes')}
                className={`flex-1 min-w-[120px] py-3.5 px-4 text-[10px] uppercase font-black tracking-[0.2em] transition-all flex items-center justify-center gap-2 ${
                  managementSubTab === 'classes' 
                    ? 'bg-slate-900 text-white shadow-lg' 
                    : 'bg-white text-slate-400 hover:text-slate-900 hover:bg-slate-50'
                }`}
              >
                <BookOpen size={14} />
                Classes
              </button>
              <button
                onClick={() => setManagementSubTab('coordinators')}
                className={`flex-1 min-w-[120px] py-3.5 px-4 text-[10px] uppercase font-black tracking-[0.2em] transition-all flex items-center justify-center gap-2 ${
                  managementSubTab === 'coordinators' 
                    ? 'bg-slate-900 text-white shadow-lg' 
                    : 'bg-white text-slate-400 hover:text-slate-900 hover:bg-slate-50'
                }`}
              >
                <Shield size={14} />
                Coordinators
              </button>
            </div>

            {/* Hub Content Rendering */}
            <div>
              {/* TEACHERS SUB-VIEW */}
              {managementSubTab === 'teachers' && (
                <div id="panel-principal-teachers" className="space-y-6 animate-fade-in bg-cyan-50/50 p-4 sm:p-6 -mx-4 sm:-mx-6 rounded-2xl border border-cyan-100 shadow-inner">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                      <h1 className="text-2xl font-black text-slate-900 tracking-tighter uppercase ">Teacher List</h1>
                    </div>
                    <button
                      onClick={() => openAddModal('teacher')}
                      className="flex items-center justify-center gap-2 py-2.5 px-6 bg-indigo-600 hover:bg-slate-900 text-white font-black text-[10px] uppercase tracking-widest transition-all shadow-lg"
                    >
                      <Plus size={14} />
                      Register New Teacher
                    </button>
                  </div>

                  {/* Search filter bar */}
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-gray-400">
                      <Search size={16} />
                    </span>
                    <input
                      type="text"
                      value={teacherSearch}
                      onChange={(e) => setTeacherSearch(e.target.value)}
                      placeholder="Search faculty by name, subject, or email..."
                      className="w-full pl-10 pr-4 py-3.5 bg-white border border-slate-200 focus:outline-none focus:border-indigo-600 transition-all text-xs font-bold"
                    />
                  </div>

                  {/* Teachers Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filteredTeachers.map(t => {
                      const isExpanded = !!expandedTeachers[t.id];
                      return (
                        <div key={t.id} className="bg-white border border-slate-200 overflow-hidden hover:border-indigo-300 transition-all shadow-xs group">
                          <div 
                            onClick={() => toggleTeacherExpanded(t.id)}
                            className="p-5 flex items-center justify-between cursor-pointer group-hover:bg-slate-50/50"
                          >
                            <div className="flex items-center gap-4">
                              <div>
                                <h3 className="font-black text-slate-900 uppercase tracking-tight leading-none mb-1.5">{t.name}</h3>
                                <p className="text-[10px] font-bold text-indigo-600 uppercase tracking-widest leading-none">{t.subject}</p>
                              </div>
                            </div>
                            <ChevronDown className={`text-slate-300 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                          </div>

                          {isExpanded && (
                            <div className="px-5 pb-5 pt-4 border-t border-slate-100 bg-slate-50/50 space-y-4 animate-fade-in font-sans">
                              <div className="grid grid-cols-2 gap-3">
                                <div className="p-3 bg-white border border-slate-200 shadow-xs">
                                  <span className="text-[8px] font-black text-slate-400 uppercase block mb-1">Login Status</span>
                                  <span className="font-mono text-xs font-bold text-emerald-600 bg-emerald-50 px-1  uppercase tracking-tighter">Login using Name</span>
                                </div>
                                <div className="p-3 bg-white border border-slate-200 shadow-xs">
                                  <span className="text-[8px] font-black text-slate-400 uppercase block mb-1">Access Password</span>
                                  <span className="font-mono text-xs font-bold text-emerald-600 bg-emerald-50 px-1">{t.password || 'nsb123'}</span>
                                </div>
                                <div className="p-3 bg-white border border-slate-200 col-span-2 shadow-xs">
                                  <span className="text-[8px] font-black text-slate-400 uppercase block mb-1">Contact Details</span>
                                  <div className="space-y-1.5">
                                    <p className="text-[10px] font-bold text-slate-700 flex items-center gap-2"><Mail size={12} className="text-slate-400" /> {t.email}</p>
                                    <p className="text-[10px] font-bold text-slate-700 flex items-center gap-2"><Phone size={12} className="text-slate-400" /> {t.phone}</p>
                                  </div>
                                </div>
                              </div>
                              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 mt-2">
                                <button
                                  onClick={() => openEditModal('teacher', t.id)}
                                  className="px-3 py-1.5 bg-white border border-slate-200 text-slate-600 font-black text-[9px] uppercase tracking-widest hover:bg-slate-900 hover:text-white transition-all shadow-xs"
                                >
                                  Edit Info
                                </button>
                                <button
                                  onClick={() => handleDeleteTeacher(t.id)}
                                  className="px-3 py-1.5 bg-white border border-rose-200 text-rose-600 font-black text-[9px] uppercase tracking-widest hover:bg-rose-600 hover:text-white transition-all shadow-xs"
                                >
                                  Delete
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* STUDENTS SUB-VIEW */}
              {managementSubTab === 'students' && (
                <div id="panel-principal-students" className="space-y-6 animate-fade-in bg-violet-50/50 p-4 sm:p-6 -mx-4 sm:-mx-6 rounded-2xl border border-violet-100 shadow-inner">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                      <h1 className="text-2xl font-black text-slate-900 tracking-tighter uppercase ">Student List</h1>
                    </div>
                    <button
                      onClick={() => openAddModal('student')}
                      className="flex items-center justify-center gap-2 py-2.5 px-6 bg-emerald-600 hover:bg-slate-900 text-white font-black text-[10px] uppercase tracking-widest transition-all shadow-lg"
                    >
                      <Plus size={14} />
                      Add Student
                    </button>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-3">
                    <div className="relative flex-1">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                      <input
                        type="text"
                        value={studentSearch}
                        onChange={(e) => setStudentSearch(e.target.value)}
                        placeholder="Search student by name, roll, or parent name..."
                        className="w-full pl-10 pr-4 py-3.5 bg-white border border-slate-200 focus:outline-none focus:border-emerald-600 transition-all text-xs font-bold"
                      />
                    </div>
                    <select
                      value={studentClassFilter}
                      onChange={(e) => setStudentClassFilter(e.target.value)}
                      className="bg-white border border-slate-200 px-4 py-3 text-xs font-bold text-slate-700 outline-none uppercase"
                    >
                      <option value="all">All Classes</option>
                      {classes.map(c => (
                        <option key={c.id} value={c.id}>{c.className} - {c.section}</option>
                      ))}
                    </select>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filteredStudents.map(s => {
                      const isExpanded = !!expandedStudents[s.id];
                      return (
                        <div key={s.id} className="bg-white border border-slate-200 overflow-hidden hover:border-emerald-300 transition-all group font-sans">
                          {/* Compact Header (Always Visible) */}
                          <div 
                            onClick={() => toggleStudentExpanded(s.id)}
                            className="p-4 flex items-center justify-between cursor-pointer group-hover:bg-slate-50/50"
                          >
                            <div className="flex items-center gap-3">
                              {s.photo ? (
                                <img src={s.photo} alt={s.name} className="w-8 h-8 rounded-full object-cover border border-slate-200" />
                              ) : (
                                <div className="w-8 h-8 rounded-full bg-slate-900 text-white flex items-center justify-center font-black text-[10px] border border-slate-800">
                                  {s.name.charAt(0)}
                                </div>
                              )}
                              <div className="min-w-0">
                                <h3 className="font-black text-slate-900 uppercase tracking-tight text-xs truncate leading-none mb-1">{s.name}</h3>
                                <div className="flex items-center gap-2">
                                  <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest leading-none">{getClassName(s.classId)}</p>
                                  {s.category === 'Academy' && (
                                    <span className="text-[8px] bg-indigo-50 text-indigo-700 border border-indigo-100 font-black px-1.5 py-0.5 rounded-full uppercase tracking-tighter">Academy</span>
                                  )}
                                </div>
                              </div>
                            </div>
                            <ChevronDown className={`text-slate-300 transition-transform ${isExpanded ? 'rotate-180' : ''}`} size={16} />
                          </div>
                          
                          {/* Expanded Details Section */}
                          {isExpanded && (
                            <div className="px-5 pb-5 pt-3 border-t border-slate-100 bg-slate-50/50 space-y-4 animate-fade-in">
                              <div className="grid grid-cols-2 gap-3">
                                <div className="p-3 bg-white border border-slate-200 shadow-xs">
                                  <span className="text-[8px] font-black text-slate-400 uppercase block mb-1">Guardian Contact</span>
                                  <p className="text-[10px] font-bold text-slate-700 flex items-center gap-2">
                                    <Phone size={10} className="text-emerald-500" /> {s.parentPhone}
                                  </p>
                                </div>
                                <div className="p-3 bg-white border border-slate-200 shadow-xs">
                                  <span className="text-[8px] font-black text-slate-400 uppercase block mb-1">Fee Settings</span>
                                  <p className="text-[10px] font-bold text-indigo-600 flex items-center gap-2">
                                    <CreditCard size={10} /> Base Fee: {s.baseFee}
                                  </p>
                                </div>
                              </div>

                              {s.category === 'Academy' && s.academySubjects && s.academySubjects.length > 0 && (
                                <div className="p-3 bg-indigo-50/50 border border-indigo-100 shadow-xs">
                                  <span className="text-[8px] font-black text-indigo-400 uppercase block mb-1.5">Academy Subjects Focus</span>
                                  <div className="flex flex-wrap gap-1.5">
                                    {s.academySubjects.map((sub, idx) => (
                                      <span key={idx} className="bg-white border border-indigo-200 text-indigo-700 text-[9px] font-bold px-2 py-0.5 uppercase ">
                                        {sub}
                                      </span>
                                    ))}
                                  </div>
                                </div>
                              )}

                              <div className="flex items-center justify-between pt-2 border-t border-slate-100 mt-2">
                                <div className="flex gap-2">
                                  <button onClick={() => openEditModal('student', s.id)} className="p-2 bg-white border border-slate-200 text-slate-400 hover:text-emerald-600 transition-all shadow-xs"><Edit2 size={12}/></button>
                                  <button onClick={() => handleDeleteStudent(s.id)} className="p-2 bg-white border border-slate-200 text-slate-400 hover:text-rose-600 transition-all shadow-xs"><Trash2 size={12}/></button>
                                </div>
                                <button 
                                  onClick={() => { setFeeSearch(s.name); handleTabChange('fees'); window.scrollTo({top:0, behavior:'smooth'}); }}
                                  className="px-4 py-2 bg-emerald-600 text-white font-black text-[9px] uppercase tracking-widest hover:bg-slate-900 transition-all shadow-md "
                                >
                                  Collect Fee ➔
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* CLASSES SUB-VIEW */}
              {managementSubTab === 'classes' && (
                <div id="panel-principal-classes" className="space-y-6 animate-fade-in bg-fuchsia-50/50 p-4 sm:p-6 -mx-4 sm:-mx-6 rounded-2xl border border-fuchsia-100 shadow-inner">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                      <h1 className="text-2xl font-black text-slate-900 tracking-tighter uppercase ">Class List</h1>
                    </div>
                    <button
                      onClick={() => openAddModal('class')}
                      className="flex items-center justify-center gap-2 py-2.5 px-6 bg-slate-900 hover:bg-indigo-600 text-white font-black text-[10px] uppercase tracking-widest transition-all shadow-lg"
                    >
                      <Plus size={14} />
                      Add New Section
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filteredClasses.map(c => {
                      const classTeacher = teachers.find(t => t.id === c.classTeacherId);
                      const studentCount = students.filter(s => s.classId === c.id).length;
                      return (
                        <div key={c.id} className="bg-white border border-slate-200 p-6 flex flex-col items-start gap-5 hover:shadow-xl transition-all font-sans relative overflow-hidden group">
                          <div className="absolute top-0 right-0 w-16 h-16 bg-slate-50 -mr-8 -mt-8 rotate-45 group-hover:bg-indigo-50 transition-colors"></div>
                          
                          <div 
                            onClick={() => {
                              setSelectedClassForDetails(c);
                              setIsClassDetailModalOpen(true);
                            }}
                            className="flex items-center gap-5 relative z-10 w-full cursor-pointer"
                          >
                            <div className="w-16 h-16 bg-slate-950 text-white flex flex-col items-center justify-center border-l-4 border-indigo-600 shrink-0">
                              <span className="text-lg font-black ">{c.className}</span>
                              <span className="text-[8px] font-bold uppercase tracking-widest bg-indigo-600 w-full text-center py-0.5">{c.section}</span>
                            </div>
                            <div className="flex-1 min-w-0">
                              <h4 className="text-[9px] font-black uppercase text-slate-400 tracking-widest mb-1 leading-none">Class Teacher</h4>
                              <p className="text-sm font-black text-slate-900 uppercase  mb-2 truncate">{classTeacher?.name || 'Vacant Slot'}</p>
                              <div className="flex items-center gap-2">
                                <span className="text-[9px] font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 flex items-center gap-1 uppercase tracking-tighter">
                                  <Users size={10}/> {studentCount} Enrolled
                                </span>
                              </div>
                              {c.subjects && c.subjects.length > 0 && (
                                <div className="mt-2 flex flex-wrap gap-1">
                                  {c.subjects.slice(0, 3).map(sub => (
                                    <span key={sub} className="text-[7px] font-bold text-slate-400 border border-slate-100 px-1.5 py-0.5 uppercase tracking-tighter">
                                      {sub}
                                    </span>
                                  ))}
                                  {c.subjects.length > 3 && (
                                    <span className="text-[7px] font-bold text-slate-400 bg-slate-50 px-1.5 py-0.5 uppercase tracking-tighter">
                                      +{c.subjects.length - 3} More
                                    </span>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>

                          <div className="flex gap-2 w-full pt-4 border-t border-slate-50 relative z-10">
                            <button
                              onClick={() => openEditModal('class', c.id)}
                              className="flex-1 py-1.5 bg-slate-50 text-slate-400 hover:text-indigo-600 hover:bg-white transition-all border border-slate-100 text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-1.5"
                            >
                              <Edit2 size={12} /> Edit
                            </button>
                            <button
                              onClick={() => handleDeleteClass(c.id)}
                              className="flex-1 py-1.5 bg-slate-50 text-slate-400 hover:text-rose-600 hover:bg-white transition-all border border-slate-100 text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-1.5"
                            >
                              <Trash2 size={12} /> Delete
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* COORDINATORS SUB-VIEW */}
              {managementSubTab === 'coordinators' && (
                <div id="panel-principal-coordinators" className="space-y-6 animate-fade-in bg-teal-50/50 p-4 sm:p-6 -mx-4 sm:-mx-6 rounded-2xl border border-teal-100 shadow-inner">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                      <h1 className="text-2xl font-black text-slate-900 tracking-tighter uppercase ">Coordinator List</h1>
                    </div>
                    <button
                      onClick={() => openAddModal('coordinator')}
                      className="flex items-center justify-center gap-2 py-2.5 px-6 bg-slate-900 hover:bg-indigo-600 text-white font-black text-[10px] uppercase tracking-widest transition-all shadow-lg"
                    >
                      <Plus size={14} />
                      Register New Coordinator
                    </button>
                  </div>

                  {/* Search filter bar */}
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-gray-400">
                      <Search size={16} />
                    </span>
                    <input
                      type="text"
                      value={coordinatorSearch}
                      onChange={(e) => setCoordinatorSearch(e.target.value)}
                      placeholder="Search coordinators by name, username, or email..."
                      className="w-full pl-10 pr-4 py-3.5 bg-white border border-slate-200 focus:outline-none focus:border-indigo-600 transition-all text-xs font-bold"
                    />
                  </div>

                  {/* Coordinators Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filteredCoordinators.map(c => {
                      const isExpanded = !!expandedCoordinators[c.id];
                      return (
                        <div key={c.id} className="bg-white border border-slate-200 overflow-hidden hover:border-indigo-300 transition-all shadow-xs group">
                          <div 
                            onClick={() => toggleCoordinatorExpanded(c.id)}
                            className="p-5 flex items-center justify-between cursor-pointer group-hover:bg-slate-50/50"
                          >
                            <div className="flex items-center gap-4">
                              <div>
                                <h3 className="font-black text-slate-900 uppercase tracking-tight leading-none mb-1.5">{c.name}</h3>
                                <p className="text-[10px] font-bold text-indigo-600 uppercase tracking-widest leading-none">Academic Coordinator</p>
                              </div>
                            </div>
                            <ChevronDown className={`text-slate-300 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                          </div>

                          {isExpanded && (
                            <div className="px-5 pb-5 pt-4 border-t border-slate-100 bg-slate-50/50 space-y-4 animate-fade-in font-sans">
                              <div className="grid grid-cols-2 gap-3">
                                <div className="p-3 bg-white border border-slate-200 shadow-xs">
                                  <span className="text-[8px] font-black text-slate-400 uppercase block mb-1">Login Status</span>
                                  <span className="font-mono text-xs font-bold text-emerald-600 bg-emerald-50 px-1  uppercase tracking-tighter">Login using Name</span>
                                </div>
                                <div className="p-3 bg-white border border-slate-200 shadow-xs">
                                  <span className="text-[8px] font-black text-slate-400 uppercase block mb-1">Access Password</span>
                                  <span className="font-mono text-xs font-bold text-emerald-600 bg-emerald-50 px-1">{c.password || 'nsb123'}</span>
                                </div>
                                <div className="p-3 bg-white border border-slate-200 col-span-2 shadow-xs">
                                  <span className="text-[8px] font-black text-slate-400 uppercase block mb-1">Contact Details</span>
                                  <div className="space-y-1.5">
                                    <p className="text-[10px] font-bold text-slate-700 flex items-center gap-2">
                                      <Mail size={12} className="text-slate-400" /> {c.email}
                                    </p>
                                    {c.phone && (
                                      <p className="text-[10px] font-bold text-slate-700 flex items-center gap-2">
                                        <Phone size={12} className="text-slate-400" /> Phone: {c.phone}
                                      </p>
                                    )}
                                  </div>
                                </div>
                              </div>
                              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 mt-2">
                                <button
                                  onClick={() => openEditModal('coordinator', c.id)}
                                  className="px-3 py-1.5 bg-white border border-slate-200 text-slate-600 font-black text-[9px] uppercase tracking-widest hover:bg-slate-900 hover:text-white transition-all shadow-xs"
                                >
                                  Edit Info
                                </button>
                                <button
                                  onClick={() => handleDeleteCoordinator(c.id)}
                                  className="px-3 py-1.5 bg-white border border-rose-200 text-rose-600 font-black text-[9px] uppercase tracking-widest hover:bg-rose-600 hover:text-white transition-all shadow-xs"
                                >
                                  Delete
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ========== TIMETABLE TABLEAUX ========== */}
        {activeTab === 'timetable' && (
          <div id="panel-principal-timetable" className="space-y-6 animate-fade-in bg-amber-50/50 p-4 sm:p-6 -mx-4 sm:-mx-6 rounded-2xl border border-amber-100 shadow-inner">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Interactive Class Timetable</h1>
              </div>
              <button
                id="add-timetable-entry-trigger"
                onClick={() => openAddModal('timetable')}
                className="flex items-center justify-center gap-2 py-2 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-sm transition-all self-start sm:self-center"
              >
                <Plus size={16} />
                Schedule Period
              </button>
            </div>

            {/* Dropdown selectors */}
            <div className="bg-white border border-gray-200 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center gap-4">
              <span className="text-xs font-bold uppercase tracking-wider text-gray-500">
                Select Academic Classroom :
              </span>
              <div className="flex-1 max-w-sm">
                <select
                  id="timetable-view-class-select"
                  value={selectedTimetableClass}
                  onChange={(e) => setSelectedTimetableClass(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:border-blue-500 text-sm"
                >
                  <option value="" disabled>Select a Class</option>
                  {classes.map(cl => (
                    <option key={cl.id} value={cl.id}>{cl.className} (Section {cl.section})</option>
                  ))}
                </select>
              </div>
              <button
                  onClick={() => {
                     const currentLength = allPeriods.length;
                     const nextNumber = currentLength + 1;
                     const nextPeriodName = `Period ${nextNumber}`;
                     
                     // Direct open modal with prefilled data
                     setTtClassId(selectedTimetableClass);
                     setTtPeriod(nextPeriodName);
                     setIsCustomPeriod(true); // force custom text input in modal
                     setTtDay('Monday');
                     setTtSubject('');
                     setTtTime('02:00 PM - 03:00 PM'); // guestimate time
                     setModalType('timetable');
                     setModalMode('add');
                     setIsModalOpen(true);
                     
                     toast.info(`Creating schedule slot for ${nextPeriodName}. Fill timetable details to save!`);
                  }}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold"
               >
                 + Add Period Slot
               </button>
             </div>
             
             {/* Extra Periods Info */}
             <div className="flex flex-wrap gap-1.5 mt-2">
                {allPeriods.length > 5 && (
                  <span className="text-[10px] bg-emerald-50 text-emerald-700 font-semibold px-2.5 py-1 rounded-md uppercase tracking-wide">
                    {allPeriods.length - 5} Extra Period(s) Active
                  </span>
                )}
             </div>
              {/* Timetable Grid View */}
            {selectedTimetableClass ? (
              <div className="space-y-4">
                 {DAYS.map(day => (
                   <div key={day} className="space-y-3">
                     <div className="flex items-center justify-between px-2 pt-2 border-l-2 border-slate-200">
                        <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">{day} Schedule</h3>
                        <button 
                          onClick={() => {
                            setTtDay(day);
                            setTtClassId(selectedTimetableClass);
                            // Set a sensible default period if possible
                            const existingCount = timetable.filter(tt => tt.classId === selectedTimetableClass && tt.day === day).length;
                            setTtPeriod(`Period ${existingCount + 1}`);
                            openAddModal('timetable');
                          }}
                          className="flex items-center gap-1 px-2 py-1 bg-blue-50 text-blue-600 hover:bg-blue-600 hover:text-white rounded text-[9px] font-black uppercase tracking-widest transition-all shadow-sm group"
                        >
                          <Plus size={12} className="group-hover:rotate-90 transition-transform" />
                          <span>Append Period</span>
                        </button>
                     </div>
                     <div className="grid grid-cols-5 sm:grid-cols-5 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-1 sm:gap-2">
                        {allPeriods.map(p => {
                           const entry = timetable.find(
                             tt => tt.classId === selectedTimetableClass && 
                                  tt.day === day && 
                                  tt.period === p
                           );
                           const col = getPeriodColor(p);
                           const status = getPeriodStatus(entry?.time || '');
                           const statusCol = getStatusColor(status);
                           return (
                             <div 
                               key={p} 
                               draggable={!!entry}
                               onDragStart={e => handleDragStart(e, { day, period: p, entry })}
                               onDragOver={handleDragOver}
                               onDrop={e => handleDrop(e, { day, period: p })}
                               onClick={() => setSelectedSlot({day, period: p})}
                               className={`border border-slate-100 p-1 px-1.5 sm:p-4 transition-all rounded-r-xl ${entry ? 'shadow-xs' : 'hover:bg-slate-50/50'} cursor-pointer ${
                                 selectedSlot?.day === day && selectedSlot?.period === p ? 'ring-2 ring-indigo-500' : ''
                               }`}
                               style={{
                                 borderLeft: `4px solid ${statusCol}`,
                                 backgroundColor: entry ? `${statusCol}10` : 'white'
                               }}
                             >
                               <div className="flex justify-between items-center mb-1 sm:mb-2 pb-0.5 sm:pb-1 border-b border-dashed border-slate-100/80">
                                 <div className="flex items-center gap-0.5 sm:gap-1.5 overflow-hidden">
                                    <span className="text-[7px] sm:text-[9px] font-black uppercase tracking-tight sm:tracking-widest text-slate-500 truncate" style={{ color: statusCol }}>{p}</span>
                                    {allPeriods.length > 1 && (
                                      <button
                                        type="button"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleDeletePeriod(p, day);
                                        }}
                                        className="p-0.5 rounded text-slate-300 hover:text-red-500 hover:bg-slate-100 transition-all"
                                        title={`Remove "${p}" completely from this class`}
                                      >
                                        <X size={10} className="w-2.5 h-2.5 sm:w-3 sm:h-3 stroke-[2.5] pointer-events-none" />
                                      </button>
                                    )}
                                 </div>
                                 <div className="flex items-center gap-0.5 sm:gap-1.5">
                                   {p === allPeriods[allPeriods.length - 1] && (
                                     <button 
                                       type="button"
                                       onClick={(e) => {
                                         e.stopPropagation();
                                         const currentLength = allPeriods.length;
                                         const nextNumber = currentLength + 1;
                                         const nextPeriodName = `Period ${nextNumber}`;

                                         setTtClassId(selectedTimetableClass);
                                         setTtPeriod(nextPeriodName);
                                         setIsCustomPeriod(true);
                                         setTtDay(day);
                                         setTtSubject('');
                                         setTtTime('02:00 PM - 03:00 PM');
                                         setModalType('timetable');
                                         setModalMode('add');
                                         setIsModalOpen(true);

                                         toast.info(`Creating schedule slot for ${nextPeriodName} on ${day}. Fill timetable details to save!`);
                                       }}
                                       className="p-0.5 sm:p-1 rounded bg-blue-600 hover:bg-blue-700 text-white font-black text-[6px] sm:text-[9px] uppercase tracking-wider transition-all flex items-center justify-center gap-0.5 sm:gap-1 shadow-sm px-1 sm:px-2"
                                       title="Add Next Period"
                                     >
                                       <Plus size={8} className="w-1.5 h-1.5 sm:w-2.5 sm:h-2.5 stroke-[3]" /> <span className="hidden xs:inline">Add</span>
                                     </button>
                                   )}
                                 </div>
                               </div>
                               {entry ? (
                                 <div className="space-y-0.5 sm:space-y-1 overflow-hidden">
                                   <p className="font-extrabold text-[8px] sm:text-xs uppercase tracking-tight  text-slate-900 truncate" style={{ color: col }} title={entry.subject}>{entry.subject}</p>
                                   <p className="text-slate-500 text-[6px] sm:text-[9px] font-bold uppercase tracking-wider sm:tracking-widest truncate" title={getTeacherName(entry.teacherId)}>{getTeacherName(entry.teacherId)}</p>
                                   <div className="flex items-center gap-1 sm:gap-2 pt-0.5 sm:pt-2 border-t border-slate-200/50 mt-1 sm:mt-2">
                                     <button onClick={() => openEditModal('timetable', entry.id)} className="text-slate-400 hover:text-slate-700 transition-colors"><Edit2 size={8} className="w-2 h-2 sm:w-2.5 sm:h-2.5" /></button>
                                     <button onClick={() => handleDeleteTimetableEntry(entry.id)} className="text-slate-400 hover:text-red-500 transition-colors"><Trash2 size={8} className="w-2 h-2 sm:w-2.5 sm:h-2.5" /></button>
                                   </div>
                                 </div>
                               ) : (
                                 <button 
                                   onClick={() => {
                                       setTtDay(day);
                                       setTtPeriod(p);
                                       openAddModal('timetable');
                                   }}
                                   className="w-full text-slate-400 hover:text-slate-600 font-bold text-[7px] sm:text-[10px] uppercase  text-left pt-0.5 sm:pt-1 truncate"
                                 >
                                   + Assign
                                 </button>
                               )}
                             </div>
                           );
                        })}
                     </div>
                   </div>
                 ))}
              </div>
            ) : (
              <div className="py-12 text-center text-gray-400 font-sans border border-dashed border-gray-300 rounded-xl bg-white">
                Please configure and select a class to inspect timetables.
              </div>
            )}
          </div>
        )}

        {activeTab === 'monthly_report' && (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h1 className="text-3xl font-black text-slate-900 tracking-tight uppercase  border-l-8 border-indigo-600 pl-6">
                  Student Report
                </h1>
                <p className="text-xs font-bold text-slate-500 uppercase tracking-[0.3em] mt-2 pl-6">
                  Academic & Financial Analytics Hub
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2 print:hidden">
                <select 
                  className="px-4 py-2 bg-white border border-slate-200 rounded-xl text-xs font-black uppercase outline-none focus:border-indigo-500 shadow-sm"
                  value={reportClassFilter}
                  onChange={(e) => setReportClassFilter(e.target.value)}
                >
                  <option value="all">All Classes</option>
                  {classes.map(c => (
                    <option key={c.id} value={c.id}>{c.className} ({c.section})</option>
                  ))}
                </select>
                <select 
                  className="px-4 py-2 bg-white border border-slate-200 rounded-xl text-xs font-black uppercase outline-none focus:border-indigo-500 shadow-sm"
                  value={new Date().getFullYear()}
                  onChange={() => {}}
                >
                  <option value={new Date().getFullYear()}>{new Date().getFullYear()}</option>
                  <option value={new Date().getFullYear() - 1}>{new Date().getFullYear() - 1}</option>
                </select>
                <select 
                  className="px-4 py-2 bg-white border border-slate-200 rounded-xl text-xs font-black uppercase outline-none focus:border-indigo-500 shadow-sm"
                  value={reportMonth}
                  onChange={(e) => setReportMonth(e.target.value as Month)}
                >
                  {MONTHS.map(m => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Performance Grid */}
            <div className="grid grid-cols-1 gap-6">
              <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
                  <h2 className="text-sm font-black uppercase tracking-widest text-slate-900 flex items-center gap-2">
                    <Users size={18} className="text-indigo-600" /> 
                    {reportClassFilter === 'all' ? 'All Classes' : `Class ${classes.find(c => c.id === reportClassFilter)?.className}`} Student Summary
                  </h2>
                  <div className="flex gap-2 print:hidden">
                    <button 
                      onClick={handleDownloadSummary}
                      className="p-2 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors shadow-sm"
                      title="Download CSV"
                    >
                      <Download size={14} className="text-slate-600" />
                    </button>
                    <button 
                      onClick={handlePrintSummary}
                      className="p-2 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors shadow-sm"
                      title="Print Summary"
                    >
                      <Printer size={14} className="text-slate-600" />
                    </button>
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-900 text-white">
                        <th className="px-1.5 py-2 text-[9px] font-black uppercase tracking-tight">Student</th>
                        <th className="px-1.5 py-2 text-[9px] font-black uppercase tracking-tight text-center">Fee Status</th>
                        <th className="px-1.5 py-2 text-[9px] font-black uppercase tracking-tight text-center">Test Avg</th>
                        <th className="px-1.5 py-2 text-[9px] font-black uppercase tracking-tight text-right">Pending</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {students
                        .filter(s => reportClassFilter === 'all' || s.classId === reportClassFilter)
                        .map(s => {
                        const feeData = feeStudents.find(fs => String(fs.id) === String(s.id));
                        const feeSummary = feeData ? getMonthlySummary(feeData, reportMonth, new Date().getFullYear()) : null;
                        const totalPending = feeData ? getTotalPending(feeData) + getTotalOtherFunds(feeData) : 0;
                        
                        const studentMarks = marks.filter(m => m.studentId === s.id);
                        const avg = studentMarks.length > 0 
                          ? Math.round(studentMarks.reduce((sum, m) => sum + Number(m.marksObtained), 0) / studentMarks.length)
                          : 0;
                        
                        const getGrade = (a: number) => {
                          if (a >= 90) return 'A+';
                          if (a >= 80) return 'A';
                          if (a >= 70) return 'B';
                          if (a >= 60) return 'C';
                          if (a >= 50) return 'D';
                          return 'F';
                        };

                        return (
                          <tr 
                            key={s.id} 
                            onClick={() => setSelectedStudentReport(s)}
                            className="hover:bg-slate-50 transition-colors group cursor-pointer"
                          >
                            <td className="px-1.5 py-2">
                              <div className="flex items-center gap-2">
                                {s.photo ? (
                                  <img src={s.photo} alt={s.name} className="w-6 h-6 rounded-full object-cover border border-slate-200" />
                                ) : (
                                  <div className="w-6 h-6 rounded-full bg-slate-900 text-white flex items-center justify-center font-black text-[8px] border border-slate-800">
                                    {s.name.charAt(0)}
                                  </div>
                                )}
                                <div>
                                  <p className="text-[10px] font-black text-slate-900 uppercase tracking-tight group-hover:text-indigo-600 transition-colors leading-tight">{s.name}</p>
                                  <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">Class {classes.find(c => c.id === s.classId)?.className}</p>
                                </div>
                              </div>
                            </td>
                            <td className="px-1.5 py-2 text-center">
                              {feeSummary?.pending === 0 ? (
                                <span className="bg-emerald-50 text-emerald-600 text-[8px] font-black px-1.5 py-0.5 rounded-full uppercase border border-emerald-100">Paid</span>
                              ) : (
                                <span className="bg-rose-50 text-rose-600 text-[8px] font-black px-1.5 py-0.5 rounded-full uppercase border border-rose-100">Unpaid</span>
                              )}
                            </td>
                            <td className="px-1.5 py-2 text-center">
                              <span className="text-[10px] font-black text-slate-900">{avg > 0 ? `${avg}%` : '0%'}</span>
                            </td>
                            <td className="px-1.5 py-2 text-right">
                              <div className="flex items-center justify-end gap-1.5">
                                <span className={`text-[10px] font-black leading-none ${totalPending > 0 ? 'text-rose-600' : 'text-slate-900'}`}>
                                  Rs.{totalPending}
                                </span>
                                <button 
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleSendFeeNotification(s, 'reminder', 0, '');
                                  }}
                                  className="p-1 text-emerald-600 hover:bg-emerald-50 rounded-md transition-colors"
                                  title="Send Fee Reminder"
                                >
                                  <Send size={12} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'alerts' && (
          <div id="notification-center" className="space-y-6 animate-fade-in font-sans pb-20">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-gray-100 pb-6 mb-8">
              <div>
                <h1 className="text-xl font-black text-slate-900 uppercase tracking-tight ">Notification Hub</h1>
              </div>
              <div className="flex items-center gap-2">
                <div className="px-4 py-2 bg-rose-50 border border-rose-100 rounded-lg text-rose-600">
                  <span className="text-[9px] font-black uppercase block leading-none">High Priority</span>
                  <span className="text-lg font-black leading-none">{fees.filter(f => f.status === 'unpaid').length}</span>
                </div>
                <div className="px-4 py-2 bg-slate-50 border border-slate-100 rounded-lg text-slate-600">
                  <span className="text-[9px] font-black uppercase block leading-none">History Logs</span>
                  <span className="text-lg font-black leading-none">{broadcastLogs.length}</span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-2">
              {(() => {
                const unpaidFees = fees.filter(f => f.status === 'unpaid');
                if (unpaidFees.length === 0) {
                  return (
                    <div className="py-20 text-center border-2 border-dashed border-slate-100 rounded-xl">
                      <CheckCircle2 size={32} className="mx-auto text-emerald-500 mb-4 opacity-20" />
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">System Ledger Clear</p>
                    </div>
                  );
                }

                const studentDefaultersMap: Record<string, { student: Student; fees: FeeRecord[] }> = {};
                unpaidFees.forEach(f => {
                  const s = students.find(st => st.id === f.studentId);
                  if (s) {
                    if (!studentDefaultersMap[s.id]) {
                      studentDefaultersMap[s.id] = { student: s, fees: [] };
                    }
                    studentDefaultersMap[s.id].fees.push(f);
                  }
                });

                return Object.values(studentDefaultersMap).map(({ student, fees: sFees }) => {
                  const classObj = classes.find(c => c.id === student.classId);
                  const totalPending = sFees.reduce((acc, curr) => acc + curr.amount, 0);
                  const months = sFees.map(f => f.month).join(', ');
                  
                  const waMessage = appSettings.feeTemplate
                    .replace(/{student_name}/g, student.name)
                    .replace(/{class_name}/g, classObj ? `${classObj.className}-${classObj.section}` : '')
                    .replace(/{total_pending}/g, totalPending.toString())
                    .replace(/{months}/g, months || 'Current Month')
                    .replace(/{date}/g, new Date().toISOString().split('T')[0]);
                  
                  const waUrl = `https://api.whatsapp.com/send?phone=${student.parentPhone.replace(/[^0-9]/g, '') || '923001234567'}&text=${encodeURIComponent(waMessage)}`;

                  return (
                    <motion.div 
                      key={student.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="bg-white border border-slate-100 p-4 flex flex-col md:flex-row items-center justify-between hover:bg-slate-50/50 transition-all rounded-lg gap-4"
                    >
                      <div className="flex items-center gap-4 w-full md:w-auto">
                        <div className="w-10 h-10 bg-slate-900 text-white flex items-center justify-center font-black text-xs uppercase ">
                           {student.name.charAt(0)}
                        </div>
                        <div className="text-left">
                          <h3 className="text-xs font-black text-slate-900 uppercase tracking-tight">{student.name}</h3>
                          <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">
                            {classObj?.className}-{classObj?.section} • Rs. {totalPending}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 w-full md:w-auto">
                        <div className="hidden lg:block text-[9px] text-slate-400  max-w-[200px] truncate overflow-hidden bg-slate-50 px-2 py-1 rounded">
                          "{waMessage}"
                        </div>
                        <a 
                          href={waUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={() => {
                            setBroadcastLogs(prev => [{
                              id: 'notif_' + Date.now(),
                              recipient: `${student.name}'s Parent`,
                              phone: student.parentPhone || '',
                              type: 'WhatsApp',
                              text: `Sent consolidated alert for Rs. ${totalPending}`,
                              timestamp: new Date().toLocaleString(),
                              status: 'Sent'
                            }, ...prev]);
                            toast.success(`Alert dispatched for ${student.name}`);
                          }}
                          className="flex-1 md:flex-none flex items-center justify-center gap-2 bg-emerald-600 hover:bg-slate-900 text-white px-5 py-2.5 rounded text-[10px] font-black uppercase tracking-widest transition-all"
                        >
                          <Phone size={14} fill="currentColor" />
                          Send Alert
                        </a>
                      </div>
                    </motion.div>
                  );
                });
              })()}
            </div>
          </div>
        )}

        {/* ========== AUDIT HUB (REGISTERS / RECORDS) PANEL ========== */}
        {activeTab === 'registers' && (
          <div id="panel-principal-registers" className="space-y-6 animate-fade-in pb-20">
            {/* Header Banner */}
            <div className="bg-gradient-to-r from-emerald-600 to-teal-700 p-6 sm:p-8 -mx-4 sm:-mx-6 -mt-4 sm:-mt-6 mb-8 shadow-lg border-b border-emerald-700/50 rounded-b-2xl text-white">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                  <h1 className="text-2xl sm:text-4xl font-black tracking-tight font-display uppercase leading-none flex items-center gap-3">
                    <Database size={28} className="text-emerald-200 shrink-0" />
                    School Registers & Records
                  </h1>
                </div>
                <div className="flex items-center gap-2 bg-emerald-900/40 backdrop-blur-sm px-4 py-2 rounded-xl border border-emerald-400/20 text-xs font-bold">
                  <span className="w-2.5 h-2.5 bg-emerald-400 rounded-full animate-pulse" />
                  <span>Real-time Ledger Active</span>
                </div>
              </div>
            </div>

            {/* Sub-tab Switcher Buttons */}
            <div className="bg-white border border-slate-200 p-2 shadow-sm flex flex-wrap gap-2 sticky top-0 z-10 rounded-2xl mb-8">
              <button
                onClick={() => setRegistersSubTab('fees')}
                className={`flex-1 min-w-[150px] py-3.5 px-4 text-xs uppercase font-black tracking-widest transition-all flex items-center justify-center gap-3 rounded-xl cursor-pointer ${
                  registersSubTab === 'fees'
                    ? 'bg-emerald-600 text-white shadow-md scale-[1.01]'
                    : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50'
                }`}
              >
                <CreditCard size={18} /> Fees Ledger ({fees.length})
              </button>
              <button
                onClick={() => setRegistersSubTab('attendance')}
                className={`flex-1 min-w-[150px] py-3.5 px-4 text-xs uppercase font-black tracking-widest transition-all flex items-center justify-center gap-3 rounded-xl cursor-pointer ${
                  registersSubTab === 'attendance'
                    ? 'bg-emerald-600 text-white shadow-md scale-[1.01]'
                    : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50'
                }`}
              >
                <CheckCircle2 size={18} /> Attendance Register ({attendance.length})
              </button>
            </div>

            {registersSubTab === 'fees' ? (
              /* ================= FEES REGISTER & COLLECTION HUB ================= */
              <div id="audit-fees-section" className="space-y-4 sm:space-y-6 animate-fade-in">
                {/* Header & Main Actions */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3 sm:gap-4 mb-2">
                  <div>
                    <h2 className="text-lg sm:text-xl font-black text-slate-900 uppercase tracking-tight flex items-center gap-2">
                      <CreditCard className="text-emerald-600 shrink-0" size={20} /> Student Fee Collection & History Ledger
                    </h2>
                  </div>
                  <div className="flex items-center gap-2.5 w-full md:w-auto">
                    <button
                      onClick={() => {
                        setQuickCollectStudentId(students[0]?.id || '');
                        setShowQuickCollectModal(true);
                      }}
                      className="flex-1 md:flex-none px-4 sm:px-5 py-2.5 bg-emerald-600 text-white text-[10px] sm:text-[11px] font-black uppercase tracking-wider flex items-center justify-center gap-2 hover:bg-slate-900 transition-all shadow-md rounded-xl cursor-pointer"
                    >
                      <Plus size={16} /> ⚡ Collect Fee
                    </button>
                    <button
                      onClick={() => {
                        const csvContent = "data:text/csv;charset=utf-8," 
                          + "ID,Date,Student,Class,Month,Amount,PaymentMethod,FeeType\n"
                          + fees.map(f => {
                              const st = students.find(s => String(s.id) === String(f.studentId));
                              return `"${f.id}","${f.paidDate || ''}","${st?.name || (f as any).studentName || ''}","${st?.classId ? getClassName(st.classId) : ''}","${f.month}","${f.amount}","${f.paymentMethod || 'Cash'}","${f.feeType || 'Tuition Fee'}"`;
                            }).join("\n");
                        const encodedUri = encodeURI(csvContent);
                        const link = document.createElement("a");
                        link.setAttribute("href", encodedUri);
                        link.setAttribute("download", `NSB1_School_Fee_Ledger_${new Date().toISOString().split('T')[0]}.csv`);
                        document.body.appendChild(link);
                        link.click();
                        document.body.removeChild(link);
                        toast.success("Fee ledger exported as CSV!");
                      }}
                      className="px-3.5 sm:px-4 py-2.5 bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 text-[10px] sm:text-[11px] font-black uppercase tracking-wider flex items-center justify-center gap-2 transition-all rounded-xl shadow-xs cursor-pointer"
                    >
                      <Download size={15} /> Export
                    </button>
                  </div>
                </div>

                {/* Filter, Search & View Controls */}
                <div className="bg-white p-3 sm:p-4 border border-slate-200 rounded-2xl shadow-sm space-y-3">
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                    {/* View Mode Switcher */}
                    <div className="flex items-center gap-1.5 w-full sm:w-auto bg-slate-100 p-1 rounded-xl">
                      <button
                        onClick={() => setRecordsFeeViewMode('roster')}
                        className={`flex-1 sm:flex-none px-3 sm:px-4 py-2 text-[10px] sm:text-[11px] font-black uppercase tracking-wider rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                          recordsFeeViewMode === 'roster'
                            ? 'bg-slate-900 text-white shadow-xs'
                            : 'text-slate-600 hover:bg-white/50'
                        }`}
                      >
                        <Users size={14} /> Fee Roster
                      </button>
                      <button
                        onClick={() => setRecordsFeeViewMode('receipts')}
                        className={`flex-1 sm:flex-none px-3 sm:px-4 py-2 text-[10px] sm:text-[11px] font-black uppercase tracking-wider rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                          recordsFeeViewMode === 'receipts'
                            ? 'bg-slate-900 text-white shadow-xs'
                            : 'text-slate-600 hover:bg-white/50'
                        }`}
                      >
                        <Receipt size={14} /> Receipts ({fees.length})
                      </button>
                    </div>

                    {/* Class Filter Dropdown */}
                    <div className="flex items-center gap-2 w-full sm:w-auto">
                      <div className="relative flex-1 min-w-[160px]">
                        <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={14} />
                        <select
                          value={recordsFeeClassFilter}
                          onChange={(e) => setRecordsFeeClassFilter(e.target.value)}
                          className="w-full pl-9 pr-8 py-2 bg-slate-50 border border-slate-200 text-xs font-bold uppercase tracking-wider focus:outline-none focus:border-emerald-500 rounded-xl appearance-none cursor-pointer"
                        >
                          <option value="all">All Classes</option>
                          {classes.map(c => {
                            const count = students.filter(s => s.classId === c.id).length;
                            return (
                              <option key={c.id} value={c.id}>
                                {c.className} - {c.section} ({count} Std)
                              </option>
                            );
                          })}
                        </select>
                        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={14} />
                      </div>
                    </div>
                  </div>

                  {/* Search Bar */}
                  <div className="relative w-full pt-1">
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={15} />
                    <input
                      type="text"
                      value={recordsFeeSearch}
                      onChange={(e) => setRecordsFeeSearch(e.target.value)}
                      placeholder="Search student by name, roll number, or month..."
                      className="w-full pl-10 pr-8 py-2.5 text-xs font-bold text-slate-800 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-emerald-500 transition-all placeholder:text-slate-400 placeholder:font-normal"
                    />
                    {recordsFeeSearch && (
                      <button
                        onClick={() => setRecordsFeeSearch('')}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
                      >
                        <X size={14} />
                      </button>
                    )}
                  </div>
                </div>

                {/* Stat Summary Cards */}
                {(() => {
                  const filteredStudentsList = filteredFeesRoster;

                  const totalExpected = filteredStudentsList.reduce((acc, s) => acc + (s.baseFee || 5500), 0);
                  const totalCollected = fees.filter(f => filteredStudentsList.some(s => String(s.id) === String(f.studentId)))
                    .reduce((sum, f) => sum + Number(f.amount || 0), 0);
                  const totalOutstanding = Math.max(0, totalExpected - totalCollected);

                  return (
                    <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 gap-2.5 sm:gap-4">
                      <div className="bg-white p-3.5 sm:p-5 border border-slate-200 rounded-2xl shadow-xs">
                        <p className="text-[9px] sm:text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 truncate">Roster Students</p>
                        <h3 className="text-base sm:text-2xl font-black text-slate-900 tracking-tight">
                          {filteredStudentsList.length} <span className="text-[10px] sm:text-xs text-slate-400 font-bold uppercase">Enrolled</span>
                        </h3>
                      </div>
                      <div className="bg-white p-3.5 sm:p-5 border border-emerald-100 bg-emerald-50/20 rounded-2xl shadow-xs">
                        <p className="text-[9px] sm:text-[10px] font-black text-emerald-600 uppercase tracking-widest mb-1 truncate">Revenue Collected</p>
                        <h3 className="text-base sm:text-2xl font-black text-emerald-700 tracking-tight">
                          Rs. {totalCollected.toLocaleString()}
                        </h3>
                      </div>
                      <div className="bg-white p-3.5 sm:p-5 border border-rose-100 bg-rose-50/20 rounded-2xl shadow-xs">
                        <p className="text-[9px] sm:text-[10px] font-black text-rose-600 uppercase tracking-widest mb-1 truncate">Pending Balance</p>
                        <h3 className="text-base sm:text-2xl font-black text-rose-700 tracking-tight">
                          Rs. {totalOutstanding.toLocaleString()}
                        </h3>
                      </div>
                      <div className="bg-white p-3.5 sm:p-5 border border-slate-200 rounded-2xl shadow-xs">
                        <p className="text-[9px] sm:text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 truncate">Collection Rate</p>
                        <h3 className="text-base sm:text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
                          {totalExpected > 0 ? Math.round((totalCollected / totalExpected) * 100) : 0}%
                        </h3>
                      </div>
                    </div>
                  );
                })()}

                {/* Content based on recordsFeeViewMode */}
                {recordsFeeViewMode === 'roster' ? (
                  /* ================= MODE 1: STUDENT FEE ROSTER & IN-PLACE COLLECT ================= */
                  <div className="bg-white border border-slate-200 shadow-sm overflow-hidden rounded-2xl">
                    <div className="p-3.5 sm:p-5 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center flex-wrap gap-2">
                      <h3 className="text-xs font-black uppercase tracking-widest text-slate-900 flex items-center gap-2">
                        <Users size={16} className="text-emerald-600 shrink-0" /> Class Student Fee History & Direct Collection
                      </h3>
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider hidden sm:inline">
                        Click "Collect Fee" to collect payment instantly
                      </span>
                    </div>

                    {/* MOBILE CARD VIEW (< md) */}
                    <div className="block md:hidden divide-y divide-slate-100">
                      {(() => {
                        if (filteredFeesRoster.length === 0) {
                          return (
                            <div className="py-12 text-center text-slate-400 font-bold uppercase tracking-wider text-xs px-4">
                              No students found matching current class and search filters.
                            </div>
                          );
                        }

                        return filteredFeesRoster.map(student => {
                          const sFees = fees.filter(f => String(f.studentId) === String(student.id));
                          const totalPaid = sFees.reduce((sum, f) => sum + Number(f.amount || 0), 0);
                          const monthlyFee = student.baseFee || 5500;
                          const isPaidCurrent = totalPaid >= monthlyFee;
                          const isExpanded = expandedStudentFeeId === String(student.id);
                          const sClass = getClassName(student.classId);
                          const photo = getStudentPhoto(student);

                          return (
                            <div key={student.id} className="p-4 space-y-3 bg-white border-b border-slate-100 last:border-b-0">
                              {/* Header & Status (Clicking toggles expansion) */}
                              <div
                                onClick={() => setExpandedStudentFeeId(isExpanded ? null : String(student.id))}
                                className="flex items-center justify-between gap-3 cursor-pointer hover:bg-slate-50/80 p-1.5 rounded-xl transition-colors"
                              >
                                <div className="flex items-center gap-3 min-w-0">
                                  {photo ? (
                                    <img
                                      src={photo}
                                      alt={student.name}
                                      className="w-10 h-10 rounded-full object-cover border border-slate-200 bg-slate-100 shrink-0"
                                    />
                                  ) : (
                                    <div className="w-10 h-10 rounded-full border border-slate-200 bg-slate-50 shrink-0" />
                                  )}
                                  <div className="min-w-0">
                                    <h4 className={`font-black uppercase tracking-tight text-xs truncate ${
                                      isPaidCurrent ? 'text-slate-900' : 'text-rose-600'
                                    }`}>
                                      {student.name}
                                    </h4>
                                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mt-0.5">
                                      Roll: {student.rollNumber || 'N/A'} • Class {sClass}
                                    </p>
                                  </div>
                                </div>
                                <div className="flex items-center gap-2 shrink-0">
                                  {isPaidCurrent ? (
                                    <span className="bg-emerald-50 text-emerald-700 px-2.5 py-1 text-[9px] font-black tracking-wider border border-emerald-100 rounded-full uppercase flex items-center gap-1">
                                      <CheckCircle2 size={10} /> Paid
                                    </span>
                                  ) : totalPaid > 0 ? (
                                    <span className="bg-amber-50 text-amber-700 px-2.5 py-1 text-[9px] font-black tracking-wider border border-amber-100 rounded-full uppercase flex items-center gap-1">
                                      <Clock size={10} /> Partial
                                    </span>
                                  ) : (
                                    <span className="bg-rose-50 text-rose-700 px-2.5 py-1 text-[9px] font-black tracking-wider border border-rose-100 rounded-full uppercase flex items-center gap-1">
                                      <AlertTriangle size={10} /> Unpaid
                                    </span>
                                  )}
                                  <ChevronDown size={15} className={`text-slate-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                                </div>
                              </div>

                              {/* Mobile Expanded Details & Actions (Revealed ONLY on Click) */}
                              {isExpanded && (
                                <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200 space-y-3 mt-2 animate-fade-in">
                                  {/* Action Toolbar Header */}
                                  <div className="flex items-center justify-between gap-2 pb-2 border-b border-slate-200">
                                    <span className="text-[10px] font-black uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
                                      <FileText size={14} className="text-emerald-600 shrink-0" />
                                      Student Fee Details
                                    </span>
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setQuickCollectStudentId(String(student.id));
                                        setQuickCollectAmount(String(student.baseFee || 5500));
                                        setShowQuickCollectModal(true);
                                      }}
                                      className="px-3 py-1.5 bg-emerald-600 hover:bg-slate-900 text-white text-[10px] font-black uppercase tracking-wider rounded-xl transition-all shadow-sm flex items-center gap-1 cursor-pointer shrink-0"
                                    >
                                      <Plus size={13} /> Collect Fee
                                    </button>
                                  </div>
                                  {/* Fee Metrics Breakdown */}
                                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 bg-white p-3 rounded-xl border border-slate-200 text-xs shadow-2xs">
                                    <div>
                                      <span className="text-[9px] font-bold text-slate-400 uppercase block">Monthly Fee</span>
                                      <span className="font-black text-slate-800">Rs. {monthlyFee.toLocaleString()}</span>
                                    </div>
                                    <div>
                                      <span className="text-[9px] font-bold text-slate-400 uppercase block">Total Paid</span>
                                      <span className={`font-black ${isPaidCurrent ? 'text-emerald-600' : 'text-rose-600'}`}>
                                        Rs. {totalPaid.toLocaleString()}
                                      </span>
                                    </div>
                                    <div className="col-span-2 sm:col-span-1">
                                      <span className="text-[9px] font-bold text-slate-400 uppercase block">Pending Balance</span>
                                      <span className={`font-black ${monthlyFee - totalPaid <= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                                        Rs. {Math.max(0, monthlyFee - totalPaid).toLocaleString()}
                                      </span>
                                    </div>
                                  </div>

                                  <div className="flex items-center justify-between pb-1 border-b border-slate-200">
                                    <span className="text-[10px] font-black uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
                                      <Receipt size={13} className="text-emerald-600" />
                                      Payment History ({sFees.length})
                                    </span>
                                    {student.parentPhone && (
                                      <span className="text-[9px] font-bold text-slate-500 uppercase font-mono">
                                        📱 {student.parentPhone}
                                      </span>
                                    )}
                                  </div>

                                  {sFees.length === 0 ? (
                                    <p className="text-[10px] font-bold text-slate-400 uppercase py-2 text-center">
                                      No payment receipts logged yet.
                                    </p>
                                  ) : (
                                    <div className="space-y-2">
                                      {sFees.map(f => (
                                        <div key={f.id} className="p-2.5 bg-white border border-slate-200 rounded-xl space-y-1.5 text-xs shadow-2xs">
                                          <div className="flex items-center justify-between">
                                            <span className="bg-emerald-100 text-emerald-800 text-[9px] font-black px-1.5 py-0.5 rounded font-mono">
                                              #{String(f.id).slice(-6)}
                                            </span>
                                            <span className="text-emerald-700 font-black">Rs. {Number(f.amount).toLocaleString()}</span>
                                          </div>
                                          <div className="flex items-center justify-between text-[10px] font-bold text-slate-500">
                                            <span>Month: {f.month}</span>
                                            <span>{f.paymentMethod || 'Cash'}</span>
                                          </div>
                                          <div className="flex items-center justify-between pt-1 border-t border-slate-100">
                                            <span className="text-[9px] text-slate-400">{f.paidDate || f.dueDate}</span>
                                            <div className="flex items-center gap-1">
                                              {student.parentPhone && (
                                                <button
                                                  onClick={() => {
                                                    const text = `Fee Receipt: Received Rs. ${f.amount} for ${student.name} (${f.month}). Receipt #${f.id}. Thank you! - NSB Academy`;
                                                    window.open(`https://api.whatsapp.com/send?phone=${student.parentPhone.replace(/[^0-9]/g, '')}&text=${encodeURIComponent(text)}`, '_blank');
                                                  }}
                                                  className="p-1 text-emerald-600 hover:bg-emerald-50 rounded"
                                                  title="WhatsApp Receipt"
                                                >
                                                  <MessageSquare size={13} />
                                                </button>
                                              )}
                                              <button
                                                onClick={() => {
                                                  if (window.confirm(`Delete receipt #${f.id}?`)) {
                                                    setFees(prev => prev.filter(item => item.id !== f.id));
                                                    toast.success("Receipt removed");
                                                  }
                                                }}
                                                className="p-1 text-rose-400 hover:text-rose-600 rounded"
                                                title="Delete Receipt"
                                              >
                                                <Trash2 size={13} />
                                              </button>
                                            </div>
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          );
                        });
                      })()}
                    </div>

                    {/* DESKTOP TABLE VIEW (>= md) */}
                    <div className="hidden md:block overflow-x-auto">
                      <table className="w-full text-left">
                        <thead className="bg-slate-50/80 border-b border-slate-100 uppercase text-[9px] font-black tracking-widest text-slate-500">
                          <tr>
                            <th className="px-5 py-4">Student & Roll #</th>
                            <th className="px-5 py-4">Class</th>
                            <th className="px-5 py-4">Fee Status</th>
                            <th className="px-5 py-4 text-right">Fee Details & Collect</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {(() => {
                            if (filteredFeesRoster.length === 0) {
                              return (
                                <tr>
                                  <td colSpan={4} className="py-16 text-center text-slate-400 font-bold uppercase tracking-wider text-xs">
                                    No students found matching current class and search filters.
                                  </td>
                                </tr>
                              );
                            }

                            return filteredFeesRoster.map(student => {
                              const sFees = fees.filter(f => String(f.studentId) === String(student.id));
                              const totalPaid = sFees.reduce((sum, f) => sum + Number(f.amount || 0), 0);
                              const monthlyFee = student.baseFee || 5500;
                              const isPaidCurrent = totalPaid >= monthlyFee;
                              const isExpanded = expandedStudentFeeId === String(student.id);
                              const sClass = getClassName(student.classId);
                              const photo = getStudentPhoto(student);

                              return (
                                <React.Fragment key={student.id}>
                                  <tr
                                    onClick={() => setExpandedStudentFeeId(isExpanded ? null : String(student.id))}
                                    className="hover:bg-slate-50/80 transition-colors cursor-pointer"
                                  >
                                    <td className="px-5 py-4">
                                      <div className="flex items-center gap-3">
                                        {photo ? (
                                          <img
                                            src={photo}
                                            alt={student.name}
                                            className="w-9 h-9 rounded-full object-cover border border-slate-200 bg-slate-100 shrink-0"
                                          />
                                        ) : (
                                          <div className="w-9 h-9 rounded-full border border-slate-200 bg-slate-50 shrink-0" />
                                        )}
                                        <div>
                                          <span className={`block uppercase tracking-tight text-xs leading-tight ${
                                            isPaidCurrent ? 'text-slate-900 font-black' : 'text-rose-600 font-black'
                                          }`}>
                                            {student.name}
                                          </span>
                                          <span className="text-[9px] text-slate-400 font-bold uppercase tracking-widest block mt-0.5">
                                            Roll #{student.rollNumber || 'N/A'}
                                          </span>
                                        </div>
                                      </div>
                                    </td>
                                    <td className="px-5 py-4 text-xs font-bold text-slate-700 uppercase tracking-wider">
                                      <span className="bg-slate-100 text-slate-800 px-2.5 py-1 text-[10px] font-black border border-slate-200 rounded-md">
                                        Class {sClass}
                                      </span>
                                    </td>
                                    <td className="px-5 py-4">
                                      {isPaidCurrent ? (
                                        <span className="bg-emerald-50 text-emerald-700 px-2.5 py-1 text-[10px] font-black tracking-wider border border-emerald-100 rounded-full uppercase flex items-center gap-1 w-fit">
                                          <CheckCircle2 size={12} /> Paid
                                        </span>
                                      ) : totalPaid > 0 ? (
                                        <span className="bg-amber-50 text-amber-700 px-2.5 py-1 text-[10px] font-black tracking-wider border border-amber-100 rounded-full uppercase flex items-center gap-1 w-fit">
                                          <Clock size={12} /> Partial
                                        </span>
                                      ) : (
                                        <span className="bg-rose-50 text-rose-700 px-2.5 py-1 text-[10px] font-black tracking-wider border border-rose-100 rounded-full uppercase flex items-center gap-1 w-fit">
                                          <AlertTriangle size={12} /> Unpaid
                                        </span>
                                      )}
                                    </td>
                                    <td className="px-5 py-4 text-right">
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setExpandedStudentFeeId(isExpanded ? null : String(student.id));
                                        }}
                                        className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-[10px] font-black uppercase tracking-wider rounded-lg transition-all flex items-center gap-1.5 ml-auto cursor-pointer"
                                      >
                                        <FileText size={13} /> {isExpanded ? 'Hide Details' : 'Click for Details'}
                                        <ChevronDown size={13} className={`transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                                      </button>
                                    </td>
                                  </tr>

                                  {/* Expanded Payment History & Collect Fee Section */}
                                  {isExpanded && (
                                    <tr>
                                      <td colSpan={4} className="bg-slate-50/90 p-4 border-y border-slate-200">
                                        <div className="bg-white p-4 rounded-xl border border-slate-200 space-y-3 shadow-inner">
                                          {/* Top Bar inside Expanded Row */}
                                          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                                            <div>
                                              <h4 className="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center gap-2">
                                                <Receipt size={14} className="text-emerald-600" />
                                                Fee Record & History for {student.name}
                                              </h4>
                                              <p className="text-[10px] font-bold text-slate-400 uppercase mt-0.5">
                                                Roll #{student.rollNumber || 'N/A'} • Class {sClass} • Phone: {student.parentPhone || 'N/A'}
                                              </p>
                                            </div>
                                            <button
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                setQuickCollectStudentId(String(student.id));
                                                setQuickCollectAmount(String(student.baseFee || 5500));
                                                setShowQuickCollectModal(true);
                                              }}
                                              className="px-4 py-2 bg-emerald-600 hover:bg-slate-900 text-white text-[10px] font-black uppercase tracking-wider rounded-xl transition-all shadow-sm flex items-center gap-1.5 cursor-pointer"
                                            >
                                              <Plus size={14} /> Collect Fee
                                            </button>
                                          </div>

                                          {/* Fee Metrics Summary Banner */}
                                          <div className="grid grid-cols-3 gap-3 bg-slate-50/80 p-3 rounded-xl border border-slate-200 text-xs">
                                            <div>
                                              <span className="text-[10px] font-black text-slate-400 uppercase block">Monthly Base Fee</span>
                                              <span className="text-sm font-black text-slate-800">Rs. {monthlyFee.toLocaleString()}</span>
                                            </div>
                                            <div>
                                              <span className="text-[10px] font-black text-slate-400 uppercase block">Total Amount Paid</span>
                                              <span className={`text-sm font-black ${isPaidCurrent ? 'text-emerald-600' : 'text-rose-600'}`}>
                                                Rs. {totalPaid.toLocaleString()}
                                              </span>
                                            </div>
                                            <div>
                                              <span className="text-[10px] font-black text-slate-400 uppercase block">Pending Balance</span>
                                              <span className={`text-sm font-black ${monthlyFee - totalPaid <= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                                                Rs. {Math.max(0, monthlyFee - totalPaid).toLocaleString()}
                                              </span>
                                            </div>
                                          </div>

                                          <div className="flex items-center justify-between border-b border-slate-100 pb-2 pt-1">
                                            <h4 className="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center gap-2">
                                              <Receipt size={14} className="text-emerald-600" />
                                              Fee History Log for {student.name} ({sClass})
                                            </h4>
                                            <span className="text-[10px] font-bold text-slate-400 uppercase">
                                              Total Receipts: {sFees.length}
                                            </span>
                                          </div>

                                          {sFees.length === 0 ? (
                                            <p className="text-xs text-slate-400 font-bold uppercase py-4 text-center">
                                              No fee payment records logged for this student yet. Click "Collect Fee" above to add payment.
                                            </p>
                                          ) : (
                                            <div className="space-y-2">
                                              {sFees.map(f => (
                                                <div key={f.id} className="p-3 bg-slate-50 border border-slate-200 rounded-lg flex items-center justify-between text-xs font-bold gap-3">
                                                  <div className="flex items-center gap-3">
                                                    <span className="bg-emerald-100 text-emerald-800 text-[9px] font-black px-2 py-0.5 rounded uppercase font-mono">
                                                      #{String(f.id).slice(-6)}
                                                    </span>
                                                    <span className="text-slate-700 font-black">Month: {f.month}</span>
                                                    <span className="text-slate-400 text-[10px]">Paid Date: {f.paidDate || f.dueDate}</span>
                                                    <span className="bg-slate-200 text-slate-700 text-[9px] px-2 py-0.5 rounded uppercase">{f.paymentMethod || 'Cash'}</span>
                                                  </div>
                                                  <div className="flex items-center gap-3">
                                                    <span className="text-emerald-700 font-black text-sm">Rs. {Number(f.amount).toLocaleString()}</span>
                                                    {student.parentPhone && (
                                                      <button
                                                        onClick={() => {
                                                          const text = `Fee Receipt: Received Rs. ${f.amount} for ${student.name} (${f.month}). Receipt #${f.id}. Thank you! - NSB Academy`;
                                                          window.open(`https://api.whatsapp.com/send?phone=${student.parentPhone.replace(/[^0-9]/g, '')}&text=${encodeURIComponent(text)}`, '_blank');
                                                        }}
                                                        className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded"
                                                        title="WhatsApp Receipt"
                                                      >
                                                        <MessageSquare size={14} />
                                                      </button>
                                                    )}
                                                    <button
                                                      onClick={() => {
                                                        if (window.confirm(`Delete receipt #${f.id}?`)) {
                                                          setFees(prev => prev.filter(item => item.id !== f.id));
                                                          toast.success("Receipt removed");
                                                        }
                                                      }}
                                                      className="p-1.5 text-rose-400 hover:text-rose-600 hover:bg-rose-50 rounded"
                                                      title="Delete Receipt"
                                                    >
                                                      <Trash2 size={14} />
                                                    </button>
                                                  </div>
                                                </div>
                                              ))}
                                            </div>
                                          )}
                                        </div>
                                      </td>
                                    </tr>
                                  )}
                                </React.Fragment>
                              );
                            });
                          })()}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ) : (
                  /* ================= MODE 2: TRANSACTION RECEIPTS LOG ================= */
                  <div className="bg-white border border-slate-200 shadow-sm overflow-hidden rounded-2xl">
                    <div className="p-3.5 sm:p-5 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
                      <h3 className="text-xs font-black uppercase tracking-widest text-slate-900 flex items-center gap-2">
                        <Receipt size={16} className="text-emerald-600 shrink-0" /> Individual Payment Receipts Log
                      </h3>
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                        {fees.length} Total Receipts
                      </span>
                    </div>

                    {/* MOBILE RECEIPT CARDS (< md) */}
                    <div className="block md:hidden divide-y divide-slate-100">
                      {(() => {
                        if (filteredFeesReceipts.length === 0) {
                          return (
                            <div className="py-12 text-center text-slate-400 font-bold uppercase tracking-wider text-xs px-4">
                              No transaction receipts found matching current filters.
                            </div>
                          );
                        }

                        return (
                          <>
                            {visibleFeesReceipts.map(fee => {
                              const student = studentsMap.get(String(fee.studentId));
                              const feeStudent = feeStudentsMap.get(String(fee.studentId));
                              const sName = student?.name || feeStudent?.name || (fee as any).studentName || (`Student #${String(fee.studentId || '').slice(-4)}`);
                              const sRoll = student?.rollNumber ? `Roll #${student.rollNumber}` : feeStudent?.class ? feeStudent.class : 'Roster Student';
                              const sClass = student?.classId ? getClassName(student.classId) : feeStudent?.class || 'General';
                              const photo = getStudentPhoto(student || { name: sName });

                              return (
                                <div key={fee.id} className="p-4 space-y-2.5 bg-white">
                                  <div className="flex items-center justify-between">
                                    <span className="font-mono text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded font-bold">
                                      #{String(fee.id).slice(-6)}
                                    </span>
                                    <span className="text-[10px] font-bold text-slate-400">{fee.paidDate || 'N/A'}</span>
                                  </div>

                                  <div className="flex items-center gap-3">
                                    {photo ? (
                                      <img
                                        src={photo}
                                        alt={sName}
                                        className="w-9 h-9 rounded-full object-cover border border-slate-200 bg-slate-100 shrink-0"
                                      />
                                    ) : (
                                      <div className="w-9 h-9 rounded-full border border-slate-200 bg-slate-50 shrink-0" />
                                    )}
                                    <div className="min-w-0">
                                      <h4 className="font-black text-slate-900 uppercase tracking-tight text-xs truncate">
                                        {sName}
                                      </h4>
                                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">
                                        {sRoll} • {sClass}
                                      </p>
                                    </div>
                                  </div>

                                  <div className="flex items-center justify-between pt-1">
                                    <div className="flex items-center gap-2">
                                      <span className="bg-emerald-50 text-emerald-700 px-2 py-0.5 text-[9px] font-black tracking-wider border border-emerald-100 rounded uppercase">
                                        {fee.month}
                                      </span>
                                      <span className="text-[10px] font-bold text-slate-500 uppercase">
                                        {fee.paymentMethod || 'Cash'}
                                      </span>
                                    </div>
                                    <span className="text-emerald-700 font-black text-sm">
                                      Rs. {Number(fee.amount).toLocaleString()}
                                    </span>
                                  </div>

                                  <div className="flex items-center justify-end gap-2 pt-1 border-t border-slate-100">
                                    {student?.parentPhone && (
                                      <button
                                        onClick={() => {
                                          const text = `Fee Receipt: Received Rs. ${fee.amount} for ${student.name} (${fee.month}). Receipt #${fee.id}. Thank you! - NSB Academy`;
                                          window.open(`https://api.whatsapp.com/send?phone=${student.parentPhone.replace(/[^0-9]/g, '')}&text=${encodeURIComponent(text)}`, '_blank');
                                        }}
                                        className="px-2.5 py-1 bg-emerald-50 text-emerald-700 text-[10px] font-bold rounded-lg flex items-center gap-1"
                                      >
                                        <MessageSquare size={12} /> WhatsApp
                                      </button>
                                    )}
                                    <button
                                      onClick={() => {
                                        if (window.confirm(`Delete fee record for ${sName}?`)) {
                                          setFees(prev => prev.filter(f => f.id !== fee.id));
                                          toast.success(`Fee record removed`);
                                        }
                                      }}
                                      className="p-1.5 text-rose-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all cursor-pointer"
                                      title="Delete Record"
                                    >
                                      <Trash2 size={15} />
                                    </button>
                                  </div>
                                </div>
                              );
                            })}
                            {filteredFeesReceipts.length > feesDisplayLimit && (
                              <div className="p-6 flex justify-center">
                                <button 
                                  onClick={() => setFeesDisplayLimit(prev => prev + 100)}
                                  className="px-6 py-2.5 bg-slate-900 text-white rounded-xl text-xs font-black uppercase tracking-widest hover:bg-slate-800 transition-all shadow-md active:scale-95"
                                >
                                  Load More Records ({filteredFeesReceipts.length - feesDisplayLimit} remaining)
                                </button>
                              </div>
                            )}
                          </>
                        );
                      })()}
                    </div>

                    {/* DESKTOP RECEIPTS TABLE (>= md) */}
                    <div className="hidden md:block overflow-x-auto">
                      <table className="w-full text-left">
                        <thead className="bg-slate-50/80 border-b border-slate-100 uppercase text-[9px] font-black tracking-widest text-slate-500">
                          <tr>
                            <th className="px-5 py-4">Receipt ID</th>
                            <th className="px-5 py-4">Date Paid</th>
                            <th className="px-5 py-4">Student & Roll</th>
                            <th className="px-5 py-4">Class</th>
                            <th className="px-5 py-4">Fee Month</th>
                            <th className="px-5 py-4">Amount</th>
                            <th className="px-5 py-4">Method</th>
                            <th className="px-5 py-4 text-right">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {(() => {
                            if (filteredFeesReceipts.length === 0) {
                              return (
                                <tr>
                                  <td colSpan={8} className="py-16 text-center text-slate-400 font-bold uppercase tracking-wider text-xs">
                                    No transaction receipts found matching current filters.
                                  </td>
                                </tr>
                              );
                            }

                            return (
                              <>
                                {visibleFeesReceipts.map(fee => {
                                  const student = studentsMap.get(String(fee.studentId));
                                  const feeStudent = feeStudentsMap.get(String(fee.studentId));
                                  const sName = student?.name || feeStudent?.name || (fee as any).studentName || (`Student #${String(fee.studentId || '').slice(-4)}`);
                                  const sRoll = student?.rollNumber ? `Roll #${student.rollNumber}` : feeStudent?.class ? feeStudent.class : 'Roster Student';
                                  const sClass = student?.classId ? getClassName(student.classId) : feeStudent?.class || 'General';
                                  const photo = getStudentPhoto(student || { name: sName });

                                  return (
                                    <tr key={fee.id} className="hover:bg-slate-50/60 transition-colors">
                                      <td className="px-5 py-4 font-mono text-xs text-slate-400 font-bold">
                                        #{String(fee.id).slice(-6)}
                                      </td>
                                      <td className="px-5 py-4 text-xs font-bold text-slate-600 tabular-nums">
                                        {fee.paidDate || 'N/A'}
                                      </td>
                                      <td className="px-5 py-4">
                                        <div className="flex items-center gap-3">
                                            {photo ? (
                                              <img
                                                src={photo}
                                                alt={sName}
                                                className="w-8 h-8 rounded-full object-cover border border-slate-200 bg-slate-100 shrink-0"
                                              />
                                            ) : (
                                              <div className="w-8 h-8 rounded-full border border-slate-200 bg-slate-50 shrink-0" />
                                            )}
                                          <div>
                                            <span className="font-black text-slate-900 block truncate uppercase tracking-tight text-xs leading-tight">
                                              {sName}
                                            </span>
                                            <span className="text-[9px] text-slate-400 font-bold uppercase tracking-widest block mt-0.5">
                                              {sRoll}
                                            </span>
                                          </div>
                                        </div>
                                      </td>
                                      <td className="px-5 py-4 text-xs font-bold text-slate-600 uppercase tracking-wider">
                                        {sClass}
                                      </td>
                                      <td className="px-5 py-4">
                                        <span className="bg-emerald-50 text-emerald-700 px-2.5 py-1 text-[10px] font-black tracking-widest border border-emerald-100 rounded-md uppercase">
                                          {fee.month}
                                        </span>
                                      </td>
                                      <td className="px-5 py-4 text-emerald-600 font-black text-sm tracking-tight tabular-nums">
                                        Rs. {Number(fee.amount).toLocaleString()}
                                      </td>
                                      <td className="px-5 py-4 text-xs font-bold text-slate-500 uppercase">
                                        {fee.paymentMethod || 'Cash'}
                                      </td>
                                      <td className="px-5 py-4 text-right">
                                        <button
                                          onClick={() => {
                                            if (window.confirm(`Delete fee record for ${sName}?`)) {
                                              setFees(prev => prev.filter(f => f.id !== fee.id));
                                              toast.success(`Fee record removed`);
                                            }
                                          }}
                                          className="p-2 text-rose-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all cursor-pointer"
                                          title="Delete Record"
                                        >
                                          <Trash2 size={16} />
                                        </button>
                                      </td>
                                    </tr>
                                  );
                                })}
                                {filteredFeesReceipts.length > feesDisplayLimit && (
                                  <tr>
                                    <td colSpan={8} className="px-5 py-8 text-center bg-white border-t border-slate-50">
                                      <button 
                                        onClick={() => setFeesDisplayLimit(prev => prev + 100)}
                                        className="px-8 py-3 bg-slate-900 text-white rounded-xl text-xs font-black uppercase tracking-widest hover:bg-slate-800 transition-all shadow-lg active:scale-95"
                                      >
                                        Load More Records ({filteredFeesReceipts.length - feesDisplayLimit} remaining)
                                      </button>
                                    </td>
                                  </tr>
                                )}
                              </>
                            );
                          })()}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              /* ================= ATTENDANCE REGISTER ================= */
              <div id="audit-attendance-section" className="space-y-6 animate-fade-in">
                {/* Filters & Control Bar */}
                <div className="bg-white p-4 border border-slate-200 rounded-2xl shadow-sm space-y-3">
                  <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
                    {/* Date, Mode & Class Controls */}
                    <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
                      <div className="relative flex-1 min-w-[150px]">
                        <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                        <input
                          type="date"
                          value={attendanceFilterDate}
                          onChange={(e) => {
                            setAttendanceFilterDate(e.target.value);
                            if (e.target.value) setAttendanceShowAllDates(false);
                          }}
                          className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 text-xs font-bold uppercase tracking-wider focus:outline-none focus:border-emerald-500 rounded-xl"
                        />
                      </div>

                      <button
                        onClick={() => setAttendanceShowAllDates(!attendanceShowAllDates)}
                        className={`px-3.5 py-2 text-[11px] font-black uppercase tracking-wider border transition-all rounded-xl cursor-pointer ${
                          attendanceShowAllDates
                            ? 'bg-slate-900 text-white border-slate-900 shadow-sm'
                            : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                        }`}
                      >
                        {attendanceShowAllDates ? '📅 History Mode' : '📆 Daily Mode'}
                      </button>

                      <div className="relative flex-1 min-w-[150px]">
                        <Users className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                        <select
                          value={attendanceFilterClass}
                          onChange={(e) => setAttendanceFilterClass(e.target.value)}
                          className="w-full pl-9 pr-8 py-2 bg-slate-50 border border-slate-200 text-xs font-bold uppercase tracking-wider focus:outline-none focus:border-emerald-500 rounded-xl appearance-none cursor-pointer"
                        >
                          <option value="all">All Classes</option>
                          {classes.map(c => {
                            const classStudentIds = students.filter(s => s.classId === c.id).map(s => s.id);
                            const isMarked = attendance.some(a => a.date === attendanceFilterDate && classStudentIds.includes(a.studentId));
                            return (
                              <option key={c.id} value={c.id}>
                                {c.className} - {c.section} {isMarked ? '✓' : ''}
                              </option>
                            );
                          })}
                        </select>
                        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={14} />
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
                      <button
                        onClick={() => {
                          setShowMarkAttendanceModal(true);
                          setMarkAttendanceClassId(attendanceFilterClass !== 'all' ? attendanceFilterClass : '');
                        }}
                        className="flex-1 md:flex-none px-5 py-2.5 bg-slate-900 text-white text-[11px] font-black uppercase tracking-wider flex items-center justify-center gap-2 hover:bg-emerald-600 transition-all shadow-md rounded-xl cursor-pointer"
                      >
                        <Plus size={15} /> Mark Attendance
                      </button>

                      {(userSession.role === 'coordinator' || userSession.role === 'principal') && (
                        <button
                          onClick={handleSendBulkAbsenceWhatsApp}
                          className="flex-1 md:flex-none px-4 py-2.5 bg-emerald-600 text-white text-[11px] font-black uppercase tracking-wider flex items-center justify-center gap-2 hover:bg-emerald-700 transition-all shadow-md rounded-xl cursor-pointer"
                        >
                          <MessageSquare size={15} /> WhatsApp Absents
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Text Search Input */}
                  <div className="relative w-full pt-1">
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={15} />
                    <input
                      type="text"
                      value={attendanceSearch}
                      onChange={(e) => setAttendanceSearch(e.target.value)}
                      placeholder="Search attendance list by student name or roll number..."
                      className="w-full pl-10 pr-4 py-2 text-xs font-bold text-slate-800 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-emerald-500 transition-all placeholder:text-slate-400 placeholder:font-normal"
                    />
                    {attendanceSearch && (
                      <button
                        onClick={() => setAttendanceSearch('')}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
                      >
                        <X size={14} />
                      </button>
                    )}
                  </div>
                </div>

                {/* Summary Metrics & Absentee Alert Pill */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-white p-5 border border-slate-200 shadow-sm flex items-center justify-between rounded-2xl">
                    <div>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">
                        Daily Attendance Average
                      </p>
                      <h3 className="text-3xl font-black text-emerald-600">
                        {filteredAttendance.length > 0
                          ? Math.round((filteredAttendance.filter(a => a.status === 'present').length / filteredAttendance.length) * 100)
                          : 0}%
                      </h3>
                    </div>
                    <div className="w-12 h-12 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-600">
                      <TrendingUp size={24} />
                    </div>
                  </div>

                  {/* Absentees Alert Card */}
                  <div className="md:col-span-2 bg-rose-50/60 border border-rose-100 p-5 rounded-2xl shadow-xs">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-pulse" />
                        <p className="text-[10px] font-black text-rose-600 uppercase tracking-widest">
                          Absentees ({
                            attendance.filter(a => {
                              const matchesDate = attendanceShowAllDates || a.date === attendanceFilterDate;
                              const student = students.find(s => String(s.id) === String(a.studentId));
                              const matchesClass = attendanceFilterClass === 'all' || student?.classId === attendanceFilterClass;
                              return matchesDate && matchesClass && a.status === 'absent';
                            }).length
                          })
                        </p>
                      </div>
                      <span className="text-[9px] font-bold text-rose-500 uppercase tracking-wider">
                        1-Click WhatsApp Alert
                      </span>
                    </div>

                    <div className="flex flex-wrap gap-2 max-h-24 overflow-y-auto pr-1">
                      {(() => {
                        const absents = filteredAttendance.filter(a => a.status === 'absent');

                        if (absents.length === 0) {
                          return (
                            <p className="text-[11px] font-bold text-slate-400 uppercase">
                              No absents recorded for this selection 🎉
                            </p>
                          );
                        }

                        return absents.map(acc => {
                          const st = studentsMap.get(String(acc.studentId));
                          const stFee = feeStudentsMap.get(String(acc.studentId));
                          const stName = st?.name || stFee?.name || `Student #${String(acc.studentId).slice(-4)}`;
                          return (
                            <div
                              key={acc.id}
                              className="bg-white border border-rose-200 pl-1.5 pr-2.5 py-1 rounded-lg flex items-center gap-2 shadow-xs hover:border-rose-400 transition-all"
                            >
                              <div className="w-5 h-5 rounded-full bg-rose-500 text-white flex items-center justify-center font-black text-[9px] shrink-0">
                                {stName.charAt(0)}
                              </div>
                              <span className="text-[10px] font-black text-slate-800 uppercase">{stName}</span>
                              {st && (
                                <button
                                  onClick={() => handleSendIndividualWhatsApp(st, acc.date)}
                                  className="text-emerald-600 hover:text-emerald-700 p-0.5"
                                  title="Send WhatsApp Alert"
                                >
                                  <Phone size={12} fill="currentColor" />
                                </button>
                              )}
                            </div>
                          );
                        });
                      })()}
                    </div>
                  </div>
                </div>

                {/* Attendance Table */}
                <div className="bg-white border border-slate-200 shadow-sm overflow-hidden rounded-2xl">
                  <div className="p-3.5 sm:p-5 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
                    <h3 className="text-xs font-black uppercase tracking-widest text-slate-900 flex items-center gap-2">
                      <CheckCircle2 size={16} className="text-emerald-600 shrink-0" /> Attendance Ledger List
                    </h3>
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 bg-emerald-500 rounded-full animate-ping" />
                      <span className="text-[10px] font-black text-slate-500 uppercase tracking-wider">
                        Live Sync
                      </span>
                    </div>
                  </div>

                  {/* MOBILE ATTENDANCE CARDS (< md) */}
                  <div className="block md:hidden divide-y divide-slate-100">
                    {(() => {
                      if (filteredAttendance.length === 0) {
                        return (
                          <div className="py-12 text-center text-slate-400 font-bold uppercase tracking-wider text-xs px-4">
                            {attendanceSearch ? `No attendance records matching "${attendanceSearch}"` : `No attendance recorded for date ${attendanceFilterDate}`}
                          </div>
                        );
                      }

                      return (
                        <>
                          {visibleAttendance.map(record => {
                            const student = studentsMap.get(String(record.studentId));
                            const feeStudent = feeStudentsMap.get(String(record.studentId));
                            const sName = student?.name || feeStudent?.name || (record as any).studentName || (`Student #${String(record.studentId || '').slice(-4)}`);
                            const sRoll = student?.rollNumber ? `Roll #${student.rollNumber}` : feeStudent?.class ? feeStudent.class : 'Roster Student';
                            const sClass = student?.classId ? getClassName(student.classId) : feeStudent?.class || 'N/A';
                            const photo = getStudentPhoto(student || { name: sName });

                            return (
                              <div key={record.id} className="p-4 space-y-3 bg-white">
                                <div className="flex items-center justify-between gap-2">
                                  <div className="flex items-center gap-3 min-w-0">
                                    {photo ? (
                                      <img
                                        src={photo}
                                        alt={sName}
                                        className="w-10 h-10 rounded-full object-cover border border-slate-200 bg-slate-100 shrink-0"
                                      />
                                    ) : (
                                      <div className="w-10 h-10 rounded-full border border-slate-200 bg-slate-50 shrink-0" />
                                    )}
                                    <div className="min-w-0">
                                      <h4 className="font-black text-slate-900 uppercase tracking-tight text-xs truncate">
                                        {sName}
                                      </h4>
                                      <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mt-0.5">
                                        {sRoll} • {sClass}
                                      </p>
                                    </div>
                                  </div>
                                  {attendanceShowAllDates && (
                                    <span className="text-[10px] font-bold text-slate-400 font-mono">
                                      {record.date}
                                    </span>
                                  )}
                                </div>

                                <div className="flex items-center justify-between pt-1 border-t border-slate-100 gap-2">
                                  <div>
                                    {record.status === 'absent' && student && (
                                      <button
                                        onClick={() => handleSendIndividualWhatsApp(student, record.date)}
                                        className="px-2.5 py-1 bg-emerald-100 text-emerald-800 text-[10px] font-black uppercase tracking-wider rounded-lg flex items-center gap-1 cursor-pointer"
                                        title="Send WhatsApp Alert to Parent"
                                      >
                                        <Phone size={12} fill="currentColor" /> Parent Alert
                                      </button>
                                    )}
                                  </div>

                                  <select
                                    value={record.status}
                                    onChange={(e) => {
                                      const newStatus = e.target.value as 'present' | 'absent' | 'late' | 'leave';
                                      setAttendance(prev => prev.map(a => a.id === record.id ? { ...a, status: newStatus } : a));
                                      toast.success(`Updated attendance for ${sName} to ${newStatus.toUpperCase()}`);
                                    }}
                                    className={`px-3 py-1.5 text-[10px] font-black uppercase tracking-wider border outline-none cursor-pointer rounded-xl transition-all ${
                                      record.status === 'present'
                                        ? 'bg-emerald-600 text-white border-emerald-700 shadow-xs'
                                        : record.status === 'absent'
                                        ? 'bg-rose-600 text-white border-rose-700 shadow-xs'
                                        : record.status === 'late'
                                        ? 'bg-amber-500 text-white border-amber-600 shadow-xs'
                                        : 'bg-blue-600 text-white border-blue-700 shadow-xs'
                                    }`}
                                  >
                                    <option value="present">Present</option>
                                    <option value="absent">Absent</option>
                                    <option value="late">Late</option>
                                    <option value="leave">Excused / Leave</option>
                                  </select>
                                </div>
                              </div>
                            );
                          })}
                          {filteredAttendance.length > attendanceDisplayLimit && (
                            <div className="p-6 flex justify-center bg-white border-t border-slate-50">
                              <button 
                                onClick={() => setAttendanceDisplayLimit(prev => prev + 100)}
                                className="px-6 py-2.5 bg-slate-900 text-white rounded-xl text-xs font-black uppercase tracking-widest hover:bg-slate-800 transition-all shadow-md active:scale-95"
                              >
                                Load More History ({filteredAttendance.length - attendanceDisplayLimit} remaining)
                              </button>
                            </div>
                          )}
                        </>
                      );
                    })()}
                  </div>

                  {/* DESKTOP ATTENDANCE TABLE (>= md) */}
                  <div className="hidden md:block overflow-x-auto">
                    <table className="w-full text-left">
                      <thead className="bg-slate-50/80 border-b border-slate-100 uppercase text-[9px] font-black tracking-widest text-slate-500">
                        <tr>
                          <th className="px-5 py-4">Student & Roll</th>
                          <th className="px-5 py-4">Class</th>
                          {attendanceShowAllDates && <th className="px-5 py-4">Date</th>}
                          <th className="px-5 py-4 text-right">Attendance Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {(() => {
                          if (filteredAttendance.length === 0) {
                            return (
                              <tr>
                                <td colSpan={attendanceShowAllDates ? 4 : 3} className="py-16 text-center text-slate-400 font-bold uppercase tracking-wider text-xs">
                                  {attendanceSearch ? `No attendance records matching "${attendanceSearch}"` : `No attendance recorded for date ${attendanceFilterDate}`}
                                </td>
                              </tr>
                            );
                          }

                          return (
                            <>
                              {visibleAttendance.map(record => {
                                const student = studentsMap.get(String(record.studentId));
                                const feeStudent = feeStudentsMap.get(String(record.studentId));
                                const sName = student?.name || feeStudent?.name || (record as any).studentName || (`Student #${String(record.studentId || '').slice(-4)}`);
                                const sRoll = student?.rollNumber ? `Roll #${student.rollNumber}` : feeStudent?.class ? feeStudent.class : 'Roster Student';
                                const sClass = student?.classId ? getClassName(student.classId) : feeStudent?.class || 'N/A';
                                const photo = getStudentPhoto(student || { name: sName });

                                return (
                                  <tr key={record.id} className="hover:bg-slate-50/60 transition-colors">
                                    <td className="px-5 py-4">
                                      <div className="flex items-center gap-3">
                                        {photo ? (
                                          <img
                                            src={photo}
                                            alt={sName}
                                            className="w-9 h-9 rounded-full object-cover border border-slate-200 bg-slate-100 shrink-0"
                                          />
                                        ) : (
                                          <div className="w-9 h-9 rounded-full border border-slate-200 bg-slate-50 shrink-0" />
                                        )}
                                        <div>
                                          <span className="font-black text-slate-900 block truncate uppercase tracking-tight text-xs leading-tight">
                                            {sName}
                                          </span>
                                          <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block mt-0.5">
                                            {sRoll}
                                          </span>
                                        </div>
                                      </div>
                                    </td>

                                    <td className="px-5 py-4 text-xs font-bold text-slate-600 uppercase tracking-wider">
                                      {sClass}
                                    </td>

                                    {attendanceShowAllDates && (
                                      <td className="px-5 py-4 text-xs font-bold text-slate-500 tabular-nums">
                                        {record.date}
                                      </td>
                                    )}

                                    <td className="px-5 py-4 text-right flex items-center justify-end gap-2">
                                      {record.status === 'absent' && student && (
                                        <button
                                          onClick={() => handleSendIndividualWhatsApp(student, record.date)}
                                          className="p-1.5 bg-emerald-100 text-emerald-700 hover:bg-emerald-600 hover:text-white rounded-lg transition-all cursor-pointer"
                                          title="Send WhatsApp Alert to Parent"
                                        >
                                          <Phone size={14} fill="currentColor" />
                                        </button>
                                      )}

                                      <select
                                        value={record.status}
                                        onChange={(e) => {
                                          const newStatus = e.target.value as 'present' | 'absent' | 'late' | 'leave';
                                          setAttendance(prev => prev.map(a => a.id === record.id ? { ...a, status: newStatus } : a));
                                          toast.success(`Updated attendance for ${sName} to ${newStatus.toUpperCase()}`);
                                        }}
                                        className={`px-3 py-1.5 text-[10px] font-black uppercase tracking-wider border outline-none cursor-pointer rounded-xl transition-all ${
                                          record.status === 'present'
                                            ? 'bg-emerald-600 text-white border-emerald-700 shadow-xs'
                                            : record.status === 'absent'
                                            ? 'bg-rose-600 text-white border-rose-700 shadow-xs'
                                            : record.status === 'late'
                                            ? 'bg-amber-500 text-white border-amber-600 shadow-xs'
                                            : 'bg-blue-600 text-white border-blue-700 shadow-xs'
                                        }`}
                                      >
                                        <option value="present">Present</option>
                                        <option value="absent">Absent</option>
                                        <option value="late">Late</option>
                                        <option value="leave">Excused / Leave</option>
                                      </select>
                                    </td>
                                  </tr>
                                );
                              })}
                              {filteredAttendance.length > attendanceDisplayLimit && (
                                <tr>
                                  <td colSpan={attendanceShowAllDates ? 4 : 3} className="px-5 py-8 text-center bg-white">
                                    <button 
                                      onClick={() => setAttendanceDisplayLimit(prev => prev + 100)}
                                      className="px-8 py-3 bg-slate-900 text-white rounded-xl text-xs font-black uppercase tracking-widest hover:bg-slate-800 transition-all shadow-lg active:scale-95"
                                    >
                                      Load More History ({filteredAttendance.length - attendanceDisplayLimit} remaining)
                                    </button>
                                  </td>
                                </tr>
                              )}
                            </>
                          );
                        })()}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}


        {/* ========== NEW SCHOOL FEE MANAGEMENT MODULE OLD (REPLACED BY AUDIT HUB) ========== */}
        {activeTab === 'fees' && (
          <div id="panel-principal-fees" className="space-y-6 animate-fade-in font-sans pb-20 bg-emerald-50/50 p-4 sm:p-6 rounded-2xl border border-emerald-100 shadow-inner">
            {/* 1. Global Dashboard Stats Row */}
            {(() => {
              const stats = getGlobalStats(feeStudents);
              return (
                <div className="grid grid-cols-3 sm:grid-cols-2 md:grid-cols-4 gap-1.5 sm:gap-4">
                  <div className="bg-white p-2 sm:p-4 rounded-2xl border border-slate-200 shadow-sm">
                    <p className="text-[8px] sm:text-[10px] font-black text-slate-400 uppercase tracking-tight sm:tracking-widest truncate">Total Students</p>
                    <p className="text-xs sm:text-xl font-black text-slate-900">{stats.totalStudents}</p>
                  </div>
                  <div className="bg-emerald-50 p-2 sm:p-4 rounded-2xl border border-emerald-100 shadow-sm">
                    <p className="text-[8px] sm:text-[10px] font-black text-emerald-600 uppercase tracking-tight sm:tracking-widest truncate">Collected</p>
                    <p className="text-xs sm:text-xl font-black text-emerald-700">Rs. {stats.totalCollected.toLocaleString()}</p>
                  </div>
                  <div className="bg-rose-50 p-2 sm:p-4 rounded-2xl border border-rose-100 shadow-sm">
                    <p className="text-[8px] sm:text-[10px] font-black text-rose-600 uppercase tracking-tight sm:tracking-widest truncate">Pending</p>
                    <p className="text-xs sm:text-xl font-black text-rose-700">Rs. {stats.totalPending.toLocaleString()}</p>
                  </div>
                  <div className="bg-amber-50 p-2 sm:p-4 rounded-2xl border border-amber-100 shadow-sm">
                    <p className="text-[8px] sm:text-[10px] font-black text-amber-600 uppercase tracking-tight sm:tracking-widest truncate">Other Funds</p>
                    <p className="text-xs sm:text-xl font-black text-amber-700">Rs. {stats.totalOther.toLocaleString()}</p>
                  </div>
                </div>
              );
            })()}

            {/* 2. Main Interface Header & Student Matcher */}
            <div className="bg-white p-4 sm:p-6 rounded-3xl border border-slate-200 shadow-sm">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                <h1 className="text-xl font-black text-slate-900 uppercase tracking-tight flex items-center gap-2">
                  <CreditCard size={24} className="text-indigo-600" />
                  Fee Portal (2026)
                </h1>
                <button 
                  onClick={() => handleTabChange('registers')}
                  className="flex items-center gap-2 px-4 py-2 text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-slate-900 hover:bg-slate-50 transition-all rounded-xl border border-slate-100 sm:border-none"
                >
                  <ArrowLeft size={16} /> Return to Audits
                </button>
              </div>
              
              <div className="flex flex-col gap-3">
                <div className="relative w-full">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                  <input 
                    type="text" 
                    placeholder="Search student by name or ID..." 
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold focus:ring-2 focus:ring-indigo-500 outline-none"
                    value={feeSearch}
                    onChange={(e) => setFeeSearch(e.target.value)}
                  />
                </div>
                <div className="flex flex-col sm:flex-row gap-3">
                  <select
                    className="w-full sm:w-auto px-4 py-2.5 bg-slate-50 border border-slate-200 text-slate-700 font-bold text-xs rounded-xl outline-none focus:ring-2 focus:ring-indigo-500"
                    value={feeClassFilter}
                    onChange={(e) => setFeeClassFilter(e.target.value)}
                  >
                    <option value="all">All Classes</option>
                    {Array.from(new Set(feeStudents.map(s => s.class))).filter(Boolean).map(c => (
                      <option key={String(c)} value={String(c)}>{String(c)}</option>
                    ))}
                  </select>
                  <select
                    className="w-full flex-1 px-4 py-2.5 bg-indigo-600 text-white font-black text-xs uppercase tracking-widest rounded-xl cursor-pointer hover:bg-indigo-700 transition-colors"
                    value={selectedStudentForFee}
                    onChange={(e) => setSelectedStudentForFee(e.target.value)}
                  >
                    <option value="">Select Student...</option>
                    {feeStudents
                      .filter(s => {
                        const matchesSearch = s.name.toLowerCase().includes(feeSearch.toLowerCase()) || String(s.id).includes(feeSearch);
                        const matchesClass = feeClassFilter === 'all' ? true : s.class === feeClassFilter;
                        return matchesSearch && matchesClass;
                      })
                      .map(s => (
                        <option key={s.id} value={s.id}>{s.name} ({s.class})</option>
                      ))
                    }
                  </select>
                </div>
              </div>
            </div>

            {(() => {
              const student = feeStudents.find(s => String(s.id) === selectedStudentForFee);
              const studentProfile = students.find(s => String(s.id) === String(selectedStudentForFee));
              
              if (!student) {
                return (
                  <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm p-6">
                    <div className="flex justify-between items-center mb-6">
                      <div>
                        <h3 className="text-base font-black text-slate-900 uppercase tracking-tight">Student Fee Roster & Account Index</h3>
                      </div>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-left">
                        <thead className="bg-slate-50 border-b border-slate-100 uppercase text-[9px] font-black tracking-widest text-slate-400">
                          <tr>
                            <th className="px-6 py-4">Student</th>
                            <th className="px-6 py-4">Class</th>
                            <th className="px-6 py-4">Monthly Fee</th>
                            <th className="px-6 py-4">Paid Total</th>
                            <th className="px-6 py-4">Pending Amount</th>
                            <th className="px-6 py-4 text-right">Action</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 text-xs font-bold">
                          {feeStudents.map(st => {
                            const totalPaid = (st.payments || []).reduce((sum, p) => sum + p.amount, 0);
                            const pending = getTotalPending(st);
                            return (
                              <tr key={st.id} className="hover:bg-slate-50 transition-colors">
                                <td className="px-6 py-4 text-slate-900 font-black">{st.name}</td>
                                <td className="px-6 py-4 text-slate-500">{st.class}</td>
                                <td className="px-6 py-4 text-slate-700">Rs. {st.monthlyFee}</td>
                                <td className="px-6 py-4 text-emerald-600 font-black">Rs. {totalPaid}</td>
                                <td className="px-6 py-4 text-rose-600 font-black">Rs. {pending}</td>
                                <td className="px-6 py-4 text-right">
                                  <button
                                    onClick={() => setSelectedStudentForFee(String(st.id))}
                                    className="px-3 py-1.5 bg-indigo-600 text-white text-[10px] font-black uppercase tracking-widest rounded-lg hover:bg-indigo-700 transition-all shadow-xs"
                                  >
                                    Manage Account
                                  </button>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                );
              }

              const account = getStudentFullAccount(student, 2026);

              return (
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                  
                  {/* Selected Student Identity Header Card */}
                  <div className="lg:col-span-12">
                    <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex flex-col sm:flex-row items-center gap-6">
                      <div className="w-24 h-24 rounded-3xl bg-slate-100 border-4 border-indigo-50 overflow-hidden shadow-inner flex items-center justify-center shrink-0">
                        {studentProfile?.photo ? (
                          <img src={studentProfile.photo} alt={student.name} className="w-full h-full object-cover" />
                        ) : (
                          <span className="text-4xl font-black text-slate-300 uppercase">{student.name.charAt(0)}</span>
                        )}
                      </div>
                      <div className="flex-1 text-center sm:text-left space-y-1">
                        <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                          <h2 className="text-2xl font-black text-slate-900 tracking-tight">{student.name}</h2>
                          <span className="bg-indigo-100 text-indigo-700 text-[10px] font-black px-2 py-1 rounded-lg uppercase tracking-widest">Roll: {studentProfile?.rollNumber || 'N/A'}</span>
                        </div>
                        <p className="text-sm font-bold text-slate-400 uppercase tracking-widest flex items-center justify-center sm:justify-start gap-2">
                          <Users size={14} /> {student.class}
                        </p>
                        <div className="flex items-center justify-center sm:justify-start gap-3 pt-2">
                           <div className="flex items-center gap-1.5 px-3 py-1 bg-emerald-50 rounded-full border border-emerald-100">
                             <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
                             <span className="text-[10px] font-black text-emerald-700 uppercase">Active Profile</span>
                           </div>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {/* Left Column: Recording & Quick Actions */}
                  <div className="lg:col-span-4 space-y-6">
                    {/* Refactored Other Funds Interface */}
                    <div className="grid grid-cols-1 gap-4">
                      <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
                        <h3 className="text-xs font-black uppercase text-slate-400 tracking-widest border-b pb-2 flex items-center gap-2">
                          <BookOpen size={14} className="text-blue-500" /> Fund Entry Cards
                        </h3>
                        
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          {[
                            { label: 'Paper Fund', desc: 'Paper Fund', icon: BookOpen, color: 'text-blue-600', bg: 'bg-blue-50' },
                            { label: 'Summer Pack', desc: 'Summer Pack', icon: Sun, color: 'text-orange-600', bg: 'bg-orange-50' },
                            { label: 'Other Fund', desc: 'Miscellaneous', icon: PlusCircle, color: 'text-indigo-600', bg: 'bg-indigo-50' }
                          ].map((fund, idx) => (
                            <div key={idx} className={`${fund.bg} p-4 rounded-2xl border border-slate-100 flex flex-col gap-3`}>
                              <div className="flex items-center gap-2">
                                <fund.icon size={16} className={fund.color} />
                                <span className={`text-[10px] font-black uppercase tracking-wider ${fund.color}`}>{fund.label}</span>
                              </div>
                              <div className="flex gap-2">
                                <input 
                                  id={`fundAmt_${idx}`} 
                                  type="number" 
                                  placeholder="Amount" 
                                  className="flex-1 p-2 bg-white border border-slate-200 rounded-lg text-xs font-black outline-none focus:border-indigo-500"
                                />
                                <button 
                                  onClick={() => {
                                    const amtInput = document.getElementById(`fundAmt_${idx}`) as HTMLInputElement;
                                    const amt = Number(amtInput.value);
                                    if (amt <= 0) { toast.error("Enter valid amount"); return; }
                                    
                                    setFeeStudents(prev => addOtherFund(prev, student.id, fund.desc, amt));
                                    handleSendFeeNotification(student, 'charge', amt, fund.desc);
                                    amtInput.value = '';
                                    toast.success(`${fund.label} entry added!`);
                                  }}
                                  className="px-3 py-2 bg-slate-900 text-white rounded-lg text-[10px] font-black uppercase tracking-widest hover:bg-slate-800 transition-all active:scale-95"
                                >
                                  Add
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Manual Reminder Card */}
                      <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
                        <h3 className="text-xs font-black uppercase text-slate-400 tracking-widest border-b pb-2 flex items-center gap-2">
                          <Send size={14} className="text-emerald-500" /> Dispatch Alerts
                        </h3>
                        <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                          <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest leading-none mb-1">Total Outstanding</p>
                          <p className="text-2xl font-black text-rose-600 ">Rs. {getTotalPending(student) + getTotalOtherFunds(student)}</p>
                        </div>
                        <button 
                          onClick={() => handleSendFeeNotification(student, 'reminder', 0, '')}
                          className="w-full py-3.5 bg-emerald-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-500/20 active:scale-95"
                        >
                          <Send size={16} /> Send WhatsApp Reminder
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Right Column: Complete Yearly Account & History */}
                  <div className="lg:col-span-8 space-y-6">
                    
                    {/* Summary Cards */}
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                      <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm flex flex-col justify-center">
                        <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1">Total Yearly Due</span>
                        <span className="text-xl font-black text-slate-900">Rs. {account.totalDue}</span>
                      </div>
                      <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm flex flex-col justify-center">
                        <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1">Total Yearly Paid</span>
                        <span className="text-xl font-black text-emerald-600">Rs. {account.totalPaid}</span>
                      </div>
                      <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm flex flex-col justify-center">
                        <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1">Other Funds</span>
                        <span className="text-xl font-black text-amber-500">Rs. {account.otherFundsTotal}</span>
                      </div>
                      <div className="bg-slate-900 p-5 rounded-3xl border border-slate-800 shadow-xl flex flex-col justify-center text-white">
                        <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1">Grand Pending</span>
                        <span className="text-xl font-black text-rose-500">Rs. {account.grandTotalPending}</span>
                      </div>
                    </div>

                    {/* Yearly Breakdown Grid */}
                    <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
                      <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                        <h3 className="text-xs font-black uppercase tracking-widest text-slate-900">Yearly Ledger (Jan-Dec 2026)</h3>
                        <div className="flex gap-4 text-[10px] font-black uppercase">
                          <span className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-full bg-emerald-500"></div> Paid</span>
                          <span className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-full bg-rose-500"></div> Pending</span>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-2 sm:gap-4 p-2 sm:p-4 bg-slate-50/50">
                        {account.yearlyBreakdown.map(m => (
                          <div 
                            key={m.month} 
                            onClick={() => {
                              if (m.isFutureMonth) {
                                toast.info(`Fee for ${m.month} is not yet due.`);
                                return;
                              }
                              
                              const allMonthlyPending = account.yearlyBreakdown.reduce((sum, curr) => sum + curr.pending, 0);
                              const previousArrears = allMonthlyPending - m.pending + account.otherFundsTotal;

                              setFeePaymentModal({
                                isOpen: true,
                                studentId: String(student.id),
                                month: m.month,
                                pending: m.pending,
                                previousArrears: previousArrears,
                                amount: (m.pending + previousArrears).toString(),
                                year: 2026
                              });
                            }}
                            className="bg-white p-2 sm:p-3 rounded-xl border border-slate-200 shadow-sm hover:shadow-md hover:border-indigo-300 group cursor-pointer transition-all active:scale-95 flex flex-col justify-between"
                            title={`Click to record payment for ${m.month}`}
                          >
                            <div className="flex justify-between items-start mb-2">
                              <span className="text-[10px] sm:text-xs font-black text-slate-900 uppercase truncate pr-1">{m.month}</span>
                              {m.isFutureMonth ? (
                                <span className="text-[8px] font-black uppercase text-slate-300">Upcoming</span>
                              ) : m.isComplete ? (
                                <CheckCircle2 size={14} className="text-emerald-500 shrink-0" />
                              ) : (
                                <AlertCircle size={14} className="text-rose-500 animate-pulse group-hover:text-indigo-600 shrink-0" />
                              )}
                            </div>
                            <div className="space-y-1 mb-2">
                              <div className="flex flex-col text-[9px] sm:text-[10px] font-bold">
                                <span className="text-slate-400">Paid:</span>
                                <span className={m.paid > 0 ? "text-emerald-600" : "text-slate-300"}>Rs. {m.paid}</span>
                              </div>
                              <div className="flex flex-col text-[9px] sm:text-[10px] font-black">
                                <span className="text-slate-400 uppercase">Pend:</span>
                                <span className={m.pending > 0 ? "text-rose-600" : "text-slate-300"}>Rs. {m.pending}</span>
                              </div>
                            </div>
                            <div className="mt-auto w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                                <div className={`h-full transition-all duration-500 ${m.isFutureMonth ? 'bg-slate-200' : m.isComplete ? 'bg-emerald-500' : 'bg-rose-500'}`} style={{ width: `${m.isFutureMonth ? 100 : (m.paid / Math.max(1, m.due)) * 100}%` }}></div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {/* Summary Totals */}
                      <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
                        <h3 className="text-xs font-black uppercase text-slate-400 tracking-widest border-b pb-2">Account Summary</h3>
                        <div className="space-y-3">
                          <div className="flex justify-between items-center">
                            <span className="text-xs font-bold text-slate-500">Total Yearly Due:</span>
                            <span className="text-sm font-black text-slate-900">Rs. {account.totalDue.toLocaleString()}</span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-xs font-bold text-slate-500">Total Yearly Paid:</span>
                            <span className="text-sm font-black text-emerald-600">Rs. {account.totalPaid.toLocaleString()}</span>
                          </div>
                          <div className="flex justify-between items-center pb-2">
                            <span className="text-xs font-bold text-slate-500">Other Funds (Fine/Dues):</span>
                            <span className="text-sm font-black text-amber-600">Rs. {account.otherFundsTotal.toLocaleString()}</span>
                          </div>
                          <div className="pt-3 border-t border-slate-200 flex flex-col gap-1">
                            <div className="flex justify-between items-center">
                              <span className="text-xs font-black text-rose-600 uppercase">Grand Total Pending:</span>
                              <span className="text-lg font-black text-rose-700">Rs. {account.grandTotalPending.toLocaleString()}</span>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Other Funds History */}
                      <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
                        <h3 className="text-xs font-black uppercase text-slate-400 tracking-widest border-b pb-2">Other Funds Entries</h3>
                        <div className="h-40 overflow-y-auto custom-scrollbar space-y-2">
                          {account.otherFunds.length > 0 ? account.otherFunds.map((f) => (
                            <div key={f.id} className="p-3 bg-slate-50 rounded-xl flex justify-between items-center border border-slate-100 group">
                              <div className="flex-1">
                                <p className="text-xs font-black text-slate-800 capitalize">{f.desc}</p>
                                <p className="text-[9px] text-slate-400 font-bold">{f.date}</p>
                              </div>
                              <div className="flex items-center gap-3">
                                <span className="text-xs font-black text-slate-900">Rs. {f.amount}</span>
                                <div className="flex items-center gap-1 transition-opacity">
                                  <button 
                                    onClick={() => setFeeEditModal({ isOpen: true, type: 'other', recordId: f.id, studentId: String(student.id), amount: String(f.amount), desc: f.desc })}
                                    className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all"
                                  >
                                    <Edit2 size={12} />
                                  </button>
                                  <button 
                                    onClick={() => {
                                      if(window.confirm("Delete this entry?")) {
                                        setFeeStudents(prev => deleteOtherFund(prev, student.id, f.id));
                                        toast.success("Entry deleted");
                                      }
                                    }}
                                    className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all"
                                  >
                                    <Trash2 size={12} />
                                  </button>
                                </div>
                              </div>
                            </div>
                          )) : (
                            <div className="h-full flex items-center justify-center text-[10px] text-slate-300 font-bold  uppercase">No extra entries found</div>
                          )}
                        </div>
                      </div>

                      {/* Payment Transactions History (Monthly Fees) */}
                      <div className="md:col-span-2 bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
                        <h3 className="text-xs font-black uppercase text-indigo-600 tracking-widest border-b pb-2 flex justify-between items-center">
                          Monthly Fee Payment History
                          <span className="text-[9px] text-slate-400 font-bold ">Latest transactions first</span>
                        </h3>
                        <div className="max-h-60 overflow-y-auto custom-scrollbar space-y-2">
                          {student.payments && student.payments.length > 0 ? student.payments.slice().reverse().map((p) => (
                            <div key={p.id} className="p-3 bg-slate-50 rounded-xl flex justify-between items-center border border-slate-100 group">
                              <div className="flex-1">
                                <div className="flex items-center gap-2">
                                  <span className="text-xs font-black text-slate-900 uppercase ">{p.month} {p.year}</span>
                                  <span className="text-[8px] bg-indigo-100 text-indigo-600 px-1.5 py-0.5 rounded font-black uppercase tracking-widest">Fee</span>
                                </div>
                                <p className="text-[9px] text-slate-400 font-bold mt-0.5">Paid on: {p.date}</p>
                              </div>
                              <div className="flex items-center gap-3">
                                <span className="text-xs font-black text-emerald-600">Rs. {p.amount}</span>
                                <div className="flex items-center gap-1 transition-opacity">
                                  <button 
                                    onClick={() => setFeeEditModal({ isOpen: true, type: 'payment', recordId: p.id, studentId: String(student.id), amount: String(p.amount), desc: `${p.month} ${p.year}` })}
                                    className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all"
                                  >
                                    <Edit2 size={12} />
                                  </button>
                                  <button 
                                    onClick={() => {
                                      if(window.confirm("Delete this payment record?")) {
                                        setFeeStudents(prev => deletePayment(prev, student.id, p.id));
                                        toast.success("Payment deleted");
                                      }
                                    }}
                                    className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all"
                                  >
                                    <Trash2 size={12} />
                                  </button>
                                </div>
                              </div>
                            </div>
                          )) : (
                            <div className="py-10 flex flex-col items-center justify-center text-slate-300 gap-2">
                              <CreditCard size={24} />
                              <p className="text-[10px] font-black uppercase tracking-widest">No payment records found</p>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })()}
          </div>
        )}
        {/* ========== SETTINGS & CONFIGURATION PORTAL ========== */}
        {activeTab === 'settings' && (
          <div id="panel-principal-settings" className="space-y-8 animate-fade-in font-sans bg-slate-50 p-4 sm:p-6 -mx-4 sm:-mx-6 rounded-2xl border border-slate-200 shadow-inner">
            
            {/* ========== MANUAL FIREBASE DATA SYNC ========== */}
            <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6 my-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-100 text-emerald-600">
                  <Database size={22} className="animate-pulse" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
                    Cloud Ledger Sync
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                      CONNECTED
                    </span>
                  </h3>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={async () => {
                    const confirm = window.confirm("Are you sure you want to download all data from Firebase? This will overwrite your local unsaved data.");
                    if(!confirm) return;
                    
                    toast.info("Downloading data from Cloud...");
                    try {
                      const syncConfig = [
                        { col: 'teachers', key: 'acadamis_teachers', type: 'list' },
                        { col: 'classes', key: 'acadamis_classes', type: 'list' },
                        { col: 'students', key: 'acadamis_students', type: 'list' },
                        { col: 'timetable', key: 'acadamis_timetable', type: 'list' },
                        { col: 'attendance', key: 'acadamis_attendance', type: 'list' },
                        { col: 'marks', key: 'acadamis_marks', type: 'list' },
                        { col: 'fees', key: 'acadamis_fees', type: 'list' },
                        { col: 'coordinators', key: 'acadamis_coordinators', type: 'list' },
                        { col: 'fee_data', key: 'school_fee_data', type: 'list' },
                        { col: 'app_settings', key: 'acadamis_app_settings', type: 'object', docId: 'global' }
                      ];

                      for (const item of syncConfig) {
                        if (item.type === 'list') {
                          const snapshot = await getDocs(collection(db, item.col));
                          const itemsList: any[] = [];
                          snapshot.forEach(docSnap => itemsList.push(docSnap.data()));
                          safeStorage.setItem(item.key, JSON.stringify(itemsList));
                        } else if (item.type === 'object' && item.docId) {
                          const docSnap = await getDoc(doc(db, item.col, item.docId));
                          if (docSnap.exists()) {
                            safeStorage.setItem(item.key, JSON.stringify(docSnap.data()));
                          }
                        }
                      }
                      toast.success("Successfully downloaded all data from cloud!");
                      setTimeout(() => window.location.reload(), 1500);
                    } catch (error: any) {
                      toast.error("Error downloading data: " + error.message);
                    }
                  }}
                  className="bg-slate-50 hover:bg-slate-100 text-slate-700 hover:text-sky-600 border border-slate-200 px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 transition-all active:scale-95 cursor-pointer shadow-sm"
                >
                  <DownloadCloud size={14} />
                  Download
                </button>

                <button
                  type="button"
                  onClick={async () => {
                    const confirm = window.confirm("Are you sure you want to upload all local data to Firebase? This will overwrite current Cloud data.");
                    if(!confirm) return;

                    toast.info("Uploading data to Cloud...");
                    try {
                      const syncConfig = [
                        { col: 'teachers', key: 'acadamis_teachers', type: 'list' },
                        { col: 'classes', key: 'acadamis_classes', type: 'list' },
                        { col: 'students', key: 'acadamis_students', type: 'list' },
                        { col: 'timetable', key: 'acadamis_timetable', type: 'list' },
                        { col: 'attendance', key: 'acadamis_attendance', type: 'list' },
                        { col: 'marks', key: 'acadamis_marks', type: 'list' },
                        { col: 'fees', key: 'acadamis_fees', type: 'list' },
                        { col: 'coordinators', key: 'acadamis_coordinators', type: 'list' },
                        { col: 'fee_data', key: 'school_fee_data', type: 'list' },
                        { col: 'app_settings', key: 'acadamis_app_settings', type: 'object', docId: 'global' }
                      ];

                      for (const item of syncConfig) {
                        const localData = safeStorage.getItem(item.key);
                        if (localData) {
                          if (item.type === 'list') {
                            const listItems = JSON.parse(localData);
                            for (const listItem of listItems) {
                              if (listItem.id) {
                                await setDoc(doc(db, item.col, String(listItem.id)), listItem);
                              }
                            }
                          } else if (item.type === 'object' && item.docId) {
                            const objData = JSON.parse(localData);
                            await setDoc(doc(db, item.col, item.docId), objData);
                          }
                        }
                      }
                      toast.success("Successfully uploaded all local data to cloud!");
                    } catch (error: any) {
                      toast.error("Error uploading data: " + error.message);
                    }
                  }}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 transition-all active:scale-95 cursor-pointer shadow-sm shadow-emerald-500/10"
                >
                  <UploadCloud size={14} />
                  Upload
                </button>

                <div className="h-4 w-[1px] bg-slate-200 mx-1 hidden sm:block"></div>

                <button
                  type="button"
                  onClick={async () => {
                    const pass = window.prompt("DANGER: This will permanently DELETE ALL records. Please enter Principal password to confirm:");
                    if (pass === null) return;
                    if (pass !== '111222') {
                      toast.error("Incorrect password. Access denied.");
                      return;
                    }

                    const confirm = window.confirm("Final Warning: This action cannot be undone. All student, teacher, and academic records in the cloud will be wiped. Proceed?");
                    if(!confirm) return;

                    toast.info("Nuking database...");
                    try {
                      const collections = ['teachers', 'classes', 'students', 'timetable', 'attendance', 'marks', 'fees', 'coordinators', 'fee_data', 'app_settings'];
                      for (const col of collections) {
                        const snapshot = await getDocs(collection(db, col));
                        for (const d of snapshot.docs) {
                            await deleteDoc(doc(db, col, d.id));
                        }
                      }
                      toast.success("All cloud records successfully deleted.");
                    } catch (error: any) {
                      toast.error("Error nuking database: " + error.message);
                    }
                  }}
                  className="bg-rose-50 hover:bg-rose-100 text-rose-600 hover:text-rose-700 border border-rose-100 px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 transition-all active:scale-95 cursor-pointer shadow-sm"
                >
                  <Trash2 size={14} />
                  Clear Cloud
                </button>
              </div>
            </div>

            {/* ========== PRINCIPAL PROFILE & OFFLINE BACKUP GRID ========== */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Profile/Security Section */}
              <div className="bg-white rounded-none p-8 border border-slate-200 shadow-sm border-t-4 border-t-indigo-600">
                <div className="flex items-center gap-3 mb-6">
                  <div className="p-2 bg-indigo-50 rounded-none border border-indigo-100">
                    <Sparkles size={24} className="text-indigo-600" />
                  </div>
                  <div>
                    <h2 className="text-xl font-black text-slate-900 uppercase tracking-tight">Security & Profile</h2>
                  </div>
                </div>

                <form 
                  onSubmit={(e) => {
                    e.preventDefault();
                    const form = e.target as HTMLFormElement;
                    const newID = (form.elements.namedItem('username') as HTMLInputElement).value;
                    const newPass = (form.elements.namedItem('password') as HTMLInputElement).value;
                    const confirmPass = (form.elements.namedItem('confirm_password') as HTMLInputElement).value;

                    if (!newID.trim() || !newPass.trim()) {
                      toast.error("ID and Password cannot be empty.");
                      return;
                    }

                    if (newPass !== confirmPass) {
                      toast.error("Passwords do not match.");
                      return;
                    }

                    if (userSession.role === 'coordinator') {
                      // Update coordinator record
                      const updatedCoords = coordinators.map(c => 
                        c.id === userSession.id ? { ...c, username: newID, password: newPass } : c
                      );
                      setCoordinators(updatedCoords);
                      toast.success("Coordinator credentials updated successfully!");
                    } else {
                      // Principal/Developer update (Shared state for this demo)
                      toast.success("Principal credentials updated successfully!");
                    }
                    form.reset();
                  }}
                  className="space-y-4"
                >
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">New Administrative ID</label>
                    <input name="username" type="text" placeholder="Enter new username/ID..." className="w-full p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold outline-none focus:border-indigo-500" />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">New Password</label>
                      <input name="password" type="password" placeholder="••••••••" className="w-full p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold outline-none focus:border-indigo-500" />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Confirm Password</label>
                      <input name="confirm_password" type="password" placeholder="••••••••" className="w-full p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold outline-none focus:border-indigo-500" />
                    </div>
                  </div>
                  <button type="submit" className="w-full py-3 bg-indigo-600 text-white font-black uppercase tracking-widest text-xs hover:bg-slate-900 transition-all rounded-lg mt-2 shadow-md">
                    Update System Credentials
                  </button>
                </form>
              </div>

              {/* Data Export / Backup Section */}
              <div className="bg-white rounded-none p-8 border border-slate-200 shadow-sm border-t-4 border-t-amber-500 flex flex-col">
                <div className="flex items-center gap-3 mb-6">
                  <div className="p-2 bg-amber-50 rounded-none border border-amber-100">
                    <DownloadCloud size={24} className="text-amber-600" />
                  </div>
                  <div>
                    <h2 className="text-xl font-black text-slate-900 uppercase tracking-tight">Offline Backup</h2>
                  </div>
                </div>
                
                <div className="flex-1 space-y-4">
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest leading-relaxed">
                    This backup contains all students, teachers, classes, attendance records, and fee ledgers in a JSON format. Recommended for long-term archiving and data safety.
                  </p>
                  <ul className="text-[10px] text-slate-500 font-bold space-y-1 my-4">
                    <li>• Student Rosters & ID Info</li>
                    <li>• Teacher & Staff Profiles</li>
                    <li>• Grade-wise Academic Records</li>
                    <li>• Complete Financial Ledgers</li>
                  </ul>
                </div>

                <button 
                  onClick={handleExportJSON}
                  className="w-full py-4 bg-slate-900 text-white font-black uppercase tracking-[0.2em] text-xs hover:bg-amber-600 transition-all rounded-xl flex items-center justify-center gap-3 shadow-lg group"
                >
                  <Download size={20} className="group-hover:animate-bounce" />
                  Download Data (JSON)
                </button>
              </div>

              {/* Data Import / System Restore Section */}
              <div className="bg-white rounded-none p-8 border border-slate-200 shadow-sm border-t-4 border-t-rose-500 flex flex-col">
                <div className="flex items-center gap-3 mb-6">
                  <div className="p-2 bg-rose-50 rounded-none border border-rose-100">
                    <UploadCloud size={24} className="text-rose-600" />
                  </div>
                  <div>
                    <h2 className="text-xl font-black text-slate-900 uppercase tracking-tight">System Restore</h2>
                  </div>
                </div>
                
                <div className="flex-1 space-y-4">
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest leading-relaxed">
                    Upload a previously exported JSON backup to overwrite current data. This action is irreversible once completed.
                  </p>
                  <div className="p-3 bg-rose-50 border border-dashed border-rose-200 rounded-lg">
                    <p className="text-[9px] text-rose-700 font-bold uppercase leading-tight ">
                      Caution: All existing records (Attendance, Fees, Marks) will be replaced by the contents of the uploaded file.
                    </p>
                  </div>
                </div>

                <div className="mt-6">
                  <input 
                    type="file" 
                    id="system-import-input" 
                    className="hidden" 
                    accept=".json" 
                    onChange={handleImportJSON}
                  />
                  <label 
                    htmlFor="system-import-input"
                    className="w-full py-4 bg-rose-600 text-white font-black uppercase tracking-[0.2em] text-xs hover:bg-slate-900 transition-all rounded-xl flex items-center justify-center gap-3 shadow-lg cursor-pointer group"
                  >
                    <Upload size={20} className="group-hover:-translate-y-1 transition-transform" />
                    Restore Records (JSON)
                  </label>
                </div>
              </div>
            </div>
            <div className="bg-white p-8 border border-slate-200 shadow-sm border-t-4 border-t-slate-900">
              <div className="flex items-center gap-4 mb-8 border-b pb-4">
                <div className="p-3 bg-slate-100 rounded-none border border-slate-200">
                  <Menu size={24} className="text-slate-900" />
                </div>
                <div>
                  <h1 className="text-2xl font-black text-slate-900 tracking-tight uppercase">System Management & Settings</h1>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                {/* Fee Collection Methods Section */}
                <div className="space-y-6">
                  <div className="space-y-2">
                    <h3 className="text-sm font-black uppercase text-slate-800 flex items-center gap-2">
                      <CreditCard size={18} className="text-indigo-600" />
                      Fee Collection Protocols (Collection Policy)
                    </h3>
                  </div>

                  <div className="bg-slate-50 p-5 border border-slate-200 space-y-4">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Primary Bank Account</label>
                      <input 
                        type="text" 
                        defaultValue="Allied Bank - A/C 2233-4455-6677"
                        className="w-full bg-white border border-slate-200 px-3 py-2 text-xs font-bold text-slate-700 focus:outline-none focus:border-slate-400" 
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Cash Collection Hours</label>
                      <input 
                        type="text" 
                        defaultValue="08:00 AM to 01:30 PM (Mon-Sat)"
                        className="w-full bg-white border border-slate-200 px-3 py-2 text-xs font-bold text-slate-700 focus:outline-none focus:border-slate-400" 
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Collection Notes for Parents</label>
                      <textarea 
                        rows={3}
                        defaultValue="Fees must be submitted by the 10th of each month. Late surcharges of Rs. 50 apply after the due date. Please present the original voucher copy at the registrar desk."
                        className="w-full bg-white border border-slate-200 px-3 py-2 text-xs font-bold text-slate-700 focus:outline-none focus:border-slate-400"
                      />
                    </div>
                    <button className="bg-slate-900 text-white text-[10px] font-black uppercase tracking-widest py-2 px-4 hover:bg-slate-800 transition-all">
                      Save Protocols
                    </button>
                  </div>
                </div>

                {/* User Access Control Section */}
                <div className="space-y-6">
                  <div className="space-y-2">
                    <h3 className="text-sm font-black uppercase text-slate-800 flex items-center gap-2">
                      <Users size={18} className="text-emerald-600" />
                      Access Control & Portal Security
                    </h3>
                    <p className="text-xs text-slate-500 leading-relaxed">
                      Manage default security settings for teachers and students during registration.
                    </p>
                  </div>

                  <div className="bg-slate-50 p-5 border border-slate-200 space-y-4">
                    <div className="flex items-center justify-between p-3 bg-white border border-slate-200">
                      <div className="space-y-0.5">
                        <p className="text-[10px] font-black uppercase text-slate-800">Auto-Generate Credentials</p>
                        <p className="text-[9px] text-slate-400">Automatically creates IDs for new students/teachers.</p>
                      </div>
                      <div className="w-10 h-5 bg-emerald-500 rounded-full flex items-center px-1">
                        <div className="w-3 h-3 bg-white rounded-full ml-auto"></div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between p-3 bg-white border border-slate-200">
                      <div className="space-y-0.5">
                        <p className="text-[10px] font-black uppercase text-slate-800">Allow Password Resets</p>
                        <p className="text-[9px] text-slate-400">Enables users to change passwords from their dashboards.</p>
                      </div>
                      <div className="w-10 h-5 bg-emerald-500 rounded-full flex items-center px-1">
                        <div className="w-3 h-3 bg-white rounded-full ml-auto"></div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between p-3 bg-white border border-slate-200">
                      <div className="space-y-0.5">
                        <p className="text-[10px] font-black uppercase text-slate-800">Strict Teacher Isolation</p>
                        <p className="text-[9px] text-slate-400">Lock teachers to their assigned classroom data only.</p>
                      </div>
                      <div className="w-10 h-5 bg-emerald-500 rounded-full flex items-center px-1">
                        <div className="w-3 h-3 bg-white rounded-full ml-auto"></div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Visual Customization & Appearance */}
                <div className="space-y-6">
                  <div className="space-y-2">
                    <h3 className="text-sm font-black uppercase text-slate-800 dark:text-slate-100 flex items-center gap-2">
                      <Sun size={18} className="text-amber-500" />
                      Appearance & Custom Display (Visual Theme)
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                      Toggle between Light and Dark visual mode templates across all students and teachers devices.
                    </p>
                  </div>

                  <div className="bg-slate-50 dark:bg-slate-900 p-5 border border-slate-200 dark:border-slate-800 space-y-4">
                    <div className="flex items-center justify-between p-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                      <div className="space-y-0.5">
                        <p className="text-[10px] font-black uppercase text-slate-800 dark:text-white">Dark Theme / Dark Mode</p>
                        <p className="text-[9px] text-slate-405">Enable an eye-friendly dark look for all management dashboards.</p>
                      </div>
                      <button 
                        type="button"
                        onClick={handleToggleTheme}
                        className={`w-12 h-6 rounded-full flex items-center px-1 transition-colors ${darkTheme ? 'bg-indigo-600' : 'bg-slate-300'}`}
                        id="btn-toggle-dark-mode"
                      >
                        <div className={`w-4 h-4 rounded-full bg-white flex items-center justify-center transition-transform ${darkTheme ? 'translate-x-6' : 'translate-x-0'}`}>
                          {darkTheme ? <Moon size={10} className="text-indigo-600" /> : <Sun size={10} className="text-amber-500" />}
                        </div>
                      </button>
                    </div>

                    <div className="p-3 bg-indigo-50/60 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900 text-[10px] text-indigo-800 dark:text-indigo-200 leading-relaxed rounded-none">
                      <strong>✨ Note:</strong> Theme preference is synchronized in real-time. Changing this updates your portal view immediately and sets your persistent local workspace styling preference.
                    </div>
                  </div>
                </div>

                {/* WhatsApp & Communication Settings */}
                <div className="space-y-6 md:col-span-2">
                  <div className="space-y-2">
                    <h3 className="text-sm font-black uppercase text-slate-800 flex items-center gap-2">
                      <Phone size={18} className="text-emerald-600" />
                      WhatsApp & Automated Communication (WhatsApp Settings)
                    </h3>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-slate-50 p-5 border border-slate-200 space-y-4">
                      <div className="flex items-center justify-between p-3 bg-white border border-slate-200 ring-2 ring-emerald-500/20">
                        <div className="space-y-0.5">
                          <p className="text-[10px] font-black uppercase text-indigo-600 flex items-center gap-1">
                            <Zap size={10} /> Auto-Redirect WhatsApp
                          </p>
                          <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">Open WA tab automatically</p>
                        </div>
                        <button 
                          onClick={() => {
                            updateSetting('autoWhatsAppRedirect', !appSettings.autoWhatsAppRedirect);
                          }}
                          className={`w-10 h-5 rounded-full flex items-center px-1 transition-all duration-300 ${appSettings.autoWhatsAppRedirect ? 'bg-indigo-600' : 'bg-slate-300'}`}
                        >
                          <div className={`w-3 h-3 bg-white rounded-full shadow-sm transition-transform duration-300 ${appSettings.autoWhatsAppRedirect ? 'translate-x-5' : 'translate-x-0'}`}></div>
                        </button>
                      </div>

                      <div className="flex items-center justify-between p-3 bg-white border border-slate-200">
                        <div className="space-y-0.5">
                          <p className="text-[10px] font-black uppercase text-slate-800">Fee Auto-Reminders</p>
                          <p className="text-[9px] text-slate-400">Auto-send WhatsApp on invoice generation.</p>
                        </div>
                        <button 
                          onClick={() => updateSetting('whatsAppAutoFee', !appSettings.whatsAppAutoFee)}
                          className={`w-10 h-5 rounded-full flex items-center px-1 transition-colors ${appSettings.whatsAppAutoFee ? 'bg-emerald-500' : 'bg-slate-300'}`}
                        >
                          <div className={`w-3 h-3 bg-white rounded-full transition-transform ${appSettings.whatsAppAutoFee ? 'ml-auto' : 'mr-auto'}`}></div>
                        </button>
                      </div>

                      <div className="flex items-center justify-between p-3 bg-white border border-slate-200">
                        <div className="space-y-0.5">
                          <p className="text-[10px] font-black uppercase text-slate-800">Absence Alerts</p>
                          <p className="text-[9px] text-slate-400">Auto-ping parents when student is marked absent.</p>
                        </div>
                        <button 
                          onClick={() => updateSetting('whatsAppAutoAbsence', !appSettings.whatsAppAutoAbsence)}
                          className={`w-10 h-5 rounded-full flex items-center px-1 transition-colors ${appSettings.whatsAppAutoAbsence ? 'bg-emerald-500' : 'bg-slate-300'}`}
                        >
                          <div className={`w-3 h-3 bg-white rounded-full transition-transform ${appSettings.whatsAppAutoAbsence ? 'ml-auto' : 'mr-auto'}`}></div>
                        </button>
                      </div>

                      <div className="flex items-center justify-between p-3 bg-white border border-slate-200">
                        <div className="space-y-0.5">
                          <p className="text-[10px] font-black uppercase text-slate-800">Results Broadcasting</p>
                          <p className="text-[9px] text-slate-400">Send report cards via WhatsApp automatically.</p>
                        </div>
                        <button 
                          onClick={() => updateSetting('whatsAppAutoResult', !appSettings.whatsAppAutoResult)}
                          className={`w-10 h-5 rounded-full flex items-center px-1 transition-colors ${appSettings.whatsAppAutoResult ? 'bg-emerald-500' : 'bg-slate-300'}`}
                        >
                          <div className={`w-3 h-3 bg-white rounded-full transition-transform ${appSettings.whatsAppAutoResult ? 'ml-auto' : 'mr-auto'}`}></div>
                        </button>
                      </div>
                    </div>

                    <div className="bg-slate-900 text-white p-5 space-y-4 shadow-xl">
                      <h4 className="text-[10px] font-black uppercase tracking-widest text-emerald-400">Bulk Execution Logs</h4>
                      <div className="space-y-2 h-40 overflow-y-auto pr-2 custom-scrollbar">
                        {broadcastLogs.length === 0 ? (
                          <p className="text-[9px] text-slate-500 ">No recent autopilot activity.</p>
                        ) : (
                          broadcastLogs.map(log => (
                            <div key={log.id} className="p-2 border-b border-white/10 last:border-0">
                              <div className="flex justify-between items-start gap-2">
                                <p className="text-[10px] font-bold text-slate-200">{log.recipient}</p>
                                <span className="text-[8px] px-1 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 uppercase">{log.status}</span>
                              </div>
                              <p className="text-[9px] text-slate-400 truncate mt-0.5">{log.text}</p>
                              <p className="text-[7px] text-slate-600 mt-0.5">{log.timestamp}</p>
                            </div>
                          ))
                        )}
                      </div>
                      <button 
                        onClick={() => {
                          const unpaidCount = fees.filter(f => f.status !== 'paid').length;
                          if (unpaidCount === 0) return;
                          toast.success(`Security Policy: Batch broadcast for ${unpaidCount} parents initiated via settings.`);
                          setBroadcastLogs(prev => [
                            {
                              id: 'batch_' + Date.now(),
                              recipient: 'System-Wide Defaulters',
                              phone: 'Multiple',
                              type: 'Settings Batch',
                              text: `Manual trigger of arrears reminder for ${unpaidCount} students.`,
                              timestamp: new Date().toLocaleString(),
                              status: 'Autopilot'
                            },
                            ...prev
                          ]);
                          toast.success(`Arrears reminder triggered for ${unpaidCount} students.`);
                        }}
                        className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-black text-[10px] uppercase py-2 tracking-widest transition-all"
                      >
                        ⚡ Run Batch Fee Reminders
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* CUSTOM SHORTCODE/PLACEHOLDER TEMPLATES SECTION */}
              <div className="mt-10 pt-10 border-t border-slate-200 space-y-6">
                <div className="space-y-2">
                  <h3 className="text-sm font-black uppercase text-slate-800 flex items-center gap-2 font-display">
                    <MessageSquare size={18} className="text-indigo-600" />
                    SMS & WhatsApp Message Templates Settings
                  </h3>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    Personalize default automated template copies dispatched on pupil absences or fee issuance incidents. Use the shortcut system tags dynamically replaced on dispatch.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 bg-slate-50 p-6 border border-slate-200">
                  {/* Absentee Template custom box */}
                  <div className="space-y-3 bg-white p-5 border border-slate-200">
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 block">Absent Alarm Template</span>
                      <span className="text-[9px] bg-indigo-50 text-indigo-700 border border-indigo-100 font-bold px-2 py-0.5 rounded-full uppercase">Absent Alert</span>
                    </div>
                    
                    <textarea 
                      rows={4}
                      value={appSettings.absentTemplate}
                      onChange={(e) => updateSetting('absentTemplate', e.target.value)}
                      placeholder="Insert your custom absent template copy..."
                      className="w-full bg-slate-50 text-xs border border-slate-200 p-3  font-medium focus:outline-none focus:border-indigo-600 focus:bg-white"
                    />
                    
                    <div className="space-y-1 bg-slate-50 p-3 text-[9px] text-slate-500 font-mono">
                      <p className="font-bold uppercase text-[8px] text-indigo-700">Available Tags (Auto Replaced):</p>
                      <ul className="list-disc list-inside space-y-0.5">
                        <li><code className="text-rose-600 font-bold">{`{student_name}`}</code> - Name of the absentee</li>
                        <li><code className="text-rose-600 font-bold">{`{roll_number}`}</code> - Roll registry number</li>
                        <li><code className="text-rose-600 font-bold">{`{date}`}</code> - Scheduled attendance date pointer</li>
                      </ul>
                    </div>

                    <div className="pt-2 border-t text-[9.5px]">
                      <span className="font-bold text-slate-500 block uppercase">Draft Sample Live Preview:</span>
                      <p className="text-slate-700 font-medium  mt-1 bg-slate-100 p-2 border leading-normal">
                        "{appSettings.absentTemplate
                          .replace(/{student_name}/g, "Zain")
                          .replace(/{roll_number}/g, "12")
                          .replace(/{date}/g, new Date().toLocaleDateString())}"
                      </p>
                    </div>
                  </div>

                  {/* Fee Reminder Template custom box */}
                  <div className="space-y-3 bg-white p-5 border border-slate-200">
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 block">Dues & Fee Reminder Template</span>
                      <div className="flex gap-2">
                        <select 
                          className="text-[9px] bg-white border border-slate-200 font-bold px-2 py-0.5 rounded uppercase focus:ring-1 focus:ring-emerald-500 outline-none"
                          onChange={(e) => {
                            const val = e.target.value;
                            let newTpl = "";
                            if (val === "short") newTpl = "Reminder: Rs. {total_pending} outstanding for {student_name}. Please settle soon. - Principal.";
                            else if (val === "standard") newTpl = "Greetings! NSB1 Reminder: Guardian of {student_name}. Pending balance: Rs {total_pending}. Kindly settle today. Thank you.";
                            else if (val === "urgent") newTpl = "🚨 URGENT: Rs. {total_pending} outstanding for {student_name}. Pay today to avoid portal suspension. - Principal NSB1.";
                            
                            if (newTpl) {
                              updateSetting('feeTemplate', newTpl);
                            }
                          }}
                          defaultValue=""
                        >
                          <option value="" disabled>Select Preset...</option>
                          <option value="short">Short (Quick)</option>
                          <option value="standard">Standard (Polite)</option>
                          <option value="urgent">Urgent (Warning)</option>
                        </select>
                        <span className="text-[9px] bg-emerald-50 text-emerald-700 border border-emerald-100 font-bold px-2 py-0.5 rounded-full uppercase">Fee Dues</span>
                      </div>
                    </div>
                    
                    <textarea 
                      rows={4}
                      value={appSettings.feeTemplate}
                      onChange={(e) => updateSetting('feeTemplate', e.target.value)}
                      placeholder="Insert your custom outstanding fee template copy..."
                      className="w-full bg-slate-50 text-xs border border-slate-200 p-3  font-medium focus:outline-none focus:border-emerald-600 focus:bg-white"
                    />
                    
                    <div className="space-y-1 bg-slate-50 p-3 text-[9px] text-slate-500 font-mono">
                      <p className="font-bold uppercase text-[8px] text-emerald-700">Available Tags (Auto Replaced):</p>
                      <ul className="list-disc list-inside space-y-0.5">
                        <li><code className="text-rose-600 font-bold">{`{student_name}`}</code> - Name of the student debtor</li>
                        <li><code className="text-rose-600 font-bold">{`{class_name}`}</code> - Enrolled classroom handle</li>
                        <li><code className="text-rose-600 font-bold">{`{total_pending}`}</code> - Total unpaid ledger sum</li>
                        <li><code className="text-rose-600 font-bold">{`{months}`}</code> - Months list needing settlement</li>
                        <li><code className="text-rose-600 font-bold">{`{date}`}</code> - Issue / settlement deadline date</li>
                      </ul>
                    </div>

                    <div className="pt-2 border-t text-[9.5px]">
                      <span className="font-bold text-slate-500 block uppercase">Draft Sample Live Preview:</span>
                      <p className="text-slate-700 font-medium  mt-1 bg-slate-100 p-2 border leading-normal whitespace-pre-wrap">
                        "{appSettings.feeTemplate
                          .replace(/{student_name}/g, "Zain")
                          .replace(/{class_name}/g, "Class-A")
                          .replace(/{total_pending}/g, "1500")
                          .replace(/{months}/g, "June, July")
                          .replace(/{date}/g, new Date().toLocaleDateString())}"
                      </p>
                    </div>
                  </div>

                  <div className="md:col-span-2 flex justify-between items-center bg-white p-3.5 border border-slate-200">
                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">
                      ✨ Status: Personalized template patterns are instantly autosaved to regional memory.
                    </p>
                    <button 
                      type="button"
                      onClick={() => {
                        toast.success("Templates are automatically synced to the cloud!");
                      }}
                      className="bg-slate-900 hover:bg-slate-850 text-white font-black text-[10px] uppercase tracking-widest py-2 px-6 shadow-md transition-all active:scale-95"
                    >
                      Sync Status
                    </button>
                  </div>
                </div>
              </div>

              {/* Data Safety & Backups Section */}
              <div className="mt-10 pt-10 border-t border-slate-200 space-y-6">
                <div className="space-y-2">
                  <h3 className="text-sm font-black uppercase text-slate-800 flex items-center gap-2">
                    <Database size={18} className="text-red-500" />
                    Data Governance & Local Backups
                  </h3>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    Download a complete snapshot of your school portal data as a JSON file for your local safety records. This is a manual safety measure.
                  </p>
                </div>

                <div className="bg-red-50 p-6 border border-red-100 space-y-4">
                  <div className="flex items-start gap-3 bg-white p-4 border border-red-100">
                    <ShieldAlert size={20} className="text-red-500 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-xs font-black text-slate-900 uppercase">Principal Local Backup Protocol</p>
                      <p className="text-[10px] text-slate-500 mt-1 leading-relaxed">
                        This backup contains all user profiles, fee records, and timetables. Store this file in a secure vault on your local machine.
                      </p>
                    </div>
                  </div>
                  
                    <button 
                      onClick={handleBackupDatabase}
                      className="w-full bg-red-600 hover:bg-red-700 text-white text-[10px] font-black uppercase tracking-[0.2em] py-4 px-6 transition-all shadow-lg flex items-center justify-center gap-3"
                    >
                      <Download size={16} />
                      Export Database to JSON (Safety Measure)
                    </button>
                </div>
              </div>

              <div className="mt-12 pt-8 border-t border-dashed border-slate-200">
                <div className="bg-amber-50 p-6 border border-amber-100 flex items-start gap-4">
                  <AlertCircle className="text-amber-600 shrink-0" size={20} />
                  <div>
                    <h4 className="text-xs font-black uppercase text-amber-900 tracking-wider">Principal Security Override</h4>
                    <p className="text-xs text-amber-800 mt-1 leading-relaxed">
                      As the principal coordinator, you have master access to all system data. Ensure you keep your master credentials secure. You can manually override any teacher password or student record from the primary rosters.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

      </main>

      {/* ========== COMMON MODAL FORM DIALOG ========== */}
      {isModalOpen && (
        <div id="modal-container" className="fixed inset-0 bg-black/65 flex items-center justify-center p-4 z-50 overflow-y-auto animate-fade-in">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-xl overflow-hidden max-h-[90vh] flex flex-col">
            
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50">
              <h2 className="text-base font-bold text-gray-900 uppercase tracking-wide">
                {modalMode === 'add' ? 'Create' : 'Configure'} {modalType.substring(0, 1).toUpperCase() + modalType.substring(1)}
              </h2>
              <button
                id="modal-close-btn"
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="p-1 rounded-lg hover:bg-gray-200 text-gray-400 hover:text-gray-600 transition-all"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Scrollable Form Wrapper */}
            <form onSubmit={handleFormSubmit} className="flex-1 overflow-y-auto p-6 space-y-4">
              
              {/* Form Errors Banner */}
              {formErrors.length > 0 && (
                <div id="modal-validation-errors" className="p-3.5 bg-red-50 text-red-700 border border-red-100 rounded-xl space-y-1">
                  <p className="font-bold text-xs flex items-center gap-1.5 uppercase tracking-wide">
                    <AlertCircle size={14} /> Please resolve form issues:
                  </p>
                  <ul className="list-disc pl-5 text-xs space-y-0.5">
                    {formErrors.map((err, idx) => <li key={idx}>{err}</li>)}
                  </ul>
                </div>
              )}

              {/* ============ TEACHER FORM FIELDS ============ */}
              {modalType === 'teacher' && (
                <div className="space-y-4">
                  <div className="space-y-1">
                    <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider">Teacher Name</label>
                    <input
                      type="text"
                      required
                      value={tName}
                      onChange={(e) => setTName(e.target.value)}
                      placeholder="e.g. Johnathan Miller"
                      className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-500"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1 col-span-2">
                      <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider">Password</label>
                      <input
                        type="text"
                        required
                        value={tPassword}
                        onChange={(e) => setTPassword(e.target.value)}
                        placeholder="nsb123"
                        className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-500"
                      />
                    </div>
                  </div>
                  
                  <div className="space-y-1">
                    <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider">Email Address (Optional)</label>
                    <input
                      type="email"
                      value={tEmail}
                      onChange={(e) => setTEmail(e.target.value)}
                      placeholder="e.g. jmiller@school.com"
                      className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-500"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider">Teaching Discipline/Subject</label>
                    <input
                      type="text"
                      required
                      value={tSubject}
                      onChange={(e) => setTSubject(e.target.value)}
                      placeholder="e.g. Physics, History, etc."
                      className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-500"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider">Phone number</label>
                    <input
                      type="text"
                      required
                      value={tPhone}
                      onChange={(e) => setTPhone(e.target.value)}
                      placeholder="e.g. +1-555-0819"
                      className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-500"
                    />
                  </div>
                </div>
              )}

              {/* ============ COORDINATOR FORM FIELDS ============ */}
              {modalType === 'coordinator' && (
                <div className="space-y-4">
                  <div className="space-y-1">
                    <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider">Coordinator Name</label>
                    <input
                      type="text"
                      required
                      value={tName}
                      onChange={(e) => setTName(e.target.value)}
                      placeholder="e.g. Sarah Connor"
                      className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-500"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1 col-span-2">
                      <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider">Password</label>
                      <input
                        type="text"
                        required
                        value={tPassword}
                        onChange={(e) => setTPassword(e.target.value)}
                        placeholder="nsb123"
                        className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-500"
                      />
                    </div>
                  </div>
                  
                  <div className="space-y-1">
                    <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider">Email Address</label>
                    <input
                      type="email"
                      required
                      value={tEmail}
                      onChange={(e) => setTEmail(e.target.value)}
                      placeholder="e.g. sconnor@school.com"
                      className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-500"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider">Phone number</label>
                    <input
                      type="text"
                      required
                      value={tPhone}
                      onChange={(e) => setTPhone(e.target.value)}
                      placeholder="e.g. +1-555-4321"
                      className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-500"
                    />
                  </div>
                </div>
              )}

              {/* ============ STUDENT FORM FIELDS ============ */}
              {modalType === 'student' && (
                <div className="space-y-6">
                  {/* Step Progress Indicator */}
                  <div className="flex items-center justify-between mb-8 px-4">
                    {[
                      { step: 1, label: 'Identity', icon: User },
                      { step: 2, label: 'Academic', icon: BookOpen },
                      { step: 3, label: 'Account', icon: CreditCard }
                    ].map((s, i) => (
                      <React.Fragment key={s.step}>
                        <div className="flex flex-col items-center gap-2 group">
                          <div 
                            onClick={() => setFormStep(s.step)}
                            className={`w-10 h-10 rounded-2xl flex items-center justify-center transition-all cursor-pointer ${
                              formStep === s.step 
                                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200 scale-110' 
                                : formStep > s.step 
                                  ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-100'
                                  : 'bg-slate-100 text-slate-400 grayscale hover:grayscale-0'
                            }`}
                          >
                            <s.icon size={18} strokeWidth={2.5} />
                          </div>
                          <span className={`text-[9px] font-black uppercase tracking-widest ${formStep === s.step ? 'text-indigo-600' : 'text-slate-400'}`}>
                            {s.label}
                          </span>
                        </div>
                        {i < 2 && (
                          <div className={`flex-1 h-0.5 mx-2 rounded-full transition-colors ${formStep > s.step + 1 ? 'bg-emerald-500' : 'bg-slate-100'}`}></div>
                        )}
                      </React.Fragment>
                    ))}
                  </div>

                  {/* STEP 1: PERSONAL IDENTITY */}
                  {formStep === 1 && (
                    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-4">
                      <div className="p-4 bg-indigo-50/50 border border-indigo-100 rounded-2xl flex items-center gap-4">
                        <div className="relative group">
                          <div className="w-16 h-16 bg-white rounded-2xl border-2 border-dashed border-indigo-200 flex items-center justify-center overflow-hidden shadow-sm transition-all group-hover:border-indigo-400">
                            {sPhoto ? (
                              <img src={sPhoto} alt="Profile" className="w-full h-full object-cover" />
                            ) : (
                              <User size={24} className="text-indigo-300" />
                            )}
                          </div>
                          <label className="absolute -bottom-2 -right-2 bg-indigo-600 text-white p-1.5 rounded-xl cursor-pointer shadow-lg hover:bg-indigo-700 transition-all border-2 border-white">
                            <Upload size={12} strokeWidth={3} />
                            <input type="file" accept="image/*" onChange={handlePhotoChange} className="hidden" />
                          </label>
                        </div>
                        <div>
                          <h4 className="text-sm font-black text-indigo-900 uppercase tracking-tight">Student Profile Image</h4>
                          <p className="text-[10px] text-indigo-500 font-bold uppercase tracking-wider">A clear photo helps in identification</p>
                        </div>
                      </div>

                      <div className="space-y-4 pt-2">
                        <div className="space-y-1">
                          <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">Full Student Name</label>
                          <input
                            type="text"
                            required
                            value={sName}
                            onChange={(e) => setSName(e.target.value)}
                            placeholder="e.g. Muhammad Ali"
                            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                          />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-1">
                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">Username</label>
                            <input
                              type="text"
                              required
                              value={sUsername}
                              onChange={(e) => setSUsername(e.target.value)}
                              placeholder="login_id"
                              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">Password</label>
                            <input
                              type="text"
                              required
                              value={sPassword}
                              onChange={(e) => setSPassword(e.target.value)}
                              placeholder="nsb123"
                              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                            />
                          </div>
                        </div>

                        <div className="space-y-1">
                          <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">Parent's WhatsApp Number</label>
                          <div className="relative">
                            <Phone size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                            <input
                              type="text"
                              required
                              value={sParentPhone}
                              onChange={(e) => setSParentPhone(e.target.value)}
                              placeholder="e.g. 03001234567"
                              className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
                            />
                          </div>
                        </div>
                      </div>

                      <div className="pt-4 flex justify-end">
                        <button 
                          type="button" 
                          onClick={() => setFormStep(2)}
                          className="px-8 py-3 bg-slate-900 text-white rounded-2xl text-[11px] font-black uppercase tracking-widest hover:bg-slate-800 transition-all active:scale-95 flex items-center gap-2"
                        >
                          Continue to Academic <ArrowUpRight size={14} />
                        </button>
                      </div>
                    </motion.div>
                  )}

                  {/* STEP 2: ACADEMIC DETAILS */}
                  {formStep === 2 && (
                    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-4">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-1">
                          <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">Assigned Class</label>
                          <select
                            value={sClassId}
                            onChange={(e) => setSClassId(e.target.value)}
                            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                          >
                            <option value="">-- Choose Class --</option>
                            {classes.map(cl => (
                              <option key={cl.id} value={cl.id}>{cl.className} ({cl.section})</option>
                            ))}
                          </select>
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">Roll Number</label>
                          <input
                            type="text"
                            required
                            value={sRoll}
                            onChange={(e) => setSRoll(e.target.value)}
                            placeholder="e.g. 101"
                            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                        <div className="space-y-1">
                          <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">Student Contact (Optional)</label>
                          <input
                            type="text"
                            value={sStudentPhone}
                            onChange={(e) => setSStudentPhone(e.target.value)}
                            placeholder="e.g. 03217654321"
                            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">Email Address</label>
                          <input
                            type="email"
                            value={sEmail}
                            onChange={(e) => setSEmail(e.target.value)}
                            placeholder="e.g. ali@school.com"
                            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                          />
                        </div>
                      </div>

                      <div className="space-y-1 pt-2">
                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">Enrollment Date</label>
                        <select
                          value={sEnrollmentMonth}
                          onChange={(e) => setSEnrollmentMonth(e.target.value)}
                          className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                        >
                          {MONTHS.map(m => (
                            <option key={m} value={m}>{m} 2026</option>
                          ))}
                        </select>
                      </div>

                      <div className="pt-6 flex justify-between gap-4">
                        <button 
                          type="button" 
                          onClick={() => setFormStep(1)}
                          className="flex-1 py-3 bg-slate-100 text-slate-600 rounded-2xl text-[11px] font-black uppercase tracking-widest hover:bg-slate-200 transition-all active:scale-95"
                        >
                          Back to Identity
                        </button>
                        <button 
                          type="button" 
                          onClick={() => setFormStep(3)}
                          className="flex-1 py-3 bg-slate-900 text-white rounded-2xl text-[11px] font-black uppercase tracking-widest hover:bg-slate-800 transition-all active:scale-95"
                        >
                          Next: Fee & Academy
                        </button>
                      </div>
                    </motion.div>
                  )}

                  {/* STEP 3: FINANCIAL & ACADEMY */}
                  {formStep === 3 && (
                    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-6">
                      <div className="p-6 bg-emerald-50 border border-emerald-100 rounded-3xl space-y-4">
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-white text-emerald-600 rounded-xl shadow-sm">
                            <CreditCard size={20} />
                          </div>
                          <div>
                            <h4 className="text-sm font-black text-emerald-900 uppercase tracking-tight ">Fee Management</h4>
                            <p className="text-[10px] text-emerald-600 font-bold uppercase tracking-wider">Set the monthly base fee for this student</p>
                          </div>
                        </div>
                        
                        <div className="space-y-1">
                          <label className="text-[10px] font-black uppercase tracking-widest text-emerald-700 ml-1">Monthly School Fee (Rs.)</label>
                          <div className="relative">
                            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-emerald-600 font-black text-xs">Rs.</span>
                            <input
                              type="number"
                              required
                              value={sBaseFee}
                              onChange={(e) => setSBaseFee(e.target.value)}
                              placeholder="e.g. 2000"
                              className="w-full pl-12 pr-4 py-4 bg-white border border-emerald-200 rounded-2xl text-xl font-black text-emerald-950 focus:ring-4 focus:ring-emerald-200/50 outline-none transition-all placeholder:text-emerald-200"
                            />
                          </div>
                        </div>
                      </div>

                      <div className="p-6 bg-indigo-950 text-white rounded-3xl space-y-6 shadow-xl shadow-indigo-200 border-l-8 border-indigo-500">
                        <div className="flex items-center justify-between">
                          <div className="space-y-1">
                            <h4 className="text-sm font-black uppercase tracking-tight  flex items-center gap-2">
                              <Zap size={18} className="text-amber-400" /> Academy Enrollment
                            </h4>
                            <p className="text-[10px] text-indigo-300 font-medium leading-relaxed max-w-[200px]">
                              Is this student also attending evening academy classes?
                            </p>
                          </div>
                          <button 
                            type="button" 
                            onClick={() => setSIsAcademy(!sIsAcademy)}
                            className={`w-14 h-7 rounded-full flex items-center px-1 transition-all ${sIsAcademy ? 'bg-indigo-500' : 'bg-slate-700'}`}
                          >
                            <div className={`w-5 h-5 bg-white rounded-full shadow-lg transition-transform ${sIsAcademy ? 'translate-x-7' : 'translate-x-0'}`}></div>
                          </button>
                        </div>

                        {sIsAcademy && (
                          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="space-y-2 pt-2 border-t border-white/10">
                            <label className="text-[10px] font-black text-indigo-300 uppercase tracking-widest">Select Academy Subjects</label>
                            <input
                              type="text"
                              value={sAcademySubjects}
                              onChange={(e) => setSAcademySubjects(e.target.value)}
                              placeholder="e.g. Physics, Chemistry, Biology"
                              className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-2xl text-sm font-bold text-white placeholder:text-white/20 focus:bg-white/20 outline-none transition-all"
                            />
                          </motion.div>
                        )}
                      </div>

                      <div className="pt-4 flex flex-col gap-3">
                        <div className="flex gap-4">
                          <button 
                            type="button" 
                            onClick={() => setFormStep(2)}
                            className="flex-1 py-4 bg-slate-100 text-slate-600 rounded-2xl text-[11px] font-black uppercase tracking-widest hover:bg-slate-200 transition-all active:scale-95"
                          >
                            Back to Academic
                          </button>
                          <button 
                            type="submit"
                            className="flex-[2] py-4 bg-indigo-600 text-white rounded-2xl text-[11px] font-black uppercase tracking-widest hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-200 active:scale-95 flex items-center justify-center gap-2"
                          >
                            <Save size={16} /> Complete Registration
                          </button>
                        </div>
                        <p className="text-[9px] text-center text-slate-400 font-bold uppercase tracking-widest">Ensure all data is correct before committing to cloud ledger</p>
                      </div>
                    </motion.div>
                  )}
                </div>
              )}

              {/* ============ CLASS FORM FIELDS ============ */}
              {modalType === 'class' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider">Class Name</label>
                      <input
                        type="text"
                        required
                        value={cClassName}
                        onChange={(e) => setCClassName(e.target.value)}
                        placeholder="e.g. Grade 10"
                        className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-500"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider">Section</label>
                      <input
                        type="text"
                        required
                        value={cSection}
                        onChange={(e) => setCSection(e.target.value)}
                        placeholder="e.g. A"
                        className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-500"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider">Assigned Class Teacher</label>
                    <select
                      value={cTeacherId}
                      onChange={(e) => setCTeacherId(e.target.value)}
                      className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-500"
                    >
                      <option value="">Choose Class Teacher</option>
                      {teachers.map(t => (
                        <option key={t.id} value={t.id}>{t.name} ({t.subject})</option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-3 p-4 bg-slate-50 border border-slate-200">
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Manage Class Subjects</label>
                    
                    <div className="space-y-2">
                      <div className="flex gap-2">
                        <select 
                          className="flex-1 px-3 py-2 bg-white border border-slate-200 rounded-md text-xs focus:outline-none focus:border-indigo-500"
                          onChange={(e) => {
                            const sub = e.target.value;
                            if (sub === 'OTHER_MANUAL') {
                              setShowOtherSubjectInput(true);
                            } else if (sub && !cSubjects.includes(sub)) {
                              setCSubjects([...cSubjects, sub]);
                              setShowOtherSubjectInput(false);
                            }
                            e.target.value = '';
                          }}
                        >
                          <option value="">Select subject to add...</option>
                          {STANDARD_SUBJECTS_LIST.filter(s => !cSubjects.includes(s)).map(s => (
                            <option key={s} value={s}>{s}</option>
                          ))}
                          <option value="OTHER_MANUAL" className="font-bold text-indigo-600">+ Other (Manual Entry)</option>
                        </select>
                      </div>

                      {showOtherSubjectInput && (
                        <div className="flex gap-2 animate-in fade-in slide-in-from-top-1 duration-200">
                          <input 
                            type="text"
                            placeholder="Enter custom subject name..."
                            value={manualSubjectName}
                            onChange={(e) => setManualSubjectName(e.target.value)}
                            className="flex-1 px-3 py-2 bg-white border border-slate-300 rounded-md text-xs focus:outline-none focus:border-indigo-500 font-bold uppercase"
                          />
                          <button 
                            type="button"
                            onClick={() => {
                              const trimmed = manualSubjectName.trim();
                              if (trimmed && !cSubjects.includes(trimmed)) {
                                setCSubjects([...cSubjects, trimmed]);
                                setManualSubjectName('');
                                setShowOtherSubjectInput(false);
                              } else if (!trimmed) {
                                setShowOtherSubjectInput(false);
                              } else {
                                toast.error("Subject already exists in list.");
                              }
                            }}
                            className="px-4 py-2 bg-indigo-600 text-white text-[10px] font-black uppercase tracking-widest rounded-md"
                          >
                            Add
                          </button>
                        </div>
                      )}
                    </div>

                    <div className="flex flex-wrap gap-2">
                      {cSubjects.map(sub => (
                        <span key={sub} className="flex items-center gap-1.5 bg-indigo-100 text-indigo-700 text-[10px] font-bold px-2.5 py-1 rounded-full border border-indigo-200">
                          {sub}
                          <button 
                            type="button"
                            onClick={() => setCSubjects(cSubjects.filter(s => s !== sub))}
                            className="hover:text-indigo-900"
                          >
                            <X size={10} />
                          </button>
                        </span>
                      ))}
                      {cSubjects.length === 0 && (
                        <p className="text-[10px] text-slate-400 ">No subjects added yet. Pick from the dropdown above.</p>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* ============ TIMETABLE FORM FIELDS ============ */}
              {modalType === 'timetable' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider">Target Class</label>
                      <select
                        value={ttClassId}
                        onChange={(e) => setTtClassId(e.target.value)}
                        className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-500"
                      >
                        {classes.map(cl => (
                          <option key={cl.id} value={cl.id}>{cl.className} ({cl.section})</option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider">Week Day</label>
                      <select
                        value={ttDay}
                        onChange={(e) => setTtDay(e.target.value as DayOfWeek)}
                        className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-500"
                      >
                        {DAYS.map(day => (
                          <option key={day} value={day}>{day}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider">Period slot</label>
                      <div className="flex gap-2">
                        {!isCustomPeriod ? (
                          <select
                            value={ttPeriod}
                            onChange={(e) => {
                              if (e.target.value === '__custom__') {
                                setIsCustomPeriod(true);
                                setTtPeriod('');
                              } else {
                                setTtPeriod(e.target.value);
                              }
                            }}
                            className="flex-1 px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-500"
                          >
                            {['Period 1', 'Period 2', 'Period 3', 'Period 4', 'Period 5', ...(appSettings.extraPeriods[ttClassId || selectedTimetableClass] || [])].map(p => (
                              <option key={p} value={p}>{p}</option>
                            ))}
                            <option value="__custom__">+ Enter Custom / Next Period...</option>
                          </select>
                        ) : (
                          <div className="flex-1 flex gap-2">
                            <input
                              type="text"
                              required
                              value={ttPeriod}
                              onChange={(e) => setTtPeriod(e.target.value)}
                              placeholder="e.g. Period 6"
                              className="flex-1 px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-500"
                            />
                            <button
                              type="button"
                              onClick={() => {
                                setIsCustomPeriod(false);
                                setTtPeriod('Period 1');
                              }}
                              className="px-2 py-1 text-xs border border-gray-300 hover:bg-gray-100 rounded-lg"
                            >
                              Reset
                            </button>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider">Assigned Teaching Time</label>
                      <input
                        type="text"
                        required
                        value={ttTime}
                        onChange={(e) => setTtTime(e.target.value)}
                        placeholder="e.g. 08:30 AM - 09:30 AM"
                        className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-500"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider">Subject Title</label>
                      <input
                        type="text"
                        required
                        value={ttSubject}
                        onChange={(e) => setTtSubject(e.target.value)}
                        placeholder="e.g. Algebra"
                        className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-500"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider">Instructing Teacher</label>
                      <select
                        value={ttTeacherId}
                        onChange={(e) => setTtTeacherId(e.target.value)}
                        className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-500"
                      >
                        <option value="">Select Instructor</option>
                        {teachers.map(t => (
                          <option key={t.id} value={t.id}>{t.name} ({t.subject})</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
              )}

              {/* Modal Actions */}
              <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex items-center justify-end gap-3 mt-8">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 hover:bg-gray-250 border border-gray-250 text-gray-700 rounded-xl text-xs font-bold transition-all"
                >
                  Cancel
                </button>
                <button
                  id="modal-submit-btn"
                  type="submit"
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all"
                >
                  Save Entity
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* ========== STUDENT DETAIL REPORT MODAL ========== */}
      <AnimatePresence>
        {selectedStudentReport && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5 z-[150] animate-in fade-in duration-300 print:static print:bg-white print:p-0">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white w-full max-w-4xl rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] print:max-h-none print:shadow-none print:rounded-none print:border-none print:w-full"
            >
              {/* Modal Top Banner & Student Info */}
              <div className="p-6 sm:p-8 bg-slate-900 text-white flex justify-between items-start relative overflow-hidden print:bg-white print:text-slate-950 print:border-b print:p-4">
                <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 rounded-full -mr-32 -mt-32 blur-3xl print:hidden"></div>
                
                <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center gap-5">
                  <div className="relative w-20 h-20 sm:w-24 sm:h-24 rounded-2xl overflow-hidden border-2 border-indigo-300/40 shadow-xl bg-slate-800 shrink-0">
                    {getStudentPhoto(selectedStudentReport) ? (
                      <img 
                        src={getStudentPhoto(selectedStudentReport)} 
                        alt={selectedStudentReport.name} 
                        className="w-full h-full object-cover" 
                      />
                    ) : (
                      <div className="w-full h-full bg-slate-800 flex items-center justify-center" />
                    )}
                  </div>
                  <div>
                    <span className="inline-block px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 mb-1.5">
                      Student Official Report
                    </span>
                    <h2 className="text-2xl sm:text-3xl font-black uppercase tracking-tight">{selectedStudentReport.name}</h2>
                    <div className="flex flex-wrap gap-2 mt-2">
                      <span className="bg-white/10 text-white/90 px-3 py-1 rounded-lg text-xs font-bold border border-white/10">
                        Class: {classes.find(c => c.id === selectedStudentReport.classId)?.className || selectedStudentReport.classId || 'N/A'}
                      </span>
                      <span className="bg-white/10 text-white/90 px-3 py-1 rounded-lg text-xs font-mono font-bold border border-white/10">
                        Roll #{selectedStudentReport.rollNumber}
                      </span>
                      <span className="bg-indigo-500/30 text-indigo-200 px-3 py-1 rounded-lg text-xs font-bold border border-indigo-400/20">
                        {selectedStudentReport.category || 'General'}
                      </span>
                    </div>
                  </div>
                </div>

                <button 
                  onClick={() => setSelectedStudentReport(null)}
                  className="relative z-10 p-2 hover:bg-white/10 rounded-xl transition-all text-white/70 hover:text-white print:hidden cursor-pointer"
                >
                  <X size={24} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-6 sm:p-8 space-y-6 bg-slate-50/60 print:bg-white print:p-4 print:overflow-visible">
                {/* Contact & Profile Quick Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
                    <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">Parent Phone</p>
                    <p className="text-sm font-mono font-bold text-slate-800 mt-1">{selectedStudentReport.parentPhone || 'N/A'}</p>
                  </div>
                  <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
                    <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">Guardian Name</p>
                    <p className="text-sm font-bold text-slate-800 mt-1">{selectedStudentReport.guardianName || 'N/A'}</p>
                  </div>
                  <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
                    <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">Academic Email</p>
                    <p className="text-sm font-bold text-slate-800 mt-1 truncate">{selectedStudentReport.email || 'N/A'}</p>
                  </div>
                </div>

                {/* Stats Overview */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 print:grid-cols-3">
                  {/* Attendance Card */}
                  <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Attendance Rate</span>
                      <CalendarDays size={18} className="text-blue-500 print:hidden" />
                    </div>
                    <div>
                      <div className="text-3xl font-black text-slate-900">
                        {(() => {
                          const stats = attendance.filter(a => a.studentId === selectedStudentReport.id);
                          if (stats.length === 0) return '0%';
                          const present = stats.filter(a => a.status === 'present' || a.status === 'leave').length;
                          return `${Math.round((present / stats.length) * 100)}%`;
                        })()}
                      </div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mt-0.5">Average Presence</p>
                    </div>
                  </div>

                  {/* Academics Card */}
                  <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Academic Score</span>
                      <Award size={18} className="text-indigo-500 print:hidden" />
                    </div>
                    <div>
                      <div className="text-3xl font-black text-slate-900">
                        {(() => {
                          const sMarks = marks.filter(m => m.studentId === selectedStudentReport.id);
                          if (sMarks.length === 0) return 'N/A';
                          const avg = Math.round(sMarks.reduce((sum, m) => sum + Number(m.marksObtained), 0) / sMarks.length);
                          return `${avg}%`;
                        })()}
                      </div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mt-0.5">Average Marks</p>
                    </div>
                  </div>

                  {/* Financials Card */}
                  <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Fee Balance</span>
                      <CreditCard size={18} className="text-emerald-500 print:hidden" />
                    </div>
                    <div>
                      <div className="text-3xl font-black text-slate-900">
                        {(() => {
                          const fData = feeStudents.find(fs => String(fs.id) === String(selectedStudentReport.id));
                          if (!fData) return 'Rs. 0';
                          return `Rs. ${getTotalPending(fData) + getTotalOtherFunds(fData)}`;
                        })()}
                      </div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mt-0.5">Total Pending Dues</p>
                    </div>
                  </div>
                </div>

                {/* Detailed Sections */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 print:grid-cols-2">
                  {/* Test History */}
                  <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
                    <h3 className="text-xs font-black uppercase text-slate-900 tracking-wider mb-4 flex items-center gap-2">
                      <BookOpen size={16} className="text-indigo-600 print:hidden" /> Recent Exam Marks
                    </h3>
                    <div className="space-y-2.5">
                      {marks.filter(m => m.studentId === selectedStudentReport.id).length === 0 ? (
                        <p className="text-xs text-slate-400  py-4 text-center">No academic records found for this student.</p>
                      ) : (
                        marks
                          .filter(m => m.studentId === selectedStudentReport.id)
                          .slice(0, 5)
                          .map((m, idx) => (
                            <div key={idx} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100">
                              <div>
                                <p className="text-xs font-black text-slate-800 uppercase tracking-tight">{m.subject}</p>
                                <p className="text-[10px] font-bold text-slate-400 uppercase">{m.examType}</p>
                              </div>
                              <div className="text-right">
                                <p className="text-xs font-black text-indigo-600">{m.marksObtained} / {m.maxMarks}</p>
                              </div>
                            </div>
                          ))
                      )}
                    </div>
                  </div>

                  {/* Attendance Log */}
                  <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
                    <h3 className="text-xs font-black uppercase text-slate-900 tracking-wider mb-4 flex items-center gap-2">
                      <Calendar size={16} className="text-blue-600 print:hidden" /> Monthly Attendance Summary
                    </h3>
                    <div className="space-y-2">
                      {MONTHS.map(month => {
                        const monthLogs = attendance.filter(a => {
                          const aDate = new Date(a.date);
                          return a.studentId === selectedStudentReport.id && MONTHS[aDate.getMonth()] === month;
                        });
                        
                        if (monthLogs.length === 0) return null;

                        const present = monthLogs.filter(l => l.status === 'present').length;
                        const leave = monthLogs.filter(l => l.status === 'leave').length;
                        const absent = monthLogs.filter(l => l.status === 'absent').length;

                        return (
                          <div key={month} className="flex items-center justify-between p-2.5 bg-slate-50 rounded-xl border border-slate-100">
                            <span className="text-xs font-bold text-slate-800 uppercase">{month}</span>
                            <div className="flex gap-3 text-xs">
                              <span className="font-bold text-emerald-600">P: {present}</span>
                              <span className="font-bold text-amber-600">L: {leave}</span>
                              <span className="font-bold text-rose-600">A: {absent}</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* Financial Ledger Section */}
                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
                  <h3 className="text-xs font-black uppercase text-slate-900 tracking-wider mb-4 flex items-center gap-2 border-b border-slate-100 pb-3">
                    <CreditCard size={18} className="text-emerald-600 print:hidden" /> Financial Payments & Ledger
                  </h3>
                  <div>
                    {(() => {
                      const fData = feeStudents.find(fs => String(fs.id) === String(selectedStudentReport.id));
                      if (!fData) return <p className="text-center text-slate-400  py-3 text-xs">No financial record on file.</p>;

                      return (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div>
                            <p className="text-[10px] font-black uppercase text-slate-400 tracking-wider mb-2">Paid History</p>
                            <div className="space-y-2">
                              {fData.payments.length === 0 ? (
                                <p className="text-xs text-slate-400 ">No payments recorded.</p>
                              ) : (
                                fData.payments.slice(0, 5).map((p, i) => (
                                  <div key={i} className="flex items-center justify-between p-2.5 bg-emerald-50/60 rounded-xl border border-emerald-100">
                                    <span className="text-xs font-bold text-emerald-900 uppercase">{p.month} {p.year}</span>
                                    <span className="text-xs font-black text-emerald-700">Rs. {p.amount}</span>
                                  </div>
                                ))
                              )}
                            </div>
                          </div>
                          <div>
                            <p className="text-[10px] font-black uppercase text-slate-400 tracking-wider mb-2">Other Charges</p>
                            <div className="space-y-2">
                              {fData.otherFunds.length === 0 ? (
                                <p className="text-xs text-slate-400 ">No extra charges on record.</p>
                              ) : (
                                fData.otherFunds.slice(0, 5).map((f, i) => (
                                  <div key={i} className="flex items-center justify-between p-2.5 bg-slate-50 rounded-xl border border-slate-200">
                                    <span className="text-xs font-bold text-slate-800 uppercase">{f.desc}</span>
                                    <span className="text-xs font-black text-slate-900">Rs. {f.amount}</span>
                                  </div>
                                ))
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                </div>
              </div>

              {/* Modal Footer Actions */}
              <div className="p-4 sm:p-5 bg-slate-100 border-t border-slate-200 flex justify-end gap-3 print:hidden">
                <button 
                  onClick={() => window.print()}
                  className="flex items-center gap-2 px-5 py-2.5 bg-white border border-slate-300 text-slate-700 rounded-xl text-xs font-bold uppercase tracking-wider hover:bg-slate-50 transition-all cursor-pointer"
                >
                  <Printer size={16} /> Print Report
                </button>
                <button 
                  onClick={() => setSelectedStudentReport(null)}
                  className="px-6 py-2.5 bg-slate-900 text-white rounded-xl text-xs font-bold uppercase tracking-wider hover:bg-slate-800 transition-all shadow-md cursor-pointer"
                >
                  Close
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ========== PRINCIPAL ATTENDANCE MARKING MODAL ========== */}
      <AnimatePresence>
        {showMarkAttendanceModal && (
          <div className="fixed inset-0 bg-slate-900/80 flex items-center justify-center p-4 z-[110] backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white w-full max-w-xl rounded-none shadow-2xl overflow-hidden flex flex-col max-h-[90vh] border-t-8 border-t-emerald-600"
            >
              <div className="px-8 py-6 border-b border-slate-100 flex items-center justify-between bg-slate-50">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-emerald-50 text-emerald-600">
                    <CheckCircle2 size={24} />
                  </div>
                  <div>
                    <h2 className="text-xl font-black text-slate-900 uppercase tracking-tight leading-tight">Direct Attendance Marking</h2>
                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest tracking-[0.2em]">{attendanceFilterDate}</p>
                  </div>
                </div>
                
                <div className="relative">
                  <select
                    value={attendanceMode}
                    onChange={(e) => {
                      const mode = e.target.value as 'grid' | 'list' | 'swipe';
                      setAttendanceMode(mode);
                      if (mode === 'swipe') setActiveSwipeIndex(0);
                    }}
                    className="appearance-none pl-3 pr-8 py-1.5 bg-slate-100 border border-slate-200 rounded-xl text-[9px] font-black uppercase tracking-widest text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 cursor-pointer"
                  >
                    <option value="grid">Grid View</option>
                    <option value="list">List View</option>
                    <option value="swipe">Swipe Mode</option>
                  </select>
                  <ChevronDown size={10} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                </div>

                <button 
                  onClick={() => setShowMarkAttendanceModal(false)}
                  className="p-2 rounded-full hover:bg-slate-200 text-slate-400 hover:text-slate-900 transition-all border border-slate-200"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-8 space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 block">Target Class</label>
                    <select 
                      value={markAttendanceClassId}
                      onChange={(e) => setMarkAttendanceClassId(e.target.value)}
                      className="w-full bg-white border border-slate-200 px-4 py-2.5 text-xs font-black uppercase tracking-widest text-slate-700 focus:outline-none focus:border-emerald-500"
                    >
                      <option value="">-- Choose Class --</option>
                      {classes.map(c => <option key={c.id} value={c.id}>{c.className} - {c.section}</option>)}
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 block">Recording Date</label>
                    <input 
                      type="date"
                      value={attendanceFilterDate}
                      onChange={(e) => setAttendanceFilterDate(e.target.value)}
                      className="w-full bg-white border border-slate-200 px-4 py-2.5 text-xs font-black uppercase tracking-widest text-slate-700 focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                </div>

                {!markAttendanceClassId ? (
                   <div className="py-20 text-center border-2 border-dashed border-slate-100 ">
                      <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">Select a class to load student roster</p>
                   </div>
                ) : attendanceMode === 'swipe' ? (
                  /* Swipe Mode in Principal Modal */
                  <div className="flex flex-col items-center py-4 font-sans">
                    {markAttRecords.length > 0 ? (
                      activeSwipeIndex < markAttRecords.length ? (
                        (() => {
                          const currentRecord = markAttRecords[activeSwipeIndex];
                          const currentStudent = students.find(s => s.id === currentRecord.studentId);
                          const photoUrl = getStudentPhoto(currentStudent);

                          return (
                            <div className="w-full max-w-sm space-y-5">
                              {/* Progress indicators */}
                              <div className="flex justify-between items-center text-xs text-slate-600 font-bold px-1">
                                <span>Student {activeSwipeIndex + 1} of {markAttRecords.length}</span>
                                <span className="font-mono bg-indigo-50 text-indigo-700 px-2.5 py-0.5 rounded-full text-[11px] font-bold border border-indigo-100">
                                  {Math.round((activeSwipeIndex / markAttRecords.length) * 100)}% Complete
                                </span>
                              </div>
                              
                              <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                                <div 
                                  className="bg-indigo-600 h-full transition-all duration-300 rounded-full" 
                                  style={{ width: `${((activeSwipeIndex + 1) / markAttRecords.length) * 100}%` }}
                                ></div>
                              </div>

                              {/* Swipe Card */}
                              <div className="relative h-[22rem] w-full flex items-center justify-center bg-slate-100/70 border-2 border-dashed border-slate-200 p-3 rounded-3xl overflow-hidden">
                                <AnimatePresence mode="popLayout">
                                  <motion.div
                                    key={currentRecord.studentId}
                                    drag="x"
                                    dragConstraints={{ left: -160, right: 160 }}
                                    onDragEnd={(event, info) => {
                                      if (info.offset.x > 100) {
                                        // Swipe right -> Present
                                        setMarkAttRecords(prev => prev.map(p => p.studentId === currentRecord.studentId ? {...p, status: 'present'} : p));
                                        setActiveSwipeIndex(idx => idx + 1);
                                        toast.success(`Marked ${currentStudent?.name} as Present`);
                                      } else if (info.offset.x < -100) {
                                        // Swipe left -> Absent
                                        setMarkAttRecords(prev => prev.map(p => p.studentId === currentRecord.studentId ? {...p, status: 'absent'} : p));
                                        setActiveSwipeIndex(idx => idx + 1);
                                        toast.error(`Marked ${currentStudent?.name} as Absent`);
                                      }
                                    }}
                                    whileTap={{ scale: 1.02 }}
                                    initial={{ scale: 0.92, y: 15, opacity: 0 }}
                                    animate={{ scale: 1, y: 0, opacity: 1 }}
                                    exit={{
                                      x: currentRecord.status === 'present' ? 260 : -260,
                                      opacity: 0,
                                      scale: 0.8,
                                      transition: { duration: 0.3 }
                                    }}
                                    className="absolute inset-0 m-3 bg-white shadow-xl rounded-2xl border border-slate-200 flex flex-col p-6 cursor-grab active:cursor-grabbing"
                                  >
                                    <div className="text-center flex-1 flex flex-col justify-center">
                                      <div className="w-28 h-28 mx-auto mb-6">
                                        {photoUrl ? (
                                          <img 
                                            src={photoUrl} 
                                            alt={currentStudent?.name} 
                                            className="w-full h-full rounded-2xl object-cover border-4 border-slate-50 shadow-md"
                                          />
                                        ) : (
                                          <div className="w-full h-full rounded-2xl border-4 border-slate-50 shadow-md bg-slate-100" />
                                        )}
                                      </div>
                                      <h2 className="text-xl font-black text-slate-900 uppercase tracking-tight">{currentStudent?.name}</h2>
                                      <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mt-1">Roll Number #{currentStudent?.rollNumber}</p>
                                      
                                      <div className="mt-8 flex justify-center gap-6">
                                        <div className="flex flex-col items-center gap-2">
                                          <div className="w-10 h-10 rounded-full border-2 border-rose-100 flex items-center justify-center text-rose-500">
                                            <ArrowLeft size={20} />
                                          </div>
                                          <span className="text-[9px] font-black text-rose-500 uppercase tracking-widest">Swipe Left: Absent</span>
                                        </div>
                                        <div className="flex flex-col items-center gap-2">
                                          <div className="w-10 h-10 rounded-full border-2 border-emerald-100 flex items-center justify-center text-emerald-500">
                                            <ArrowRight size={20} />
                                          </div>
                                          <span className="text-[9px] font-black text-emerald-500 uppercase tracking-widest">Swipe Right: Present</span>
                                        </div>
                                      </div>
                                    </div>
                                  </motion.div>
                                </AnimatePresence>
                              </div>
                            </div>
                          );
                        })()
                      ) : (
                        <div className="py-20 text-center animate-fade-in">
                          <div className="w-16 h-16 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4">
                            <CheckCircle2 size={32} />
                          </div>
                          <h3 className="text-lg font-black text-slate-900 uppercase ">Roster Complete</h3>
                          <p className="text-xs text-slate-500 mt-1 uppercase tracking-widest font-bold">You have reviewed all student attendance records.</p>
                          <button
                            onClick={() => setActiveSwipeIndex(0)}
                            className="mt-6 px-6 py-2 bg-slate-900 text-white text-[10px] font-black uppercase tracking-widest"
                          >
                            Restart Swipe Session
                          </button>
                        </div>
                      )
                    ) : (
                      <div className="py-20 text-center">
                         <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">No students found in this class</p>
                      </div>
                    )}
                  </div>
                ) : attendanceMode === 'list' ? (
                  /* List Mode - Compact */
                  <div className="space-y-3">
                    <div className="divide-y divide-slate-100 border border-slate-100 rounded-none">
                      {markAttRecords.map((rec, idx) => {
                        const student = students.find(s => s.id === rec.studentId);
                        return (
                          <div key={rec.studentId} className="flex items-center justify-between p-3 bg-white hover:bg-slate-50">
                            <div className="flex items-center gap-3">
                              <span className="text-[10px] font-black text-slate-400 w-6">#{idx+1}</span>
                              <p className="text-xs font-black text-slate-900 uppercase truncate max-w-[120px]">{student?.name}</p>
                            </div>
                            <div className="flex items-center gap-1">
                               {(['present', 'absent', 'late', 'leave'] as const).map(status => (
                                <button
                                  key={status}
                                  onClick={() => {
                                    setMarkAttRecords(prev => prev.map(p => p.studentId === rec.studentId ? {...p, status} : p));
                                  }}
                                  className={`px-2 py-1 text-[8px] font-black uppercase tracking-tighter ${
                                    rec.status === status 
                                      ? status === 'present' ? 'bg-emerald-600 text-white shadow-sm' :
                                        status === 'absent' ? 'bg-rose-600 text-white shadow-sm' :
                                        status === 'late' ? 'bg-amber-500 text-white shadow-sm' :
                                        'bg-indigo-600 text-white shadow-sm'
                                      : 'bg-slate-100 text-slate-400'
                                  }`}
                                >
                                  {status === 'present' ? 'P' : status === 'absent' ? 'A' : status === 'late' ? 'L' : 'LV'}
                                </button>
                              ))}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ) : (
                  /* Grid Mode (Default) */
                  <div className="space-y-3">
                    <div className="flex justify-between items-center mb-1">
                       <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-900">Student Roll Call ({markAttRecords.length})</h3>
                       <div className="flex gap-2">
                          <button 
                            onClick={() => setMarkAttRecords(prev => prev.map(p => ({...p, status: 'present'})))}
                            className="text-[9px] font-black uppercase tracking-widest text-emerald-600 hover:bg-emerald-50 px-2 py-1"
                          >
                            All Present
                          </button>
                          <button 
                            onClick={() => setMarkAttRecords(prev => prev.map(p => ({...p, status: 'absent'})))}
                            className="text-[9px] font-black uppercase tracking-widest text-rose-600 hover:bg-rose-50 px-2 py-1"
                          >
                            All Absent
                          </button>
                       </div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {markAttRecords.map((rec, idx) => {
                        const student = students.find(s => s.id === rec.studentId);
                        return (
                          <div key={rec.studentId} className="flex flex-col p-4 bg-white border border-slate-100 rounded-none hover:border-emerald-200 transition-colors">
                            <div className="flex items-center gap-3 mb-3">
                              {getStudentPhoto(student) ? (
                                <img src={getStudentPhoto(student)} alt={student?.name || 'Student'} className="w-10 h-10 rounded-xl object-cover border border-slate-100 bg-slate-50" />
                              ) : (
                                <div className="w-10 h-10 rounded-xl border border-slate-100 bg-slate-50" />
                              )}
                              <div>
                                <p className="text-[11px] font-black text-slate-900 uppercase leading-none">{student?.name}</p>
                                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-1">Roll #{student?.rollNumber}</p>
                              </div>
                            </div>
                            <div className="flex items-center justify-between gap-1 p-1 bg-slate-50 rounded-none">
                              {(['present', 'absent', 'late', 'leave'] as const).map(status => (
                                <button
                                  key={status}
                                  onClick={() => {
                                    setMarkAttRecords(prev => prev.map(p => p.studentId === rec.studentId ? {...p, status} : p));
                                  }}
                                  className={`flex-1 py-1.5 text-[9px] font-black uppercase tracking-widest transition-all ${
                                    rec.status === status 
                                      ? status === 'present' ? 'bg-emerald-600 text-white shadow-md' :
                                        status === 'absent' ? 'bg-rose-600 text-white shadow-md' :
                                        status === 'late' ? 'bg-amber-500 text-white shadow-md' :
                                        'bg-indigo-600 text-white shadow-md'
                                      : 'text-slate-400 hover:text-slate-900 hover:bg-white'
                                  }`}
                                >
                                  {status === 'present' ? 'P' : status === 'absent' ? 'A' : status === 'late' ? 'L' : 'LV'}
                                </button>
                              ))}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              <div className="px-8 py-6 bg-slate-50 border-t border-slate-100 flex items-center justify-between gap-4">
                <button
                  onClick={() => setShowMarkAttendanceModal(false)}
                  className="px-6 py-3 border border-slate-200 text-slate-600 text-[10px] font-black uppercase tracking-widest hover:bg-white transition-all rounded-none"
                >
                  Discard Changes
                </button>
                <button
                  disabled={!markAttendanceClassId}
                  onClick={handlePrincipalMarkAttendance}
                  className="px-8 py-3 bg-slate-950 text-white text-[10px] font-black uppercase tracking-[0.2em] flex items-center gap-2 hover:bg-emerald-600 disabled:opacity-50 disabled:bg-slate-400 transition-all rounded-none shadow-xl"
                >
                  <Save size={14} /> Commit Attendance Record
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ========== MOBILE RESPONSIVE BOTTOM FOOTER NAVIGATION ========== */}
      <div id="principal-mobile-footer-nav" className="md:hidden fixed bottom-0 left-0 right-0 bg-slate-900 border-t border-slate-800 text-white z-50 shadow-2xl px-1 pb-safe select-none print:hidden">
        <div className="flex justify-around items-center h-16">
          {(userSession.role === 'principal' || userSession.role === 'coordinator' || userSession.role === 'developer') && (
            <div className="flex-1 flex justify-center -translate-y-4">
              <button
                id="mobile-nav-dashboard"
                onClick={() => { handleTabChange('dashboard'); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                className={`rounded-full flex flex-col items-center justify-center p-2.5 transition-all duration-300 shadow-xl border-4 ${
                  activeTab === 'dashboard' 
                    ? 'bg-gradient-to-tr from-emerald-600 to-teal-500 border-slate-900 text-white scale-110 ring-4 ring-emerald-500/20' 
                    : 'bg-emerald-500 hover:bg-emerald-400 border-slate-900 text-white hover:scale-105'
                }`}
                style={{ minHeight: '52px', minWidth: '52px' }}
              >
                <BarChart2 size={20} className="stroke-[2.5]" />
                <span className="text-[8px] mt-0.5 font-black uppercase tracking-widest">
                  Home
                </span>
              </button>
            </div>
          )}
          
          <button
            id="mobile-nav-management"
            onClick={() => { handleTabChange('management_hub'); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
            className={`flex-1 flex flex-col items-center justify-center py-1 transition-all text-center focus:outline-none ${
              activeTab === 'management_hub' ? 'text-emerald-400 font-bold scale-105' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Shield size={16} />
            <span className="text-[8px] mt-0.5 font-semibold uppercase tracking-wider">Admin Hub</span>
          </button>

          <button
            id="mobile-nav-reports"
            onClick={() => { handleTabChange('monthly_report'); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
            className={`flex-1 flex flex-col items-center justify-center py-1 transition-all text-center focus:outline-none ${
              activeTab === 'monthly_report' ? 'text-indigo-500 font-black scale-105' : 'text-slate-400 hover:text-white'
            }`}
          >
            <FileText size={16} />
            <span className="text-[8px] mt-0.5 font-bold uppercase tracking-wider">Reports</span>
          </button>

          {/* EYE-CATCHING AND ACCESSIBLE AUDIT HUB NAV */}
          {(userSession.role === 'principal' || userSession.role === 'coordinator' || userSession.role === 'developer') && (
            <button
              id="mobile-nav-registers"
              onClick={() => { handleTabChange('registers'); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
              className={`flex-1 flex flex-col items-center justify-center py-1 transition-all text-center focus:outline-none rounded-lg mx-0.5 ${
                activeTab === 'registers' || activeTab === 'fees'
                  ? 'text-emerald-400 font-black scale-105 bg-emerald-500/10 border border-emerald-500/20' 
                  : 'text-slate-400 hover:text-emerald-400 hover:bg-emerald-500/5'
              }`}
            >
              <Database size={16} className={activeTab === 'registers' || activeTab === 'fees' ? 'text-emerald-400' : 'text-slate-400'} />
              <span className="text-[8px] mt-0.5 font-bold uppercase tracking-wider">Records</span>
            </button>
          )}

          <button
            id="mobile-nav-menu"
            onClick={() => setSidebarOpen(true)}
            className="flex-1 flex flex-col items-center justify-center py-1 transition-all text-center text-slate-400 hover:text-emerald-400"
          >
            <Menu size={16} />
            <span className="text-[8px] mt-0.5 font-bold uppercase tracking-wider">Menu</span>
          </button>
        </div>
      </div>

      {/* ========== INTERACTIVE CLASS INSIGHTS MODAL ========== */}
      {isClassDetailModalOpen && selectedClassForDetails && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-[100] backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-none w-full max-w-4xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-scale-up border-t-8 border-t-indigo-600">
            {/* Modal Header */}
            <div className="px-8 py-6 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 bg-slate-950 text-white flex flex-col items-center justify-center font-black  border-l-4 border-indigo-600">
                  <span className="text-xl">{selectedClassForDetails.className}</span>
                  <span className="text-[9px] uppercase tracking-widest bg-indigo-600 w-full text-center py-0.5">{selectedClassForDetails.section}</span>
                </div>
                <div>
                  <h2 className="text-xl font-black text-slate-900 uppercase tracking-tight">Interactive Class Insights</h2>
                  <p className="text-xs text-slate-500 font-bold uppercase tracking-widest">Timetable & Student Roster Overview</p>
                </div>
              </div>
              <button
                onClick={() => setIsClassDetailModalOpen(false)}
                className="p-2 rounded-full hover:bg-slate-200 text-slate-400 hover:text-slate-900 transition-all border border-slate-200 shadow-sm"
              >
                <X size={20} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-8 space-y-10 custom-scrollbar">
              {/* Section 0: Academic Scope / Subjects */}
              {selectedClassForDetails.subjects && selectedClassForDetails.subjects.length > 0 && (
                <div className="space-y-4">
                  <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
                    <BookOpen size={18} className="text-blue-600" />
                    <h3 className="text-sm font-black uppercase tracking-widest text-slate-900">Academic Curriculum / Subjects</h3>
                  </div>
                  <div className="flex flex-wrap gap-3">
                    {selectedClassForDetails.subjects.map(sub => (
                      <div key={sub} className="bg-slate-50 border border-slate-200 px-4 py-2 flex items-center gap-2 shadow-sm">
                        <div className="w-2 h-2 bg-indigo-500 rounded-full"></div>
                        <span className="text-xs font-black text-slate-700 uppercase ">{sub}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Section 1: Timetable */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
                  <Calendar size={18} className="text-indigo-600" />
                  <h3 className="text-sm font-black uppercase tracking-widest text-slate-900">Period Schedule (Weekly)</h3>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
                  {DAYS.map(day => (
                    <div key={day} className="space-y-2">
                      <div className="bg-slate-900 text-white text-[9px] font-black uppercase py-1.5 px-3 tracking-widest flex items-center justify-between shadow-md">
                        <span>{day}</span>
                        <button 
                          onClick={() => {
                            setIsClassDetailModalOpen(false);
                            if (selectedClassForDetails) {
                              setSelectedTimetableClass(selectedClassForDetails.id);
                              setTtClassId(selectedClassForDetails.id);
                              setTtDay(day);
                              const existingCount = timetable.filter(tt => tt.classId === selectedClassForDetails.id && tt.day === day).length;
                              setTtPeriod(`Period ${existingCount + 1}`);
                              handleTabChange('timetable');
                              openAddModal('timetable');
                            }
                          }}
                          className="bg-indigo-600 hover:bg-indigo-500 p-1 rounded transition-colors"
                          title="Add entry to this day"
                        >
                          <Plus size={8} />
                        </button>
                      </div>
                      <div className="space-y-1.5 min-h-[100px] bg-slate-50/50 p-2 border border-slate-100">
                        {timetable
                          .filter(tt => tt.classId === selectedClassForDetails.id && tt.day === day)
                          .sort((a,b) => a.period.localeCompare(b.period))
                          .map(entry => (
                            <div key={entry.id} className="p-2 bg-white border border-slate-200 shadow-xs border-l-2 border-l-indigo-500">
                              <p className="text-[8px] font-black text-indigo-600 uppercase tracking-tighter leading-none mb-1">{entry.period}</p>
                              <p className="text-[10px] font-extrabold text-slate-900 uppercase  truncate leading-none mb-0.5">{entry.subject}</p>
                              <p className="text-[8px] text-slate-400 font-bold uppercase truncate">{getTeacherName(entry.teacherId)}</p>
                            </div>
                          ))}
                        {timetable.filter(tt => tt.classId === selectedClassForDetails.id && tt.day === day).length === 0 && (
                          <div className="h-full flex items-center justify-center py-8">
                             <p className="text-[8px] text-slate-400 font-bold uppercase tracking-widest text-center ">No Lectures</p>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Section 2: Students Dropdown/List */}
              <div className="space-y-4 pt-4 border-t border-slate-100">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div className="flex items-center gap-2">
                    <Users size={18} className="text-emerald-600" />
                    <h3 className="text-sm font-black uppercase tracking-widest text-slate-900">Enrolled Student Roster</h3>
                  </div>
                  <span className="bg-emerald-50 text-emerald-700 text-[10px] font-black px-3 py-1 rounded-full uppercase border border-emerald-100">
                    {students.filter(s => s.classId === selectedClassForDetails.id).length} Active Pupils
                  </span>
                </div>

                <div className="relative group">
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Jump to Student Profile:</label>
                  <select 
                    id="class-modal-student-jump"
                    className="w-full bg-slate-50 border border-slate-200 p-3 rounded-none focus:ring-1 focus:ring-indigo-600 outline-none font-bold text-xs uppercase tracking-wider"
                    onChange={(e) => {
                      if (e.target.value) {
                         toast.info(`Reviewing profile for Student Registry #${e.target.value}...`);
                      }
                    }}
                  >
                    <option value="">Select a student from this class...</option>
                    {students
                      .filter(s => s.classId === selectedClassForDetails.id)
                      .map(s => (
                        <option key={s.id} value={s.id}>
                          Roll #{s.rollNumber} - {s.name}
                        </option>
                      ))}
                  </select>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                  {students.filter(s => s.classId === selectedClassForDetails.id).map(s => (
                    <div key={s.id} className="p-4 bg-white border border-slate-100 shadow-sm flex items-center gap-3">
                      {s.photo ? (
                        <img src={s.photo} alt={s.name} className="w-10 h-10 rounded-xl object-cover border border-slate-200 shadow-sm" />
                      ) : (
                        <div className="w-10 h-10 bg-slate-900 text-white flex items-center justify-center font-black text-xs border border-slate-800">
                          {s.name.charAt(0)}
                        </div>
                      )}
                      <div>
                        <p className="text-[10px] font-black text-slate-900 uppercase tracking-tight truncate leading-none mb-0.5">{s.name}</p>
                        <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">Roll #{s.rollNumber}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-6 bg-slate-50 border-t border-slate-100 flex justify-end">
               <button
                 onClick={() => setIsClassDetailModalOpen(false)}
                 className="px-8 py-3 bg-slate-900 hover:bg-indigo-600 text-white font-black text-xs uppercase tracking-[0.2em] transition-all shadow-lg shadow-slate-200"
               >
                 Close Insights
               </button>
            </div>
          </div>
        </div>
      )}

      {/* ========== CUSTOM PERIOD DELETION CONFIRMATION MODAL ========== */}
      {periodToDeletePending && (
        <div id="delete-period-modal" className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50 overflow-y-auto animate-fade-in animate-duration-200">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden flex flex-col p-6 border border-slate-150 animate-scale-up">
            <div className="flex items-center gap-3 text-red-600 mb-4 bg-red-50 p-3.5 rounded-xl border border-red-100">
              <AlertCircle size={24} className="shrink-0" />
              <div>
                <h3 className="text-sm font-black uppercase tracking-wider text-red-950">Confirm Slot Removal</h3>
                <p className="text-[10px] text-red-800 font-bold uppercase tracking-widest mt-0.5">Destructive action override</p>
              </div>
            </div>

            <p className="text-xs text-slate-700 leading-relaxed mb-6 font-medium">
              Are you sure you want to completely remove <strong className="text-slate-900 font-black">"{periodToDeletePending.period}"</strong> on {periodToDeletePending.day}? 
              This will automatically purge all scheduled subject mappings under this slot for Class {getClassName(selectedTimetableClass)}. This action is immediate and cannot be undone.
            </p>

            <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setPeriodToDeletePending(null)}
                className="px-4 py-2 hover:bg-slate-100 border border-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all"
              >
                No, Keep Period
              </button>
              <button
                type="button"
                onClick={() => {
                  executeDeletePeriod(periodToDeletePending.period, periodToDeletePending.day);
                }}
                className="px-5 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-md shadow-red-250"
              >
                Yes, Remove Slot
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========== GENERAL DELETION CONFIRMATION MODAL ========== */}
      {deleteConfirmModal.isOpen && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50 overflow-y-auto animate-fade-in animate-duration-200">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden flex flex-col p-6 border border-slate-150 animate-scale-up">
            <div className="flex items-center gap-3 text-red-600 mb-4 bg-red-50 p-3.5 rounded-xl border border-red-100">
              <AlertCircle size={24} className="shrink-0" />
              <div>
                <h3 className="text-sm font-black uppercase tracking-wider text-red-950">Confirm Deletion</h3>
                <p className="text-[10px] text-red-800 font-bold uppercase tracking-widest mt-0.5">Destructive action override</p>
              </div>
            </div>

            <p className="text-xs text-slate-700 leading-relaxed mb-6 font-medium">
              {deleteConfirmModal.message}
            </p>

            <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setDeleteConfirmModal({ isOpen: false, type: '', id: '', message: '' })}
                className="px-4 py-2 hover:bg-slate-100 border border-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmAction}
                className="px-5 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-md shadow-red-250"
              >
                Yes, Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {feePaymentModal.isOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-sm overflow-hidden shadow-2xl relative animate-scale-up">
            <button 
              onClick={() => setFeePaymentModal({ ...feePaymentModal, isOpen: false })} 
              className="absolute top-4 right-4 text-slate-400 hover:text-rose-500 bg-slate-100 p-2 rounded-full transition-colors"
            >
              <X size={16} />
            </button>
            <div className="p-6 space-y-6">
              <div className="text-center space-y-2">
                <div className="w-12 h-12 bg-indigo-100 flex items-center justify-center rounded-2xl mx-auto mb-4 text-indigo-600">
                  <CreditCard size={24} />
                </div>
                <h3 className="text-lg font-black text-slate-900 uppercase">Fee Payment</h3>
                <p className="text-xs font-black text-slate-400 uppercase tracking-widest">{feePaymentModal.month} 2026</p>
                <div className="flex flex-col gap-1 items-center mt-2 border-t border-slate-100 pt-3">
                   <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Previous Arrears: Rs. {feePaymentModal.previousArrears}</span>
                   <span className="text-[10px] font-bold text-indigo-600 uppercase tracking-widest">Current Fee: Rs. {feePaymentModal.pending}</span>
                </div>
              </div>

              <div className="bg-slate-900 p-4 rounded-xl flex justify-between items-center text-white border border-slate-800 shadow-xl">
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-300">Total Pending Dues</span>
                <span className="text-xl font-black text-rose-500">Rs. {feePaymentModal.pending + feePaymentModal.previousArrears}</span>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Amount to Pay (Rs.)</label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 pl-4 flex items-center text-slate-400 font-black text-sm">Rs.</span>
                    <input 
                      type="number"
                      value={feePaymentModal.amount}
                      onChange={(e) => setFeePaymentModal({ ...feePaymentModal, amount: e.target.value })}
                      className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xl font-black text-slate-900 focus:outline-none focus:border-indigo-500 focus:ring-1 transition-colors outline-none"
                    />
                  </div>
                </div>

                <button 
                  onClick={() => {
                    const amt = Number(feePaymentModal.amount);
                    if (amt !== 0) {
                      setFeeStudents(prev => addPayment(prev, feePaymentModal.studentId, feePaymentModal.month, feePaymentModal.year, amt));
                      const studentObj = students.find(s => String(s.id) === String(feePaymentModal.studentId));
                      if (studentObj) handleSendFeeNotification(studentObj, 'payment', amt, `${feePaymentModal.month} ${feePaymentModal.year}`);
                      setFeePaymentModal({ ...feePaymentModal, isOpen: false });
                      toast.success(`Payment transaction of Rs. ${amt} recorded for ${feePaymentModal.month}`);
                    } else {
                      toast.error("Enter a valid non-zero amount");
                    }
                  }}
                  className="w-full py-4 bg-indigo-600 hover:bg-slate-900 text-white font-black text-xs uppercase tracking-widest rounded-xl transition-all shadow-md active:scale-95 flex justify-center items-center gap-2"
                >
                  Confirm Payment
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========== FEE RECORD EDIT MODAL ========== */}
      {feeEditModal.isOpen && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4 z-[110] overflow-y-auto animate-fade-in animate-duration-200">
          <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl overflow-hidden flex flex-col p-8 border border-slate-200 animate-scale-up">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-sm font-black uppercase tracking-widest text-slate-900">Edit {feeEditModal.type === 'payment' ? 'Payment' : 'Other Fund'} Record</h3>
              <button 
                onClick={() => setFeeEditModal({ ...feeEditModal, isOpen: false })}
                className="p-2 hover:bg-slate-100 rounded-xl transition-all text-slate-400"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-6">
              {feeEditModal.type === 'other' && (
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Description</label>
                  <input 
                    type="text"
                    value={feeEditModal.desc}
                    onChange={(e) => setFeeEditModal({ ...feeEditModal, desc: e.target.value })}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-900 focus:outline-none focus:border-indigo-500 focus:ring-1 transition-colors outline-none"
                  />
                </div>
              )}
              
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Amount (Rs.)</label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-4 flex items-center text-slate-400 font-black text-sm">Rs.</span>
                  <input 
                    type="number"
                    value={feeEditModal.amount}
                    onChange={(e) => setFeeEditModal({ ...feeEditModal, amount: e.target.value })}
                    className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xl font-black text-slate-900 focus:outline-none focus:border-indigo-500 focus:ring-1 transition-colors outline-none"
                  />
                </div>
              </div>

              <div className="pt-4 flex flex-col gap-3">
                <button 
                  onClick={() => {
                    const amt = Number(feeEditModal.amount);
                    if (feeEditModal.type === 'payment') {
                      setFeeStudents(prev => editPayment(prev, feeEditModal.studentId, feeEditModal.recordId, amt));
                    } else {
                      setFeeStudents(prev => editOtherFund(prev, feeEditModal.studentId, feeEditModal.recordId, feeEditModal.desc, amt));
                    }
                    setFeeEditModal({ ...feeEditModal, isOpen: false });
                    toast.success("Record updated successfully!");
                  }}
                  className="w-full py-4 bg-indigo-600 hover:bg-slate-900 text-white font-black text-xs uppercase tracking-widest rounded-xl transition-all shadow-md active:scale-95 flex justify-center items-center gap-2"
                >
                  <Save size={16} /> Save Changes
                </button>
                <button 
                  onClick={() => setFeeEditModal({ ...feeEditModal, isOpen: false })}
                  className="w-full py-3 bg-slate-100 hover:bg-slate-200 text-slate-600 font-black text-xs uppercase tracking-widest rounded-xl transition-all flex justify-center items-center"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Bulk WA Modal */}
      <AnimatePresence>
        {bulkWAModal.isOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden border border-slate-200"
            >
              <div className="bg-emerald-600 p-6 text-white flex justify-between items-center">
                <div>
                  <h2 className="text-xl font-black uppercase tracking-tight flex items-center gap-3">
                    <MessageSquare size={24} /> Bulk WhatsApp Dispatch
                  </h2>
                  <p className="text-[10px] uppercase font-bold text-emerald-100 mt-1">Total Absents: {bulkWAModal.absents.length} students</p>
                </div>
                <button 
                  onClick={() => setBulkWAModal({ isOpen: false, absents: [] })}
                  className="p-2 hover:bg-white/20 rounded-full transition-colors"
                >
                  <X size={20} />
                </button>
              </div>

              {/* Class Filter Dropdown in Modal */}
              <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between gap-4">
                <div className="flex-1 relative">
                  <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                  <select 
                    value={bulkWAClassFilter}
                    onChange={(e) => setBulkWAClassFilter(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-[10px] font-black uppercase tracking-widest outline-none focus:ring-2 focus:ring-emerald-500 appearance-none"
                  >
                    <option value="all">Filter by Class (All)</option>
                    {classes.map(c => (
                      <option key={c.id} value={c.id}>{c.className} - {c.section}</option>
                    ))}
                  </select>
                </div>
              </div>
              
              <div className="p-6 max-h-[60vh] overflow-y-auto custom-scrollbar space-y-4">
                {(() => {
                  const filtered = bulkWAModal.absents.filter(st => bulkWAClassFilter === 'all' || st.classId === bulkWAClassFilter);
                  
                  if (filtered.length === 0) {
                    return <p className="text-center py-10 text-slate-400 font-bold uppercase text-xs">No students matching filter</p>;
                  }

                  return filtered.map((st, idx) => {
                    const sClass = classes.find(c => c.id === st.classId);
                    return (
                      <div key={st.id || idx} className="p-4 bg-slate-50 border border-slate-200 rounded-2xl flex items-center justify-between gap-4 shadow-sm">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 bg-slate-200 rounded-full flex items-center justify-center font-black text-slate-600 text-sm">
                            {idx + 1}
                          </div>
                          <div>
                            <h4 className="text-sm font-black text-slate-900 uppercase tracking-tight ">{st.name}</h4>
                            <p className="text-[10px] font-bold text-slate-400 uppercase">
                              {sClass ? `${sClass.className} - ${sClass.section}` : 'N/A'} | Roll: {st.rollNumber} | {st.parentPhone || 'No Phone'}
                            </p>
                          </div>
                        </div>
                        <button 
                            onClick={() => handleSendIndividualWhatsApp(st, st.attendanceDate)}
                            className="px-5 py-2.5 bg-emerald-600 hover:bg-slate-900 text-white font-black text-[10px] uppercase tracking-widest flex items-center gap-2 rounded-xl transition-all shadow-md active:scale-95"
                        >
                          <Send size={14} /> Send WA
                        </button>
                      </div>
                    );
                  });
                })()}
              </div>

              <div className="p-6 bg-slate-50 border-t border-slate-200 flex justify-between items-center">
                <div className="flex items-center gap-2">
                    <CheckCircle2 size={16} className="text-emerald-600" />
                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest uppercase">Click Send for each parent</span>
                </div>
                <button 
                  onClick={() => setBulkWAModal({ isOpen: false, absents: [] })}
                  className="px-6 py-2.5 bg-slate-200 text-slate-600 font-black text-[10px] uppercase tracking-widest hover:bg-slate-300 rounded-xl transition-all"
                >
                  Dismiss
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Quick Fee Collection Modal */}
      <AnimatePresence>
        {showQuickCollectModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-4 bg-slate-950/60 backdrop-blur-sm overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white w-full max-w-xl rounded-3xl shadow-2xl overflow-hidden border border-slate-200 my-auto max-h-[92vh] flex flex-col"
            >
              <div className="bg-emerald-600 p-4 sm:p-6 text-white flex justify-between items-center shrink-0">
                <div>
                  <h2 className="text-base sm:text-xl font-black uppercase tracking-tight flex items-center gap-2.5">
                    <CreditCard size={22} className="shrink-0" /> ⚡ Direct Fee Collection & Receipt
                  </h2>
                  <p className="text-[9px] sm:text-[10px] uppercase font-bold text-emerald-100 mt-0.5">Collect fee & issue real-time payment receipt</p>
                </div>
                <button
                  onClick={() => setShowQuickCollectModal(false)}
                  className="p-1.5 hover:bg-white/20 rounded-full transition-colors cursor-pointer shrink-0"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="p-4 sm:p-6 space-y-3.5 sm:space-y-4 overflow-y-auto flex-1">
                {/* Select Student */}
                <div>
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 block mb-1">
                    Select Student *
                  </label>
                  <select
                    value={quickCollectStudentId}
                    onChange={(e) => {
                      const stId = e.target.value;
                      setQuickCollectStudentId(stId);
                      const stObj = students.find(s => String(s.id) === String(stId));
                      if (stObj?.baseFee) setQuickCollectAmount(String(stObj.baseFee));
                    }}
                    className="w-full p-2.5 sm:p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 outline-none focus:border-emerald-600 uppercase"
                  >
                    <option value="">-- Select Student --</option>
                    {students.map(s => (
                      <option key={s.id} value={s.id}>
                        {s.name} ({getClassName(s.classId)}) - Roll #{s.rollNumber || 'N/A'}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                  {/* Fee Month */}
                  <div>
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 block mb-1">
                      Fee Month *
                    </label>
                    <select
                      value={quickCollectMonth}
                      onChange={(e) => setQuickCollectMonth(e.target.value)}
                      className="w-full p-2.5 sm:p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 outline-none focus:border-emerald-600 uppercase"
                    >
                      {['August 2026', 'July 2026', 'June 2026', 'May 2026', 'September 2026', 'October 2026', 'Annual Paper Fund', 'Admission Fee'].map(m => (
                        <option key={m} value={m}>{m}</option>
                      ))}
                    </select>
                  </div>

                  {/* Fee Amount */}
                  <div>
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 block mb-1">
                      Fee Amount (Rs.) *
                    </label>
                    <input
                      type="number"
                      value={quickCollectAmount}
                      onChange={(e) => setQuickCollectAmount(e.target.value)}
                      placeholder="Amount in PKR"
                      className="w-full p-2.5 sm:p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 outline-none focus:border-emerald-600"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                  {/* Fee Type */}
                  <div>
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 block mb-1">
                      Fee Category
                    </label>
                    <select
                      value={quickCollectFeeType}
                      onChange={(e) => setQuickCollectFeeType(e.target.value)}
                      className="w-full p-2.5 sm:p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 outline-none focus:border-emerald-600 uppercase"
                    >
                      <option value="Tuition Fee">Tuition Fee</option>
                      <option value="Admission Fee">Admission Fee</option>
                      <option value="Annual Paper Fund">Annual Paper Fund</option>
                      <option value="Exam Fee">Exam Fee</option>
                      <option value="Miscellaneous">Miscellaneous</option>
                    </select>
                  </div>

                  {/* Payment Method */}
                  <div>
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 block mb-1">
                      Payment Method
                    </label>
                    <select
                      value={quickCollectPaymentMethod}
                      onChange={(e) => setQuickCollectPaymentMethod(e.target.value)}
                      className="w-full p-2.5 sm:p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 outline-none focus:border-emerald-600 uppercase"
                    >
                      <option value="Cash">Cash</option>
                      <option value="Online Transfer">Online Bank Transfer</option>
                      <option value="JazzCash">JazzCash / EasyPaisa</option>
                      <option value="Cheque">Cheque</option>
                    </select>
                  </div>
                </div>

                {/* Remarks */}
                <div>
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 block mb-1">
                    Remarks / Receipt Notes (Optional)
                  </label>
                  <input
                    type="text"
                    value={quickCollectNotes}
                    onChange={(e) => setQuickCollectNotes(e.target.value)}
                    placeholder="e.g. Paid in full with discount or roll balance"
                    className="w-full p-2.5 sm:p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 outline-none focus:border-emerald-600"
                  />
                </div>
              </div>

              <div className="p-4 sm:p-6 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-2.5 shrink-0">
                <button
                  onClick={() => setShowQuickCollectModal(false)}
                  className="px-4 sm:px-6 py-2.5 bg-slate-200 text-slate-700 font-black text-[10px] uppercase tracking-widest rounded-xl hover:bg-slate-300 transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={handleRecordQuickFee}
                  className="px-4 sm:px-6 py-2.5 bg-emerald-600 text-white font-black text-[10px] uppercase tracking-widest hover:bg-slate-900 rounded-xl transition-all shadow-md flex items-center gap-2 cursor-pointer"
                >
                  <CheckCircle2 size={16} /> Record & Issue Receipt
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
