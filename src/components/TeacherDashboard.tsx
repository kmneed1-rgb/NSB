import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'sonner';
import { 
  Users, Calendar, Award, CheckSquare, LogOut, Save, UserCheck, UserX,
  Clock, AlertCircle, Sparkles, BookOpen, Menu, X, ArrowLeft, ClipboardList, Info, CreditCard,
  Bell, CheckCircle2, ListTodo, CalendarDays, ArrowRight, Search, PlusCircle, AlertTriangle, ChevronDown, Sun, Moon, Phone, Trash2, Plus, Send
} from 'lucide-react';
import { getNotifications, addNotification, saveNotifications, PortalNotification } from '../lib/notificationUtils';
import { getPeriodStatus, getStatusColor } from '../lib/periodUtils';
import { Teacher, Student, Class, TimetableEntry, Attendance, Mark, ExamType, UserSession, FeeRecord, DayOfWeek } from '../types';

interface TeacherDashboardProps {
  userSession: UserSession;
  teachers: Teacher[];
  setTeachers: React.Dispatch<React.SetStateAction<Teacher[]>>;
  students: Student[];
  setStudents: React.Dispatch<React.SetStateAction<Student[]>>;
  classes: Class[];
  timetable: TimetableEntry[];
  attendance: Attendance[];
  setAttendance: React.Dispatch<React.SetStateAction<Attendance[]>>;
  marks: Mark[];
  setMarks: React.Dispatch<React.SetStateAction<Mark[]>>;
  fees: FeeRecord[];
  setFees: React.Dispatch<React.SetStateAction<FeeRecord[]>>;
  onLogout: () => void;
}

type TabType = 'dashboard' | 'students' | 'attendance' | 'marks' | 'timetable' | 'fees' | 'settings';

