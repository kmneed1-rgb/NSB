import { db } from '../firebase';
import { collection, getDocs, doc, setDoc, deleteDoc } from 'firebase/firestore';
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'sonner';
import { BarChart2, CheckCircle2, ChevronDown, ChevronUp, CreditCard, Database, Download, Edit2, LogOut, Mail, Menu, MessageSquare, Moon, Percent, Phone, Plus, PlusCircle, RefreshCw, Save, Search, Shield, ShieldAlert, Sparkles, Sun, Trash2, TrendingUp, User, Users, X, ArrowUpRight, Award, Bell, BookOpen, Calendar, CalendarDays, AlertCircle, DownloadCloud, UploadCloud } from 'lucide-react';
import { getPeriodStatus, getStatusColor } from '../lib/periodUtils';
import { addNotification } from '../lib/notificationUtils';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, Cell } from 'recharts';
import { Teacher, Student, Coordinator, Class, TimetableEntry, DayOfWeek, UserSession, FeeRecord } from '../types';
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
  loadFromLocalStorage, 
  saveToLocalStorage, 
  StudentFeeData, 
  MONTHS 
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
  onLogout: () => void;
}

type TabType = 'dashboard' | 'management_hub' | 'timetable' | 'alerts' | 'settings' | 'fees';

const STANDARD_SUBJECTS_LIST = [
  'Mathematics', 'English', 'Urdu', 'Science', 'Physics', 'Chemistry', 'Biology', 
  'Computer Science', 'Islamiyat', 'Pak Studies', 'Social Studies', 'Geography', 
  'History', 'General Science', 'Art', 'Physical Education'
];

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
  onLogout
}: PrincipalDashboardProps) {
  const [activeTab, setActiveTab] = useState<TabType>('dashboard');
  const [managementSubTab, setManagementSubTab] = useState<'teachers' | 'students' | 'classes' | 'coordinators'>('teachers');
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Theme support
  const [darkTheme, setDarkTheme] = useState<boolean>(() => {
    return localStorage.getItem('acadamis_dark_theme') === 'true';
  });

  // Track global theme triggers in case theme toggles else where
  useEffect(() => {
    const syncTheme = () => {
      setDarkTheme(localStorage.getItem('acadamis_dark_theme') === 'true');
    };
    window.addEventListener('acadamis_toggle_theme', syncTheme);
    return () => window.removeEventListener('acadamis_toggle_theme', syncTheme);
  }, []);

  const handleToggleTheme = () => {
    const nextVal = !darkTheme;
    setDarkTheme(nextVal);
    localStorage.setItem('acadamis_dark_theme', String(nextVal));
    window.dispatchEvent(new Event('acadamis_toggle_theme'));
    toast.success(nextVal ? "🌙 Dark theme ho gya!" : "☀️ Light theme ho gya!");
  };

  // Search/Filter States
  const [teacherSearch, setTeacherSearch] = useState('');
  const [studentSearch, setStudentSearch] = useState('');
  const [coordinatorSearch, setCoordinatorSearch] = useState('');
  const [studentClassFilter, setStudentClassFilter] = useState('all');
  const [classSearch, setClassSearch] = useState('');

  // PRINCIPAL FEE PORTAL STATE (NEW ENGINE)
  const [feeStudents, setFeeStudents] = useState<StudentFeeData[]>([]);

  // Initialize and Sync Fee System
  useEffect(() => {
    const stored = loadFromLocalStorage();
    
    // Sync with existing students from props
    const synced = students.map(s => {
      const match = stored.find(fs => String(fs.id) === String(s.id));
      if (match) {
        return {
          ...match,
          name: s.name, // keep name/class updated from official list
          class: classes.find(c => c.id === s.classId)?.className || match.class
        };
      }
      return {
        id: s.id,
        name: s.name,
        class: classes.find(c => c.id === s.classId)?.className || 'Default',
        monthlyFee: s.baseFee || 1500,
        payments: [],
        otherFunds: []
      };
    });
    
    setFeeStudents(synced);
  }, [students, classes]);

  const [feeSearch, setFeeSearch] = useState('');
  const [feeClassFilter, setFeeClassFilter] = useState('all');
  const [selectedStudentForFee, setSelectedStudentForFee] = useState<string>('');
  const [isCashPayment, setIsCashPayment] = useState(true);
  const [selectedStudentForLedger, setSelectedStudentForLedger] = useState('');
  
  const [feePaymentModal, setFeePaymentModal] = useState<{isOpen: boolean; studentId: string; month: string; pending: number; previousArrears: number; amount: string; year: number}>({ isOpen: false, studentId: '', month: '', pending: 0, previousArrears: 0, amount: '', year: 2026 });
  
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

  // WhatsApp Alert & Autopilot States
  const [whatsAppAutoFee, setWhatsAppAutoFee] = useState(true);
  const [whatsAppAutoAbsence, setWhatsAppAutoAbsence] = useState(true);
  const [whatsAppAutoResult, setWhatsAppAutoResult] = useState(false);

  // Customizable SMS / WhatsApp Templates
  const [absentTemplate, setAbsentTemplate] = useState<string>(() => {
    return localStorage.getItem('acadamis_custom_absent_template') || 
      "ATTENTION: Your child {student_name} is marked ABSENT today ({date}). Kindly contact the school office. Principal.";
  });

  const [feeTemplate, setFeeTemplate] = useState<string>(() => {
    return localStorage.getItem('acadamis_custom_fee_template') || 
      "Greetings! 🌟\nNSB1 Principal Office Reminder:\nGuardian of {student_name} (Class: {class_name}).\nPending balance detected: Rs {total_pending} (Due for: {months}).\nKindly settle the dues today to avoid portal suspension.\nThank you.";
  });

  const [broadcastLogs, setBroadcastLogs] = useState<Array<{
    id: string;
    recipient: string;
    phone: string;
    type: string;
    text: string;
    timestamp: string;
    status: 'Sent' | 'Failed' | 'Autopilot';
  }>>([
    { id: 'tx_1', recipient: 'Naveed (Parent of Mohammad)', phone: '+923001234567', type: 'Absent Alarm 🔔', text: 'ATTENTION: Your child Mohammad is absent from class today (09-06-2026). Kindly contact the principal\'s office.', timestamp: '2026-06-09 09:10 AM', status: 'Sent' },
    { id: 'tx_2', recipient: 'Irfan (Parent of Ayesha)', phone: '+923219876543', type: 'Fee Reminder 💰', text: 'Reminder: Ayesha\'s fee (500) is outstanding. Please clear soon.', timestamp: '2026-06-09 11:20 AM', status: 'Sent' }
  ]);

  // Modals / Form editing state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalType, setModalType] = useState<'teacher' | 'student' | 'class' | 'timetable' | 'coordinator'>('teacher');
  const [modalMode, setModalMode] = useState<'add' | 'edit'>('add');
  const [currentId, setCurrentId] = useState<string | null>(null);

  // Validation state
  const [formErrors, setFormErrors] = useState<string[]>([]);

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
  const [sBaseFee, setSBaseFee] = useState('500');
  const [sPassword, setSPassword] = useState('nsb123');
  const [sUsername, setSUsername] = useState('');
  const [sIsAcademy, setSIsAcademy] = useState(false);
  const [sAcademySubjects, setSAcademySubjects] = useState('');

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
  const [extraPeriods, setExtraPeriods] = useState<Record<string, string[]>>(() => {
    try {
      const saved = localStorage.getItem('acadamis_extra_periods');
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error(e);
    }
    return {};
  });

  const [deletedPeriods, setDeletedPeriods] = useState<Record<string, string[]>>(() => {
    try {
      const saved = localStorage.getItem('acadamis_deleted_periods');
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error(e);
    }
    return {};
  });

  useEffect(() => {
    localStorage.setItem('acadamis_extra_periods', JSON.stringify(extraPeriods));
  }, [extraPeriods]);

  useEffect(() => {
    localStorage.setItem('acadamis_deleted_periods', JSON.stringify(deletedPeriods));
  }, [deletedPeriods]);

  useEffect(() => {
    let changed = false;
    const cleaned = { ...extraPeriods };

    for (const classId of Object.keys(cleaned)) {
      const activePeriodsForClass = timetable
        .filter(tt => tt.classId === classId)
        .map(tt => tt.period);
      
      const currentList = cleaned[classId] || [];
      const newList = currentList.filter(p => activePeriodsForClass.includes(p));
      
      if (newList.length !== currentList.length) {
        cleaned[classId] = newList;
        changed = true;
      }
    }

    if (changed) {
      setExtraPeriods(cleaned);
      localStorage.setItem('acadamis_extra_periods', JSON.stringify(cleaned));
    }
  }, [timetable]);

  const [periodColors, setPeriodColors] = useState<Record<string, string>>(() => {
    try {
      const saved = localStorage.getItem('acadamis_period_colors');
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error(e);
    }
    return {};
  });

  useEffect(() => {
    localStorage.setItem('acadamis_period_colors', JSON.stringify(periodColors));
  }, [periodColors]);

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
    return periodColors[key] || '#4f46e5'; // default Indigo color
  };

  const defaultPeriods = ['Period 1', 'Period 2', 'Period 3', 'Period 4', 'Period 5'];
  const allPeriods = [...defaultPeriods, ...(extraPeriods[selectedTimetableClass] || [])].filter(
    p => !(deletedPeriods[selectedTimetableClass] || []).includes(p)
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
          extraPeriods,
          deletedPeriods,
          periodColors,
          absentTemplate,
          feeTemplate
        }
      };

      const dataStr = JSON.stringify(backupData, null, 2);
      const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);
      
      const exportFileDefaultName = `acadamis_backup_${new Date().toISOString().split('T')[0]}.json`;
      
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
    setSBaseFee('500');
    setSPassword('nsb123');
    setSUsername('');
    setSIsAcademy(false);
    setSAcademySubjects('');

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
        setSBaseFee(match.baseFee?.toString() || '500');
        setSPassword(match.password || 'nsb123');
        setSUsername(match.username || '');
        setSIsAcademy(match.category === 'Academy');
        setSAcademySubjects(match.academySubjects?.join(', ') || '');
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
          username: tUsername || tName.trim(), 
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
          username: tUsername,
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
          username: tUsername || tName.trim(), 
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
          username: tUsername,
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
          baseFee: Number(sBaseFee) || 500,
          category: sIsAcademy ? 'Academy' : 'Regular',
          academySubjects: sIsAcademy ? sAcademySubjects.split(',').map(s => s.trim()).filter(s => s !== '') : []
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
          baseFee: Number(sBaseFee) || 500,
          password: sPassword,
          username: sUsername,
          category: sIsAcademy ? 'Academy' : 'Regular',
          academySubjects: sIsAcademy ? sAcademySubjects.split(',').map(s => s.trim()).filter(s => s !== '') : []
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
        setDeletedPeriods(prev => {
          const currentList = prev[ttClassId] || [];
          if (currentList.includes(ttPeriod)) {
            const updated = {
              ...prev,
              [ttClassId]: currentList.filter(p => p !== ttPeriod)
            };
            localStorage.setItem('acadamis_deleted_periods', JSON.stringify(updated));
            return updated;
          }
          return prev;
        });

        // Automatically register period in extraPeriods if it is custom
        const defaultPeriods = ['Period 1', 'Period 2', 'Period 3', 'Period 4', 'Period 5'];
        if (ttPeriod && !defaultPeriods.includes(ttPeriod)) {
          setExtraPeriods(prev => {
            const classList = prev[ttClassId] || [];
            if (!classList.includes(ttPeriod)) {
              const updated = {
                ...prev,
                [ttClassId]: [...classList, ttPeriod]
              };
              localStorage.setItem('acadamis_extra_periods', JSON.stringify(updated));
              return updated;
            }
            return prev;
          });
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
        setDeletedPeriods(prev => {
          const currentList = prev[ttClassId] || [];
          if (currentList.includes(ttPeriod)) {
            const updated = {
              ...prev,
              [ttClassId]: currentList.filter(p => p !== ttPeriod)
            };
            localStorage.setItem('acadamis_deleted_periods', JSON.stringify(updated));
            return updated;
          }
          return prev;
        });

        // Automatically register period in extraPeriods if it is custom
        const defaultPeriods = ['Period 1', 'Period 2', 'Period 3', 'Period 4', 'Period 5'];
        if (ttPeriod && !defaultPeriods.includes(ttPeriod)) {
          setExtraPeriods(prev => {
            const classList = prev[ttClassId] || [];
            if (!classList.includes(ttPeriod)) {
              const updated = {
                ...prev,
                [ttClassId]: [...classList, ttPeriod]
              };
              localStorage.setItem('acadamis_extra_periods', JSON.stringify(updated));
              return updated;
            }
            return prev;
          });
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
    const c = classes.find(item => item.id === cId);
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
      <div id="mobile-top-bar" className="md:hidden flex items-center justify-between px-4 py-3 bg-white border-b border-gray-200 shadow-sm z-20">
        <div className="flex items-center gap-2">
          <Shield className="text-blue-600" size={20} />
          <span className="font-bold text-gray-900 tracking-tight">{userSession.role === 'principal' ? 'Principal Console' : 'Coordinator Console'}</span>
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
        } font-sans`}
      >
        <div>
          {/* Brand header - Minimalist */}
          <div className="p-8 pb-10 flex flex-col items-center border-b border-slate-50 mb-6">
            <img 
              src="/src/assets/images/nsb1_logo_white_bg_1781098534962.png" 
              alt="NSB 1 ACADEMY" 
              className="h-16 w-auto object-contain mb-3"
              referrerPolicy="no-referrer"
            />
            <div className="flex items-center gap-2">
              <h1 className="text-slate-900 font-black text-xs tracking-widest uppercase">NSB1 Academy</h1>
            </div>
          </div>

          {/* Minimalist Nav */}
          <nav className="px-5 space-y-1">
            {[
              { id: 'dashboard', label: 'Overview', icon: BarChart2 },
              { id: 'management_hub', label: 'Management Hub', icon: Shield },
              { id: 'timetable', label: 'Schedules', icon: Calendar },
              { id: 'alerts', label: 'Alert Center', icon: AlertCircle, color: 'text-rose-600' },
              { id: 'fees', label: 'Cash Registry', icon: CreditCard },
              { id: 'settings', label: 'Settings', icon: Menu }
            ].map(link => {
              const Icon = link.icon;
              const isActive = activeTab === link.id;
              return (
                <button
                  key={link.id}
                  onClick={() => { setActiveTab(link.id as any); setSidebarOpen(false); }}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 text-[10px] font-bold uppercase tracking-[0.2em] transition-all text-left group ${
                    isActive 
                      ? 'text-indigo-600 bg-indigo-50/50' 
                      : 'text-slate-400 hover:text-slate-900 hover:bg-slate-50'
                  }`}
                >
                  <Icon size={14} className={isActive ? 'text-indigo-600' : 'text-slate-300 group-hover:text-slate-500'} />
                  {link.label}
                </button>
              );
            })}
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
      <main className="flex-1 min-h-screen flex flex-col p-4 md:p-8 lg:p-10 max-w-7xl mx-auto w-full font-sans text-slate-800">
        
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
          <div id="panel-principal-dashboard" className="space-y-8 animate-fade-in bg-sky-50/50 p-4 sm:p-6 -mx-4 sm:-mx-6 rounded-2xl border border-sky-100 shadow-inner">
            {/* Greeting Header */}
            <div className="bg-indigo-600 p-8 -mx-4 sm:-mx-6 -mt-4 sm:-mt-6 mb-8 shadow-lg border-b border-indigo-700/50">
              <p className="text-[10px] font-bold text-indigo-100 uppercase tracking-widest mb-1">
                {userSession.role === 'principal' ? 'Principal Console' : 
                 userSession.role === 'developer' ? 'Developer Terminal' : 
                 'Coordinator Console'}
              </p>
              <h1 className="text-3xl font-black text-white tracking-tighter font-display uppercase leading-tight">
                {userSession.role === 'developer' ? 'System Tracking Dashboard' : 'Academic Command Center'}
              </h1>
              <p className="text-xs text-indigo-100/70 mt-2 max-w-lg font-medium leading-relaxed">
                {userSession.role === 'developer' ? 
                  'Live monitoring of school infrastructure, financial registers, and academic rosters.' : 
                  'Real-time overview of state registers, student rosters, and financial accounts stored inside Acadamis.'}
              </p>
            </div>

            {/* Metrics cards bar - Elegant Minimalist */}
            {(() => {
              const totalBilled = fees.reduce((sum, f) => sum + Number(f.amount || 0), 0);
              const totalCollected = fees.filter(f => f.status === 'paid').reduce((sum, f) => sum + Number(f.amount || 0), 0);
              const totalPending = totalBilled - totalCollected;

              // Current Month Collection
              const CURRENT_MONTH = MONTHS[new Date().getMonth()];
              const currentMonthFees = fees.filter(f => f.month === CURRENT_MONTH);
              const totalCollectedCurrentMonth = currentMonthFees.filter(f => f.status === 'paid').reduce((sum, f) => sum + Number(f.amount || 0), 0);
              const totalPendingCurrentMonth = currentMonthFees.filter(f => f.status === 'unpaid').reduce((sum, f) => sum + Number(f.amount || 0), 0);

              // Calculate student counts for granular overview without revealing revenue to coordinators
              const studentIdsWithUnpaid = Array.from(new Set(
                fees.filter(f => f.status === 'unpaid' || f.status === 'pending').map(f => f.studentId)
              ));
              const studentIdsWithOnlyPaid = Array.from(new Set(
                fees.filter(f => f.status === 'paid').map(f => f.studentId)
              )).filter(sid => !studentIdsWithUnpaid.includes(sid));

              const currentMonthStudentIdsWithUnpaid = Array.from(new Set(
                currentMonthFees.filter(f => f.status === 'unpaid' || f.status === 'pending').map(f => f.studentId)
              ));
              const currentMonthStudentIdsWithPaid = Array.from(new Set(
                currentMonthFees.filter(f => f.status === 'paid').map(f => f.studentId)
              )).filter(sid => !currentMonthStudentIdsWithUnpaid.includes(sid));

              return (
                <div className="space-y-8">
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-8 md:gap-14 animate-fade-in pt-8 border-t border-slate-100">
                    
                    {[
                      { label: 'Academic Faculty', val: teachers.length, color: 'text-blue-600', bg: 'bg-blue-50/50' },
                      { label: 'Pupil Enrollment', val: students.length, color: 'text-emerald-600', bg: 'bg-emerald-50/50' },
                      { label: 'Active Facilities', val: classes.length, color: 'text-amber-600', bg: 'bg-amber-50/50' },
                      { label: 'Attendance Average', val: '94.2%', color: 'text-indigo-600', bg: 'bg-indigo-50/50' },
                      ...(userSession.role === 'principal' ? [
                        { label: 'Collected Ledger', val: `${totalCollected.toLocaleString()}`, color: 'text-violet-600', bg: 'bg-violet-50/50' },
                        { label: 'Outstanding Dues', val: `${totalPending.toLocaleString()}`, color: 'text-rose-600', bg: 'bg-rose-50/50' }
                      ] : [
                        { label: 'Paid Fee Students', val: studentIdsWithOnlyPaid.length, color: 'text-violet-600', bg: 'bg-violet-50/50' },
                        { label: 'Pending Fee Students', val: studentIdsWithUnpaid.length, color: 'text-rose-600', bg: 'bg-rose-50/50' }
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
                    {userSession.role === 'principal' ? (
                      <>
                        <div className="p-6 bg-violet-50/50 border border-violet-100">
                          <span className="text-[9px] font-black uppercase tracking-[0.3em] mb-3 text-violet-600 block">Total {CURRENT_MONTH} Collection</span>
                          <span className="text-2xl md:text-3xl font-light tracking-tighter text-slate-900 block tabular-nums">{totalCollectedCurrentMonth.toLocaleString()}</span>
                        </div>
                        <div className="p-6 bg-emerald-50/50 border border-emerald-100">
                          <span className="text-[9px] font-black uppercase tracking-[0.3em] mb-3 text-emerald-600 block">{CURRENT_MONTH} Paid</span>
                          <span className="text-2xl md:text-3xl font-light tracking-tighter text-slate-900 block tabular-nums">{totalCollectedCurrentMonth.toLocaleString()}</span>
                        </div>
                        <div className="p-6 bg-rose-50/50 border border-rose-100">
                          <span className="text-[9px] font-black uppercase tracking-[0.3em] mb-3 text-rose-600 block">{CURRENT_MONTH} Pending</span>
                          <span className="text-2xl md:text-3xl font-light tracking-tighter text-slate-900 block tabular-nums">{totalPendingCurrentMonth.toLocaleString()}</span>
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="p-6 bg-violet-50/50 border border-violet-100">
                          <span className="text-[9px] font-black uppercase tracking-[0.3em] mb-3 text-violet-600 block">Total Pupils Scheduled</span>
                          <span className="text-2xl md:text-3xl font-light tracking-tighter text-slate-900 block tabular-nums">{students.length} Students</span>
                        </div>
                        <div className="p-6 bg-emerald-50/50 border border-emerald-100">
                          <span className="text-[9px] font-black uppercase tracking-[0.3em] mb-3 text-emerald-600 block">{CURRENT_MONTH} Paid Students</span>
                          <span className="text-2xl md:text-3xl font-light tracking-tighter text-slate-900 block tabular-nums">{currentMonthStudentIdsWithPaid.length} Students</span>
                        </div>
                        <div className="p-6 bg-rose-50/50 border border-rose-100">
                          <span className="text-[9px] font-black uppercase tracking-[0.3em] mb-3 text-rose-600 block">{CURRENT_MONTH} Pending Students</span>
                          <span className="text-2xl md:text-3xl font-light tracking-tighter text-slate-900 block tabular-nums">{currentMonthStudentIdsWithUnpaid.length} Students</span>
                        </div>
                      </>
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
              <p className="text-xs text-gray-500 mb-6">Create new roster files and schedule objects instantly dynamically inserted into the shared system context.</p>

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
                      <h1 className="text-2xl font-black text-slate-900 tracking-tighter uppercase italic">Faculty Register</h1>
                      <p className="text-xs text-slate-500 mt-0.5">Manage identities, credentials, and access keys for teaching staff.</p>
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
                              <div className="w-12 h-12 bg-slate-900 text-white flex items-center justify-center font-black italic text-lg border border-slate-700">
                                {t.name.charAt(0)}
                              </div>
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
                                  <span className="text-[8px] font-black text-slate-400 uppercase block mb-1">Teacher ID</span>
                                  <span className="font-mono text-xs font-bold text-slate-900">{t.id}</span>
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
                      <h1 className="text-2xl font-black text-slate-900 tracking-tighter uppercase italic">Pupil Registry</h1>
                      <p className="text-xs text-slate-500 mt-0.5">Manage enrollment and personal profiles of all school pupils.</p>
                    </div>
                    <button
                      onClick={() => openAddModal('student')}
                      className="flex items-center justify-center gap-2 py-2.5 px-6 bg-emerald-600 hover:bg-slate-900 text-white font-black text-[10px] uppercase tracking-widest transition-all shadow-lg"
                    >
                      <Plus size={14} />
                      Enroll Student
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
                              <div className="w-10 h-10 bg-emerald-950 text-white flex items-center justify-center font-black italic border border-emerald-700 text-xs shadow-sm">
                                #{s.rollNumber}
                              </div>
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
                                  <span className="text-[8px] font-black text-slate-400 uppercase block mb-1">Financial State</span>
                                  <p className="text-[10px] font-bold text-indigo-600 flex items-center gap-2">
                                    <CreditCard size={10} /> Base: {s.baseFee}
                                  </p>
                                </div>
                              </div>

                              {s.category === 'Academy' && s.academySubjects && s.academySubjects.length > 0 && (
                                <div className="p-3 bg-indigo-50/50 border border-indigo-100 shadow-xs">
                                  <span className="text-[8px] font-black text-indigo-400 uppercase block mb-1.5">Academy Subjects Focus</span>
                                  <div className="flex flex-wrap gap-1.5">
                                    {s.academySubjects.map((sub, idx) => (
                                      <span key={idx} className="bg-white border border-indigo-200 text-indigo-700 text-[9px] font-bold px-2 py-0.5 uppercase italic">
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
                                  onClick={() => { setFeeSearch(s.name); setActiveTab('fees'); window.scrollTo({top:0, behavior:'smooth'}); }}
                                  className="px-4 py-2 bg-emerald-600 text-white font-black text-[9px] uppercase tracking-widest hover:bg-slate-900 transition-all shadow-md italic"
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
                      <h1 className="text-2xl font-black text-slate-900 tracking-tighter uppercase italic">Classroom Directory</h1>
                      <p className="text-xs text-slate-500 mt-0.5">Register academic grade rooms and assign class teachers.</p>
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
                              <span className="text-lg font-black italic">{c.className}</span>
                              <span className="text-[8px] font-bold uppercase tracking-widest bg-indigo-600 w-full text-center py-0.5">{c.section}</span>
                            </div>
                            <div className="flex-1 min-w-0">
                              <h4 className="text-[9px] font-black uppercase text-slate-400 tracking-widest mb-1 leading-none">Class Mentor</h4>
                              <p className="text-sm font-black text-slate-900 uppercase italic mb-2 truncate">{classTeacher?.name || 'Vacant Slot'}</p>
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
                              <Trash2 size={12} /> Void
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
                      <h1 className="text-2xl font-black text-slate-900 tracking-tighter uppercase italic">Coordinator Directory</h1>
                      <p className="text-xs text-slate-500 mt-0.5">Manage administrative roles, passwords, email log-ins, and IDs.</p>
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
                              <div className="w-12 h-12 bg-indigo-600 text-white flex items-center justify-center font-black italic text-lg border border-indigo-700">
                                {c.name.charAt(0)}
                              </div>
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
                                  <span className="text-[8px] font-black text-slate-400 uppercase block mb-1">Coordinator ID</span>
                                  <span className="font-mono text-xs font-bold text-slate-900">{c.id}</span>
                                </div>
                                <div className="p-3 bg-white border border-slate-200 shadow-xs">
                                  <span className="text-[8px] font-black text-slate-400 uppercase block mb-1">Access Password</span>
                                  <span className="font-mono text-xs font-bold text-emerald-600 bg-emerald-50 px-1">{c.password || 'nsb123'}</span>
                                </div>
                                <div className="p-3 bg-white border border-slate-200 col-span-2 shadow-xs">
                                  <span className="text-[8px] font-black text-slate-400 uppercase block mb-1">Email / Username</span>
                                  <div className="space-y-1.5">
                                    <p className="text-[10px] font-bold text-slate-700 flex items-center gap-2">
                                      <Mail size={12} className="text-slate-400" /> {c.email}
                                    </p>
                                    {c.username && (
                                      <p className="text-[10px] font-bold text-slate-700 flex items-center gap-2">
                                        <User size={12} className="text-slate-400" /> Username: {c.username}
                                      </p>
                                    )}
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
                <p className="text-xs text-gray-500 mt-0.5">Control daily subjects, periods, hours, and class instruction blocks.</p>
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
                                   <p className="font-extrabold text-[8px] sm:text-xs uppercase tracking-tight italic text-slate-900 truncate" style={{ color: col }} title={entry.subject}>{entry.subject}</p>
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
                                   className="w-full text-slate-400 hover:text-slate-600 font-bold text-[7px] sm:text-[10px] uppercase italic text-left pt-0.5 sm:pt-1 truncate"
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

        {activeTab === 'alerts' && (
          <div id="notification-center" className="space-y-6 animate-fade-in font-sans pb-20">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-gray-100 pb-6 mb-8">
              <div>
                <h1 className="text-xl font-black text-slate-900 uppercase tracking-tight italic">Notification Hub</h1>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">Manage and Dispatch Pendency Alerts</p>
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
                  
                  const waMessage = feeTemplate
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
                        <div className="w-10 h-10 bg-slate-900 text-white flex items-center justify-center font-black text-xs uppercase italic">
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
                        <div className="hidden lg:block text-[9px] text-slate-400 italic max-w-[200px] truncate overflow-hidden bg-slate-50 px-2 py-1 rounded">
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

        {/* ========== NEW SCHOOL FEE MANAGEMENT MODULE ========== */}
        {activeTab === 'fees' && (
          <div id="panel-principal-fees" className="space-y-6 animate-fade-in font-sans pb-20 bg-emerald-50/50 p-4 sm:p-6 -mx-4 sm:-mx-6 rounded-2xl border border-emerald-100 shadow-inner">
            {/* 1. Global Dashboard Stats Row */}
            {(() => {
              const stats = getGlobalStats(feeStudents);
              return (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total Students</p>
                    <p className="text-xl font-black text-slate-900">{stats.totalStudents}</p>
                  </div>
                  <div className="bg-emerald-50 p-4 rounded-2xl border border-emerald-100 shadow-sm">
                    <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">Total Collected</p>
                    <p className="text-xl font-black text-emerald-700">Rs. {stats.totalCollected.toLocaleString()}</p>
                  </div>
                  <div className="bg-rose-50 p-4 rounded-2xl border border-rose-100 shadow-sm">
                    <p className="text-[10px] font-black text-rose-600 uppercase tracking-widest">Total Pending</p>
                    <p className="text-xl font-black text-rose-700">Rs. {stats.totalPending.toLocaleString()}</p>
                  </div>
                  <div className="bg-amber-50 p-4 rounded-2xl border border-amber-100 shadow-sm">
                    <p className="text-[10px] font-black text-amber-600 uppercase tracking-widest">Other Funds</p>
                    <p className="text-xl font-black text-amber-700">Rs. {stats.totalOther.toLocaleString()}</p>
                  </div>
                </div>
              );
            })()}

            {/* 2. Main Interface Header & Student Matcher */}
            <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
              <div className="flex-1">
                <h1 className="text-xl font-black text-slate-900 uppercase tracking-tight flex items-center gap-2">
                  <CreditCard size={24} className="text-indigo-600" />
                  School Fee Ledger (2026)
                </h1>
                <div className="mt-4 flex flex-col sm:flex-row gap-3">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                    <input 
                      type="text" 
                      placeholder="Search student by name or ID..." 
                      className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold focus:ring-2 focus:ring-indigo-500 outline-none"
                      value={feeSearch}
                      onChange={(e) => setFeeSearch(e.target.value)}
                    />
                  </div>
                  <select
                    className="px-4 py-2.5 bg-slate-50 border border-slate-200 text-slate-700 font-bold text-xs rounded-xl outline-none focus:ring-2 focus:ring-indigo-500"
                    value={feeClassFilter}
                    onChange={(e) => setFeeClassFilter(e.target.value)}
                  >
                    <option value="all">All Classes</option>
                    {Array.from(new Set(feeStudents.map(s => s.class))).map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                  <select
                    className="px-4 py-2.5 bg-indigo-600 text-white font-black text-xs uppercase tracking-widest rounded-xl cursor-pointer hover:bg-indigo-700 transition-colors"
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
              if (!student) {
                return (
                  <div className="p-20 text-center bg-slate-50 border border-dashed border-slate-300 rounded-3xl">
                    <Users size={48} className="mx-auto text-slate-300 mb-4" />
                    <p className="text-slate-500 font-bold uppercase tracking-widest text-sm italic">
                      Please select a student to manage their fee account
                    </p>
                  </div>
                );
              }

              const account = getStudentFullAccount(student, 2026);

              return (
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                  
                  {/* Left Column: Recording & Quick Actions */}
                  <div className="lg:col-span-4 space-y-6">
                    {/* Add Other Funds Form */}
                    <div className="bg-slate-900 p-6 rounded-3xl border border-slate-800 shadow-xl space-y-4 text-white">
                      <h3 className="text-xs font-black uppercase text-amber-500 tracking-widest flex items-center gap-2">
                        <ArrowUpRight size={16} /> Other Funds / Fines
                      </h3>
                      <div className="space-y-1">
                        <label className="text-[10px] font-black text-slate-500 uppercase">Description</label>
                        <input id="otherDesc" type="text" placeholder="e.g. Exam Fund, Fine..." className="w-full p-2.5 bg-slate-800 border border-slate-700 rounded-lg text-xs font-bold text-white outline-none" />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-black text-slate-500 uppercase">Amount (Rs.)</label>
                        <input id="otherAmt" type="number" className="w-full p-2.5 bg-slate-800 border border-slate-700 rounded-lg text-sm font-black text-white outline-none" placeholder="0" />
                      </div>
                      <button 
                        onClick={() => {
                          const desc = (document.getElementById('otherDesc') as HTMLInputElement).value;
                          const amt = Number((document.getElementById('otherAmt') as HTMLInputElement).value);
                          if (!desc || amt <= 0) { toast.error("Enter valid details"); return; }
                          
                          setFeeStudents(prev => addOtherFund(prev, student.id, desc, amt));
                          (document.getElementById('otherDesc') as HTMLInputElement).value = '';
                          (document.getElementById('otherAmt') as HTMLInputElement).value = '';
                          toast.success("Other fund entry added!");
                        }}
                        className="w-full py-3 bg-white text-slate-900 hover:bg-amber-400 font-black text-xs uppercase tracking-widest rounded-xl transition-all shadow-md active:scale-95"
                      >
                        Add Entry
                      </button>
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
                      <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-2 sm:gap-4 p-2 sm:p-4 bg-slate-50/50">
                        {account.yearlyBreakdown.map(m => (
                          <div 
                            key={m.month} 
                            onClick={() => {
                              if (m.isFutureMonth) {
                                toast.info(`Fee for ${m.month} is not yet due.`);
                                return;
                              }
                              
                              const allPending = account.yearlyBreakdown.reduce((sum, curr) => sum + curr.pending, 0);
                              const previousArrears = allPending - m.pending;

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
                          {account.otherFunds.length > 0 ? account.otherFunds.map((f, i) => (
                            <div key={i} className="p-3 bg-slate-50 rounded-xl flex justify-between items-center border border-slate-100">
                              <div>
                                <p className="text-xs font-black text-slate-800 capitalize">{f.desc}</p>
                                <p className="text-[9px] text-slate-400 font-bold">{f.date}</p>
                              </div>
                              <span className="text-xs font-black text-slate-900">Rs. {f.amount}</span>
                            </div>
                          )) : (
                            <div className="h-full flex items-center justify-center text-[10px] text-slate-300 font-bold italic uppercase">No extra entries found</div>
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
            <div className="bg-white rounded-none p-8 border border-slate-200 shadow-sm border-t-4 border-t-emerald-600 mt-8 mb-8">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-emerald-50 rounded-none border border-emerald-100">
                  <Database size={24} className="text-emerald-600" />
                </div>
                <div>
                  <h3 className="text-xl font-bold font-sans text-slate-800">Cloud Data Synchronization</h3>
                  <p className="text-sm text-slate-500">Manually push or pull all academic records to/from Firebase</p>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-4">
                <button
                  type="button"
                  onClick={async () => {
                    const confirm = window.confirm("Are you sure you want to download all data from Firebase? This will overwrite your local unsaved data.");
                    if(!confirm) return;
                    
                    toast.info("Downloading data from Cloud...");
                    try {
                      const collections = ['teachers', 'classes', 'students', 'timetable', 'attendance', 'marks', 'fees', 'coordinators'];
                      for (const col of collections) {
                        const snapshot = await getDocs(collection(db, col));
                        const items = [];
                        snapshot.forEach(docSnap => items.push(docSnap.data()));
                        localStorage.setItem('acadamis_' + col, JSON.stringify(items));
                      }
                      toast.success("Successfully downloaded all data from cloud!");
                      setTimeout(() => window.location.reload(), 1500);
                    } catch (error: any) {
                      toast.error("Error downloading data: " + error.message);
                    }
                  }}
                  className="bg-sky-600 hover:bg-sky-700 text-white px-6 py-3 rounded-lg font-bold shadow-md flex-1 text-center flex items-center justify-center gap-2"
                >
                  <DownloadCloud size={18} />
                  Download from Firebase
                </button>

                <button
                  type="button"
                  onClick={async () => {
                    const confirm = window.confirm("Are you sure you want to upload all local data to Firebase? This will overwrite current Cloud data.");
                    if(!confirm) return;

                    toast.info("Uploading data to Cloud...");
                    try {
                      const collections = ['teachers', 'classes', 'students', 'timetable', 'attendance', 'marks', 'fees', 'coordinators'];
                      for (const col of collections) {
                        const localData = localStorage.getItem('acadamis_' + col);
                        if (localData) {
                          const items = JSON.parse(localData);
                          for (const item of items) {
                            if(item.id) {
                              await setDoc(doc(db, col, item.id), item);
                            }
                          }
                        }
                      }
                      toast.success("Successfully uploaded all local data to cloud!");
                    } catch (error: any) {
                      toast.error("Error uploading data: " + error.message);
                    }
                  }}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-3 rounded-lg font-bold shadow-md flex-1 text-center flex items-center justify-center gap-2"
                >
                  <UploadCloud size={18} />
                  Upload to Firebase
                </button>

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
                      const collections = ['teachers', 'classes', 'students', 'timetable', 'attendance', 'marks', 'fees', 'coordinators'];
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
                  className="bg-rose-600 hover:bg-rose-700 text-white px-6 py-3 rounded-lg font-bold shadow-md flex-1 text-center flex items-center justify-center gap-2"
                >
                  <Trash2 size={18} />
                  Clear Cloud Data
                </button>
              </div>
            </div>

            {/* Coordinator/Principal Profile Settings (Change Password) */}
            <div className="bg-white rounded-none p-8 border border-slate-200 shadow-sm border-t-4 border-t-indigo-600">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-indigo-50 rounded-none border border-indigo-100">
                  <Sparkles size={24} className="text-indigo-600" />
                </div>
                <div>
                  <h2 className="text-xl font-black text-slate-900 uppercase tracking-tight">Security & Profile Credentials</h2>
                  <p className="text-xs text-slate-500">Update your administrative login identity and master password below.</p>
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
                    // Principal just changes in session or we might have a principal record
                    // For now, let's assume we update the session and maybe a local setting
                    toast.warning("Central Principal override updated in local session context.");
                  }
                }}
                className="max-w-md space-y-6"
              >
                <div className="space-y-4">
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Administrative Login ID</label>
                    <input 
                      name="username"
                      type="text" 
                      defaultValue={userSession.username || ''}
                      className="w-full bg-slate-50 border border-slate-200 p-3 rounded-none focus:ring-1 focus:ring-indigo-500 outline-none font-mono text-sm"
                      placeholder="Enter new admin ID"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">New Master Password</label>
                    <input 
                      name="password"
                      type="password" 
                      className="w-full bg-slate-50 border border-slate-200 p-3 rounded-none focus:ring-1 focus:ring-indigo-500 outline-none font-mono text-sm"
                      placeholder="Enter new password"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Confirm Master Password</label>
                    <input 
                      name="confirm_password"
                      type="password" 
                      className="w-full bg-slate-50 border border-slate-200 p-3 rounded-none focus:ring-1 focus:ring-indigo-500 outline-none font-mono text-sm"
                      placeholder="Confirm new password"
                      required
                    />
                  </div>
                </div>

                <button 
                  type="submit"
                  className="px-8 py-4 bg-indigo-600 hover:bg-indigo-700 text-white font-black uppercase tracking-widest text-xs transition-all shadow-lg flex items-center gap-2"
                >
                  <Save size={16} />
                  Update My Credentials
                </button>
              </form>
            </div>
            <div className="bg-white p-8 border border-slate-200 shadow-sm border-t-4 border-t-slate-900">
              <div className="flex items-center gap-4 mb-8 border-b pb-4">
                <div className="p-3 bg-slate-100 rounded-none border border-slate-200">
                  <Menu size={24} className="text-slate-900" />
                </div>
                <div>
                  <h1 className="text-2xl font-black text-slate-900 tracking-tight uppercase">System Management & Settings</h1>
                  <p className="text-xs text-slate-500 font-bold uppercase tracking-widest mt-1">Global Configuration Parameters</p>
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
                    <p className="text-xs text-slate-500 leading-relaxed">
                      Define how the school collects fees from parents. These instructions will be visible on student vouchers.
                    </p>
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
                    <p className="text-xs text-slate-500">Enable or disable automated WhatsApp notifications for fee dues, absences, and result announcements.</p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-slate-50 p-5 border border-slate-200 space-y-4">
                      <div className="flex items-center justify-between p-3 bg-white border border-slate-200">
                        <div className="space-y-0.5">
                          <p className="text-[10px] font-black uppercase text-slate-800">Fee Auto-Reminders</p>
                          <p className="text-[9px] text-slate-400">Auto-send WhatsApp on invoice generation.</p>
                        </div>
                        <button 
                          onClick={() => setWhatsAppAutoFee(!whatsAppAutoFee)}
                          className={`w-10 h-5 rounded-full flex items-center px-1 transition-colors ${whatsAppAutoFee ? 'bg-emerald-500' : 'bg-slate-300'}`}
                        >
                          <div className={`w-3 h-3 bg-white rounded-full transition-transform ${whatsAppAutoFee ? 'ml-auto' : 'mr-auto'}`}></div>
                        </button>
                      </div>

                      <div className="flex items-center justify-between p-3 bg-white border border-slate-200">
                        <div className="space-y-0.5">
                          <p className="text-[10px] font-black uppercase text-slate-800">Absence Alerts</p>
                          <p className="text-[9px] text-slate-400">Auto-ping parents when student is marked absent.</p>
                        </div>
                        <button 
                          onClick={() => setWhatsAppAutoAbsence(!whatsAppAutoAbsence)}
                          className={`w-10 h-5 rounded-full flex items-center px-1 transition-colors ${whatsAppAutoAbsence ? 'bg-emerald-500' : 'bg-slate-300'}`}
                        >
                          <div className={`w-3 h-3 bg-white rounded-full transition-transform ${whatsAppAutoAbsence ? 'ml-auto' : 'mr-auto'}`}></div>
                        </button>
                      </div>

                      <div className="flex items-center justify-between p-3 bg-white border border-slate-200">
                        <div className="space-y-0.5">
                          <p className="text-[10px] font-black uppercase text-slate-800">Results Broadcasting</p>
                          <p className="text-[9px] text-slate-400">Send report cards via WhatsApp automatically.</p>
                        </div>
                        <button 
                          onClick={() => setWhatsAppAutoResult(!whatsAppAutoResult)}
                          className={`w-10 h-5 rounded-full flex items-center px-1 transition-colors ${whatsAppAutoResult ? 'bg-emerald-500' : 'bg-slate-300'}`}
                        >
                          <div className={`w-3 h-3 bg-white rounded-full transition-transform ${whatsAppAutoResult ? 'ml-auto' : 'mr-auto'}`}></div>
                        </button>
                      </div>
                    </div>

                    <div className="bg-slate-900 text-white p-5 space-y-4 shadow-xl">
                      <h4 className="text-[10px] font-black uppercase tracking-widest text-emerald-400">Bulk Execution Logs</h4>
                      <div className="space-y-2 h-40 overflow-y-auto pr-2 custom-scrollbar">
                        {broadcastLogs.length === 0 ? (
                          <p className="text-[9px] text-slate-500 italic">No recent autopilot activity.</p>
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
                      value={absentTemplate}
                      onChange={(e) => {
                        const val = e.target.value;
                        setAbsentTemplate(val);
                        localStorage.setItem('acadamis_custom_absent_template', val);
                      }}
                      placeholder="Insert your custom absent template copy..."
                      className="w-full bg-slate-50 text-xs border border-slate-200 p-3 italic font-medium focus:outline-none focus:border-indigo-600 focus:bg-white"
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
                      <p className="text-slate-700 font-medium italic mt-1 bg-slate-100 p-2 border leading-normal">
                        "{absentTemplate
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
                              setFeeTemplate(newTpl);
                              localStorage.setItem('acadamis_custom_fee_template', newTpl);
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
                      value={feeTemplate}
                      onChange={(e) => {
                        const val = e.target.value;
                        setFeeTemplate(val);
                        localStorage.setItem('acadamis_custom_fee_template', val);
                      }}
                      placeholder="Insert your custom outstanding fee template copy..."
                      className="w-full bg-slate-50 text-xs border border-slate-200 p-3 italic font-medium focus:outline-none focus:border-emerald-600 focus:bg-white"
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
                      <p className="text-slate-700 font-medium italic mt-1 bg-slate-100 p-2 border leading-normal whitespace-pre-wrap">
                        "{feeTemplate
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
                        localStorage.setItem('acadamis_custom_absent_template', absentTemplate);
                        localStorage.setItem('acadamis_custom_fee_template', feeTemplate);
                        toast.success("All customizable message templates saved successfully!");
                      }}
                      className="bg-slate-900 hover:bg-slate-850 text-white font-black text-[10px] uppercase tracking-widest py-2 px-6 shadow-md transition-all active:scale-95"
                    >
                      Save Templates
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
                    <div className="space-y-1">
                      <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider">Username</label>
                      <input
                        type="text"
                        required
                        value={tUsername}
                        onChange={(e) => setTUsername(e.target.value)}
                        placeholder="Login ID / Username"
                        className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-500"
                        
                      />
                      
                    </div>

                    <div className="space-y-1">
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
                    <div className="space-y-1">
                      <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider">Username</label>
                      <input
                        type="text"
                        required
                        value={tUsername}
                        onChange={(e) => setTUsername(e.target.value)}
                        placeholder="Login ID / Username"
                        className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-500"
                        
                      />
                      
                    </div>

                    <div className="space-y-1">
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
                <div className="space-y-4">
                  <div className="space-y-1">
                    <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider">Student Name</label>
                    <input
                      type="text"
                      required
                      value={sName}
                      onChange={(e) => setSName(e.target.value)}
                      placeholder="e.g. Billy Davidson"
                      className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-500"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider">Username</label>
                      <input
                        type="text"
                        required
                        value={sUsername}
                        onChange={(e) => setSUsername(e.target.value)}
                        placeholder="Login ID / Username"
                        className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-500"
                        
                      />
                      
                    </div>

                    <div className="space-y-1">
                      <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider">Password</label>
                      <input
                        type="text"
                        required
                        value={sPassword}
                        onChange={(e) => setSPassword(e.target.value)}
                        placeholder="nsb123"
                        className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-500"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider">Student Email (Optional)</label>
                    <input
                      type="email"
                      value={sEmail}
                      onChange={(e) => setSEmail(e.target.value)}
                      placeholder="e.g. billy.d@school.com"
                      className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-500"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider">Class Assigned</label>
                      <select
                        value={sClassId}
                        onChange={(e) => setSClassId(e.target.value)}
                        className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-500"
                      >
                        <option value="">Choose Class</option>
                        {classes.map(cl => (
                          <option key={cl.id} value={cl.id}>{cl.className} ({cl.section})</option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-1">
                      <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider">Roll Number</label>
                      <input
                        type="text"
                        required
                        value={sRoll}
                        onChange={(e) => setSRoll(e.target.value)}
                        placeholder="e.g. 104"
                        className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-500"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider">Student Contact (Mobile)</label>
                      <input
                        type="text"
                        value={sStudentPhone}
                        onChange={(e) => setSStudentPhone(e.target.value)}
                        placeholder="e.g. +1-555-0000"
                        className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-500"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider">Parent Phone Contact</label>
                      <input
                        type="text"
                        required
                        value={sParentPhone}
                        onChange={(e) => setSParentPhone(e.target.value)}
                        placeholder="e.g. +1-555-4321"
                        className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-500"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider">Monthly Fee</label>
                    <input
                      type="number"
                      required
                      value={sBaseFee}
                      onChange={(e) => setSBaseFee(e.target.value)}
                      placeholder="e.g. 500"
                      className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-500"
                    />
                  </div>

                  {/* Academy Student Toggle & Subject Management */}
                  <div className="p-4 bg-slate-50 border border-slate-200 space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <label className="block text-xs font-black text-slate-800 uppercase tracking-tight">Academy Enrollment</label>
                        <p className="text-[10px] text-slate-500">Enable if student is part of the specialized tutorial academy.</p>
                      </div>
                      <button 
                        type="button" 
                        onClick={() => setSIsAcademy(!sIsAcademy)}
                        className={`w-12 h-6 rounded-full flex items-center px-1 transition-colors ${sIsAcademy ? 'bg-indigo-600' : 'bg-slate-300'}`}
                      >
                        <div className={`w-4 h-4 bg-white rounded-full transition-transform ${sIsAcademy ? 'translate-x-6' : 'translate-x-0'}`}></div>
                      </button>
                    </div>

                    {sIsAcademy && (
                      <div className="space-y-2 animate-in fade-in slide-in-from-top-2 duration-300">
                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Academy Subjects</label>
                        <input
                          type="text"
                          value={sAcademySubjects}
                          onChange={(e) => setSAcademySubjects(e.target.value)}
                          placeholder="e.g. Mathematics, Physics, Chemistry"
                          className="w-full px-3 py-2 bg-white border border-slate-200 rounded-md text-sm focus:outline-none focus:border-indigo-500"
                        />
                        <p className="text-[9px] text-slate-400 italic">Separate multiple subjects with commas.</p>
                      </div>
                    )}
                  </div>
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
                        <p className="text-[10px] text-slate-400 italic">No subjects added yet. Pick from the dropdown above.</p>
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
                            {['Period 1', 'Period 2', 'Period 3', 'Period 4', 'Period 5', ...(extraPeriods[ttClassId || selectedTimetableClass] || [])].map(p => (
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

      {/* ========== MOBILE RESPONSIVE BOTTOM FOOTER NAVIGATION ========== */}
      <div id="principal-mobile-footer-nav" className="md:hidden fixed bottom-0 left-0 right-0 bg-slate-900 border-t border-slate-800 text-white z-50 shadow-2xl px-1 pb-safe select-none">
        <div className="flex justify-around items-center h-14">
          {userSession.role === 'principal' && (
            <button
              id="mobile-nav-dashboard"
              onClick={() => { setActiveTab('dashboard'); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
              className={`flex-1 flex flex-col items-center justify-center py-1 transition-all text-center focus:outline-none ${
                activeTab === 'dashboard' ? 'text-blue-400 font-bold scale-105' : 'text-slate-400 hover:text-white'
              }`}
            >
              <BarChart2 size={16} />
              <span className="text-[8px] mt-0.5 font-semibold uppercase tracking-wider">Desk</span>
            </button>
          )}
          
          <button
            id="mobile-nav-management"
            onClick={() => { setActiveTab('management_hub'); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
            className={`flex-1 flex flex-col items-center justify-center py-1 transition-all text-center focus:outline-none ${
              activeTab === 'management_hub' ? 'text-blue-400 font-bold scale-105' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Shield size={16} />
            <span className="text-[8px] mt-0.5 font-semibold uppercase tracking-wider">Management</span>
          </button>

          {/* EYE-CATCHING AND ACCESSIBLE FEE REGISTRAR NAV */}
          {(userSession.role === 'principal' || userSession.role === 'coordinator') && (
            <>
              <button
                id="mobile-nav-fees"
                onClick={() => { setActiveTab('fees'); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                className={`flex-1 flex flex-col items-center justify-center py-1 transition-all text-center focus:outline-none rounded-lg mx-0.5 ${
                  activeTab === 'fees' 
                    ? 'text-blue-400 font-black scale-105 bg-blue-500/10 border border-blue-500/20' 
                    : 'text-slate-400 hover:text-blue-400 hover:bg-blue-500/5'
                }`}
              >
                <CreditCard size={16} className={activeTab === 'fees' ? 'text-blue-400' : 'text-slate-400'} />
                <span className="text-[8px] mt-0.5 font-bold uppercase tracking-wider">Fees</span>
              </button>

              <button
                id="mobile-nav-menu"
                onClick={() => setSidebarOpen(true)}
                className="flex-1 flex flex-col items-center justify-center py-1 transition-all text-center text-slate-400 hover:text-blue-400"
              >
                <Menu size={16} />
                <span className="text-[8px] mt-0.5 font-bold uppercase tracking-wider">Menu</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* ========== INTERACTIVE CLASS INSIGHTS MODAL ========== */}
      {isClassDetailModalOpen && selectedClassForDetails && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-[100] backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-none w-full max-w-4xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-scale-up border-t-8 border-t-indigo-600">
            {/* Modal Header */}
            <div className="px-8 py-6 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 bg-slate-950 text-white flex flex-col items-center justify-center font-black italic border-l-4 border-indigo-600">
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
                        <span className="text-xs font-black text-slate-700 uppercase italic">{sub}</span>
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
                              setActiveTab('timetable');
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
                              <p className="text-[10px] font-extrabold text-slate-900 uppercase italic truncate leading-none mb-0.5">{entry.subject}</p>
                              <p className="text-[8px] text-slate-400 font-bold uppercase truncate">{getTeacherName(entry.teacherId)}</p>
                            </div>
                          ))}
                        {timetable.filter(tt => tt.classId === selectedClassForDetails.id && tt.day === day).length === 0 && (
                          <div className="h-full flex items-center justify-center py-8">
                             <p className="text-[8px] text-slate-400 font-bold uppercase tracking-widest text-center italic">No Lectures</p>
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
                      <div className="w-10 h-10 bg-slate-900 text-white flex items-center justify-center font-black text-xs border border-slate-800">
                        {s.name.charAt(0)}
                      </div>
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

    </div>
  );
}
