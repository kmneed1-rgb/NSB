import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'sonner';
import { 
  Users, BookOpen, Calendar, LogOut, Plus, Edit2, Trash2, Search, X, 
  Menu, Shield, Phone, Mail, Award, AlertCircle, RefreshCw, BarChart2, PlusCircle, CreditCard,
  TrendingUp, CheckCircle2, AlertTriangle, ArrowUpRight, Percent, CalendarDays,
  ChevronDown, ChevronUp, Bell, User
} from 'lucide-react';
import { getPeriodStatus, getStatusColor } from '../lib/periodUtils';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, Cell } from 'recharts';
import { Teacher, Student, Class, TimetableEntry, DayOfWeek, UserSession, FeeRecord } from '../types';
import CashPaymentEntry from './CashPaymentEntry';

interface PrincipalDashboardProps {
  userSession: UserSession;
  teachers: Teacher[];
  setTeachers: React.Dispatch<React.SetStateAction<Teacher[]>>;
  students: Student[];
  setStudents: React.Dispatch<React.SetStateAction<Student[]>>;
  classes: Class[];
  setClasses: React.Dispatch<React.SetStateAction<Class[]>>;
  timetable: TimetableEntry[];
  setTimetable: React.Dispatch<React.SetStateAction<TimetableEntry[]>>;
  fees: FeeRecord[];
  setFees: React.Dispatch<React.SetStateAction<FeeRecord[]>>;
  onLogout: () => void;
}

type TabType = 'dashboard' | 'management_hub' | 'timetable' | 'alerts' | 'settings' | 'fees';