export default function TeacherDashboard({
  userSession,
  teachers,
  setTeachers,
  students,
  setStudents,
  classes,
  timetable,
  attendance,
  setAttendance,
  marks,
  setMarks,
  fees,
  setFees,
  onLogout
}: TeacherDashboardProps) {
  const [activeTab, setActiveTab] = useState<TabType>('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showAddFeeModal, setShowAddFeeModal] = useState(false);
  const [newFeeStudentId, setNewFeeStudentId] = useState('');
  const [newFeeAmount, setNewFeeAmount] = useState('');
  const [newFeeType, setNewFeeType] = useState('Tuition Fee');
  const [newFeeMonth, setNewFeeMonth] = useState('June 2026');
  const [amountCollected, setAmountCollected] = useState('');

  // SATH HI parent notification popup alert states for teacher
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

  // Identify teacher's profile
  const teacherProfile = teachers.find(t => t.id === userSession.id);
  const teacherId = teacherProfile?.id || '';
  const teacherSubject = teacherProfile?.subject || 'All Subjects';

  // Find all classes where this teacher is either the class teacher or teaches a subject
  const myClasses = classes.filter(c => 
    c.classTeacherId === teacherId || 
    timetable.some(tt => tt.teacherId === teacherId && tt.classId === c.id)
  );
  
  const classId = myClasses.find(c => c.classTeacherId === teacherId)?.id || myClasses[0]?.id || '';

  // Fallback class view strictly limited to teacher's classes
  const [activeClassId, setActiveClassId] = useState<string>(classId);
  
  const viewClassStudents = students.filter(s => activeClassId === 'all' || s.classId === activeClassId);

  const handleAddCashFee = () => {
    if (!newFeeStudentId || !newFeeAmount) {
      alert('Please select a student and enter amount.');
      return;
    }
    const student = students.find(s => s.id === newFeeStudentId);
    if (!student) return;

    const billTotal = Number(newFeeAmount);
    const collected = Number(amountCollected) || billTotal;

    const updatedFees = fees.filter(f => !(f.studentId === newFeeStudentId && f.status === 'unpaid'));

    if (collected > 0 && collected < billTotal) {
      // Record partial
      const paidRecord: FeeRecord = {
        id: `fee_p_t_${Date.now()}`,
        studentId: newFeeStudentId,
        amount: collected,
        dueDate: new Date().toISOString().split('T')[0],
        status: 'paid',
        paidDate: new Date().toISOString().split('T')[0],
        month: newFeeMonth,
        feeType: newFeeType,
        paymentMethod: 'Cash Partial (Faculty)',
        description: `Partial collection recorded by faculty (${collected} of ${billTotal})`
      };

      const arrearsRecord: FeeRecord = {
        id: `fee_a_t_${Date.now()}`,
        studentId: newFeeStudentId,
        amount: billTotal - collected,
        dueDate: new Date().toISOString().split('T')[0],
        status: 'unpaid',
        month: newFeeMonth,
        feeType: 'Arrears / Balance',
        description: `Arrears from faculty collection (${newFeeType})`
      };

      setFees([paidRecord, arrearsRecord, ...updatedFees]);
    } else {
      const newFee: FeeRecord = {
        id: `fee_t_${Date.now()}`,
        studentId: newFeeStudentId,
        amount: billTotal,
        dueDate: new Date().toISOString().split('T')[0],
        status: 'paid',
        paidDate: new Date().toISOString().split('T')[0],
        month: newFeeMonth,
        feeType: newFeeType,
        paymentMethod: 'Cash (Direct Collection)',
        description: `Direct cash collection by Faculty: ${userSession.name}`
      };
      setFees([newFee, ...updatedFees]);
    }

    toast.success(`Collection of ${collected} for ${student.name} recorded!`);

    // SATH HI: Trigger parents message notification popup preview
    const rawMsg = `Saddar Campus Fee Deposit Receipt:\nAssalam-o-Alaikum! Fee payment of Rs. ${collected} has been received for student ${student.name} (${newFeeMonth} - ${newFeeType}). Your account balance has been updated. Thank you.\n- NSB1 Digital Registrar Office.`;

    setFeeNotificationPopup({
      studentName: student.name,
      parentPhone: student.parentPhone || '0300-1111222',
      guardianName: student.guardianName || 'Guardian of ' + student.name,
      amount: collected,
      feeType: newFeeType,
      month: newFeeMonth,
      dueDate: new Date().toISOString().split('T')[0],
      messageText: rawMsg
    });

    setShowAddFeeModal(false);
    setNewFeeAmount('');
    setAmountCollected('');
    setNewFeeStudentId('');
  };
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [newPassword, setNewPassword] = useState('');

  // ATTENDANCE STATES
  const [attendanceDate, setAttendanceDate] = useState('2026-06-09'); // Default date based on simulated metadata
  // Local scratchpad for managing attendance edits before saving
  const [scratchAttendance, setScratchAttendance] = useState<{ [studentId: string]: 'present' | 'absent' }>({});
  const [attendanceMode, setAttendanceMode] = useState<'list' | 'swipe'>('list');
  const [activeSwipeIndex, setActiveSwipeIndex] = useState<number>(0);
  const [feeSearch, setFeeSearch] = useState('');
  const [expandedFeeId, setExpandedFeeId] = useState<string | null>(null);

  const [selectedStudentProfile, setSelectedStudentProfile] = useState<Student | null>(null);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [profileMarkSubject, setProfileMarkSubject] = useState(teacherSubject);
  const [profileMarkExam, setProfileMarkExam] = useState('');
  const [profileMarkObtained, setProfileMarkObtained] = useState('');
  const [profileMarkMax, setProfileMarkMax] = useState('100');

  // MARKS STATES
  const [selectedMarkClassId, setSelectedMarkClassId] = useState<string>(activeClassId);
  const [selectedSubject, setSelectedSubject] = useState<string>('');
  const [selectedExamType, setSelectedExamType] = useState<ExamType>('Monthly test');
  const [maxMarksInput, setMaxMarksInput] = useState<number>(100);
  
  // NEW REPORT BUILDER STATE
  const [reportStudentId, setReportStudentId] = useState<string>('');
  const [reportSubjectsList, setReportSubjectsList] = useState<{ id: string, subject: string, ref: string, maxMarks: string, obtained: string }[]>([]);
  const [reportSubjectToAdd, setReportSubjectToAdd] = useState<string>('');
  const [reportRefToAdd, setReportRefToAdd] = useState<string>('');
  
  const [scratchMarks, setScratchMarks] = useState<{ [studentId: string]: string }>({});

  // Helper to resolve weekday from date string (format YYYY-MM-DD)
  const getWeekdayFromDateStr = (dateStr: string): DayOfWeek => {
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      const year = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10) - 1;
      const day = parseInt(parts[2], 10);
      const d = new Date(year, month, day);
      const dayIndex = d.getDay(); // 0: Sun, 1: Mon, 2: Tue, 3: Wed, 4: Thu, 5: Fri, 6: Sat
      const mapping: Record<number, DayOfWeek> = {
        1: 'Monday',
        2: 'Tuesday',
        3: 'Wednesday',
        4: 'Thursday',
        5: 'Friday'
      };
      return mapping[dayIndex] || 'Tuesday'; // Fallback
    }
    return 'Tuesday';
  };

  const currentDayName = getWeekdayFromDateStr(attendanceDate);

  // Filter today's classes for this teacher
  const todayClasses = timetable
    .filter(tt => tt.teacherId === teacherId && tt.day === currentDayName)
    // Sort chronologically by Period
    .sort((a, b) => {
      const parsePeriod = (p: string) => {
        const num = parseInt(p.replace(/[^0-9]/g, ''), 15);
        return isNaN(num) ? 99 : num;
      };
      return parsePeriod(a.period) - parsePeriod(b.period);
    });

  // Unique list of class IDs taught today
  const classesTaughtToday = Array.from(new Set(todayClasses.map(tt => tt.classId)));

  // Notifications local states
  const [notifications, setNotifications] = useState<PortalNotification[]>(() => getNotifications());
  const [showNotifDropdown, setShowNotifDropdown] = useState(false);
  const notifiedPeriodsRef = useRef<string[]>([]);

  // Theme support
  const [darkTheme, setDarkTheme] = useState<boolean>(() => {
    return localStorage.getItem('acadamis_dark_theme') === 'true';
  });

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

  // Update notifications from global state on external events
  useEffect(() => {
    const updateNotifs = () => {
      setNotifications(getNotifications());
    };
    window.addEventListener('acadamis_new_notification', updateNotifs);
    return () => window.removeEventListener('acadamis_new_notification', updateNotifs);
  }, []);

  // Real-time period detection interval (runs every 10 seconds)
  useEffect(() => {
    const checkActivePeriods = () => {
      // Find today's lectures for this teacher
      const myTodayLectures = timetable.filter(tt => tt.teacherId === teacherId && tt.day === currentDayName);
      if (myTodayLectures.length === 0) return;

      myTodayLectures.forEach(lecture => {
        const status = getPeriodStatus(lecture.time);
        if (status === 'current') {
          // Check if we already notified during this session
          if (!notifiedPeriodsRef.current.includes(lecture.id)) {
            notifiedPeriodsRef.current.push(lecture.id);
            
            const classObj = classes.find(c => c.id === lecture.classId);
            const classStr = classObj ? `${classObj.className}-${classObj.section}` : '';
            
            // Trigger Toast Notification
            toast.success(`🔔 Class Bell: ${lecture.period} has started!`, {
              description: `Subject "${lecture.subject}" is active for Class ${classStr}.`,
              duration: 8000
            });

            // Add notification
            addNotification({
              type: 'period_bell',
              title: `${lecture.period} Started ⏰`,
              message: `Class bell is ringing! Your scheduled lecture for "${lecture.subject}" is now active for Class ${classStr}. Kindly proceed to your classroom.`,
              teacherId: teacherId,
              classId: lecture.classId,
              role: 'teacher'
            });
          }
        }
      });
    };

    const interval = /^[0-9]/.test(attendanceDate) ? setInterval(checkActivePeriods, 10050) : null;
    checkActivePeriods();

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [timetable, teacherId, currentDayName, classes, attendanceDate]);

  // Manually Simulate Next Period
  const handleSimulateNextPeriod = () => {
    // Collect all lectures for this teacher regardless of day, sorted chronologically
    const allTeacherLectures = timetable.filter(tt => tt.teacherId === teacherId);
    if (allTeacherLectures.length === 0) {
      toast.error("No lectures scheduled for you in the timetable yet. Ask the Principal to add one!");
      return;
    }

    // Pick one at random to simulate
    const randIndex = Math.floor(Math.random() * allTeacherLectures.length);
    const lecture = allTeacherLectures[randIndex];
    const classObj = classes.find(c => c.id === lecture.classId);
    const classStr = classObj ? `${classObj.className}-${classObj.section}` : 'General';

    // Show simulation toast
    toast.info(`🔔 Simulated Bell: ${lecture.period} started!`, {
      description: `Class: ${classStr} | Subject: ${lecture.subject}. Notification has been dispatched to both your portal and your students!`,
      duration: 6000
    });

    // Add persistent notification so both teacher and student get it
    addNotification({
      type: 'period_bell',
      title: `${lecture.period} Started (${lecture.subject}) ⏰`,
      message: `🔔 Simulated School Bell is ringing! Today's lecture "${lecture.subject}" for Class ${classStr} with instructor ${userSession.name} has begun.`,
      teacherId: teacherId,
      classId: lecture.classId,
      role: 'all'
    });
  };

  const handleMarkAllRead = () => {
    const updated = notifications.map(n => ({ ...n, isUnread: false }));
    saveNotifications(updated);
    setNotifications(updated);
    toast.success("All notifications marked as read.");
  };

  const handleClearNotifications = () => {
    saveNotifications([]);
    setNotifications([]);
    toast.success("Notification history cleared.");
  };

  // All relevant classes to track for attendance today (Assigned Class + classes taught today)
  const classesToCheckForReminders = Array.from(new Set([
    ...(myClasses.find(c => c.classTeacherId === teacherId)?.id ? [myClasses.find(c => c.classTeacherId === teacherId)!.id] : []),
    ...classesTaughtToday
  ]));

  // Count pending and completed for attendance checklist
  const attendanceStatusList = classesToCheckForReminders.map(cId => {
    const cls = classes.find(item => item.id === cId);
    const classStudents = students.filter(s => s.classId === cId);
    const marked = classStudents.length > 0 && attendance.some(a => a.date === attendanceDate && classStudents.some(s => s.id === a.studentId));
    return {
      classId: cId,
      className: cls ? `${cls.className}-${cls.section}` : 'N/A',
      isMentorClass: cId === classId,
      marked,
      studentCount: classStudents.length
    };
  });

  const pendingCount = attendanceStatusList.filter(item => !item.marked).length;

  // GET RELEVANT DATA FOR ACTIVE VIEW
  const viewClass = classes.find(c => c.id === activeClassId);

  // Initialize attendance scratchpad for selected class & date
  const loadAttendanceForDate = (date: string, cId: string) => {
    const classStudents = students.filter(s => s.classId === cId);
    const dateAttendance = attendance.filter(a => a.date === date);
    
    const initialToggles: { [studentId: string]: 'present' | 'absent' } = {};
    classStudents.forEach(student => {
      const match = dateAttendance.find(a => a.studentId === student.id);
      // Default to 'present' if not marked, or set stored value
      initialToggles[student.id] = match ? match.status : 'present';
    });
    setScratchAttendance(initialToggles);
    setActiveSwipeIndex(0);
  };

  // Trigger loading when entering attendance tab or changing date/class
  const handleEnterAttendanceTab = (clsId: string, dateStr: string) => {
    setActiveClassId(clsId);
    setAttendanceDate(dateStr);
    loadAttendanceForDate(dateStr, clsId);
  };

  const handleToggleAttendance = (studentId: string) => {
    setScratchAttendance(prev => ({
      ...prev,
      [studentId]: prev[studentId] === 'present' ? 'absent' : 'present'
    }));
  };

  const handleSaveAttendance = () => {
    const studentsToSave = students.filter(s => s.classId === activeClassId);
    
    // Filter out existing entries for this date & students in this class
    const cleanLogs = attendance.filter(a => 
      !(a.date === attendanceDate && studentsToSave.some(s => s.id === a.studentId))
    );

    // Build new logs
    const newLogs: Attendance[] = studentsToSave.map((s, index) => ({
      id: `at_gen_${Date.now()}_${index}`,
      studentId: s.id,
      date: attendanceDate,
      status: scratchAttendance[s.id] || 'present'
    }));

    setAttendance([...cleanLogs, ...newLogs]);
    toast.success('Attendance logs successfully updated and cached!');
  };

  // MARKS ENGINE
  const handleEnterMarksTab = (clsId: string, subject: string, exam: ExamType) => {
    setSelectedMarkClassId(clsId);
    setSelectedSubject(subject);
    setSelectedExamType(exam);

    // Load initial marks values
    const classStudents = students.filter(s => s.classId === clsId);
    const scratch: { [studentId: string]: string } = {};
    
    let resolvedMaxMarks = exam === 'Unit Test' ? 25 : 100;
    
    classStudents.forEach(student => {
      const match = marks.find(
        m => m.studentId === student.id && 
             (m.subject?.toLowerCase() || '') === (subject?.toLowerCase()?.trim() || '') && 
             m.examType === exam
      );
      scratch[student.id] = match ? String(match.marksObtained) : '';
      if (match) {
        resolvedMaxMarks = match.maxMarks;
      }
    });
    
    setMaxMarksInput(resolvedMaxMarks);
    setScratchMarks(scratch);
  };

  const handleSaveMarks = () => {
    const classStudents = students.filter(s => s.classId === selectedMarkClassId);
    if (!selectedSubject.trim()) {
      alert('Subject name is required to log scores.');
      return;
    }

    // Filter out existing marked records for this specific class scope, subject & exam type
    const cleanMarks = marks.filter(m => 
      !( (m.subject?.toLowerCase() || '') === (selectedSubject?.toLowerCase()?.trim() || '') && 
        m.examType === selectedExamType && 
        classStudents.some(s => s.id === m.studentId))
    );

    // Build new records
    const newRecords: Mark[] = [];
    classStudents.forEach((student, index) => {
      const scoreStr = scratchMarks[student.id];
      if (scoreStr !== undefined && scoreStr.trim() !== '') {
        const score = parseFloat(scoreStr);
        if (!isNaN(score)) {
          newRecords.push({
            id: `m_gen_${Date.now()}_${index}`,
            studentId: student.id,
            subject: selectedSubject.trim(),
            examType: selectedExamType,
            marksObtained: Math.min(score, maxMarksInput), // clamp to maximum marks
            maxMarks: maxMarksInput
          });
        }
      }
    });

    setMarks([...cleanMarks, ...newRecords]);
    toast.success('Exam marks mapped and committed to storage.');
  };

  const handleAddMarkFromProfile = () => {
    if (!selectedStudentProfile) return;
    if (!profileMarkSubject.trim() || !profileMarkExam.trim() || !profileMarkObtained.trim()) {
      toast.error("Please fill all marks fields correctly");
      return;
    }

    const marksObtainedNum = parseFloat(profileMarkObtained);
    const maxMarksNum = parseFloat(profileMarkMax) || 100;

    if (isNaN(marksObtainedNum)) {
      toast.error("Marks obtained must be a number");
      return;
    }

    const newMark: Mark = {
      id: `m_prof_${Date.now()}`,
      studentId: selectedStudentProfile.id,
      subject: profileMarkSubject.trim(),
      examType: profileMarkExam.trim(),
      marksObtained: marksObtainedNum,
      maxMarks: maxMarksNum,
    };

    setMarks(prev => [...prev, newMark]);
    setProfileMarkExam('');
    setProfileMarkObtained('');
    toast.success(`Mark added for ${selectedStudentProfile.name}`);
  };

  // Group Timetable elements neatly
  const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
  
  const getPeriodsList = () => {
    const defaultPeriods = ['Period 1', 'Period 2', 'Period 3', 'Period 4', 'Period 5'];
    try {
      const saved = localStorage.getItem('acadamis_extra_periods');
      const deletedSaved = localStorage.getItem('acadamis_deleted_periods');
      
      const extra = saved ? JSON.parse(saved) : {};
      const deleted = deletedSaved ? JSON.parse(deletedSaved) : {};
      
      const classIds = myClasses.map(c => c.id);
      if (classIds.length === 0) {
        const allExtras = Object.values(extra).flat() as string[];
        const baseList = [...defaultPeriods, ...allExtras];
        const allDeletes = Object.values(deleted).flat() as string[];
        const unique = Array.from(new Set(baseList)).filter(p => !allDeletes.includes(p));
        return unique.sort((a, b) => {
          const aNum = parseInt(a.replace(/\D/g, '')) || 0;
          const bNum = parseInt(b.replace(/\D/g, '')) || 0;
          return aNum - bNum;
        });
      }
      
      const activePeriodsSet = new Set<string>();
      classIds.forEach(cId => {
        const classExtras = extra[cId] || [];
        const classDeleted = deleted[cId] || [];
        const classActive = [...defaultPeriods, ...classExtras].filter(p => !classDeleted.includes(p));
        classActive.forEach(p => activePeriodsSet.add(p));
      });
      
      const unique = Array.from(activePeriodsSet);
      return unique.sort((a, b) => {
        const aNum = parseInt(a.replace(/\D/g, '')) || 0;
        const bNum = parseInt(b.replace(/\D/g, '')) || 0;
        return aNum - bNum;
      });
    } catch (e) {
      console.error(e);
    }
    return defaultPeriods;
  };
  const PERIODS = getPeriodsList();

  // Resolve class details for timetable
  const getClassLabel = (cId: string) => {
    const c = classes.find(item => item.id === cId);
    return c ? `${c.className}-${c.section}` : 'N/A';
  };

  return (
    <div id="teacher-dashboard-root" className="min-h-screen bg-gray-50 flex flex-col md:flex-row pb-16 md:pb-0 relative">
      
      {/* Mobile Top Bar */}
      <div id="mobile-teacher-top-bar" className="md:hidden flex items-center justify-between px-4 py-3 bg-white border-b border-gray-200 shadow-sm z-20">
        <div className="flex items-center gap-2">
          <BookOpen className="text-emerald-600" size={20} />
          <span className="font-bold text-gray-900 tracking-tight">Teacher Desk</span>
        </div>
        <div className="flex items-center gap-2 relative">
          {/* Mobile Bell Button */}
          <button 
            type="button"
            onClick={() => setShowNotifDropdown(!showNotifDropdown)}
            className="p-1.5 text-slate-500 hover:text-slate-900 transition-colors relative"
            title="Notifications"
          >
            <Bell size={18} />
            {notifications.filter(n => n.isUnread).length > 0 && (
              <span className="absolute -top-1 -right-1 bg-red-650 text-white font-black text-[7px] w-4.5 h-4.5 rounded-full flex items-center justify-center border border-white">
                {notifications.filter(n => n.isUnread).length}
              </span>
            )}
          </button>

          <button 
             onClick={onLogout}
             className="px-3 py-1.5 rounded-lg border border-red-100 text-red-600 bg-red-50 hover:bg-red-600 hover:text-white flex items-center gap-1.5 font-black text-[10px] uppercase transition-all shadow-sm"
             title="Logout"
          >
            <LogOut size={14} />
            EXIT
          </button>
          
          <button 
            id="teacher-sidebar-toggle" 
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-1.5 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-100"
          >
            <Menu size={20} />
          </button>
        </div>
      </div>

      {/* Sidebar background overlay */}
      {sidebarOpen && (
        <div 
          onClick={() => setSidebarOpen(false)} 
          className="fixed inset-0 bg-black/40 z-30 md:hidden"
        />
      )}

      {/* Teacher Sidebar Drawer */}
      <div 
        id="sidebar-teacher" 
        className={`fixed md:sticky top-0 left-0 h-screen w-64 bg-white border-r border-slate-100 flex flex-col justify-between z-40 transition-transform duration-300 transform md:transform-none ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        } font-sans`}
      >
        <div>
          {/* Minimalist Brand header */}
          <div className="p-8 border-b border-slate-50 flex flex-col items-center gap-3">
            <div className="flex items-center justify-between w-full">
              <img 
                src="/src/assets/images/nsb1_logo_white_bg_1781098534962.png" 
                alt="NSB 1 ACADEMY" 
                className="h-12 w-auto object-contain"
                referrerPolicy="no-referrer"
              />
              <button onClick={() => setSidebarOpen(false)} className="md:hidden text-slate-400 hover:text-slate-900">
                <X size={18} />
              </button>
            </div>
            <div className="text-center w-full">
              <h1 className="text-slate-900 font-black text-lg tracking-widest uppercase italic leading-none">NSB1 Academy</h1>
              <p className="text-slate-400 font-bold text-[9px] tracking-[0.3em] uppercase mt-1">Faculty Hub</p>
            </div>
          </div>

          {/* Nav groups - Minimalist List */}
          <nav className="p-4 space-y-1 mt-6">
            {[
              { id: 'dashboard', label: 'Overview', icon: Sparkles },
              { id: 'students', label: 'Roster', icon: Users },
              { id: 'attendance', label: 'Roll Call', icon: CheckSquare, action: () => handleEnterAttendanceTab(activeClassId || classes[0]?.id || '', attendanceDate) },
              { id: 'marks', label: 'Grading', icon: Award, action: () => handleEnterMarksTab(selectedMarkClassId || classes[0]?.id || '', selectedSubject, selectedExamType) },
              { id: 'timetable', label: 'Schedule', icon: Calendar },
              
              { id: 'settings', label: 'Settings', icon: Sparkles }
            ].map((item) => (
              <button
                key={item.id}
                onClick={() => { 
                  if (item.action) item.action();
                  setActiveTab(item.id as TabType); 
                  setSidebarOpen(false); 
                }}
                className={`w-full flex items-center gap-3 px-4 py-3 text-[10px] font-black uppercase tracking-widest text-left transition-all ${
                  activeTab === item.id 
                    ? 'bg-slate-900 text-white' 
                    : 'text-slate-400 hover:text-slate-900 hover:bg-slate-50'
                }`}
              >
                <item.icon size={14} className={activeTab === item.id ? 'text-white' : 'text-slate-300'} />
                {item.label}
              </button>
            ))}
          </nav>
        </div>

        {/* Minimalist Profile section */}
        <div className="p-6 border-t border-slate-50">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-8 h-8 rounded-none bg-slate-900 flex items-center justify-center text-white font-black text-[10px] italic">
              {userSession.name.charAt(0)}
            </div>
            <div className="truncate">
              <p className="text-slate-900 text-[11px] font-black uppercase tracking-tight truncate">{userSession.name}</p>
              <p className="text-slate-400 text-[9px] font-bold uppercase tracking-widest truncate">{teacherSubject}</p>
            </div>
          </div>
          
          <button
            onClick={onLogout}
            className="w-full py-4 bg-rose-600 text-white hover:bg-rose-700 transition-all text-xs font-black uppercase tracking-widest text-center cursor-pointer flex items-center justify-center gap-2 shadow-lg shadow-rose-100"
          >
            <LogOut size={16} />
            EXIT FACULTY PORTAL
          </button>
        </div>
      </div>

      {/* Main Panel Content */}
      <main className="flex-1 min-h-screen flex flex-col p-4 md:p-8 lg:p-10 max-w-7xl mx-auto w-full text-slate-800 font-sans">
        
        {/* Global Desktop Top Bar with Real-time Period Alert & Notification Bell */}
        <div className="flex items-center justify-between border-b border-slate-200 pb-4 mb-6 z-30 relative font-sans">
          <div className="flex items-center gap-6">
            <h1 className="text-xl font-bold text-slate-900 tracking-tight sm:block hidden select-none">NSB1 Academy Faculty portal</h1>
            
            {/* Real-time active period locator */}
            {(() => {
              // Find today's current lecture based on clock time & selected day
              const currentPeriodObj = timetable.find(tt => {
                if (tt.teacherId !== teacherId) return false;
                const systemDays = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
                const systName = systemDays[new Date().getDay()];
                // Match today or our date selector's weekday
                if (tt.day !== systName && tt.day !== currentDayName) return false;
                
                try {
                  const status = getPeriodStatus(tt.time);
                  return status === 'current';
                } catch (e) {
                  return false;
                }
              });

              if (!currentPeriodObj) return (
                <div className="flex items-center gap-2 px-3 py-1 bg-slate-100 text-slate-600 rounded-full text-[10px] font-bold uppercase tracking-wider">
                  <span className="w-1.5 h-1.5 rounded-full bg-slate-400"></span>
                  No Active Lecture Right Now
                </div>
              );

              const matchingClass = classes.find(c => c.id === currentPeriodObj.classId);
              const classLabel = matchingClass ? `${matchingClass.className}-${matchingClass.section}` : '';

              return (
                <div className="flex items-center gap-2 px-3 py-1 bg-red-50 border border-red-100 text-red-700 rounded-full text-[10px] font-extrabold uppercase tracking-widest animate-pulse">
                  <span className="w-1.5 h-1.5 rounded-full bg-red-650 animate-ping"></span>
                  LIVE: {currentPeriodObj.period} ({currentPeriodObj.subject} — Class {classLabel})
                </div>
              );
            })()}
          </div>

          <div className="flex items-center gap-3">
            {/* Quick Period Simulator */}
            <button
              onClick={handleSimulateNextPeriod}
              className="text-[9px] font-extrabold uppercase tracking-widest bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 text-indigo-700 px-3 py-2 transition-all shadow-xs rounded-none flex items-center gap-1.5 cursor-pointer"
              title="Test class bells and push notifications"
            >
              <Clock size={12} className="animate-spin-slow" />
              Simulate Bell
            </button>

            {/* Quick Dark Mode Toggler */}
            <button
              type="button"
              onClick={handleToggleTheme}
              className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 rounded-none transition-all flex items-center justify-center text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-900"
              title="Toggle Dark/Light Mode"
            >
              {darkTheme ? <Sun size={15} className="text-amber-500 animate-pulse" /> : <Moon size={15} />}
            </button>

            {/* Notification Bell Dropdown */}
            {/* Visible on both mobile and desktop via single dropdown trigger */}
            <div className="relative">
              <button 
                onClick={() => setShowNotifDropdown(!showNotifDropdown)}
                className={`p-2 hover:bg-slate-100 border border-slate-200 rounded-none transition-all flex items-center justify-center relative uppercase font-black text-[10px] ${showNotifDropdown ? 'bg-slate-100' : 'bg-white'}`}
                title="Notifications"
              >
                <Bell size={16} className="text-slate-600" />
                {notifications.filter(n => n.isUnread).length > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 bg-indigo-650 text-white font-extrabold text-[8px] w-4.5 h-4.5 rounded-full flex items-center justify-center border border-white">
                    {notifications.filter(n => n.isUnread).length}
                  </span>
                )}
              </button>

              <AnimatePresence>
                {showNotifDropdown && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setShowNotifDropdown(false)} />
                    <motion.div 
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 10 }}
                      className="absolute right-0 mt-2 w-80 bg-white border border-slate-200 rounded-none shadow-xl z-50 py-3 flex flex-col font-sans"
                    >
                      <div className="px-4 pb-2 border-b border-slate-150 flex items-center justify-between">
                        <span className="text-[9px] font-extrabold text-slate-400 uppercase tracking-widest">School Bells / Alerts</span>
                        <div className="flex items-center gap-2">
                          {notifications.length > 0 && (
                            <button onClick={handleMarkAllRead} className="text-[9px] hover:underline text-indigo-600 font-bold uppercase">Mark Read</button>
                          )}
                          {notifications.length > 0 && (
                            <span className="text-slate-200">|</span>
                          )}
                          <button onClick={handleClearNotifications} className="text-[9px] hover:underline text-rose-600 font-bold uppercase">Clear</button>
                        </div>
                      </div>

                      <div className="max-h-64 overflow-y-auto divide-y divide-slate-100">
                        {notifications.length === 0 ? (
                          <div className="py-8 text-center text-slate-400 text-xs italic">
                            No notifications received yet
                          </div>
                        ) : (
                          notifications.map(notif => (
                            <div 
                              key={notif.id} 
                              className={`p-3 text-left transition-colors hover:bg-slate-50/50 ${notif.isUnread ? 'bg-indigo-55/10' : ''}`}
                            >
                              <div className="flex items-start gap-2.5">
                                <span className="text-xs">
                                  {notif.type === 'period_bell' ? '🔔' : notif.type === 'fee_due' ? '💰' : '📅'}
                                </span>
                                <div className="space-y-0.5 max-w-[210px] overflow-hidden">
                                  <h4 className="font-extrabold text-xs text-slate-900 leading-tight flex items-center gap-1.5">
                                    <span className="truncate">{notif.title}</span>
                                    {notif.isUnread && <span className="inline-block w-1.5 h-1.5 rounded-full bg-indigo-605 shrink-0"></span>}
                                  </h4>
                                  <p className="text-[10px] text-slate-600 leading-relaxed word-break whitespace-normal break-words">{notif.message}</p>
                                  <span className="text-[8px] text-slate-450 block font-mono mt-1">{notif.timestamp}</span>
                                </div>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </motion.div>
                  </>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>
        
        {/* ========== TEACHER DASHBOARD HOME ========== */}
        {activeTab === 'dashboard' && (
          <div id="panel-teacher-home" className="space-y-8 animate-fade-in bg-sky-50/50 p-4 sm:p-6 -mx-4 sm:-mx-6 rounded-2xl border border-sky-100 shadow-inner">
            {/* Header Block */}
            <div className="bg-white rounded-none p-6 md:p-8 border border-slate-200 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-6 border-t-4 border-t-emerald-600">
              <div>
                <span className="text-[10px] font-extrabold text-emerald-600 uppercase tracking-widest block mb-1">WELCOME HOME</span>
                <h1 className="text-2xl font-black text-slate-900 tracking-tight font-display uppercase">Bonjour, {userSession.name}!</h1>
                <p className="text-sm text-slate-500 mt-1 max-w-md">
                  Active instructional desk serving primary subject: <strong className="text-slate-800">{teacherSubject}</strong>.
                  {myClasses.some(c => c.classTeacherId === teacherId) ? (
                    (() => {
                      const mc = myClasses.find(c => c.classTeacherId === teacherId);
                      return <span> Serving as primary mentor for class <strong className="text-emerald-700 font-bold">{mc?.className} - {mc?.section}</strong>.</span>;
                    })()
                  ) : (
                    <span className="text-orange-600 font-medium"> Currently not assigned as a dedicated general class mentor.</span>
                  )}
                </p>
              </div>

              {myClasses.some(c => c.classTeacherId === teacherId) && (
                (() => {
                  const mc = myClasses.find(c => c.classTeacherId === teacherId);
                  return (
                    <div className="p-4 bg-emerald-50 rounded-none border border-emerald-100 flex items-center gap-3">
                      <UserCheck className="text-emerald-600 shrink-0" size={24} />
                      <div>
                        <h4 className="text-[10px] font-extrabold text-emerald-950 uppercase tracking-wider">My Designated Class</h4>
                        <p className="text-sm text-emerald-800 font-bold mt-0.5">{mc?.className} - {mc?.section}</p>
                      </div>
                    </div>
                  );
                })()
              )}
            </div>

            {/* ========== DAILY REMINDER & AGENDA PORTAL ========== */}
            <div id="daily-reminder-board" className="bg-white border border-slate-200 shadow-sm p-6 space-y-5 border-t-4 border-t-indigo-600 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-50/40 rounded-full blur-2xl -mr-10 -mt-10 pointer-events-none"></div>
              
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-slate-100 pb-4 relative z-10">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 bg-indigo-50 text-indigo-600 rounded-none border border-indigo-150">
                    <Bell size={20} className="animate-pulse" />
                  </div>
                  <div>
                    <h2 className="text-sm font-black text-slate-900 uppercase tracking-wider font-display flex items-center gap-2">
                      Daily Reminder & Agenda (Daily Tasks)
                    </h2>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Operational checklist for <strong className="text-slate-700">{currentDayName}</strong> based on active date: <span className="font-mono text-indigo-600 font-bold">{attendanceDate}</span>
                    </p>
                  </div>
                </div>

                {/* Overall status pills */}
                <div className="flex flex-wrap items-center gap-2 font-mono text-xs">
                  <span className="bg-slate-100 text-slate-705 px-2.5 py-1 font-bold">
                    📅 {currentDayName} Schedule
                  </span>
                  {pendingCount > 0 ? (
                    <span className="bg-amber-500 text-slate-950 font-extrabold px-2.5 py-1 uppercase tracking-wider flex items-center gap-1">
                      ⚠️ {pendingCount} Pending Roll Call{pendingCount > 1 ? 's' : ''}
                    </span>
                  ) : (
                    <span className="bg-emerald-600 text-white font-extrabold px-2.5 py-1 uppercase tracking-wider flex items-center gap-1.5">
                      <CheckCircle2 size={12} /> Ready & Cleared
                    </span>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 relative z-10">
                {/* Left Side: Today's Lectures (7 cols) */}
                <div className="lg:col-span-7 space-y-3.5 border-r border-slate-100 pr-0 lg:pr-6">
                  <div className="flex justify-between items-center">
                    <h3 className="text-xs font-black uppercase text-slate-900 tracking-wider flex items-center gap-1.5">
                      <CalendarDays size={14} className="text-indigo-600" />
                      Class Lectures scheduled today ({todayClasses.length})
                    </h3>
                    <span className="text-[10px] text-indigo-500 font-bold uppercase tracking-wider">Timetabled Lectures</span>
                  </div>

                  {todayClasses.length === 0 ? (
                    <div className="bg-slate-50 border border-slate-100 p-6 text-center text-slate-500 rounded-none text-xs">
                      ☕ No formal lectures assigned to your ID under <strong>{currentDayName}</strong>. 
                      <p className="mt-1.5 text-[11px] text-slate-400">Great opportunity to review grading portfolios or coordinate with fellow faculty members!</p>
                    </div>
                  ) : (
                    <div className="space-y-2 max-h-[280px] overflow-y-auto pr-1">
                      {todayClasses.map((lecture) => {
                        const clsObj = classes.find(c => c.id === lecture.classId);
                        const isMentor = clsObj?.classTeacherId === teacherId;

                        return (
                          <div key={lecture.id} className="bg-slate-50 hover:bg-slate-100/80 border border-slate-150 p-3 flex flex-col md:flex-row justify-between items-start md:items-center gap-3 transition-colors">
                            <div className="space-y-1">
                              <div className="flex items-center gap-2">
                                <span className="bg-indigo-100 text-indigo-800 text-[9px] font-black uppercase tracking-wider px-2 py-0.5 font-mono">
                                  {lecture.period}
                                </span>
                                <h4 className="text-xs font-black uppercase text-slate-800 flex items-center gap-1">
                                  🏫 {getClassLabel(lecture.classId)}
                                </h4>
                                {isMentor && (
                                  <span className="text-[9px] bg-emerald-50 text-emerald-700 border border-emerald-100 px-1.5 py-0.5 font-bold">
                                    Primary Mentor
                                  </span>
                                )}
                              </div>
                              <p className="text-xs text-slate-600 font-bold">
                                Subject: <span className="text-indigo-900">{lecture.subject}</span>
                              </p>
                            </div>

                            <div className="text-right self-end md:self-auto">
                              <span className="text-[10px] font-mono font-bold bg-white text-slate-700 border border-slate-200 px-2.5 py-1">
                                🕒 {lecture.time}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Right Side: Attendance Checklist Tasks (5 cols) */}
                <div className="lg:col-span-5 space-y-3.5 flex flex-col justify-between">
                  <div className="space-y-3.5">
                    <div className="flex justify-between items-center">
                      <h3 className="text-xs font-black uppercase text-slate-900 tracking-wider flex items-center gap-1.5">
                        <ListTodo size={14} className="text-emerald-600" />
                        Today's Attendance Checklist ({attendanceStatusList.length})
                      </h3>
                      <span className="text-[10px] text-emerald-600 font-bold uppercase tracking-wider">Verification Task</span>
                    </div>

                    {attendanceStatusList.length === 0 ? (
                      <div className="bg-slate-50 border border-slate-100 p-6 text-center text-slate-500 rounded-none text-xs">
                        No assigned classroom cohorts requiring registers today.
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {attendanceStatusList.map((item) => (
                          <div 
                            key={item.classId} 
                            className={`p-3.5 border transition-all flex justify-between items-center ${
                              item.marked 
                                ? 'bg-emerald-50/40 border-emerald-100/70 text-slate-700' 
                                : 'bg-rose-50/50 border-rose-100/70 text-slate-900'
                            }`}
                          >
                            <div className="space-y-0.5">
                              <div className="flex items-center gap-2">
                                <h4 className="text-xs font-black uppercase text-slate-800">
                                  Class {item.className}
                                </h4>
                                {item.isMentorClass && (
                                  <span className="text-[8px] uppercase tracking-wider font-extrabold bg-blue-50 text-blue-600 px-1.5 border border-blue-100">
                                    My Cohort
                                  </span>
                                )}
                              </div>
                              <p className="text-[10px] text-slate-500">
                                Total Pupils: <span className="font-bold text-slate-700">{item.studentCount}</span>
                              </p>
                            </div>

                            <div className="flex items-center gap-2">
                              {item.marked ? (
                                <span className="text-[9px] font-mono font-extrabold text-emerald-700 bg-emerald-100/80 px-2 py-1 uppercase rounded-none flex items-center gap-1">
                                  ✓ Logged
                                </span>
                              ) : (
                                <span className="text-[9px] font-mono font-extrabold text-rose-600 bg-rose-100/80 px-2 py-1 uppercase rounded-none">
                                  ⚠️ Pending
                                </span>
                              )}

                              <button
                                type="button"
                                onClick={() => {
                                  handleEnterAttendanceTab(item.classId, attendanceDate);
                                  setActiveTab('attendance');
                                  window.scrollTo({ top: 0, behavior: 'smooth' });
                                }}
                                className={`text-[9px] font-extrabold uppercase py-1.5 px-3 transition-all cursor-pointer ${
                                  item.marked
                                    ? 'bg-slate-150 hover:bg-slate-200 text-slate-800'
                                    : 'bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold shadow-sm'
                                }`}
                              >
                                {item.marked ? 'Re-edit' : 'Take Attendance'}
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {pendingCount > 0 && (
                    <div className="bg-amber-50 border border-amber-100 p-3 text-[10px] text-amber-950 font-mono font-medium leading-relaxed">
                      ⚠️ Remainder: Principal office sync expects all student attendance records to be updated and signed by 2:00 PM today.
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Quick Action shortcuts cards - Geometric bottom border theme */}
            <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-2 gap-3 sm:gap-6">
              
              <div 
                onClick={() => {
                  handleEnterAttendanceTab(classId || classes[0]?.id || '', attendanceDate);
                  setActiveTab('attendance');
                }}
                className="bg-white p-6 border-b-4 border-emerald-500 shadow-sm rounded-none hover:shadow-md transition-all cursor-pointer group"
              >
                <div className="h-10 w-10 bg-slate-100 text-slate-800 rounded-none flex items-center justify-center mb-4 group-hover:bg-emerald-600 group-hover:text-white transition-all border border-slate-250">
                  <CheckSquare size={18} />
                </div>
                <h3 className="text-base font-bold text-slate-900 uppercase tracking-wide font-display">Mark Attendance</h3>
                <p className="text-xs text-slate-500 mt-1">Log present or absent indices for pupils on a selected calendar day.</p>
              </div>

              <div 
                onClick={() => {
                  handleEnterMarksTab(classId || classes[0]?.id || '', selectedSubject, selectedExamType);
                  setActiveTab('marks');
                }}
                className="bg-white p-6 border-b-4 border-indigo-500 shadow-sm rounded-none hover:shadow-md transition-all cursor-pointer group"
              >
                <div className="h-10 w-10 bg-slate-100 text-slate-800 rounded-none flex items-center justify-center mb-4 group-hover:bg-indigo-600 group-hover:text-white transition-all border border-slate-250">
                  <Award size={18} />
                </div>
                <h3 className="text-base font-bold text-slate-900 uppercase tracking-wide font-display">Configure Scores</h3>
                <p className="text-xs text-slate-500 mt-1">Commend academic marks for Unit Tests, Mid-Year cycle, and Final exams.</p>
              </div>

            </div>

            {/* Password Modal */}
            <AnimatePresence>
              {showPasswordModal && (
                <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[100] p-4 backdrop-blur-sm">
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: 20 }}
                    className="bg-white w-full max-w-md border border-slate-200 p-8 shadow-2xl relative"
                  >
                    <button 
                      onClick={() => setShowPasswordModal(false)}
                      className="absolute top-4 right-4 text-slate-400 hover:text-slate-900"
                    >
                      <X size={20} />
                    </button>

                    <div className="flex items-center gap-3 mb-6">
                      <div className="p-2 bg-slate-100 rounded-none border border-slate-200">
                        <Menu size={20} className="text-slate-900" />
                      </div>
                      <div>
                        <h2 className="text-lg font-black uppercase tracking-tight text-slate-900">Update Credentials</h2>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Portal Access Security</p>
                      </div>
                    </div>


                    <div className="space-y-6">
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 block">Current ID</label>
                        <input 
                          type="text" 
                          disabled 
                          value={userSession.username || 'user_id'} 
                          className="w-full bg-slate-50 border border-slate-100 px-3 py-2 text-xs font-bold text-slate-400 cursor-not-allowed" 
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 block">New Password</label>
                        <input 
                          type="password"
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          placeholder="••••••••"
                          className="w-full bg-white border border-slate-200 px-3 py-2 text-xs font-bold text-slate-700 focus:outline-none focus:border-slate-900" 
                        />
                        <p className="text-[9px] text-slate-400 italic">Minimum 8 characters recommended for robust security.</p>
                      </div>

                      <button
                        onClick={() => {
                          if (newPassword.length < 4) {
                            toast.error('Password must be at least 4 characters long.');
                            return;
                          }
                          
                          // Update password logic
                          setTeachers(prev => prev.map(t => 
                            t.id === userSession.id ? { ...t, password: newPassword } : t
                          ));
                          
                          toast.success('Password updated successfully! Next login requires new credentials.');
                          setShowPasswordModal(false);
                        }}
                        className="w-full bg-slate-900 text-white font-black uppercase tracking-widest py-3 hover:bg-slate-800 transition-all text-xs"
                      >
                        Commit Changes
                      </button>
                    </div>
                  </motion.div>
                </div>
              )}
            </AnimatePresence>

            {/* Quick Summary overview info */}
            <div className="bg-slate-900 text-white rounded-none p-5 border border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-sm">
              <div className="flex items-center gap-3">
                <Info size={18} className="text-emerald-400 shrink-0" />
                <p className="text-xs text-slate-300 font-sans">
                  You are editing simulated data. This app uses <strong>Indexed Storage (localStorage)</strong>. You can safely simulate different dates, record marks, and re-login as a student to see the changes update in real time.
                </p>
              </div>
            </div>

          </div>
        )}

        {/* ========== STUDENTS ROSTER VIEW ========== */}
        {activeTab === 'students' && (
          <div id="panel-teacher-students" className="space-y-6 animate-fade-in bg-violet-50/50 p-4 sm:p-6 -mx-4 sm:-mx-6 rounded-2xl border border-violet-100 shadow-inner">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">My Students Roster</h1>
                <p className="text-xs text-gray-500 mt-0.5">Inspect roster directory details for students belongs to classroom units.</p>
              </div>
              
              {/* Select Classroom */}
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-gray-500">Classroom:</span>
                <select
                  id="teacher-students-class-select"
                  value={activeClassId}
                  onChange={(e) => setActiveClassId(e.target.value)}
                  className="px-2.5 py-1.5 bg-white border border-gray-200 rounded-lg text-xs font-bold text-gray-700 focus:outline-none"
                >
                  {classes.map(cl => (
                    <option key={cl.id} value={cl.id}>{cl.className} ({cl.section})</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Students roster table */}
            <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-xs">
              <div className="p-4 bg-gray-50/50 border-b border-gray-100 flex items-center justify-between">
                <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500">
                  Students in {viewClass ? `${viewClass.className} - ${viewClass.section}` : 'N/A'}
                </h3>
                <span className="text-xs bg-slate-200 text-slate-800 font-bold px-2 py-0.5 rounded">
                  {viewClassStudents.length} Assigned Pupils
                </span>
              </div>
              
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b border-gray-100 text-xs font-bold text-gray-400 uppercase tracking-widest bg-gray-50/20">
                      <th className="px-6 py-3 w-20">Roll #</th>
                      <th className="px-6 py-3">Student Name</th>
                      <th className="px-6 py-3">Academic Email</th>
                      <th className="px-6 py-3">Contact parent Phone</th>
                      <th className="px-6 py-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 text-sm">
                    {viewClassStudents.length > 0 ? (
                      viewClassStudents.map(s => (
                        <tr key={s.id} className="hover:bg-gray-50/40 transition-colors">
                          <td className="px-6 py-4 font-mono font-bold text-gray-700">#{s.rollNumber}</td>
                          <td className="px-6 py-4">
                            <span className="font-semibold text-slate-900">{s.name}</span>
                          </td>
                          <td className="px-6 py-4 text-xs font-medium text-gray-600">{s.email}</td>
                          <td className="px-6 py-4 text-xs font-mono text-gray-500">{s.parentPhone}</td>
                          <td className="px-6 py-4 text-right">
                            <button 
                              onClick={() => {
                                setSelectedStudentProfile(s);
                                setShowProfileModal(true);
                                setProfileMarkSubject(teacherSubject);
                              }}
                              className="px-4 py-1.5 bg-indigo-50 text-indigo-600 hover:bg-indigo-600 hover:text-white border border-indigo-100 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all shadow-sm"
                            >
                              Profile
                            </button>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={5} className="px-6 py-12 text-center text-gray-400 text-sm italic">
                          No student profiles enrolled inside this class register.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ========== MARK DAILY ATTENDANCE ========== */}
        {activeTab === 'attendance' && (
          <div id="panel-teacher-attendance" className="space-y-6 animate-fade-in bg-rose-50/50 p-4 sm:p-6 -mx-4 sm:-mx-6 rounded-2xl border border-rose-100 shadow-inner">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Mark Daily Attendance</h1>
                <p className="text-xs text-gray-500 mt-0.5">Change dates and present status indicators. Click Save to commit registers.</p>
              </div>

              {/* Class & Date Controls */}
              <div className="flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-gray-500">Class:</span>
                  <select
                    id="attendance-class-select"
                    value={activeClassId}
                    onChange={(e) => handleEnterAttendanceTab(e.target.value, attendanceDate)}
                    className="px-2 py-1.5 bg-white border border-gray-200 rounded-lg text-xs font-bold text-slate-800"
                  >
                    {myClasses.map(cl => (
                      <option key={cl.id} value={cl.id}>{cl.className} ({cl.section})</option>
                    ))}
                  </select>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-gray-500">Log Date:</span>
                  <input
                    id="attendance-date-input"
                    type="date"
                    value={attendanceDate}
                    onChange={(e) => handleEnterAttendanceTab(activeClassId, e.target.value)}
                    className="px-2 py-1 bg-white border border-gray-200 rounded-lg text-xs font-bold text-slate-800"
                  />
                </div>
              </div>
            </div>

            {/* Attendance mode selection */}
            <div className="flex items-center gap-4 border-b border-gray-200 pb-1.5 font-sans">
              <button
                type="button"
                onClick={() => setAttendanceMode('list')}
                className={`py-2 text-xs font-bold uppercase tracking-wider border-b-2 transition-all ${
                  attendanceMode === 'list' 
                    ? 'border-emerald-600 text-emerald-800' 
                    : 'border-transparent text-slate-400 hover:text-slate-600'
                }`}
              >
                📋 Spreadsheet List View
              </button>
              <button
                type="button"
                onClick={() => {
                  setAttendanceMode('swipe');
                  setActiveSwipeIndex(0);
                }}
                className={`py-2 text-xs font-bold uppercase tracking-wider border-b-2 transition-all flex items-center gap-1.5 ${
                  attendanceMode === 'swipe' 
                    ? 'border-emerald-600 text-emerald-800' 
                    : 'border-transparent text-slate-400 hover:text-slate-600'
                }`}
              >
                ✨ Swipe Card Mode (Modern)
              </button>
            </div>

            {/* Notification */}

            {/* Conditional Views: List vs Swipe Card Block */}
            {attendanceMode === 'list' ? (
              /* Attendance Roster list panel */
              <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-xs">
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="border-b border-gray-100 text-xs font-bold text-gray-500 uppercase tracking-widest bg-gray-50">
                        <th className="px-6 py-4 w-28">Roll #</th>
                        <th className="px-6 py-4">Student Profile</th>
                        <th className="px-6 py-4">Calendar Index</th>
                        <th className="px-6 py-4 text-center">Status Toggle</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-150 text-sm">
                      {viewClassStudents.length > 0 ? (
                        viewClassStudents.map(student => {
                          const status = scratchAttendance[student.id] || 'present';
                          return (
                            <tr key={student.id} className="hover:bg-gray-50/20">
                              <td className="px-6 py-4 font-mono text-gray-700 font-bold">#{student.rollNumber}</td>
                              <td className="px-6 py-4">
                                <span className="font-semibold text-slate-900 block">{student.name}</span>
                                <span className="text-[10px] text-gray-400 font-mono">{student.email}</span>
                              </td>
                              <td className="px-6 py-4 text-xs font-bold text-gray-600">
                                {attendanceDate}
                              </td>
                              <td className="px-6 py-4">
                                <div className="flex items-center justify-center gap-2">
                                  <button
                                    type="button"
                                    onClick={() => handleToggleAttendance(student.id)}
                                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-extrabold shadow-sm transition-all ${
                                      status === 'present'
                                        ? 'bg-emerald-100 text-emerald-800 border border-emerald-200/60'
                                        : 'bg-red-100 text-red-800 border border-red-200/60'
                                    }`}
                                  >
                                    {status === 'present' ? <UserCheck size={13} /> : <UserX size={13} />}
                                    {status.toUpperCase()}
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })
                      ) : (
                        <tr>
                          <td colSpan={4} className="px-6 py-12 text-center text-gray-400 text-sm italic font-medium">
                            No student profiles enrolled inside the class scope.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                {viewClassStudents.length > 0 && (
                  <div className="p-4 bg-gray-50 border-t border-gray-100 flex justify-end">
                    <button
                      id="save-attendance-btn"
                      onClick={handleSaveAttendance}
                      className="flex items-center gap-2 py-2 px-5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold tracking-wide shadow-sm transition-all cursor-pointer"
                    >
                      <Save size={14} />
                      Commit and Save Attendance Logs
                    </button>
                  </div>
                )}
              </div>
            ) : (
              /* Swipe Card Mode Markup with Framer Motion */
              <div className="flex flex-col items-center py-4 font-sans">
                {viewClassStudents.length > 0 ? (
                  activeSwipeIndex < viewClassStudents.length ? (
                    (() => {
                      const currentStudent = viewClassStudents[activeSwipeIndex];
                      const currentStatus = scratchAttendance[currentStudent.id] || 'present';
                      return (
                        <div className="w-full max-w-sm space-y-6">
                          {/* Progress indicators */}
                          <div className="flex justify-between items-center text-xs text-slate-500 font-bold px-1">
                            <span>Swipe Progress: {activeSwipeIndex + 1} / {viewClassStudents.length} Students</span>
                            <span className="font-mono bg-slate-100 px-2 py-0.5 rounded-sm">{Math.round((activeSwipeIndex / viewClassStudents.length) * 100)}% Marked</span>
                          </div>
                          
                          <div className="w-full bg-slate-100 h-1 rounded-none overflow-hidden border border-slate-200">
                            <div className="bg-emerald-600 h-full transition-all duration-300" style={{ width: `${(activeSwipeIndex / viewClassStudents.length) * 100}%` }}></div>
                          </div>

                          {/* Tinder Card Stage */}
                          <div className="relative h-96 w-full flex items-center justify-center bg-slate-50/50 border border-dashed border-slate-200 p-4 rounded-none overflow-hidden">
                            <AnimatePresence mode="popLayout">
                              <motion.div
                                key={currentStudent.id}
                                drag="x"
                                dragConstraints={{ left: -160, right: 160 }}
                                onDragEnd={(event, info) => {
                                  if (info.offset.x > 110) {
                                    // Swipe right -> Present
                                    setScratchAttendance(prev => ({ ...prev, [currentStudent.id]: 'present' }));
                                    setActiveSwipeIndex(idx => idx + 1);
                                  } else if (info.offset.x < -110) {
                                    // Swipe left -> Absent
                                    setScratchAttendance(prev => ({ ...prev, [currentStudent.id]: 'absent' }));
                                    setActiveSwipeIndex(idx => idx + 1);
                                  }
                                }}
                                whileTap={{ scale: 1.02 }}
                                initial={{ scale: 0.95, y: 15, opacity: 0 }}
                                animate={{ scale: 1, y: 0, opacity: 1 }}
                                exit={{
                                  x: scratchAttendance[currentStudent.id] === 'present' ? 240 : -240,
                                  opacity: 0,
                                  scale: 0.95,
                                  rotate: scratchAttendance[currentStudent.id] === 'present' ? 12 : -12
                                }}
                                transition={{ type: 'spring', stiffness: 260, damping: 20 }}
                                className="bg-white border border-slate-200 shadow-md p-6 rounded-none w-full h-80 flex flex-col justify-between cursor-grab active:cursor-grabbing text-slate-800 relative select-none"
                              >
                                <div>
                                  <div className="flex justify-between items-center">
                                    <span className="font-mono text-[10px] font-bold text-indigo-100 bg-indigo-700 px-1.5 py-0.5">Roll #{currentStudent.rollNumber}</span>
                                    <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider font-mono">Drag Left/Right</span>
                                  </div>

                                  <div className="text-center mt-10">
                                    <div className="w-16 h-16 bg-slate-100 border-2 border-indigo-200 rounded-full flex items-center justify-center text-indigo-700 font-bold text-xl uppercase mx-auto mb-3 shadow-sm select-none">
                                      {currentStudent.name.charAt(0)}
                                    </div>
                                    <h3 className="text-lg font-black text-slate-900 tracking-tight font-display uppercase leading-tight">{currentStudent.name}</h3>
                                    <p className="text-xs text-slate-400 font-mono mt-1">{currentStudent.email}</p>
                                  </div>
                                </div>

                                {/* Active Badge Indicator Hints inside card */}
                                <div className="flex items-center justify-between text-[10px] uppercase font-bold tracking-widest mt-6 pt-4 border-t border-slate-100">
                                  <div className="text-rose-500 font-black flex items-center gap-1">
                                    &larr; ABSENT
                                  </div>
                                  <span className="text-slate-300 font-medium">Swipe Option</span>
                                  <div className="text-emerald-500 font-black flex items-center gap-1">
                                    PRESENT &rarr;
                                  </div>
                                </div>
                              </motion.div>
                            </AnimatePresence>
                          </div>

                          {/* Quick swipe controls */}
                          <div className="flex items-center justify-between gap-3 font-sans">
                            <button
                              type="button"
                              onClick={() => {
                                setScratchAttendance(prev => ({ ...prev, [currentStudent.id]: 'absent' }));
                                setActiveSwipeIndex(idx => idx + 1);
                              }}
                              className="flex-1 py-3 bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 text-xs font-bold tracking-wider uppercase text-center rounded-none transition-all cursor-pointer"
                            >
                              ABSENT &larr;
                            </button>
                            
                            <button
                              type="button"
                              onClick={() => {
                                if (activeSwipeIndex > 0) setActiveSwipeIndex(idx => idx - 1);
                              }}
                              disabled={activeSwipeIndex === 0}
                              className="px-3.5 py-3 bg-slate-100 text-slate-500 hover:bg-slate-200 border border-slate-200 text-xs font-bold uppercase disabled:opacity-40 rounded-none cursor-pointer"
                              title="Rewind Card"
                            >
                              ⏪ Back
                            </button>

                            <button
                              type="button"
                              onClick={() => {
                                setScratchAttendance(prev => ({ ...prev, [currentStudent.id]: 'present' }));
                                setActiveSwipeIndex(idx => idx + 1);
                              }}
                              className="flex-1 py-3 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 text-xs font-bold tracking-wider uppercase text-center rounded-none transition-all cursor-pointer"
                            >
                              PRESENT &rarr;
                            </button>
                          </div>
                        </div>
                      );
                    })()
                  ) : (
                    /* Swiped roster collection complete */
                    <div className="bg-white border border-slate-200 p-8 text-center rounded-none shadow-sm max-w-sm w-full space-y-6">
                      <div className="w-12 h-12 bg-emerald-50 border-2 border-emerald-300 text-emerald-600 rounded-full flex items-center justify-center text-lg mx-auto shadow-xs">
                        ✓
                      </div>
                      <div>
                        <h3 className="text-base font-bold text-slate-900 font-display uppercase tracking-tight">Roster Cards Swiped!</h3>
                        <p className="text-xs text-slate-500 mt-1">You have evaluated all active student registers for this date stamp.</p>
                      </div>

                      {/* Summary statistics */}
                      <div className="grid grid-cols-2 gap-4 p-4 bg-slate-50 border border-slate-100 text-center">
                        <div>
                          <p className="text-[9px] font-bold text-emerald-600 uppercase tracking-widest font-mono">Present Swipes</p>
                          <span className="text-xl font-bold text-emerald-900 font-display">
                            {Object.values(scratchAttendance).filter(v => v === 'present').length} Pupils
                          </span>
                        </div>
                        <div>
                          <p className="text-[9px] font-bold text-rose-500 uppercase tracking-widest font-mono">Absent Swipes</p>
                          <span className="text-xl font-bold text-rose-950 font-display">
                            {Object.values(scratchAttendance).filter(v => v === 'absent').length} Pupils
                          </span>
                        </div>
                      </div>

                      <div className="flex gap-2.5 font-sans">
                        <button
                          type="button"
                          onClick={() => setActiveSwipeIndex(0)}
                          className="flex-1 py-2 bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-700 rounded-none text-xs font-bold uppercase transition-all cursor-pointer"
                        >
                          🔄 Re-Swipe
                        </button>
                        <button
                          type="button"
                          onClick={handleSaveAttendance}
                          className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-none text-xs font-bold uppercase tracking-wider transition-all cursor-pointer"
                        >
                          💾 Commit Logs
                        </button>
                      </div>
                    </div>
                  )
                ) : (
                  <p className="text-xs text-slate-400 text-center py-12 italic bg-white w-full border border-slate-200 rounded-none">
                    No student profiles enrolled inside this class register scope.
                  </p>
                )}
              </div>
            )}

            {/* ========== WHATSAPP ABSENT DISPATCH SERVICE ========== */}
            {(() => {
              const absentsList = viewClassStudents.filter(student => scratchAttendance[student.id] === 'absent');
              return (
                <div className="bg-gradient-to-br from-slate-900 to-indigo-950 text-white p-5 rounded-none border-l-4 border-emerald-500 shadow-sm mt-8 space-y-4 font-sans border border-slate-750">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                    <div>
                      <h3 className="text-xs font-black uppercase tracking-widest text-emerald-400 flex items-center gap-1.5 font-display">
                        📢 WhatsApp Absent Alert Center
                      </h3>
                      <p className="text-[11px] text-indigo-200">
                        Prowl through absent registers on active date {attendanceDate} and execute direct manual alerts or auto rule models to parent contacts.
                      </p>
                    </div>
                    {absentsList.length > 0 && (
                      <button
                        type="button"
                        onClick={() => {
                          toast.success(`Autopilot Rule Executed: SMS/WhatsApp broadcast initiated successfully for ${absentsList.length} absent students!`);
                        }}
                        className="bg-emerald-600 hover:bg-emerald-500 text-white text-[10px] font-black uppercase py-2 px-3 tracking-wider flex items-center gap-1.5 transition-all cursor-pointer"
                      >
                        ⚡ Simulate Autopilot Blast ({absentsList.length} parents)
                      </button>
                    )}
                  </div>

                  {absentsList.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {absentsList.map(st => {
                        const localTpl = localStorage.getItem('acadamis_custom_absent_template') || 
                          "Greetings, Respected Parent! We noticed that your child {student_name} (Roll: {roll_number}) has been marked ABSENT on date {date}. Kindly clarify the reason or contact the school office. Principal.";
                        const messageText = localTpl
                          .replace(/{student_name}/g, st.name)
                          .replace(/{roll_number}/g, st.rollNumber || '')
                          .replace(/{date}/g, attendanceDate);
                        return (
                          <div key={st.id} className="bg-white/5 border border-white/10 p-3.5 space-y-2.5 flex flex-col justify-between">
                            <div>
                              <div className="flex justify-between items-start">
                                <h4 className="text-xs font-bold text-white uppercase">{st.name}</h4>
                                <span className="text-[9px] font-mono text-indigo-300 font-bold">Roll: #{st.rollNumber}</span>
                              </div>
                              <p className="text-[10px] text-slate-300 font-mono italic mt-1 bg-white/[0.03] p-1.5 border border-white/5 line-clamp-2">
                                "{messageText}"
                              </p>
                            </div>

                            <div className="flex justify-between items-center pt-2.5 border-t border-white/10">
                              <span className="text-[9px] font-mono text-emerald-400">📲 {st.parentPhone || '0300-1112222'}</span>
                              <a
                                href={`https://api.whatsapp.com/send?phone=${st.parentPhone || '923001234567'}&text=${encodeURIComponent(messageText)}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                onClick={() => {
                                  toast.info(`Direct WhatsApp communication opened with ${st.name}'s parent!`);
                                }}
                                className="bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-[9px] px-2.5 py-1 uppercase flex items-center gap-1 transition-all"
                              >
                                💬 WA Send
                              </a>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="p-4 bg-slate-850/50 border border-white/5 text-center text-xs text-slate-400 hover:text-white transition-all">
                      ★ Perfect Attendance Record for {viewClass?.className || 'Class Group'} on Date {attendanceDate}! No Parent pings necessary.
                    </div>
                  )}
                </div>
              );
            })()}

          </div>
        )}

        {/* ========== SUBJECT GRADES MANAGMENT ========== */}
        {activeTab === 'marks' && (
          <div id="panel-teacher-marks" className="space-y-6 animate-fade-in bg-indigo-50/50 p-4 sm:p-6 -mx-4 sm:-mx-6 rounded-2xl border border-indigo-100 shadow-inner">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Student Report Card Builder</h1>
                <p className="text-xs text-gray-500 mt-0.5">Generate multi-subject report cards and dispatch them to parents via WhatsApp.</p>
              </div>

              {/* Filter tools */}
              <div className="flex flex-wrap items-center gap-4">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-semibold text-gray-500">Select Class:</span>
                  <select
                    id="marks-class-select"
                    value={selectedMarkClassId}
                    onChange={(e) => {
                      setSelectedMarkClassId(e.target.value);
                      setReportStudentId('');
                    }}
                    className="px-2 py-1.5 bg-white border border-gray-200 rounded-lg text-xs font-bold text-slate-800 focus:outline-none focus:border-emerald-500"
                  >
                    <option value="">-- Choose Class --</option>
                    {myClasses.map(cl => (
                      <option key={cl.id} value={cl.id}>{cl.className} ({cl.section})</option>
                    ))}
                  </select>
                </div>
                
                {selectedMarkClassId && (
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-semibold text-gray-500">Select Student:</span>
                    <select
                      value={reportStudentId}
                      onChange={(e) => setReportStudentId(e.target.value)}
                      className="px-2 py-1.5 bg-white border border-gray-200 rounded-lg text-xs font-bold text-indigo-800 focus:outline-none focus:border-indigo-500 w-48"
                    >
                      <option value="">-- Choose Student --</option>
                      {students.filter(s => s.classId === selectedMarkClassId).map(st => (
                        <option key={st.id} value={st.id}>{st.rollNumber} - {st.name}</option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
            </div>

            {reportStudentId ? (() => {
              const student = students.find(s => s.id === reportStudentId);
              if (!student) return null;
              
              let totalObtained = 0;
              let totalMax = 0;
              reportSubjectsList.forEach(sj => {
                totalObtained += Number(sj.obtained) || 0;
                totalMax += Number(sj.maxMarks) || 0;
              });
              const overallPct = totalMax > 0 ? Math.round((totalObtained / totalMax) * 100) : 0;
              const whatsappText = `Greetings, Respected Parent! Report for ${student.name} (Roll: ${student.rollNumber}):

` + 
                reportSubjectsList.map(s => `- ${s.subject} (${s.ref}): ${s.obtained}/${s.maxMarks}`).join('\n') + 
                `

Total: ${totalObtained}/${totalMax} (${overallPct}%). Status: ${overallPct >= 40 ? 'PASS' : 'RE-STUDY'}`;

              return (
                <div className="space-y-6">
                  {/* Add Subject Config Bar */}
                  <div className="bg-indigo-50/50 border border-indigo-100/50 rounded-xl p-4 shadow-sm">
                    <div className="flex items-center gap-2 mb-3">
                      <div className="bg-indigo-100 text-indigo-700 p-1.5 rounded-lg"><Award size={16} /></div>
                      <h3 className="text-sm font-bold text-indigo-900">Add Subject to Report</h3>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end">
                      <div className="sm:col-span-3 space-y-1">
                        <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest">Active Subject</label>
                        <select
                          value={reportSubjectToAdd}
                          onChange={(e) => setReportSubjectToAdd(e.target.value)}
                          className="w-full px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-xs font-semibold text-slate-950 focus:outline-none focus:border-indigo-500"
                        >
                          <option value="">Select Subject</option>
                          <option value="English">English</option>
                          <option value="Mathematics">Mathematics</option>
                          <option value="Science">Science</option>
                          <option value="Urdu">Urdu</option>
                          <option value="Islamiat">Islamiat</option>
                          <option value="Computer">Computer</option>
                          <option value="Physics">Physics</option>
                          <option value="Chemistry">Chemistry</option>
                          <option value="Biology">Biology</option>
                          <option value="History">History</option>
                          <option value="Geography">Geography</option>
                          <option value="Other">Other...</option>
                        </select>
                      </div>

                      <div className="sm:col-span-4 space-y-1">
                        <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest">Book / Test Reference</label>
                        <input
                          type="text"
                          value={reportRefToAdd}
                          onChange={(e) => setReportRefToAdd(e.target.value)}
                          placeholder="e.g. Oxford Book Ch 2, Mid Term"
                          className="w-full px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-xs font-semibold text-slate-950 focus:outline-none focus:border-indigo-500"
                        />
                      </div>
                      
                      <div className="sm:col-span-5 flex justify-end">
                        <button
                          type="button"
                          onClick={() => {
                            if (!reportSubjectToAdd.trim()) { toast.error('Please select a subject'); return; }
                            setReportSubjectsList([...reportSubjectsList, { 
                              id: Date.now().toString(), 
                              subject: reportSubjectToAdd, 
                              ref: reportRefToAdd || 'General',
                              maxMarks: '100',
                              obtained: '0'
                            }]);
                            setReportSubjectToAdd('');
                            setReportRefToAdd('');
                            toast.success('Subject row added below');
                          }}
                          className="py-1.5 px-4 bg-indigo-600 text-white hover:bg-indigo-700 rounded-lg text-xs font-bold uppercase tracking-wider shadow-sm transition-all flex items-center gap-2"
                        >
                          <Plus size={14} />
                          Add subject to Report
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Interactive Scores Board */}
                  <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-xs">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left">
                        <thead>
                          <tr className="border-b border-gray-100 text-xs font-bold text-gray-500 uppercase tracking-widest bg-gray-50">
                            <th className="px-6 py-4">Subject</th>
                            <th className="px-6 py-4">Assessment Reference</th>
                            <th className="px-6 py-4 text-center">Total Marks</th>
                            <th className="px-6 py-4 text-center">Obtained Marks</th>
                            <th className="px-4 py-4 text-center w-16">Action</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-150 text-sm">
                          {reportSubjectsList.length === 0 ? (
                            <tr>
                              <td colSpan={5} className="px-6 py-12 text-center text-gray-400 text-sm italic font-medium">
                                No subjects added to this report card yet. Select a subject above and press Add.
                              </td>
                            </tr>
                          ) : (
                            reportSubjectsList.map((item, index) => (
                              <tr key={item.id} className="hover:bg-gray-50/20">
                                <td className="px-6 py-4">
                                  <span className="font-bold text-slate-900 block">{item.subject}</span>
                                </td>
                                <td className="px-6 py-4">
                                  <span className="text-xs text-gray-500">{item.ref}</span>
                                </td>
                                <td className="px-6 py-4 text-center">
                                  <input
                                    type="number"
                                    min="1"
                                    value={item.maxMarks}
                                    onChange={(e) => {
                                      const newList = [...reportSubjectsList];
                                      newList[index].maxMarks = e.target.value;
                                      setReportSubjectsList(newList);
                                    }}
                                    className="w-20 px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-sm text-center font-bold text-slate-700 focus:outline-none focus:border-blue-500 inline-block"
                                  />
                                </td>
                                <td className="px-6 py-4 text-center">
                                  <input
                                    type="number"
                                    min="0"
                                    value={item.obtained}
                                    onChange={(e) => {
                                      const newList = [...reportSubjectsList];
                                      newList[index].obtained = e.target.value;
                                      setReportSubjectsList(newList);
                                    }}
                                    placeholder="0"
                                    className="w-20 px-3 py-1.5 bg-indigo-50 border border-indigo-100 rounded-lg text-sm text-center font-extrabold text-indigo-900 focus:outline-none focus:border-indigo-500 inline-block"
                                  />
                                </td>
                                <td className="px-4 py-4 text-center">
                                  <button onClick={() => {
                                    setReportSubjectsList(reportSubjectsList.filter(s => s.id !== item.id));
                                  }} className="text-gray-400 hover:text-red-500 transition-colors p-2">
                                    <Trash2 size={14} />
                                  </button>
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* ========== WHATSAPP REPORT CARD BROADCASTER ========== */}
                  {reportSubjectsList.length > 0 && (
                    <div className="bg-gradient-to-br from-slate-950 to-indigo-900 text-white p-6 rounded-2xl border border-indigo-500/30 shadow-lg mt-8 space-y-4 font-sans">
                      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                        <div>
                          <h3 className="text-sm font-black uppercase tracking-widest text-indigo-400 flex items-center gap-2 font-display">
                            <span>📊</span> WhatsApp Report Dispatch
                          </h3>
                          <p className="text-[11px] text-indigo-200 mt-1">
                            Review and dispatch the compiled scorecard directly to ${student.name}'s parents via WhatsApp.
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            const parentPhone = student.parentPhone || student.studentPhone || '';
                            const cleanPhone = parentPhone.replace(/\D/g, '');
                            if (!cleanPhone) {
                              toast.error(`No parent phone number found for ${student.name}. Please add it in Principal dashboard.`);
                              return;
                            }
                            // Form wa.me link. Use the first digits. Usually in Pakistan we add 92 if not present, but letting pure digits work.
                            let countryCodePhone = cleanPhone;
                            if (countryCodePhone.startsWith('0')) {
                              countryCodePhone = '92' + countryCodePhone.substring(1);
                            } else if (!countryCodePhone.startsWith('92') && countryCodePhone.length === 10) {
                               countryCodePhone = '92' + countryCodePhone;
                            }
                            
                            const waUrl = `https://wa.me/${countryCodePhone}?text=${encodeURIComponent(whatsappText)}`;
                            window.open(waUrl, '_blank');
                            toast.success(`Opening WhatsApp for ${student.name}`);
                          }}
                          className="bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-black uppercase py-2 px-4 rounded-xl tracking-wider flex items-center gap-2 transition-all cursor-pointer shadow-md shadow-emerald-900/50"
                        >
                          <Send size={14} />
                          Send to WhatsApp
                        </button>
                      </div>

                      <div className="bg-white/10 backdrop-blur-sm border border-white/10 p-4 rounded-xl space-y-3 relative overflow-hidden">
                        <div className="absolute top-0 left-0 w-1 h-full bg-indigo-500"></div>
                        <div className="flex whitespace-pre-wrap text-sm text-indigo-50 font-medium leading-relaxed font-mono">
                          {whatsappText}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })() : (
              <div className="bg-white border text-center border-gray-200 p-12 rounded-2xl shadow-sm text-slate-500 flex flex-col items-center justify-center">
                <div className="w-16 h-16 bg-slate-50 border border-slate-100 rounded-full flex items-center justify-center mb-4 text-slate-300">
                  <Award size={24} />
                </div>
                <h3 className="text-sm font-bold text-slate-700">No Student Selected</h3>
                <p className="text-xs text-slate-400 max-w-sm mx-auto mt-2 leading-relaxed">
                  Please select a class and then choose a student from the dropdown above to begin building their multi-subject report card.
                </p>
              </div>
            )}
          </div>
        )}

{/* ========== TEACHER TIMETABLE SCHEDULE ========== */}
        {activeTab === 'timetable' && (
          <div id="panel-teacher-timetable" className="space-y-6 animate-fade-in bg-amber-50/50 p-4 sm:p-6 -mx-4 sm:-mx-6 rounded-2xl border border-amber-100 shadow-inner">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">My Pedagogical Timetable</h1>
              <p className="text-xs text-gray-500 mt-0.5">Filter schedule blocks specifically looking for sessions registered to your instructor identity.</p>
            </div>

            {/* Timetable Grid mapping */}
            <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-xs">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[700px] border-collapse text-left">
                  <thead>
                    <tr className="bg-gray-100/60 border-b border-gray-200">
                      <th className="px-4 py-3.5 text-xs font-bold text-gray-500 uppercase tracking-widest w-28">
                        Weekday
                      </th>
                      {PERIODS.map(p => (
                        <th key={p} className="px-4 py-3.5 text-xs font-bold text-gray-500 uppercase tracking-wider text-center border-l border-gray-150">
                          {p}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-150">
                    {DAYS.map(day => (
                      <tr key={day} className="hover:bg-gray-50/20">
                        <td className="px-4 py-6 font-bold text-gray-700 text-xs bg-gray-50/50">
                          {day}
                        </td>
                        {PERIODS.map(p => {
                          // Find entries where this teacher is scheduled to instruct
                          const entry = timetable.find(
                            tt => tt.teacherId === teacherId && 
                                 tt.day === day && 
                                 tt.period === p
                          );

                          return (
                            <td key={p} className="px-3 py-3 text-center border-l border-gray-200 align-top min-w-36">
                              {(() => {
                                if (!entry) return (
                                  <span className="text-[11px] text-gray-300 font-medium italic block py-4 select-none">
                                    No Lecture
                                  </span>
                                );
                                
                                let col = '#10b981'; // default emerald
                                try {
                                  const savedColors = localStorage.getItem('acadamis_period_colors');
                                  if (savedColors) {
                                    const parsedColors = JSON.parse(savedColors);
                                    col = parsedColors[`${entry.classId}_${p}`] || '#10b981';
                                  }
                                } catch (e) {}
                                
                                const systemDays = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
                                const systName = systemDays[new Date().getDay()];
                                const isLive = (day === systName || day === currentDayName) && getPeriodStatus(entry.time) === 'current';

                                return (
                                  <div 
                                    style={{ 
                                      borderLeft: isLive ? `4px solid #ef4444` : `3px solid ${col}`, 
                                      backgroundColor: isLive ? '#fef2f2' : `${col}12` 
                                    }}
                                    className={`p-2.5 rounded-r-xl border-t border-r border-b border-l-0 border-gray-150 text-left transition-all ${
                                      isLive ? 'ring-2 ring-red-500 shadow-md shadow-red-100 animate-pulse' : ''
                                    }`}
                                  >
                                    <div className="flex items-center justify-between gap-1">
                                      <div className="font-bold text-xs truncate" style={{ color: isLive ? '#ef4444' : col }}>
                                        {entry.subject}
                                      </div>
                                      {isLive && (
                                        <span className="shrink-0 bg-red-650 text-white text-[7px] font-black tracking-widest px-1 py-0.5 rounded uppercase font-display scale-90">
                                          LIVE
                                        </span>
                                      )}
                                    </div>
                                    <div className="text-[10px] text-slate-755 mt-0.5 truncate font-medium">
                                      🏫 Class: {getClassLabel(entry.classId)}
                                    </div>
                                    <div className="text-[9px] font-mono text-slate-500 mt-1 flex items-center justify-between">
                                      <span>{entry.time}</span>
                                    </div>
                                  </div>
                                );
                              })()}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ========== SETTINGS TAB (CHANGE ID/PASSWORD) ========== */}
        {activeTab === 'settings' && (
          <div id="panel-teacher-settings" className="space-y-8 animate-fade-in bg-slate-50 p-4 sm:p-6 -mx-4 sm:-mx-6 rounded-2xl border border-slate-200 shadow-inner">
            <div className="bg-white rounded-none p-8 border border-slate-200 shadow-sm border-t-4 border-t-indigo-600">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-indigo-50 rounded-none border border-indigo-100">
                  <Sparkles size={24} className="text-indigo-600" />
                </div>
                <div>
                  <h2 className="text-xl font-black text-slate-900 uppercase tracking-tight">Security & Profile Settings</h2>
                  <p className="text-xs text-slate-500">Update your portal login identity and password credentials below.</p>
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

                  // Update teacher record in state
                  const updatedTeachers = teachers.map(t => 
                    t.id === userSession.id ? { ...t, username: newID, password: newPass } : t
                  );
                  setTeachers(updatedTeachers);
                  toast.success("Profile credentials updated successfully! These changes are now active.");
                }}
                className="max-w-md space-y-6"
              >
                <div className="space-y-4">
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Portal Login ID / Username</label>
                    <input 
                      name="username"
                      type="text" 
                      defaultValue={teacherProfile?.username || ''}
                      className="w-full bg-slate-50 border border-slate-200 p-3 rounded-none focus:ring-1 focus:ring-indigo-500 outline-none font-mono text-sm"
                      placeholder="Enter new login ID"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">New Password</label>
                    <input 
                      name="password"
                      type="password" 
                      defaultValue={teacherProfile?.password || ''}
                      className="w-full bg-slate-50 border border-slate-200 p-3 rounded-none focus:ring-1 focus:ring-indigo-500 outline-none font-mono text-sm"
                      placeholder="Enter new password"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Confirm New Password</label>
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
                  className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 text-white font-black uppercase tracking-widest text-xs transition-all shadow-lg shadow-indigo-100 flex items-center justify-center gap-2"
                >
                  <Save size={16} />
                  Update Credentials
                </button>
              </form>

              <div className="mt-12 p-4 bg-amber-50 border border-amber-100 text-amber-800 text-[10px] leading-relaxed">
                <p className="font-bold flex items-center gap-1.5 mb-1 uppercase tracking-wider">
                  <AlertCircle size={12} /> Security Notice
                </p>
                Once you change your ID or Password, you must use the new credentials for your next login session. These settings are tracked by the Digital Registrar Office (Principal Dashboard) for administrative security protocols.
              </div>
            </div>
          </div>
        )}

      </main>

      {/* ========== MOBILE RESPONSIVE BOTTOM FOOTER NAVIGATION ========== */}
      <div id="teacher-mobile-footer-nav" className="md:hidden fixed bottom-0 left-0 right-0 bg-slate-900 border-t border-slate-800 text-white z-50 shadow-2xl px-2 pb-safe select-none">
        <div className="flex justify-around items-center h-16 relative">
          
          <button
            id="mobile-nav-dashboard"
            onClick={() => { setActiveTab('dashboard'); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
            className={`flex-1 flex flex-col items-center justify-center py-1 transition-all text-center focus:outline-none ${
              activeTab === 'dashboard' ? 'text-emerald-400 font-bold scale-105' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Sparkles size={18} />
            <span className="text-[9px] mt-0.5 font-semibold uppercase tracking-wider">Home</span>
          </button>

          <button
            id="mobile-nav-marks"
            onClick={() => {
              handleEnterMarksTab(selectedMarkClassId || classes[0]?.id || '', selectedSubject, selectedExamType);
              setActiveTab('marks');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            className={`flex-1 flex flex-col items-center justify-center py-1 transition-all text-center focus:outline-none ${
              activeTab === 'marks' ? 'text-emerald-400 font-bold scale-105' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Award size={18} />
            <span className="text-[9px] mt-0.5 font-semibold uppercase tracking-wider">Grades</span>
          </button>

          {/* QUICK ATTENDANCE PROMINENT STANDOUT CTA */}
          <div className="flex-1 flex justify-center -translate-y-4">
            <button
              id="mobile-nav-attendance"
              onClick={() => {
                handleEnterAttendanceTab(activeClassId || classes[0]?.id || '', attendanceDate);
                setActiveTab('attendance');
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              style={{ minHeight: '52px', minWidth: '52px' }}
              className={`rounded-full flex flex-col items-center justify-center p-2.5 transition-all duration-300 shadow-xl border-4 ${
                activeTab === 'attendance'
                  ? 'bg-gradient-to-tr from-emerald-600 to-teal-500 border-slate-900 text-white scale-110 ring-4 ring-emerald-500/20'
                  : 'bg-emerald-500 hover:bg-emerald-400 border-slate-900 text-white hover:scale-105 animate-pulse'
              }`}
            >
              <CheckSquare size={20} className="stroke-[2.5]" />
              <span className="text-[8px] font-black uppercase tracking-widest mt-0.5">Attd</span>
            </button>
          </div>

          <button
            id="mobile-nav-students"
            onClick={() => { setActiveTab('students'); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
            className={`flex-1 flex flex-col items-center justify-center py-1 transition-all text-center focus:outline-none ${
              activeTab === 'students' ? 'text-emerald-400 font-bold scale-105' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Users size={18} />
            <span className="text-[9px] mt-0.5 font-semibold uppercase tracking-wider">Pupils</span>
          </button>

          

        </div>
      </div>

      {/* Add Cash Fee Modal */}
      <AnimatePresence>
        {showAddFeeModal && (
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[110] p-4 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white w-full max-w-md border border-slate-200 p-8 shadow-2xl relative"
            >
              <button 
                onClick={() => setShowAddFeeModal(false)}
                className="absolute top-4 right-4 text-slate-400 hover:text-slate-900"
              >
                <X size={20} />
              </button>

              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-emerald-50 rounded-none border border-emerald-100/60">
                  <CreditCard size={20} className="text-emerald-600" />
                </div>
                <div>
                  <h2 className="text-lg font-black uppercase tracking-tight text-slate-900">Add Cash Collection</h2>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest tracking-[0.2em]">Quick Ledger Entry (Cash Collection)</p>
                </div>
              </div>

              <div className="space-y-5">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 block">Select Student</label>
                  <select 
                    value={newFeeStudentId}
                    onChange={(e) => {
                      const sid = e.target.value;
                      setNewFeeStudentId(sid);
                      if (sid) {
                        const student = students.find(s => s.id === sid);
                        const arrears = fees
                          .filter(f => f.studentId === sid && f.status === 'unpaid')
                          .reduce((sum, f) => sum + f.amount, 0);
                        const base = student?.baseFee || 500;
                        setNewFeeAmount((base + arrears).toString());
                        setAmountCollected((base + arrears).toString());
                      }
                    }}
                    className="w-full bg-white border border-slate-200 px-3 py-2 text-xs font-bold text-slate-700 focus:outline-none focus:border-emerald-500"
                  >
                    <option value="">-- Select Pupil --</option>
                    {viewClassStudents.map(s => {
                      const studentArrears = fees
                        .filter(f => f.studentId === s.id && f.status === 'unpaid')
                        .reduce((sum, f) => sum + f.amount, 0);
                      return (
                        <option key={s.id} value={s.id}>
                          {s.name} (Roll: #{s.rollNumber}) {studentArrears > 0 ? `| Arrears: ${studentArrears}` : ''}
                        </option>
                      );
                    })}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5 col-span-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 block leading-none mb-1">Voucher Amount (Total Amount)</label>
                    <div className="flex gap-2 mb-2">
                      {[500, 400, 300].map(amt => (
                        <button
                          key={amt}
                          onClick={() => setNewFeeAmount(amt.toString())}
                          className="px-2 py-1 bg-slate-100 hover:bg-slate-900 hover:text-white transition-all text-[9px] font-black rounded-lg border border-slate-200"
                        >
                          {amt}
                        </button>
                      ))}
                    </div>
                    <div className="relative">
                      <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400 font-mono text-xs font-bold">Rs.</span>
                      <input 
                        type="number"
                        value={newFeeAmount}
                        onChange={(e) => setNewFeeAmount(e.target.value)}
                        placeholder="e.g. 500"
                        className="w-full pl-7 pr-3 py-2 bg-white border border-slate-200 text-xs font-bold text-slate-700 focus:outline-none focus:border-emerald-500" 
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5 col-span-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-emerald-600 block leading-none mb-1 italic">Cash Collected (Received)</label>
                    <div className="flex gap-2 mb-2">
                      {newFeeAmount && [newFeeAmount, (Number(newFeeAmount)/2).toString()].map(amt => (
                        <button
                          key={amt}
                          onClick={() => setAmountCollected(amt.toString())}
                          className="px-2 py-1 bg-emerald-50 hover:bg-emerald-600 hover:text-white transition-all text-[9px] font-black text-emerald-700 rounded-lg border border-emerald-100"
                        >
                          Recovered ${amt}
                        </button>
                      ))}
                    </div>
                    <div className="relative">
                      <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-emerald-500 font-mono text-xs font-bold">Rs.</span>
                      <input 
                        type="number"
                        value={amountCollected}
                        onChange={(e) => setAmountCollected(e.target.value)}
                        placeholder="Full amount?"
                        className="w-full pl-7 pr-3 py-2 bg-emerald-50 border border-emerald-200 text-xs font-bold text-emerald-800 focus:outline-none focus:border-emerald-600 placeholder:text-emerald-300" 
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 block">Month</label>
                    <select 
                      value={newFeeMonth}
                      onChange={(e) => setNewFeeMonth(e.target.value)}
                      className="w-full bg-white border border-slate-200 px-3 py-2 text-xs font-bold text-slate-700 focus:outline-none focus:border-emerald-500"
                    >
                      {['June 2026', 'July 2026', 'August 2026', 'September 2026'].map(m => (
                        <option key={m} value={m}>{m}</option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 block">Fee Category</label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {[
                        'Tuition Fee', 
                        'Pending Balance', 
                        ...(classes.find(c => c.id === activeClassId)?.feeConfigs?.map(cc => cc.name) || ['Paper Fund'])
                      ].filter((v, i, a) => a.indexOf(v) === i).map(cat => {
                        const curCls = classes.find(c => c.id === activeClassId);
                        let displayAmount = '';
                        if (cat === 'Tuition Fee') {
                          const student = students.find(s => s.id === newFeeStudentId);
                          displayAmount = student?.baseFee ? String(student.baseFee) : '1500';
                        } else {
                          const config = curCls?.feeConfigs?.find(cc => cc.name === cat);
                          if (config) displayAmount = String(config.amount);
                          else if (cat === 'Paper Fund') displayAmount = '150';
                          else if (cat === 'Pending Balance') displayAmount = '500';
                        }
                        
                        const isSelected = newFeeType === cat;

                        return (
                          <button
                            key={cat}
                            type="button"
                            onClick={() => {
                              if (isSelected) {
                                setNewFeeType('');
                                setNewFeeAmount('');
                              } else {
                                setNewFeeType(cat);
                                if (displayAmount) setNewFeeAmount(displayAmount);
                              }
                            }}
                            className={`py-2 px-3 border text-[10px] uppercase font-black tracking-wider transition-all text-left rounded-sm cursor-pointer flex justify-between items-center ${
                              isSelected 
                                ? 'bg-emerald-600 border-emerald-600 text-white shadow-xs' 
                                : 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-600'
                            }`}
                          >
                            <span>{cat}</span>
                            {displayAmount && <span className="text-[8px] opacity-70">Rs. {displayAmount}</span>}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>

                <button
                  onClick={handleAddCashFee}
                  className="w-full bg-slate-900 text-white font-black uppercase tracking-widest py-3 mt-2 hover:bg-emerald-600 transition-all text-xs flex items-center justify-center gap-2"
                >
                  <CheckCircle2 size={16} />
                  Record Collection
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Student Profile & Direct Mark Management Modal */}
      <AnimatePresence>
        {showProfileModal && selectedStudentProfile && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col border border-slate-200 shadow-2xl rounded-none"
            >
              {/* Modal Header */}
              <div className="p-6 bg-slate-900 text-white flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-indigo-600 flex items-center justify-center text-xl font-black italic">
                    {selectedStudentProfile.name.charAt(0)}
                  </div>
                  <div>
                    <h2 className="text-xl font-black uppercase tracking-tight">{selectedStudentProfile.name}</h2>
                    <p className="text-xs text-indigo-300 font-bold tracking-widest uppercase mt-0.5">
                      Roll #{selectedStudentProfile.rollNumber} • {getClassLabel(selectedStudentProfile.classId)}
                    </p>
                  </div>
                </div>
                <button 
                  onClick={() => setShowProfileModal(false)}
                  className="p-2 hover:bg-white/10 transition-colors text-slate-300 hover:text-white"
                >
                  <X size={24} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-8 space-y-10 text-left">
                {/* Information Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                  <div className="space-y-4">
                    <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] border-b border-slate-100 pb-2">Student Bio</h3>
                    <div className="space-y-3">
                      <div>
                        <p className="text-[9px] font-bold text-slate-400 uppercase">Academic Email</p>
                        <p className="text-xs font-bold text-slate-800">{selectedStudentProfile.email}</p>
                      </div>
                      <div>
                        <p className="text-[9px] font-bold text-slate-400 uppercase">Username</p>
                        <p className="text-xs font-mono text-slate-600">{selectedStudentProfile.username}</p>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] border-b border-slate-100 pb-2">Guardian Context</h3>
                    <div className="space-y-3">
                      <div>
                        <p className="text-[9px] font-bold text-slate-400 uppercase">Parent Phone</p>
                        <p className="text-xs font-mono font-bold text-slate-800">{selectedStudentProfile.parentPhone}</p>
                      </div>
                      <div>
                        <p className="text-[9px] font-bold text-slate-400 uppercase">Guardian Name</p>
                        <p className="text-xs font-bold text-slate-800">{selectedStudentProfile.guardianName || 'N/A'}</p>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] border-b border-slate-100 pb-2">Financial Status</h3>
                    <div className="bg-slate-50 p-3 border border-slate-100">
                      <p className="text-[9px] font-bold text-slate-400 uppercase">Monthly Base Fee</p>
                      <p className="text-lg font-black text-slate-900">Rs. {selectedStudentProfile.baseFee || '0'}</p>
                    </div>
                  </div>
                </div>

                {/* Mark Management Section */}
                <div className="pt-8 border-t border-slate-100 grid grid-cols-1 lg:grid-cols-2 gap-10">
                  {/* Mark Input Form */}
                  <div className="space-y-6">
                    <div className="flex items-center gap-2">
                       <Award className="text-indigo-600" size={20} />
                       <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider italic">Direct Mark Management</h3>
                    </div>
                    
                    <div className="bg-indigo-50/50 p-6 border border-indigo-100 space-y-4 shadow-sm">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1.5 font-sans">
                          <label className="text-[9px] font-black text-indigo-900 uppercase">Subject</label>
                          <input 
                            type="text"
                            value={profileMarkSubject}
                            onChange={(e) => setProfileMarkSubject(e.target.value)}
                            className="w-full px-3 py-2 bg-white border border-indigo-200 text-xs font-bold focus:border-indigo-600 focus:outline-none"
                          />
                        </div>
                        <div className="space-y-1.5 font-sans">
                          <label className="text-[9px] font-black text-indigo-900 uppercase">Max Marks</label>
                          <input 
                            type="number"
                            value={profileMarkMax}
                            onChange={(e) => setProfileMarkMax(e.target.value)}
                            className="w-full px-3 py-2 bg-white border border-indigo-200 text-xs font-bold focus:border-indigo-600 focus:outline-none"
                          />
                        </div>
                      </div>

                      <div className="space-y-1.5 font-sans">
                         <label className="text-[9px] font-black text-indigo-900 uppercase">Test / Assignment Title</label>
                         <input 
                           type="text"
                           value={profileMarkExam}
                           onChange={(e) => setProfileMarkExam(e.target.value)}
                           placeholder="e.g. Monthly Test, Assignment 1"
                           className="w-full px-3 py-2 bg-white border border-indigo-200 text-xs font-bold focus:border-indigo-600 focus:outline-none"
                         />
                      </div>

                      <div className="space-y-1.5 font-sans">
                         <label className="text-[9px] font-black text-indigo-900 uppercase">Marks Obtained</label>
                         <div className="flex items-center gap-3">
                           <input 
                             type="number"
                             value={profileMarkObtained}
                             onChange={(e) => setProfileMarkObtained(e.target.value)}
                             placeholder="Score"
                             className="w-full px-4 py-3 bg-white border border-indigo-200 text-lg font-black text-indigo-900 focus:border-indigo-600 focus:outline-none"
                           />
                           <span className="text-slate-400 font-black text-xl italic">/ {profileMarkMax}</span>
                         </div>
                      </div>

                      <button 
                        onClick={handleAddMarkFromProfile}
                        className="w-full py-4 bg-indigo-600 hover:bg-slate-900 text-white text-[10px] font-black uppercase tracking-[0.2em] shadow-lg shadow-indigo-200 transition-all active:scale-95"
                      >
                        Commit Mark to Record
                      </button>
                    </div>
                  </div>

                  {/* Existing Marks List */}
                  <div className="space-y-6">
                    <div className="flex items-center justify-between">
                       <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Academic History</h3>
                       <span className="text-[9px] font-bold text-indigo-600 uppercase">Latest Entries</span>
                    </div>

                    <div className="space-y-3 max-h-[350px] overflow-y-auto pr-2 custom-scrollbar">
                      {marks.filter(m => m.studentId === selectedStudentProfile.id).length > 0 ? (
                        marks
                          .filter(m => m.studentId === selectedStudentProfile.id)
                          .sort((a, b) => b.id.localeCompare(a.id))
                          .map(m => (
                            <div key={m.id} className="p-4 bg-white border border-slate-100 flex items-center justify-between hover:border-indigo-200 transition-all shadow-xs rounded-none">
                              <div className="text-left">
                                <h4 className="text-xs font-black text-slate-800 uppercase tracking-tight">{m.examType}</h4>
                                <p className="text-[10px] text-slate-400 font-bold uppercase mt-0.5">{m.subject}</p>
                              </div>
                              <div className="text-right">
                                <span className={`text-base font-black italic ${ (m.marksObtained / Math.max(1, m.maxMarks)) >= 0.33 ? 'text-emerald-600' : 'text-rose-600'}`}>
                                  {m.marksObtained}
                                </span>
                                <span className="text-xs text-slate-300 font-bold"> / {m.maxMarks}</span>
                              </div>
                            </div>
                          ))
                      ) : (
                        <div className="py-12 border-2 border-dashed border-slate-100 flex flex-col items-center justify-center text-slate-400 gap-3">
                           <Award size={32} className="opacity-20" />
                           <p className="text-[10px] font-bold uppercase tracking-widest">No academic records found</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-6 bg-slate-50 border-t border-slate-100 flex justify-end">
                <button 
                  onClick={() => setShowProfileModal(false)}
                  className="px-8 py-3 bg-slate-900 text-white text-[10px] font-black uppercase tracking-widest hover:bg-slate-800 transition-all shadow-lg"
                >
                  Close Profile
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Minimalist Parent Message Notification Alert Popup */}
      {feeNotificationPopup && (
        <div id="parent-notification-modal-teacher" className="fixed inset-0 bg-slate-900/40 flex items-center justify-center p-4 z-[999] backdrop-blur-sm animate-fade-in">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white border border-slate-200 w-full max-w-lg shadow-2xl overflow-hidden flex flex-col rounded-none"
          >
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Bell size={20} className="text-indigo-600" />
                <h3 className="text-sm font-black uppercase tracking-tight text-slate-900">Receipt Dispatch</h3>
              </div>
              <button 
                onClick={() => setFeeNotificationPopup(null)}
                className="text-slate-400 hover:text-slate-900 transition-colors"
                title="Close window"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-8 space-y-6">
              <div className="flex justify-between items-end border-b border-slate-50 pb-4">
                <div className="text-left">
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Recipient Parent</p>
                  <p className="text-sm font-bold text-slate-900">{feeNotificationPopup.guardianName}</p>
                </div>
                <div className="text-right">
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Phone Number</p>
                  <p className="text-xs font-mono font-bold text-slate-600">{feeNotificationPopup.parentPhone}</p>
                </div>
              </div>

              <div className="space-y-2 text-left">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Message Content</label>
                <textarea
                  value={feeNotificationPopup.messageText}
                  onChange={(e) => {
                    const revisedText = e.target.value;
                    setFeeNotificationPopup(prev => prev ? { ...prev, messageText: revisedText } : null);
                  }}
                  rows={6}
                  className="w-full bg-slate-50 text-xs p-4 rounded-none text-slate-800 border border-slate-100 focus:outline-none focus:border-indigo-600 leading-relaxed resize-none font-medium"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(feeNotificationPopup.messageText);
                    toast.success("Copied to clipboard");
                  }}
                  className="py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 text-[10px] font-black uppercase tracking-[0.2em] transition-all"
                >
                  Copy Text
                </button>
                <a
                  href={`https://api.whatsapp.com/send?phone=${feeNotificationPopup.parentPhone.replace(/[^0-9]/g, '')}&text=${encodeURIComponent(feeNotificationPopup.messageText)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="py-3 bg-emerald-600 hover:bg-slate-900 text-white text-[10px] font-black uppercase tracking-[0.2em] transition-all flex items-center justify-center gap-2"
                >
                  <Phone size={14} fill="currentColor" />
                  WA Receipt
                </a>
              </div>
            </div>

            <div className="bg-slate-50 p-4 border-t border-slate-100 flex justify-end">
              <button
                type="button"
                onClick={() => setFeeNotificationPopup(null)}
                className="px-6 py-2 bg-slate-900 text-white text-[9px] font-black uppercase tracking-widest hover:bg-slate-800 transition-all font-sans"
              >
                Dismiss
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