export default function PrincipalDashboard({
  userSession,
  teachers,
  setTeachers,
  students,
  setStudents,
  classes,
  setClasses,
  timetable,
  setTimetable,
  fees,
  setFees,
  onLogout
}: PrincipalDashboardProps) {
  const [activeTab, setActiveTab] = useState<TabType>('dashboard');
  const [managementSubTab, setManagementSubTab] = useState<'teachers' | 'students' | 'classes'>('teachers');
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Search/Filter States
  const [teacherSearch, setTeacherSearch] = useState('');
  const [studentSearch, setStudentSearch] = useState('');
  const [studentClassFilter, setStudentClassFilter] = useState('all');
  const [classSearch, setClassSearch] = useState('');

  // PRINCIPAL FEE PORTAL STATE
  const [feeSearch, setFeeSearch] = useState('');
  const [feeStatusFilter, setFeeStatusFilter] = useState<'all' | 'paid' | 'unpaid' | 'pending'>('all');
  const [feeListingClassFilter, setFeeListingClassFilter] = useState('all');
  const [feeStudentId, setFeeStudentId] = useState('');
  const [feeMonth, setFeeMonth] = useState('June 2026');
  const [feeAmount, setFeeAmount] = useState('500');
  const [feeDueDate, setFeeDueDate] = useState('2026-06-15');
  const [feeFormOpen, setFeeFormOpen] = useState(false);
  const [expandedFeeId, setExpandedFeeId] = useState<string | null>(null);

  // Advanced Billing / Category States
  const [feeCategory, setFeeCategory] = useState<'Tuition Fee' | 'Annual Fee' | 'Paper Fund' | 'Pending Balance' | 'Miscellaneous'>('Tuition Fee');
  const [feeDescription, setFeeDescription] = useState('');
  const [otherFeeAmount, setOtherFeeAmount] = useState('0');
  const [applyToClass, setApplyToClass] = useState(false);
  const [isCashPayment, setIsCashPayment] = useState(true);
  const [amountCollected, setAmountCollected] = useState('');
  const [selectedStudentForLedger, setSelectedStudentForLedger] = useState('');

  // WhatsApp Alert & Autopilot States
  const [whatsAppAutoFee, setWhatsAppAutoFee] = useState(true);
  const [whatsAppAutoAbsence, setWhatsAppAutoAbsence] = useState(true);
  const [whatsAppAutoResult, setWhatsAppAutoResult] = useState(false);
  const [broadcastType, setBroadcastType] = useState<'fee' | 'absence' | 'result'>('fee');
  const [broadcastStudentId, setBroadcastStudentId] = useState('');
  const [broadcastClassId, setBroadcastClassId] = useState('');
  const [broadcastCustomText, setBroadcastCustomText] = useState('');
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
    { id: 'tx_2', recipient: 'Irfan (Parent of Ayesha)', phone: '+923219876543', type: 'Fee Reminder 💰', text: 'REMINDER: Ayesha\'s June 2026 Tuition Fee (500) is outstanding. Kindly clear the dues as soon as possible to avoid late surcharges.', timestamp: '2026-06-09 11:20 AM', status: 'Sent' }
  ]);

  const handleCreateInvoice = (e: React.FormEvent) => {
    e.preventDefault();

    if (!feeStudentId) {
      toast.error("Please select a student profile for private statement generation.");
      return;
    }
    const studentObj = students.find(s => s.id === feeStudentId);
    if (!studentObj) return;

    const studentsToBill = applyToClass && feeCategory === 'Paper Fund' 
        ? students.filter(s => s.classId === studentObj.classId)
        : [studentObj];

    const newInvoices: FeeRecord[] = [];
    let updatedFees = [...fees];

    studentsToBill.forEach(student => {
        const outstandingBalance = updatedFees
            .filter(f => f.studentId === student.id && f.status === 'unpaid')
            .reduce((sum, f) => sum + f.amount, 0);

        const baseAmount = student.baseFee || 500;
        const billTotal = baseAmount + outstandingBalance + Number(otherFeeAmount || 0);
        
        // Remove old unpaid invoices for this student
        updatedFees = updatedFees.filter(f => !(f.studentId === student.id && f.status === 'unpaid'));

        newInvoices.push({
            id: 'fee_' + student.id + Date.now() + Math.random(),
            studentId: student.id,
            amount: billTotal,
            month: feeMonth,
            dueDate: feeDueDate,
            status: 'unpaid',
            feeType: feeCategory,
            description: outstandingBalance > 0 
                ? `${feeCategory} invoice (Incl. ${outstandingBalance} arrears + ${otherFeeAmount} extra)` 
                : `${feeCategory} - ${feeDescription || 'Particulars'} (Incl. ${otherFeeAmount} extra)`
        });
    });

    setFees([...newInvoices, ...updatedFees]);

    setFeeStudentId('');
    setFeeFormOpen(false);
    setIsCashPayment(true);
    setFeeDescription('');
    setOtherFeeAmount('0');
    setAmountCollected('');
    toast.success(`${isCashPayment ? 'Cash Collection' : 'Ledger Invoice'} recorded for ${studentObj.name} successfully!`);

    // Auto trigger warning
    if (whatsAppAutoFee) {
      const arrears = fees
        .filter(f => f.studentId === studentObj.id && f.status === 'unpaid')
        .reduce((sum, f) => sum + f.amount, 0);
      const billTotalForStudent = (studentObj.baseFee || 500) + arrears + Number(otherFeeAmount || 0);

      setBroadcastLogs(prev => [
        {
          id: 'auto_' + Date.now(),
          recipient: `${studentObj.name}'s Guardian`,
          phone: studentObj.parentPhone || '0300-XXXXXXX',
          type: 'Private Auto Fee 💰',
          text: `Greetings! Fee for student ${studentObj.name} (${billTotalForStudent}) for ${feeMonth} has been issued. (Incl. ${otherFeeAmount} extra fund). Due Date: ${feeDueDate}`,
          timestamp: new Date().toLocaleString(),
          status: 'Autopilot'
        },
        ...prev
      ]);
    }
  };

  const handleDeleteInvoice = (id: string) => {
    setFees(prev => prev.filter(f => f.id !== id));
    toast.success("Invoice successfully expunged from ledger records.");
  };

  const handleToggleSettleFee = (id: string) => {
    setFees(prev => prev.map(f => {
      if (f.id === id) {
        return {
          ...f,
          status: f.status === 'paid' ? 'unpaid' : 'paid',
          paidDate: f.status === 'paid' ? undefined : new Date().toISOString().split('T')[0],
          paymentMethod: f.status === 'paid' ? undefined : 'Principal Cash Registry'
        };
      }
      return f;
    }));
    toast.info("Invoice transaction status has been updated.");
  };

  // Modals / Form editing state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalType, setModalType] = useState<'teacher' | 'student' | 'class' | 'timetable'>('teacher');
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
  const [tPassword, setTPassword] = useState('password123');
  const [tUsername, setTUsername] = useState('');

  // Student
  const [sName, setSName] = useState('');
  const [sEmail, setSEmail] = useState('');
  const [sClassId, setSClassId] = useState('');
  const [sRoll, setSRoll] = useState('');
  const [sParentPhone, setSParentPhone] = useState('');
  const [sBaseFee, setSBaseFee] = useState('500');
  const [sPassword, setSPassword] = useState('password123');
  const [sUsername, setSUsername] = useState('');

  // Class
  const [cClassName, setCClassName] = useState('');
  const [cSection, setCSection] = useState('');
  const [cTeacherId, setCTeacherId] = useState('');

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

  const toggleTeacherExpanded = (id: string) => {
    setExpandedTeachers(prev => ({ ...prev, [id]: !prev[id] }));
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
    setTPassword('password123');
    setTUsername('');

    setSName('');
    setSEmail('');
    setSClassId(classes[0]?.id || '');
    setSRoll('');
    setSParentPhone('');
    setSBaseFee('500');
    setSPassword('password123');
    setSUsername('');

    setCClassName('');
    setCSection('');
    setCTeacherId(teachers[0]?.id || '');

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

  const openAddModal = (type: 'teacher' | 'student' | 'class' | 'timetable') => {
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

  const openEditModal = (type: 'teacher' | 'student' | 'class' | 'timetable', id: string) => {
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
        setTPassword(match.password || 'password123');
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
        setSBaseFee(match.baseFee?.toString() || '500');
        setSPassword(match.password || 'password123');
        setSUsername(match.username || '');
      }
    } else if (type === 'class') {
      const match = classes.find(c => c.id === id);
      if (match) {
        setCClassName(match.className);
        setCSection(match.section);
        setCTeacherId(match.classTeacherId);
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
      if (!emailRegex.test(tEmail)) errors.push('A valid email is required.');
      if (!tSubject.trim()) errors.push('Teaching subject is required.');
      if (!tPhone.trim()) errors.push('Phone is required.');
      if (!tPassword.trim()) errors.push('Password is required.');

      // Check unique email except current editing
      const emailTaken = teachers.some(t => t.email?.toLowerCase() === tEmail.toLowerCase() && t.id !== currentId);
      if (emailTaken) errors.push('This email is already taken by another teacher.');
    } 
    
    else if (modalType === 'student') {
      if (!sName.trim()) errors.push('Student name is required.');
      if (!emailRegex.test(sEmail)) errors.push('A valid email is required.');
      if (!sClassId) errors.push('Class must be selected.');
      if (!sRoll.trim()) errors.push('Roll number is required.');
      if (!sParentPhone.trim()) errors.push('Parent contact phone is required.');
      if (!sPassword.trim()) errors.push('Password is required.');

      // Check unique email
      const emailTaken = students.some(s => s.email?.toLowerCase() === sEmail.toLowerCase() && s.id !== currentId);
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
          username: tUsername || ('teacher_' + id.slice(-4)), 
          password: tPassword,
          subject: tSubject.trim(),
          phone: tPhone.trim(),
        };
        setTeachers([...teachers, newTeacher]);
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
      }
    } 
    
    else if (modalType === 'student') {
      if (modalMode === 'add') {
        const id = 's_' + Date.now();
        const newStudent: Student = {
          id,
          name: sName.trim(),
          email: sEmail.toLowerCase().trim(),
          username: sUsername || ('student_' + id.slice(-4)),
          password: sPassword,
          classId: sClassId,
          rollNumber: sRoll.trim(),
          parentPhone: sParentPhone.trim(),
          baseFee: Number(sBaseFee) || 500
        };
        setStudents([...students, newStudent]);
      } else {
        setStudents(students.map(s => s.id === currentId ? {
          ...s,
          name: sName.trim(),
          email: sEmail.toLowerCase().trim(),
          classId: sClassId,
          rollNumber: sRoll.trim(),
          parentPhone: sParentPhone.trim(),
          baseFee: Number(sBaseFee) || 500,
          password: sPassword,
          username: sUsername,
        } : s));
      }
    }     
    else if (modalType === 'class') {
      if (modalMode === 'add') {
        const newClass: Class = {
          id: 'c_' + Date.now(),
          className: cClassName.trim(),
          section: cSection.toUpperCase().trim(),
          classTeacherId: cTeacherId
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
          classTeacherId: cTeacherId
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
  const handleDeleteTeacher = (id: string) => {
    if (confirm('Are you sure you want to delete this teacher? This will vacate teachers from assigned classes and timetables.')) {
      setTeachers(teachers.filter(t => t.id !== id));
      // Reset vacated class teachers
      setClasses(classes.map(c => c.classTeacherId === id ? { ...c, classTeacherId: '' } : c));
      // Delete timetable entries linked to teacher
      setTimetable(timetable.filter(tt => tt.teacherId !== id));
    }
  };

  const handleDeleteStudent = (id: string) => {
    if (confirm('Are you sure you want to delete this student profile?')) {
      setStudents(students.filter(s => s.id !== id));
    }
  };

  const handleDeleteClass = (id: string) => {
    if (confirm('Are you sure you want to delete this class? This will dissociate linked students and delete associated timetables.')) {
      setClasses(classes.filter(c => c.id !== id));
      // Dissociate students (unset their class relation)
      setStudents(students.map(s => s.classId === id ? { ...s, classId: '' } : s));
      // Clear timetable items
      setTimetable(timetable.filter(tt => tt.classId !== id));
      // Reset view active class
      if (selectedTimetableClass === id) {
        const remaining = classes.filter(c => c.id !== id);
        setSelectedTimetableClass(remaining[0]?.id || '');
      }
    }
  };

  const handleDeleteTimetableEntry = (id: string) => {
    if (confirm('Delete this timetable session?')) {
      setTimetable(timetable.filter(t => t.id !== id));
    }
  };

  // Helpers for display resolution
  const getTeacherName = (tId: string) => {
    const t = teachers.find(item => item.id === tId);
    return t ? t.name : 'Unassigned';
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
        
        {/* Active Tab View rendering */}

        {/* ========== DASHBOARD OVERVIEW TABLEAUX ========== */}
        {activeTab === 'dashboard' && (
          <div id="panel-principal-dashboard" className="space-y-8 animate-fade-in">
            {/* Greeting Header */}
            <div>
              <p className="text-[10px] font-bold text-blue-600 uppercase tracking-widest mb-1">{userSession.role === 'principal' ? 'Principal Console' : 'Coordinator Console'}</p>
              <h1 className="text-2xl font-black text-slate-900 tracking-tight font-display uppercase">{userSession.role === 'principal' ? 'Principal Dashboard' : 'Coordinator Dashboard'}</h1>
              <p className="text-sm text-slate-500 mt-1">Real-time counts and summaries of state registers stored inside Acadamis.</p>
            </div>

            {/* Metrics cards bar - Elegant Minimalist */}
            {(() => {
              const totalBilled = fees.reduce((sum, f) => sum + Number(f.amount || 0), 0);
              const totalCollected = fees.filter(f => f.status === 'paid').reduce((sum, f) => sum + Number(f.amount || 0), 0);
              const totalPending = totalBilled - totalCollected;

              // Current Month Collection
              const CURRENT_MONTH = feeMonth;
              const currentMonthFees = fees.filter(f => f.month === CURRENT_MONTH);
              const totalCollectedCurrentMonth = currentMonthFees.filter(f => f.status === 'paid').reduce((sum, f) => sum + Number(f.amount || 0), 0);
              const totalPendingCurrentMonth = currentMonthFees.filter(f => f.status === 'unpaid').reduce((sum, f) => sum + Number(f.amount || 0), 0);

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
                      ] : [])
                    ].map(stat => (
                      <div key={stat.label} className={`group p-6 border border-transparent hover:border-slate-100 transition-all ${stat.bg}`}>
                        <span className={`block text-[9px] font-black uppercase tracking-[0.3em] mb-3 ${stat.color}`}>{stat.label}</span>
                        <span className="text-2xl md:text-3xl font-light tracking-tighter text-slate-900 block tabular-nums">{stat.val}</span>
                      </div>
                    ))}
                  </div>

                  {/* Fee Summary Cards */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-8 animate-fade-in">
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
            </div>

            {/* Hub Content Rendering */}
            <div>
              {/* TEACHERS SUB-VIEW */}
              {managementSubTab === 'teachers' && (
                <div id="panel-principal-teachers" className="space-y-6 animate-fade-in">
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
                                  <span className="font-mono text-xs font-bold text-emerald-600 bg-emerald-50 px-1">{t.password || 'password123'}</span>
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
                <div id="panel-principal-students" className="space-y-6 animate-fade-in">
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
                                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest leading-none">{getClassName(s.classId)}</p>
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
                <div id="panel-principal-classes" className="space-y-6 animate-fade-in">
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
                          
                          <div className="flex items-center gap-5 relative z-10 w-full">
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
            </div>
          </div>
        )}

        {/* ========== TIMETABLE TABLEAUX ========== */}
        {activeTab === 'timetable' && (
          <div id="panel-principal-timetable" className="space-y-6 animate-fade-in">
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
                   <div key={day} className="space-y-2">
                     <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 pl-2">{day} Schedule</h3>
                     <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2">
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
                               className={`border border-slate-100 p-4 transition-all rounded-r-xl ${entry ? 'shadow-xs' : 'hover:bg-slate-50/50'} cursor-pointer ${
                                 selectedSlot?.day === day && selectedSlot?.period === p ? 'ring-2 ring-indigo-500' : ''
                               }`}
                               style={{
                                 borderLeft: `4px solid ${statusCol}`,
                                 backgroundColor: entry ? `${statusCol}10` : 'white'
                               }}
                             >
                               <div className="flex justify-between items-center mb-2 pb-1 border-b border-dashed border-slate-100/80">
                                 <div className="flex items-center gap-1.5">
                                    <span className="text-[9px] font-black uppercase tracking-widest text-slate-500" style={{ color: statusCol }}>{p}</span>
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
                                        <X size={10} className="stroke-[2.5] pointer-events-none" />
                                      </button>
                                    )}
                                  </div>
                                 <div className="flex items-center gap-1.5">
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
                                       className="p-1 rounded bg-blue-600 hover:bg-blue-700 text-white font-black text-[9px] uppercase tracking-wider transition-all flex items-center justify-center gap-1 shadow-sm px-2"
                                       title="Add Next Period"
                                     >
                                       <Plus size={10} className="stroke-[3]" /> Add
                                     </button>
                                   )}
                                 </div>
                               </div>
                               {entry ? (
                                 <div className="space-y-1">
                                   <p className="font-extrabold text-xs uppercase tracking-tight italic text-slate-900" style={{ color: col }}>{entry.subject}</p>
                                   <p className="text-slate-500 text-[9px] font-bold uppercase tracking-widest">{getTeacherName(entry.teacherId)}</p>
                                   <div className="flex items-center gap-2 pt-2 border-t border-slate-200/50 mt-2">
                                     <button onClick={() => openEditModal('timetable', entry.id)} className="text-slate-400 hover:text-slate-700 transition-colors"><Edit2 size={10} /></button>
                                     <button onClick={() => handleDeleteTimetableEntry(entry.id)} className="text-slate-400 hover:text-red-500 transition-colors"><Trash2 size={10} /></button>
                                   </div>
                                 </div>
                               ) : (
                                 <button 
                                   onClick={() => {
                                       setTtDay(day);
                                       setTtPeriod(p);
                                       openAddModal('timetable');
                                   }}
                                   className="w-full text-slate-400 hover:text-slate-600 font-bold text-[10px] uppercase italic text-left pt-1"
                                 >
                                   + Click to Assign
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
            <div className="bg-white p-6 md:p-8 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-rose-600 text-white rounded-2xl shadow-lg shadow-rose-200">
                  <Bell size={24} />
                </div>
                <div>
                  <h1 className="text-2xl font-black text-slate-900 tracking-tight uppercase italic">Notification Center</h1>
                  <p className="text-xs text-slate-500 font-bold uppercase tracking-widest mt-1">Defaulter Tracking & Communication Intelligence</p>
                </div>
              </div>
              <div className="flex bg-slate-900 rounded-2xl p-4 text-white items-center gap-6 shadow-xl">
                <div className="text-center">
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Active Alerts</p>
                  <p className="text-xl font-black text-rose-500">{fees.filter(f => f.status === 'unpaid').length}</p>
                </div>
                <div className="w-px h-8 bg-slate-800"></div>
                <div className="text-center">
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Sent Today</p>
                  <p className="text-xl font-black text-emerald-400">
                    {broadcastLogs.filter(l => l.timestamp.includes(new Date().toLocaleDateString()) || true).length}
                  </p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 px-1">
              {(() => {
                const unpaidFees = fees.filter(f => f.status === 'unpaid');
                if (unpaidFees.length === 0) {
                  return (
                    <div className="bg-white border border-slate-200 p-20 text-center shadow-sm rounded-3xl">
                      <div className="w-20 h-20 bg-emerald-50 text-emerald-500 rounded-full flex items-center justify-center mx-auto mb-6">
                        <CheckCircle2 size={40} />
                      </div>
                      <h2 className="text-xl font-black text-slate-900 uppercase tracking-tight">System All Clear</h2>
                      <p className="text-xs text-slate-500 mt-2 font-bold uppercase tracking-widest italic">All student accounts are currently in good standing.</p>
                    </div>
                  );
                }

                // Group by student to avoid spamming multiple notifications for same student
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
                  
                  // Draft Modern Message
                  const waMessage = `Greetings! 🌟
NSB1 Principal Office Reminder:
Guardian of ${student.name} (Class: ${classObj?.className}-${classObj?.section}).
Pending balance detected: ${totalPending} (Due for: ${months}).
Kindly settle the dues today to avoid portal suspension.
Thank you.`;
                  
                  const waUrl = `https://api.whatsapp.com/send?phone=${student.parentPhone.replace(/[^0-9]/g, '') || '923001234567'}&text=${encodeURIComponent(waMessage)}`;

                  return (
                    <motion.div 
                      key={student.id}
                      initial={{ opacity: 0, scale: 0.98 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="bg-white border border-slate-200 rounded-3xl overflow-hidden hover:shadow-xl transition-all group flex flex-col md:flex-row"
                    >
                      {/* Status Strip */}
                      <div className="w-2 bg-rose-500 h-full"></div>
                      
                      <div className="flex-1 p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
                        <div className="flex items-start gap-4">
                          <div className="w-14 h-14 bg-slate-100 text-slate-900 rounded-2xl flex items-center justify-center font-black text-xl flex-shrink-0 group-hover:bg-rose-600 group-hover:text-white transition-colors border border-slate-200">
                            {(student.name?.[0] || 'S').toUpperCase()}
                          </div>
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <h3 className="font-black text-slate-900 uppercase text-lg tracking-tight">{student.name}</h3>
                              <span className="bg-amber-100 text-amber-700 text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-tighter">
                                Defaulter
                              </span>
                            </div>
                            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest flex items-center gap-2">
                              {classObj?.className}-{classObj?.section} • Roll #{student.rollNumber}
                            </p>
                            <div className="mt-3 bg-slate-50 rounded-2xl p-4 border border-slate-100 text-xs text-slate-600 relative">
                              <div className="absolute -top-1.5 left-4 bg-slate-900 text-white text-[8px] font-black px-2 py-0.5 rounded-full uppercase">Draft Alert</div>
                              <p className="italic leading-relaxed whitespace-pre-wrap font-medium">"{waMessage}"</p>
                            </div>
                          </div>
                        </div>

                        <div className="flex flex-col items-center md:items-end gap-4 w-full md:w-auto">
                          <div className="text-center md:text-right">
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Outstanding Total</p>
                            <p className="text-3xl font-black text-rose-600 font-mono tracking-tighter leading-none mt-1">{totalPending}</p>
                            <p className="text-[9px] text-slate-400 font-bold mt-1 uppercase leading-none">{sFees.length} UNPAID VOUCHERS</p>
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
                                type: 'WA Alert 🚀',
                                text: `Sent consolidated alert for ${totalPending}`,
                                timestamp: new Date().toLocaleString(),
                                status: 'Sent'
                              }, ...prev]);
                              toast.success(`Consolidated alert dispatched for ${student.name}!`);
                            }}
                            className="w-full md:w-auto flex items-center justify-center gap-3 bg-emerald-600 hover:bg-slate-900 text-white px-8 py-4 rounded-2xl font-black text-xs uppercase tracking-widest transition-all shadow-xl shadow-emerald-200 active:scale-95"
                          >
                            <Phone size={18} fill="currentColor" />
                            Send WA Alert
                          </a>
                        </div>
                      </div>
                    </motion.div>
                  );
                });
              })()}
            </div>
          </div>
        )}

        {/* ========== PRINCIPAL FEES & WHATSAPP COCKPIT SYSTEM ========== */}
        {activeTab === 'fees' && (
          <div id="panel-principal-fees" className="space-y-8 animate-fade-in font-sans pb-20">
            
            {/* New Compact Functional Header */}
            <div className="bg-white p-6 md:p-10 border rounded-3xl border-slate-100 shadow-xl shadow-slate-100/50 flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div className="flex items-center gap-5">
                <div className="p-4 bg-indigo-600 text-white rounded-2xl shadow-lg">
                  <CreditCard size={28} />
                </div>
                <div>
                  <h1 className="text-2xl font-black text-slate-900 tracking-tight uppercase italic">Cash Registry</h1>
                  <p className="text-[10px] text-slate-500 font-bold uppercase tracking-[0.2em] mt-1 italic leading-none">Live Collection & Ledger Management (Cash Registry)</p>
                </div>
              </div>
              
              <div className="flex flex-wrap items-center gap-3">
                <button 
                  onClick={() => setFeeFormOpen(!feeFormOpen)}
                  className={`px-8 py-3.5 text-xs font-black uppercase tracking-widest flex items-center gap-2 transform transition-all active:scale-95 shadow-xl rounded-2xl ${
                    feeFormOpen ? 'bg-rose-600 text-white' : 'bg-slate-900 text-white hover:bg-slate-800'
                  }`}
                >
                  {feeFormOpen ? <X size={16} /> : <PlusCircle size={16} />}
                  {feeFormOpen ? 'Cancel' : 'Collect Fee'}
                </button>
                <button 
                  onClick={() => {
                    const pendingFees = fees.filter(f => f.status === 'unpaid');
                    if (pendingFees.length === 0) {
                      toast.info("No pending fees to notify.");
                      return;
                    }
                    
                    // Simulate WhatsApp broadcast
                    const pendingStudents = Array.from(new Set(pendingFees.map(f => f.studentId)));
                    const newLogs = pendingStudents.map(studentId => {
                        const student = students.find(s => s.id === studentId);
                        return {
                            id: 'whatsapp_' + Date.now() + studentId,
                            recipient: `${student?.name || 'Unknown Student'}'s Guardian`,
                            phone: student?.parentPhone || '0300-XXXXXXX',
                            type: 'WhatsApp Fee Reminder 📱',
                            text: `Greetings! Your child ${student?.name} has outstanding fees. Please settle to avoid hassle.`,
                            timestamp: new Date().toLocaleString(),
                            status: 'Sent (WhatsApp)'
                        };
                    });
                    setBroadcastLogs(prev => [...newLogs, ...prev]);
                    toast.success(`Sent WhatsApp reminders to ${pendingStudents.length} students/parents.`);
                  }}
                  className="px-8 py-3.5 text-xs font-black uppercase tracking-widest flex items-center gap-2 transform transition-all active:scale-95 shadow-xl rounded-2xl bg-indigo-600 text-white hover:bg-indigo-700"
                >
                  <Bell size={16} />
                  Notify
                </button>
              </div>
            </div>

            {/* EXPANDED BILLING CREATOR INVOICE FORM */}
            {feeFormOpen && (
              <div id="fee-generation-section" className="bg-white border-2 border-slate-100 p-8 shadow-2xl animate-fade-in font-sans">
                <form onSubmit={handleCreateInvoice} className="grid grid-cols-1 md:grid-cols-2 gap-10">
                  <div className="space-y-6">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 block">Mass Billing (Class Action)</label>
                      <button
                        type="button"
                        onClick={() => {
                          if (feeListingClassFilter === 'all') {
                            toast.error("Please select a specific class to generate.");
                            return;
                          }
                          const classStudents = students.filter(s => s.classId === feeListingClassFilter);
                          const newFees: FeeRecord[] = classStudents.map(student => ({
                            id: 'fee_' + Date.now() + Math.random(),
                            studentId: student.id,
                            amount: student.baseFee || 500,
                            month: feeMonth,
                            dueDate: feeDueDate,
                            status: 'unpaid',
                            feeType: 'Tuition Fee',
                            description: `Automated ${feeMonth} invoice`
                          }));
                          setFees(prev => [...newFees, ...prev]);
                          toast.success(`Generated ${newFees.length} invoices for the class.`);
                        }}
                        className="w-full text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 p-4 transition-all shadow-md"
                      >
                        Generate Monthly Invoices
                      </button>
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 block">Filter by Class</label>
                      <select
                        value={feeListingClassFilter}
                        onChange={(e) => {
                          setFeeListingClassFilter(e.target.value);
                          setFeeStudentId('');
                        }}
                        className="w-full text-base font-black text-slate-800 bg-slate-50 border border-slate-200 p-4 outline-none transition-all shadow-inner"
                      >
                         <option value="all">All Classes</option>
                         {classes.map(c => <option key={c.id} value={c.id}>{c.className} ({c.section})</option>)}
                      </select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 block">Select Student</label>
                      <select
                        value={feeStudentId}
                        onChange={(e) => {
                          const sid = e.target.value;
                          setFeeStudentId(sid);
                          if (sid) {
                            const student = students.find(s => s.id === sid);
                            const arrears = fees
                              .filter(f => f.studentId === sid && f.status === 'unpaid')
                              .reduce((sum, f) => sum + f.amount, 0);
                            const base = student?.baseFee || 500;
                            setFeeAmount((base + arrears).toString());
                            setAmountCollected((base + arrears).toString());
                            setIsCashPayment(true);
                          }
                        }}
                        className="w-full text-base font-black text-slate-800 bg-slate-50 border border-slate-200 p-4 outline-none focus:border-indigo-600 focus:bg-white transition-all shadow-inner"
                        required
                      >
                        <option value="">-- Choose Pupil Ledger --</option>
                        {students
                          .filter(s => feeListingClassFilter === 'all' || s.classId === feeListingClassFilter)
                          .sort((a,b) => a.name.localeCompare(b.name))
                          .map(s => {
                            const c = classes.find(cl => cl.id === s.classId);
                            return <option key={s.id} value={s.id}>{s.name} (Roll: {s.rollNumber} - {c?.className})</option>;
                          })}
                      </select>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 block">Billing Period</label>
                        <select
                          value={feeMonth}
                          onChange={(e) => setFeeMonth(e.target.value)}
                          className="w-full text-sm font-bold bg-slate-50 border border-slate-200 p-4 outline-none focus:border-indigo-600"
                        >
                          {['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'].map(m => (
                            <option key={m} value={`${m} 2026`}>{m} 2026</option>
                          ))}
                        </select>
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 block">Category</label>
                        <select
                          value={feeCategory}
                          onChange={(e) => setFeeCategory(e.target.value as any)}
                          className="w-full text-sm font-bold bg-slate-50 border border-slate-200 p-4 outline-none focus:border-indigo-600"
                        >
                          <option value="Tuition Fee">Tuition Fee</option>
                          <option value="Annual Fee">Annual Fund</option>
                          <option value="Pending Balance">Arrears</option>
                          <option value="Paper Fund">Paper Fund</option>
                          <option value="Miscellaneous">Misc</option>
                        </select>
                      </div>
                    </div>

                     <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 block">Other Fee (e.g., Paper Fund)</label>
                      <input
                        type="number"
                        value={otherFeeAmount}
                        onChange={(e) => {
                          const val = e.target.value;
                          setOtherFeeAmount(val);
                          // Recalculate total: base + arrears + otherFee
                          const base = students.find(s => s.id === feeStudentId)?.baseFee || 500;
                          const arrears = fees
                            .filter(f => f.studentId === feeStudentId && f.status === 'unpaid')
                            .reduce((sum, f) => sum + f.amount, 0);
                          setFeeAmount((base + arrears + Number(val || 0)).toString());
                        }}
                        placeholder="Add extra fee..."
                        className="w-full text-xs font-bold text-slate-800 bg-slate-50 border border-slate-200 p-4 outline-none focus:border-indigo-600"
                      />
                      {feeCategory === 'Paper Fund' && (
                         <div className="flex items-center gap-2 mt-2 bg-slate-100 p-2">
                             <input type="checkbox" checked={applyToClass} onChange={(e) => setApplyToClass(e.target.checked)} />
                             <label className="text-[9px] font-black uppercase tracking-widest text-slate-800">Apply to all students in this class</label>
                         </div>
                      )}
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 block">Notes/Remarks</label>
                      <input
                        type="text"
                        value={feeDescription}
                        onChange={(e) => setFeeDescription(e.target.value)}
                        placeholder="Optional particulars..."
                        className="w-full text-xs font-bold text-slate-800 bg-slate-50 border border-slate-200 p-4 outline-none focus:border-indigo-600"
                      />
                    </div>
                  </div>

                  <div className="space-y-6">
                    <div className="bg-slate-900 p-8 flex flex-col items-center text-center shadow-xl">
                      <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-4">Invoice Net Total</label>
                      <input
                        type="number"
                        value={feeAmount}
                        onChange={(e) => setFeeAmount(e.target.value)}
                        className="bg-transparent text-5xl font-black text-white w-full text-center outline-none border-b-2 border-slate-800 focus:border-indigo-500 transition-all tabular-nums"
                      />
                      <div className="flex gap-2 mt-6 flex-wrap justify-center">
                        {[500, 1000, 1500].map(amt => (
                          <button
                            key={amt}
                            type="button"
                            onClick={() => setFeeAmount(amt.toString())}
                            className={`px-3 py-1.5 text-[8px] font-black border transition-all ${
                              feeAmount === amt.toString() ? 'bg-indigo-600 border-indigo-600 text-white' : 'bg-transparent border-slate-700 text-slate-500 hover:text-white hover:border-slate-500'
                            }`}
                          >
                            {amt}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="p-6 border-2 border-dashed border-emerald-200 bg-emerald-50/20">
                      <label className="flex items-center gap-3 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={isCashPayment}
                          onChange={(e) => {
                             setIsCashPayment(e.target.checked);
                             if(e.target.checked) setAmountCollected(feeAmount);
                             else setAmountCollected('');
                          }}
                          className="w-5 h-5 rounded-none border-emerald-300 text-emerald-600 focus:ring-0 cursor-pointer"
                        />
                        <div className="flex-1">
                          <span className="text-xs font-black text-emerald-800 uppercase tracking-widest block leading-none">Record as Cash Collection</span>
                          <span className="text-[9px] font-bold text-emerald-600 mt-0.5 block">Update ledger as 'Paid' immediately.</span>
                        </div>
                      </label>
                      
                      {isCashPayment && (
                        <div className="mt-4 pt-4 border-t border-emerald-100 animate-fade-in">
                          <label className="text-[9px] font-black uppercase text-emerald-600 block mb-2">Collected Amount</label>
                          <input
                            type="number"
                            value={amountCollected}
                            onChange={(e) => setAmountCollected(e.target.value)}
                            className="w-full text-lg font-black text-emerald-900 bg-white border border-emerald-200 p-3 outline-none focus:border-emerald-500 tabular-nums"
                          />
                        </div>
                      )}
                    </div>

                    <button
                      type="submit"
                      className="w-full py-5 bg-indigo-600 hover:bg-slate-900 text-white font-black text-xs uppercase tracking-[0.3em] transition-all shadow-2xl flex items-center justify-center gap-4 active:scale-95"
                    >
                      Process Transaction &rarr;
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* TWO-COLUMN COCKPIT GRID: EXPENDITURE MATRIX & WHATSAPP SETTINGS */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
              
              {/* STUDENT ACCORDION REGISTER & KHATA SUMMARY (Ledger History) */}
              <div className="lg:col-span-12 bg-white border border-slate-200 p-6 flex flex-col justify-between shadow-sm">
                <div className="space-y-6">
                  <div className="border-b pb-3 flex flex-col gap-2">
                    <div>
                      <h3 className="text-xs font-extrabold uppercase tracking-widest text-slate-800 font-display">Live Ledger Entries & Full Audit View</h3>
                    </div>
                    {/* Add Search, Class and Student filter */}
                    <div className="flex gap-2 w-full">
                      <select
                        value={feeListingClassFilter}
                        onChange={(e) => {
                          setFeeListingClassFilter(e.target.value);
                          setSelectedStudentForLedger('');
                        }}
                        className="text-[10px] p-1.5 border border-slate-200 bg-white font-bold outline-none uppercase"
                      >
                        <option value="all">EVERCLASS</option>
                        {classes.map(c => (
                          <option key={c.id} value={c.id}>{c.className}-{c.section}</option>
                        ))}
                      </select>
                      <select
                        value={selectedStudentForLedger}
                        onChange={(e) => setSelectedStudentForLedger(e.target.value)}
                        className="text-[10px] p-1.5 border border-slate-200 bg-white font-bold outline-none uppercase"
                      >
                        <option value="">-- ALL STUDENTS --</option>
                        {students
                          .filter(s => feeListingClassFilter === 'all' || s.classId === feeListingClassFilter)
                          .sort((a,b) => a.name.localeCompare(b.name))
                          .map(s => (
                            <option key={s.id} value={s.id}>{s.name} (Roll: {s.rollNumber})</option>
                         ))}
                      </select>
                      <input
                        type="text"
                        placeholder="Search Pupil ledger..."
                        value={feeSearch}
                        onChange={(e) => setFeeSearch(e.target.value)}
                        className="text-xs p-1.5 border border-slate-200 hover:border-slate-400 focus:border-indigo-600 outline-none w-full sm:w-36"
                      />
                    </div>
                  </div>

                  {/* HIGH FIDELITY SINGLE STUDENT LEDGER (Complete "Khata" View) */}
                  {(() => {
                    // Let the user pick a student to view an entire financial summary. By default select first student in the searched query
                    const queryFilter = (feeSearch || '').toLowerCase();
                    const filteredStudentsList = students.filter(s => {
                      const matchesSearch = (s.name || '').toLowerCase().includes(queryFilter);
                      const matchesClass = feeListingClassFilter === 'all' || s.classId === feeListingClassFilter;
                      return matchesSearch && matchesClass;
                    });
                    const selectedLedgerStudent = (selectedStudentForLedger && students.find(s => s.id === selectedStudentForLedger)) || filteredStudentsList[0] || students[0];

                    if (!selectedLedgerStudent) return <p className="text-xs text-slate-400 italic py-8 text-center">No student record detected.</p>;

                    const studentsClassObj = classes.find(c => c.id === selectedLedgerStudent.classId);
                    const studentLedgerFees = fees.filter(f => f.studentId === selectedLedgerStudent.id);
                    
                    const ledgerUnpaid = studentLedgerFees.filter(f => f.status === 'unpaid');
                    const ledgerPaid = studentLedgerFees.filter(f => f.status === 'paid');
                    
                    const totalBilledVal = studentLedgerFees.reduce((sum, f) => sum + f.amount, 0);
                    const totalPaidVal = ledgerPaid.reduce((sum, f) => sum + f.amount, 0);
                    const totalOutstandingVal = ledgerUnpaid.reduce((sum, f) => sum + f.amount, 0);

                    return (
                      <div className="space-y-4">
                        {/* Selected Student profile sub header */}
                        <div className="p-4 bg-amber-50/60 border border-amber-200 flex flex-col sm:flex-row gap-4 justify-between sm:items-center">
                          <div className="space-y-0.5">
                            <span className="text-[9px] font-black uppercase text-amber-800 bg-amber-100 py-0.5 px-1.5 font-mono">INSIDE ACTIVE STATEMENT LEDGER</span>
                            <h4 className="text-base font-black text-slate-900 font-display">{selectedLedgerStudent.name}</h4>
                            <p className="text-xs text-slate-500">Roll No: #{selectedLedgerStudent.rollNumber} | {studentsClassObj?.className} - {studentsClassObj?.section} | Parent Phone: <strong className="font-mono text-slate-700">{selectedLedgerStudent.parentPhone || '0300-XXXXXXX'}</strong></p>
                          </div>

                          {/* Quick manual WhatsApp overdue ping for the student */}
                          <div className="shrink-0 flex flex-col gap-1.5">
                            {totalOutstandingVal > 0 ? (
                              <a
                                href={`https://api.whatsapp.com/send?phone=${selectedLedgerStudent.parentPhone}&text=${encodeURIComponent(`Dear Guardian! ScholarSync Dues Alert for student ${selectedLedgerStudent.name} (Roll: ${selectedLedgerStudent.rollNumber}). Total Pending Arrears is ${totalOutstandingVal}. Please pay dues to Allied Bank.`)}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                onClick={() => {
                                  setBroadcastLogs(prev => [{
                                    id: 'tx_ar_' + Date.now(),
                                    recipient: `${selectedLedgerStudent.name}'s parent`,
                                    phone: selectedLedgerStudent.parentPhone || '0300-0000000',
                                    type: 'Fee Alert 💰',
                                    text: `AUTOPING: Dues Notice: ${totalOutstandingVal} outstanding for ${selectedLedgerStudent.name}.`,
                                    timestamp: new Date().toLocaleString(),
                                    status: 'Sent'
                                  }, ...prev]);
                                }}
                                className="bg-amber-600 hover:bg-slate-900 text-white font-extrabold text-[10px] px-3 py-1.5 text-center uppercase tracking-wider block"
                              >
                                🔔 Ping Overdue On WhatsApp
                              </a>
                            ) : (
                              <span className="text-xs text-emerald-700 bg-emerald-50 px-2.5 py-1 text-center font-bold font-sans uppercase">★ DUES EXEMPTED</span>
                            )}
                          </div>
                        </div>

                        {/* Financial Ledger numbers */}
                        <div className="grid grid-cols-3 gap-4 text-center">
                          <div className="bg-slate-50 p-2.5 border border-slate-200">
                            <span className="text-[9px] font-bold text-slate-500 block uppercase">Kul Billed Dues</span>
                            <span className="text-base font-black text-slate-950 font-mono">{totalBilledVal}</span>
                          </div>
                          <div className="bg-emerald-50 p-2.5 border border-emerald-200 text-emerald-950">
                            <span className="text-[9px] font-extrabold text-emerald-800 block uppercase">Kul Received</span>
                            <span className="text-base font-black font-mono text-emerald-900">{totalPaidVal}</span>
                          </div>
                          <div className="bg-rose-50 p-2.5 border border-rose-200 text-rose-950">
                            <span className="text-[9px] font-extrabold text-rose-800 block uppercase">Balance Arrears</span>
                            <span className="text-base font-black font-mono text-rose-900 animate-pulse">{totalOutstandingVal}</span>
                          </div>
                        </div>

                        {/* PAYMENT HISTORY SECTION */}
                        <div className="mt-6 border-t pt-6">
                            <div className="flex items-center gap-2 mb-4">
                              <h5 className="text-[10px] font-black uppercase text-emerald-700 tracking-widest bg-emerald-50 px-2 py-0.5 border border-emerald-100">Historical Payment Logs</h5>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                              {ledgerPaid.length === 0 ? (
                                <p className="text-[10px] text-slate-400 italic">No cash recovery history recorded.</p>
                              ) : (
                                ledgerPaid.map(fee => (
                                  <div key={fee.id + '_paid'} className="p-3 bg-white border border-slate-100 flex items-center justify-between hover:border-emerald-300 transition-all">
                                    <div className="flex gap-3 items-center">
                                      <div className="w-8 h-8 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center font-black italic text-xs border border-emerald-100">
                                        Rs.
                                      </div>
                                      <div>
                                        <p className="text-[10px] font-black text-slate-900 uppercase italic leading-none">{fee.amount} Received</p>
                                        <p className="text-[8px] font-bold text-slate-400 mt-1 uppercase">{fee.month} / {fee.paidDate}</p>
                                      </div>
                                    </div>
                                    <CheckCircle2 size={14} className="text-emerald-500" />
                                  </div>
                                ))
                              )}
                            </div>
                        </div>

                        {/* Minimalist Cards for Ledger entries */}
                        <div className="space-y-2 mt-8">
                           <h5 className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-3">Recent Statement Entries</h5>
                           <div className="max-h-[300px] overflow-y-auto pr-2 custom-scrollbar space-y-2">
                          {studentLedgerFees.length > 0 ? (
                            studentLedgerFees.map(fee => (
                              <div key={fee.id} className="bg-white border border-slate-100 p-3 hover:border-blue-200 transition-all flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                  <div className={`w-2 h-8 ${
                                    (fee.feeType || 'Tuition Fee') === 'Tuition Fee' ? 'bg-blue-600' :
                                    fee.feeType === 'Annual Fee' ? 'bg-amber-600' :
                                    fee.feeType === 'Paper Fund' ? 'bg-purple-600' :
                                    'bg-rose-600'
                                  }`}></div>
                                  <div>
                                    <div className="flex items-center gap-2">
                                       <h4 className="font-black text-[10px] uppercase text-slate-900 italic tracking-tight">{fee.month}</h4>
                                       <span className={`text-[8px] font-bold px-1.5 py-0.5 uppercase tracking-widest ${fee.status === 'paid' ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>{fee.status}</span>
                                    </div>
                                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">{fee.feeType || 'Tuition Fee'} • Due {fee.dueDate}</p>
                                  </div>
                                </div>
                                <div className="flex items-center gap-3">
                                  <span className="font-black font-mono text-xs text-slate-900">{fee.amount}</span>
                                  <div className="flex gap-1 border-l border-slate-100 pl-3">
                                    <button 
                                      type="button" 
                                      onClick={() => {
                                        setFees(prev => prev.map(f => f.id === fee.id ? { ...f, status: 'paid', paymentMethod: 'Cash', paidDate: new Date().toISOString().split('T')[0] } : f));
                                        toast.success(`Cash settlement recorded for ${fee.month}.`);
                                      }}
                                      className={`p-1.5 transition-all ${fee.status === 'paid' ? 'hidden' : 'text-amber-500 hover:text-amber-700'}`}
                                      title="Settle as Cash"
                                    >
                                      <CreditCard size={14} />
                                    </button>
                                    <button 
                                      type="button" 
                                      onClick={() => handleToggleSettleFee(fee.id)}
                                      className={`p-1.5 transition-all ${fee.status === 'paid' ? 'text-rose-400 hover:text-rose-600' : 'text-emerald-400 hover:text-emerald-600'}`}
                                      title={fee.status === 'paid' ? 'Mark Unpaid' : 'Mark Bank Paid'}
                                    >
                                      {fee.status === 'paid' ? <X size={14} /> : <CheckCircle2 size={14} />}
                                    </button>
                                    <button 
                                      type="button" 
                                      onClick={() => handleDeleteInvoice(fee.id)}
                                      className="p-1.5 text-slate-300 hover:text-red-500 transition-all"
                                    >
                                      <Trash2 size={14} />
                                    </button>
                                  </div>
                                </div>
                              </div>
                            ))
                          ) : (
                            <div className="py-8 border border-dashed border-slate-100 text-center text-slate-300 font-bold text-[9px] uppercase tracking-[0.2em]">
                              No ledger items found.
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })()}
              </div>
            </div>
          </div>

            <div className="bg-white border border-slate-200 p-6 shadow-sm">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center pb-4 border-b mb-4 gap-4">
                <div>
                  <h3 className="text-xs font-extrabold uppercase tracking-widest text-slate-800 font-display">System Consolidated Tuition Invoices Register</h3>
                  <p className="text-[10px] text-gray-500">Double click state checkbox to mark transaction paid or dispatch localized WhatsApp warning notices.</p>
                </div>

                {/* Filter and search */}
                <div className="flex flex-wrap items-center gap-3">
                  <select
                    value={feeListingClassFilter}
                    onChange={(e) => setFeeListingClassFilter(e.target.value)}
                    className="p-1 px-2.5 border text-xs font-semibold bg-white outline-none"
                  >
                    <option value="all">All Classrooms</option>
                    {classes.map(c => (
                      <option key={c.id} value={c.id}>{c.className}-{c.section}</option>
                    ))}
                  </select>
                  <select
                    value={feeStatusFilter}
                    onChange={(e) => setFeeStatusFilter(e.target.value as any)}
                    className="p-1 px-2.5 border text-xs font-semibold bg-white outline-none"
                  >
                    <option value="all">-- All Status --</option>
                    <option value="paid">Settled (Paid)</option>
                    <option value="unpaid">Due / Arrears (Unpaid)</option>
                    <option value="pending">Awaiting Verification</option>
                  </select>
                </div>
              </div>

              <div className="space-y-2">
                {(() => {
                  const finalFilteredFees = fees.filter(fee => {
                    const studentObj = students.find(s => s.id === fee.studentId);
                    if (!studentObj) return false;

                    // Class filter
                    if (feeListingClassFilter !== 'all' && studentObj.classId !== feeListingClassFilter) return false;

                    // Search filter
                    if (feeSearch) {
                      const matchesName = (studentObj.name?.toLowerCase() || '').includes(feeSearch.toLowerCase());
                      if (!matchesName) return false;
                    }

                    // Status filter
                    if (feeStatusFilter !== 'all' && fee.status !== feeStatusFilter) return false;

                    return true;
                  });

                  if (finalFilteredFees.length === 0) {
                    return (
                      <div className="p-12 text-center text-slate-400 font-bold text-[10px] uppercase tracking-widest border border-dashed border-slate-200">
                        No consolidated tuition records found in active registries.
                      </div>
                    );
                  }

                  return finalFilteredFees.map(fee => {
                    const studentObj = students.find(s => s.id === fee.studentId);
                    const classObj = classes.find(c => c.id === studentObj?.classId);
                    const isExpanded = expandedFeeId === fee.id;

                    return (
                      <div key={fee.id} className="bg-white border border-slate-100 transition-all hover:border-slate-300 shadow-sm overflow-hidden">
                        {/* Minimal Header - Primary Request: Just Name and Status */}
                        <div 
                          onClick={() => setExpandedFeeId(isExpanded ? null : fee.id)}
                          className="p-4 flex items-center justify-between cursor-pointer hover:bg-slate-50 transition-colors"
                        >
                          <div className="flex items-center gap-4">
                            <div className={`w-2 h-2 rounded-full ${
                              fee.status === 'paid' ? 'bg-emerald-500' : 'bg-rose-500 animate-pulse'
                            }`}></div>
                            <h4 className="font-extrabold text-sm uppercase text-slate-900 tracking-tight">{studentObj?.name}</h4>
                          </div>
                          <div className="flex items-center gap-4">
                            <span className={`text-[9px] font-black uppercase px-3 py-1 rounded-none border ${
                              fee.status === 'paid' ? 'border-emerald-100 bg-emerald-50 text-emerald-700' : 'border-rose-100 bg-rose-50 text-rose-700'
                            }`}>
                              {fee.status === 'paid' ? 'Paid' : 'Pending'}
                            </span>
                            {isExpanded ? <ChevronUp size={14} className="text-slate-400" /> : <ChevronDown size={14} className="text-slate-400" />}
                          </div>
                        </div>

                        {/* Expanded Detail View */}
                        {isExpanded && (
                          <div className="p-5 border-t border-slate-50 bg-slate-50/30 animate-fade-in space-y-5">
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                              <div className="space-y-1">
                                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Entry ID</p>
                                <p className="text-[10px] font-mono font-bold text-slate-500">#{fee.id.slice(-6)}</p>
                              </div>
                              <div className="space-y-1">
                                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Roll Number</p>
                                <p className="text-xs font-bold text-slate-700">{studentObj?.rollNumber}</p>
                              </div>
                              <div className="space-y-1">
                                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Class Register</p>
                                <p className="text-xs font-bold text-slate-700">{classObj ? `${classObj.className} (${classObj.section})` : 'N/A'}</p>
                              </div>
                              <div className="space-y-1">
                                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Billing Cycle</p>
                                <p className="text-xs font-bold text-slate-700">{fee.month}</p>
                              </div>
                            </div>

                            {fee.description && (
                              <div className="p-2.5 bg-white border border-slate-100 rounded-sm">
                                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Notes / Particulars</p>
                                <p className="text-[11px] text-slate-600 italic">"{fee.description}"</p>
                              </div>
                            )}

                            {fee.status === 'paid' && (
                              <div className="flex items-center gap-2 text-[10px] font-bold text-emerald-700 bg-emerald-50 w-fit px-2 py-1 uppercase tracking-tight">
                                <CheckCircle2 size={12} />
                                Settled via {fee.paymentMethod || 'Primary Registry'} on {fee.paidDate}
                              </div>
                            )}

                            <div className="flex items-center justify-between pt-3 border-t border-slate-200 mt-2">
                              <div className="flex gap-2">
                                {fee.status !== 'paid' && (
                                  <a
                                    href={`https://api.whatsapp.com/send?phone=${studentObj?.parentPhone}&text=${encodeURIComponent(`Aasalam-o-ALAIKUM! ScholarSync Alert: Fee for student ${studentObj?.name} of ${fee.amount} is Arrears. Please pay at school or Allied bank.`)}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-[10px] uppercase tracking-widest flex items-center gap-1.5 shadow-sm"
                                  >
                                    <Phone size={12} />
                                    WA Reminder
                                  </a>
                                )}
                                <button
                                  type="button"
                                  onClick={() => handleDeleteInvoice(fee.id)}
                                  className="px-3 py-1.5 bg-white border border-slate-200 text-slate-500 hover:text-red-600 hover:border-red-200 font-black text-[10px] uppercase tracking-widest flex items-center gap-1.5 transition-all"
                                >
                                  <Trash2 size={12} />
                                  Delete
                                </button>
                              </div>

                              <div className="flex gap-2">
                                {fee.status !== 'paid' && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setFees(prev => prev.map(f => f.id === fee.id ? { ...f, status: 'paid', paymentMethod: 'Cash', paidDate: new Date().toISOString().split('T')[0] } : f));
                                      toast.success(`Cash payment collected for ${studentObj?.name}!`);
                                    }}
                                    className="px-4 py-1.5 bg-amber-500 hover:bg-amber-600 text-slate-900 font-black text-[10px] uppercase tracking-widest flex items-center gap-1.5 shadow-sm"
                                  >
                                    <CreditCard size={12} />
                                    Settle as Cash
                                  </button>
                                )}
                                <button
                                  type="button"
                                  onClick={() => handleToggleSettleFee(fee.id)}
                                  className={`px-4 py-1.5 font-black text-[10px] uppercase tracking-widest flex items-center gap-1.5 transition-all shadow-sm ${
                                    fee.status === 'paid' ? 'bg-rose-100 text-rose-700 hover:bg-rose-200' : 'bg-indigo-600 hover:bg-slate-900 text-white'
                                  }`}
                                >
                                  {fee.status === 'paid' ? <X size={12} /> : <CheckCircle2 size={12} />}
                                  {fee.status === 'paid' ? 'Void Settlement' : 'Mark Settled (Bank)'}
                                </button>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  });
                })()}
              </div>
            </div>

          </div>
        )}

        {activeTab === 'fee_reports' && (
          <div id="panel-fee-reports" className="space-y-8 animate-fade-in font-sans">
            
            {/* Header Banner */}
            <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-6 shadow-md border-b-4 border-amber-500">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                  <span className="text-[10px] bg-amber-500 text-slate-950 px-2 py-0.5 rounded-none font-black uppercase tracking-widest font-mono">Consolidated Ledger Intelligence</span>
                  <h1 className="text-2xl font-black uppercase font-display tracking-tight mt-1 flex items-center gap-2">
                    <BarChart2 size={24} className="text-amber-400 animate-pulse" />
                    Accounts Analytics & Fee Reports
                  </h1>
                  <p className="text-xs text-indigo-100/80 mt-0.5">Automated accounting registers. Read dynamic charts tracing monthly revenue targets, unpaid liabilities, and parental broadcast response models.</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => setActiveTab('fees')}
                    className="bg-indigo-600 hover:bg-indigo-500 text-white font-extrabold text-xs py-2.5 px-4 uppercase tracking-wider flex items-center gap-2 transition-all cursor-pointer"
                  >
                    <CreditCard size={16} />
                    Back to Registrar
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      toast.success("Accounting logs recalibrated with direct cash book ledgers.");
                    }}
                    className="bg-slate-800 hover:bg-slate-700 text-white font-extrabold text-xs py-2.5 px-4 uppercase tracking-wider flex items-center gap-1.5 transition-all cursor-pointer"
                  >
                    <RefreshCw size={14} className="animate-spin-slow" />
                    Recalibrate Cash Flow
                  </button>
                </div>
              </div>
            </div>

            {/* KPI METRIC CARDS GRID */}
            {(() => {
              const totalBilled = fees.reduce((sum, f) => sum + Number(f.amount || 0), 0);
              const totalCollected = fees.filter(f => f.status === 'paid').reduce((sum, f) => sum + Number(f.amount || 0), 0);
              const totalPending = totalBilled - totalCollected;
              const collectionRate = totalBilled > 0 ? ((totalCollected / totalBilled) * 100).toFixed(1) : '0';

              return (
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                  {/* Card 1: Total Revenue Billed */}
                  <div className="bg-white border-l-4 border-blue-500 p-5 shadow-sm space-y-3 relative overflow-hidden flex flex-col justify-between">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="text-[10px] uppercase tracking-widest text-slate-500 font-bold">Total Invoiced</p>
                        <h3 className="text-2xl font-black text-slate-900 mt-1">{totalBilled.toLocaleString()}</h3>
                      </div>
                      <div className="p-2 bg-blue-50 text-blue-600">
                        <CreditCard size={20} />
                      </div>
                    </div>
                    <div>
                      <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden mt-2">
                        <div className="bg-blue-500 h-full w-full"></div>
                      </div>
                      <p className="text-[9px] text-gray-400 mt-1 font-mono font-semibold">Dynamic cash registry aggregates</p>
                    </div>
                  </div>

                  {/* Card 2: Total Revenue Collected */}
                  <div className="bg-white border-l-4 border-emerald-500 p-5 shadow-sm space-y-3 relative overflow-hidden flex flex-col justify-between">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="text-[10px] uppercase tracking-widest text-slate-500 font-bold">Collected Assets</p>
                        <h3 className="text-2xl font-black text-slate-900 mt-1">{totalCollected.toLocaleString()}</h3>
                      </div>
                      <div className="p-2 bg-emerald-50 text-emerald-600">
                        <CheckCircle2 size={20} />
                      </div>
                    </div>
                    <div>
                      <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden mt-2">
                        <div className="bg-emerald-500 h-full" style={{ width: `${collectionRate}%` }}></div>
                      </div>
                      <p className="text-[9px] text-emerald-600 mt-1 font-mono font-semibold flex items-center gap-1">
                        <TrendingUp size={10} />
                        Settle target hit beautifully ({collectionRate}%)
                      </p>
                    </div>
                  </div>

                  {/* Card 3: Outstandings/Pending */}
                  <div className="bg-white border-l-4 border-rose-500 p-5 shadow-sm space-y-3 relative overflow-hidden flex flex-col justify-between">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="text-[10px] uppercase tracking-widest text-slate-500 font-bold">Pending Liabilities</p>
                        <h3 className="text-2xl font-black text-rose-600 mt-1">{totalPending.toLocaleString()}</h3>
                      </div>
                      <div className="p-2 bg-rose-50 text-rose-600">
                        <AlertTriangle size={20} />
                      </div>
                    </div>
                    <div>
                      <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden mt-2">
                        <div className="bg-rose-500 h-full" style={{ width: `${100 - Number(collectionRate)}%` }}></div>
                      </div>
                      <p className="text-[9px] text-rose-500 mt-1 font-mono font-semibold">
                        ⚠️ Requires manual WhatsApp followups
                      </p>
                    </div>
                  </div>

                  {/* Card 4: Settle Rate */}
                  <div className="bg-white border-l-4 border-amber-500 p-5 shadow-sm space-y-3 relative overflow-hidden flex flex-col justify-between">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="text-[10px] uppercase tracking-widest text-slate-500 font-bold">Collection Ratio</p>
                        <h3 className="text-2xl font-black text-amber-600 mt-1">{collectionRate}%</h3>
                      </div>
                      <div className="p-2 bg-amber-50 text-amber-600">
                        <Percent size={20} />
                      </div>
                    </div>
                    <div>
                      <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden mt-2">
                        <div className="bg-amber-500 h-full" style={{ width: `${collectionRate}%` }}></div>
                      </div>
                      <p className="text-[9px] text-slate-500 mt-1 font-mono font-semibold">
                        Target benchmark: <span className="font-bold text-slate-700">90.0% Settle Rate</span>
                      </p>
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* DOUBLE RECHARTS BAR CHARTS GRID */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              
              {/* Chart A: Monthly Fee Distribution (Stacked Bar chart) */}
              <div className="bg-white p-6 shadow-sm border border-slate-100 space-y-4">
                <div className="border-b pb-3 flex justify-between items-center">
                  <div>
                    <h3 className="text-xs font-black uppercase tracking-wider text-slate-900">
                      💰 Monthly Invoice & Settlement Patterns
                    </h3>
                    <p className="text-[11px] text-slate-500">Gross revenue invoiced, comparing realized settlements vs. non-paid outstandings.</p>
                  </div>
                  <span className="text-[9px] font-mono bg-blue-50 text-blue-600 px-2 py-0.5 uppercase font-bold">Historical Stack</span>
                </div>

                {(() => {
                  const monthsMap: Record<string, { month: string; Collected: number; Pending: number; Total?: number }> = {};
                  fees.forEach(fee => {
                    const m = fee.month || 'Other';
                    if (!monthsMap[m]) {
                      monthsMap[m] = { month: m, Collected: 0, Pending: 0, Total: 0 };
                    }
                    if (fee.status === 'paid') {
                      monthsMap[m].Collected += Number(fee.amount || 0);
                    } else {
                      monthsMap[m].Pending += Number(fee.amount || 0);
                    }
                    if (monthsMap[m].Total !== undefined) {
                      monthsMap[m].Total += Number(fee.amount || 0);
                    }
                  });

                  // Sort order preference or natural keys
                  const chartData = Object.values(monthsMap);

                  if (chartData.length === 0) {
                    return (
                      <div className="h-72 flex items-center justify-center text-xs text-gray-400 border border-dashed rounded-lg">
                        Add invoices in the ledger to map Monthly Revenue plots.
                      </div>
                    );
                  }

                  return (
                    <div className="h-80 w-full pt-4">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                          data={chartData}
                          margin={{ top: 10, right: 10, left: -10, bottom: 5 }}
                        >
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                          <XAxis 
                            dataKey="month" 
                            stroke="#64748b" 
                            fontSize={10} 
                            tickLine={false}
                          />
                          <YAxis 
                            stroke="#64748b" 
                            fontSize={10} 
                            tickLine={false}
                            axisLine={false}
                            tickFormatter={(v) => `${v}`}
                          />
                          <Tooltip 
                            formatter={(value) => [`${value}`, undefined]}
                            contentStyle={{ fontSize: '11px', fontFamily: 'monospace', borderRadius: '4px' }}
                          />
                          <Legend 
                            wrapperStyle={{ fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.05em' }} 
                          />
                          <Bar dataKey="Collected" name="Collected Fee" fill="#10b981" stackId="revenue" radius={[0, 0, 0, 0]} />
                          <Bar dataKey="Pending" name="Unpaid Balance" fill="#f43f5e" stackId="revenue" radius={[2, 2, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  );
                })()}
              </div>

              {/* Chart B: Revenue Categoric Streams */}
              <div className="bg-white p-6 shadow-sm border border-slate-100 space-y-4">
                <div className="border-b pb-3 flex justify-between items-center">
                  <div>
                    <h3 className="text-xs font-black uppercase tracking-wider text-slate-900">
                      📂 Revenue Category Slices
                    </h3>
                    <p className="text-[11px] text-slate-500">Breakdown of collectable targets across Tuition Fees, Annual Fund, and general balances.</p>
                  </div>
                  <span className="text-[9px] font-mono bg-indigo-50 text-indigo-600 px-2 py-0.5 uppercase font-bold">Grouped Streams</span>
                </div>

                {(() => {
                  const categories = ['Tuition Fee', 'Annual Fee', 'Paper Fund', 'Pending Balance', 'Miscellaneous'];
                  const recordsMap = categories.reduce((acc, cat) => {
                    acc[cat] = { category: cat, Collected: 0, Pending: 0 };
                    return acc;
                  }, {} as Record<string, { category: string; Collected: number; Pending: number }>);

                  fees.forEach(fee => {
                    const type = fee.feeType || 'Tuition Fee';
                    const key = recordsMap[type] ? type : 'Miscellaneous';
                    if (fee.status === 'paid') {
                      recordsMap[key].Collected += Number(fee.amount || 0);
                    } else {
                      recordsMap[key].Pending += Number(fee.amount || 0);
                    }
                  });

                  const chartData = Object.values(recordsMap);

                  return (
                    <div className="h-80 w-full pt-4">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                          data={chartData}
                          margin={{ top: 10, right: 10, left: -10, bottom: 5 }}
                        >
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                          <XAxis 
                            dataKey="category" 
                            stroke="#64748b" 
                            fontSize={9} 
                            tickLine={false}
                          />
                          <YAxis 
                            stroke="#64748b" 
                            fontSize={10} 
                            tickLine={false}
                            axisLine={false}
                            tickFormatter={(v) => `${v}`}
                          />
                          <Tooltip 
                            formatter={(value) => [`${value}`, undefined]}
                            contentStyle={{ fontSize: '11px', fontFamily: 'monospace', borderRadius: '4px' }}
                          />
                          <Legend 
                            wrapperStyle={{ fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.05em' }} 
                          />
                          <Bar dataKey="Collected" name="Collected" fill="#3b82f6" radius={[2, 2, 0, 0]} />
                          <Bar dataKey="Pending" name="Unpaid" fill="#f59e0b" radius={[2, 2, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  );
                })()}
              </div>

            </div>

            {/* ANNUAL LEDGER DETAIL SEARCH */}
            <div className="bg-white p-6 shadow-sm border border-slate-100 border-t-4 border-t-indigo-600">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center border-b pb-4 mb-6">
                <div>
                  <h3 className="text-xs font-black uppercase tracking-wider text-slate-900 flex items-center gap-1.5">
                    📑 Individual Student Annual Ledger
                  </h3>
                  <p className="text-[11px] text-slate-500">Search and audit the entire academic year transactions for a specific student profile.</p>
                </div>
                <div className="mt-3 md:mt-0 flex gap-2">
                  <select 
                    value={selectedStudentForLedger}
                    onChange={(e) => setSelectedStudentForLedger(e.target.value)}
                    className="text-[10px] font-black uppercase tracking-widest bg-slate-50 border border-slate-200 px-3 py-2 outline-none focus:border-indigo-600"
                  >
                    <option value="">-- SELECT STUDENT FOR LEDGER --</option>
                    {students.sort((a,b) => a.name.localeCompare(b.name)).map(s => {
                      const classObj = classes.find(c => c.id === s.classId);
                      return (
                        <option key={s.id} value={s.id}>
                          {s.name} ({classObj?.className})
                        </option>
                      );
                    })}
                  </select>
                  {selectedStudentForLedger && (
                    <button 
                      onClick={() => setSelectedStudentForLedger('')}
                      className="p-2 bg-slate-900 text-white hover:bg-rose-600 transition-all"
                    >
                      <X size={16} />
                    </button>
                  )}
                </div>
              </div>

              {selectedStudentForLedger ? (
                <div className="animate-fade-in-up">
                  <CashPaymentEntry 
                    studentId={selectedStudentForLedger} 
                    fees={fees} 
                    setFees={setFees}
                    studentName={students.find(s => s.id === selectedStudentForLedger)?.name} 
                  />
                </div>
              ) : (
                <div className="py-12 border-2 border-dashed border-slate-100 flex flex-col items-center justify-center text-slate-300">
                  <User size={48} className="mb-2 opacity-20" />
                  <p className="text-xs font-black uppercase tracking-widest italic opacity-50">Please select a student above to generate annual statement</p>
                </div>
              )}
            </div>

            {/* THREE COLUMN GRID: LEADERBOARD OF UNPAID DUES + RECALL AUTOPILOT */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              
              {/* Outstandling Dues List */}
              <div className="bg-white p-6 shadow-sm border border-slate-100 space-y-4 lg:col-span-3 flex flex-col justify-between">
                <div>
                  <div className="border-b pb-3 flex justify-between items-center">
                    <div>
                      <h3 className="text-xs font-black uppercase tracking-wider text-slate-900 flex items-center gap-1.5">
                        🚨 Outstanding Dues Ledger (List of Arrears)
                      </h3>
                      <p className="text-[11px] text-slate-500">List of students with accrued unpaid balances for current academic cycle.</p>
                    </div>
                    <span className="text-[9px] font-mono bg-rose-50 text-rose-600 px-2.5 py-1 font-bold">Unsettled Debt Ledger</span>
                  </div>

                  {(() => {
                    const studentDebtMap: Record<string, { id: string; name: string; classId: string; totalOwed: number; phone: string; invoiceIds: string[] }> = {};
                    
                    fees.forEach(fee => {
                      if (fee.status !== 'paid') {
                        const student = students.find(s => s.id === fee.studentId);
                        if (student) {
                          if (!studentDebtMap[student.id]) {
                            studentDebtMap[student.id] = {
                              id: student.id,
                              name: student.name,
                              classId: student.classId,
                              totalOwed: 0,
                              phone: student.parentPhone || '0300-1112222',
                              invoiceIds: []
                            };
                          }
                          studentDebtMap[student.id].totalOwed += Number(fee.amount || 0);
                          studentDebtMap[student.id].invoiceIds.push(fee.id);
                        }
                      }
                    });

                    const topUnpaid = Object.values(studentDebtMap)
                      .sort((a, b) => b.totalOwed - a.totalOwed);

                    if (topUnpaid.length === 0) {
                      return (
                        <div className="py-12 text-center text-xs text-slate-400">
                          ★ Perfect Clearance Record! No student currently owes school balances.
                        </div>
                      );
                    }

                    return (
                      <div className="space-y-4 mt-4">
                        <div className="space-y-3">
                          {topUnpaid.map((st, i) => {
                            const classNameStr = classes.find(c => c.id === st.classId)?.className || 'General Class';

                            return (
                              <div key={st.id} className="bg-slate-50/70 border border-slate-100 p-3.5 flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
                                <div className="space-y-1">
                                  <div className="flex items-center gap-2">
                                    <span className="text-[10px] w-5 h-5 rounded-full bg-slate-900 text-white flex items-center justify-center font-black">
                                      {i + 1}
                                    </span>
                                    <h4 className="text-xs font-black uppercase text-slate-800">{st.name}</h4>
                                    <span className="text-[9px] bg-indigo-50 text-indigo-600 px-2 py-0.5 font-bold">{classNameStr}</span>
                                  </div>
                                  <p className="text-[9px] text-gray-400 font-mono">Parents Contact: <span className="text-slate-700 font-bold">{st.phone}</span></p>
                                </div>

                                <div className="flex items-center gap-2.5 self-end md:self-auto">
                                  <div className="text-right">
                                    <span className="text-xs font-black text-rose-600 font-mono block">{st.totalOwed}</span>
                                    <span className="text-[8px] text-gray-400 uppercase font-bold tracking-wider font-mono">{st.invoiceIds.length} unpaid billings</span>
                                  </div>
                                  
                                  <div className="h-8 border-r border-slate-200"></div>

                                  <div className="flex gap-1.5">
                                    <button
                                      type="button"
                                      onClick={() => {
                                        // settle all invoices of this student
                                        st.invoiceIds.forEach(invId => handleToggleSettleFee(invId));
                                        toast.success(`All invoices associated with student ${st.name} settled successfully!`);
                                      }}
                                      className="bg-white hover:bg-slate-100 text-slate-800 font-extrabold text-[9px] tracking-wider px-2.5 py-1.5 uppercase border border-slate-200 transition-all cursor-pointer"
                                    >
                                      ✓ Settle Entire Balance
                                    </button>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })()}
                </div>

                <div className="text-right pt-4 border-t border-dashed border-slate-200">
                  <span className="text-[9px] text-gray-400 font-mono">Ledger data reflects current outstanding receivables stored in system cache.</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ========== SETTINGS & CONFIGURATION PORTAL ========== */}
        {activeTab === 'settings' && (
          <div id="panel-principal-settings" className="space-y-8 animate-fade-in font-sans">
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
                        placeholder="teacher_123"
                        className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-500"
                        disabled={modalMode === 'add'}
                      />
                      {modalMode === 'add' && <p className="text-[9px] text-gray-400 italic">Auto-generated on save</p>}
                    </div>

                    <div className="space-y-1">
                      <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider">Password</label>
                      <input
                        type="text"
                        required
                        value={tPassword}
                        onChange={(e) => setTPassword(e.target.value)}
                        placeholder="password123"
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
                        placeholder="student_123"
                        className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-500"
                        disabled={modalMode === 'add'}
                      />
                      {modalMode === 'add' && <p className="text-[9px] text-gray-400 italic">Auto-generated on save</p>}
                    </div>

                    <div className="space-y-1">
                      <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider">Password</label>
                      <input
                        type="text"
                        required
                        value={sPassword}
                        onChange={(e) => setSPassword(e.target.value)}
                        placeholder="password123"
                        className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-500"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider">Student Email</label>
                    <input
                      type="email"
                      required
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
          {userSession.role === 'principal' && (
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
                <Trash2 size={12} /> Yes, Delete Subject
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
