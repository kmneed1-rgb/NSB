import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'sonner';
import { 
  Users, Calendar, Award, CheckSquare, LogOut, Save, UserCheck, UserX,
  Clock, AlertCircle, Sparkles, BookOpen, Menu, X, ArrowLeft, ClipboardList, Info, CreditCard,
  Bell, CheckCircle2, ListTodo, CalendarDays, ArrowRight, Search, PlusCircle, AlertTriangle, ChevronDown
} from 'lucide-react';
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

type TabType = 'dashboard' | 'students' | 'attendance' | 'marks' | 'timetable' | 'fees';

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

  // MARKS STATES
  const [selectedMarkClassId, setSelectedMarkClassId] = useState<string>(activeClassId);
  const [selectedSubject, setSelectedSubject] = useState<string>(teacherSubject);
  const [selectedExamType, setSelectedExamType] = useState<ExamType>('Unit Test');
  const [maxMarksInput, setMaxMarksInput] = useState<number>(25);
  // Scratchpad for marks edits: { [studentId: string]: string (marks obtained) }
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
        <div className="flex items-center gap-2">
          <button 
             onClick={onLogout}
             className="px-3 py-1.5 rounded-lg border border-red-100 text-red-600 bg-red-50 hover:bg-red-600 hover:text-white flex items-center gap-1.5 font-black text-[10px] uppercase transition-all shadow-sm"
             title="Logout"
          >
            <LogOut size={16} />
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
              { id: 'fees', label: 'Finances', icon: CreditCard }
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
        
        {/* ========== TEACHER DASHBOARD HOME ========== */}
        {activeTab === 'dashboard' && (
          <div id="panel-teacher-home" className="space-y-8 animate-fade-in">
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
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              
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

              <div 
                onClick={() => {
                  setActiveTab('fees');
                }}
                className="bg-white p-6 border-b-4 border-amber-500 shadow-sm rounded-none hover:shadow-md transition-all cursor-pointer group"
              >
                <div className="h-10 w-10 bg-slate-100 text-slate-800 rounded-none flex items-center justify-center mb-4 group-hover:bg-amber-600 group-hover:text-white transition-all border border-slate-250">
                  <CreditCard size={18} />
                </div>
                <h3 className="text-base font-bold text-slate-900 uppercase tracking-wide font-display">Collection Audit</h3>
                <p className="text-xs text-slate-500 mt-1">Track classroom dues and record cash contributions from parents.</p>
              </div>

              <div 
                onClick={() => {
                  setShowPasswordModal(true);
                  setNewPassword('');
                }}
                className="bg-white p-6 border-b-4 border-slate-900 shadow-sm rounded-none hover:shadow-md transition-all cursor-pointer group"
              >
                <div className="h-10 w-10 bg-slate-100 text-slate-800 rounded-none flex items-center justify-center mb-4 group-hover:bg-slate-900 group-hover:text-white transition-all border border-slate-250">
                  <Menu size={18} />
                </div>
                <h3 className="text-base font-bold text-slate-900 uppercase tracking-wide font-display">Security Settings</h3>
                <p className="text-xs text-slate-500 mt-1">Change your portal password and update instructional credentials here.</p>
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
          <div id="panel-teacher-students" className="space-y-6 animate-fade-in">
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
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 text-sm">
                    {viewClassStudents.length > 0 ? (
                      viewClassStudents.map(s => (
                        <tr key={s.id} className="hover:bg-gray-50/40">
                          <td className="px-6 py-4 font-mono font-bold text-gray-700">#{s.rollNumber}</td>
                          <td className="px-6 py-4">
                            <span className="font-semibold text-slate-900">{s.name}</span>
                          </td>
                          <td className="px-6 py-4 text-xs font-medium text-gray-600">{s.email}</td>
                          <td className="px-6 py-4 text-xs font-mono text-gray-500">{s.parentPhone}</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={4} className="px-6 py-12 text-center text-gray-400 text-sm italic">
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
          <div id="panel-teacher-attendance" className="space-y-6 animate-fade-in">
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
                        const messageText = `Greetings, Respected Parent! We noticed that your child ${st.name} (Roll: ${st.rollNumber}) has been marked ABSENT on date ${attendanceDate}. Kindly clarify the reason or contact the school office. Principal.`;
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
          <div id="panel-teacher-marks" className="space-y-6 animate-fade-in">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Manage Examination Grades</h1>
                <p className="text-xs text-gray-500 mt-0.5">Input parameters, subject references, and raw grades scored. Submit to propagate to students.</p>
              </div>

              {/* Filter tools */}
              <div className="flex flex-wrap items-center gap-2">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-semibold text-gray-500">Class:</span>
                  <select
                    id="marks-class-select"
                    value={selectedMarkClassId}
                    onChange={(e) => handleEnterMarksTab(e.target.value, selectedSubject, selectedExamType)}
                    className="px-2 py-1.5 bg-white border border-gray-200 rounded-lg text-xs font-bold text-slate-800 focus:outline-none"
                  >
                    {myClasses.map(cl => (
                      <option key={cl.id} value={cl.id}>{cl.className} ({cl.section})</option>
                    ))}
                  </select>
                </div>

                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-semibold text-gray-500">Exam:</span>
                  <select
                    id="marks-exam-select"
                    value={selectedExamType}
                    onChange={(e) => handleEnterMarksTab(selectedMarkClassId, selectedSubject, e.target.value as ExamType)}
                    className="px-2 py-1.5 bg-white border border-gray-200 rounded-lg text-xs font-bold text-slate-800 focus:outline-none"
                  >
                    <option value="Unit Test">Unit Test</option>
                    <option value="Half Yearly">Half Yearly</option>
                    <option value="Final">Final</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Input Config Bar */}
            <div className="bg-white border border-gray-200 rounded-xl p-4 grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-1">
                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest">Active Subject</label>
                <input
                  id="marks-subject-input"
                  type="text"
                  value={selectedSubject}
                  onChange={(e) => setSelectedSubject(e.target.value)}
                  placeholder="e.g. Mathematics"
                  className="w-full px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-xs font-semibold text-slate-900 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest">Maximum Possible Grade</label>
                <input
                  id="marks-max-marks-input"
                  type="number"
                  value={maxMarksInput}
                  onChange={(e) => setMaxMarksInput(Math.max(1, parseInt(e.target.value) || 0))}
                  className="w-full px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-xs font-bold text-slate-900 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="flex items-end">
                <button
                  type="button"
                  onClick={() => handleEnterMarksTab(selectedMarkClassId, selectedSubject, selectedExamType)}
                  className="w-full py-1.5 px-3 border border-slate-200 hover:bg-slate-50 text-slate-700 hover:text-slate-800 rounded-lg text-xs font-bold tracking-wide transition-all"
                >
                  Reload Current Marks
                </button>
              </div>
            </div>


            {/* Interactive Scores Board */}
            <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-xs">
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b border-gray-100 text-xs font-bold text-gray-500 uppercase tracking-widest bg-gray-50">
                      <th className="px-6 py-4 w-28">Roll #</th>
                      <th className="px-6 py-4">Student Profile</th>
                      <th className="px-6 py-4">Assessment parameters</th>
                      <th className="px-6 py-4 w-48">Score Given</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-150 text-sm">
                    {students.filter(s => s.classId === selectedMarkClassId).length > 0 ? (
                      students.filter(s => s.classId === selectedMarkClassId).map(student => (
                        <tr key={student.id} className="hover:bg-gray-50/20">
                          <td className="px-6 py-4 font-mono text-gray-700 font-bold">#{student.rollNumber}</td>
                          <td className="px-6 py-4">
                            <span className="font-semibold text-slate-900 block">{student.name}</span>
                            <span className="text-[10px] text-gray-400 font-mono">{student.email}</span>
                          </td>
                          <td className="px-6 py-4 text-xs font-medium text-gray-700">
                            <div>{selectedSubject}</div>
                            <div className="text-gray-400 mt-0.5">{selectedExamType} (Max {maxMarksInput})</div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-2">
                              <input
                                type="number"
                                min="0"
                                max={String(maxMarksInput)}
                                step="0.5"
                                value={scratchMarks[student.id] || ''}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  setScratchMarks(prev => ({ ...prev, [student.id]: val }));
                                }}
                                placeholder="0"
                                className="w-20 px-3 py-1.5 bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-lg text-sm text-center font-extrabold text-blue-900 focus:outline-none focus:border-emerald-500"
                              />
                              <span className="text-xs text-gray-400 font-bold">/ {maxMarksInput}</span>
                            </div>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={4} className="px-6 py-12 text-center text-gray-400 text-sm italic font-medium">
                          No student profiles enrolled inside this classroom context.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {students.filter(s => s.classId === selectedMarkClassId).length > 0 && (
                <div className="p-4 bg-gray-50 border-t border-gray-100 flex justify-end">
                  <button
                    id="save-marks-btn"
                    onClick={handleSaveMarks}
                    className="flex items-center gap-2 py-2 px-5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold tracking-wide shadow-sm transition-all"
                  >
                    <Save size={14} />
                    Commit and Save Marks Register
                  </button>
                </div>
              )}
            </div>

            {/* ========== WHATSAPP REPORT CARD BROADCASTER ========== */}
            {(() => {
              const activeClassStudents = students.filter(s => s.classId === selectedMarkClassId);
              return (
                <div className="bg-gradient-to-br from-slate-950 to-indigo-900 text-white p-5 rounded-none border-l-4 border-indigo-500 shadow-sm mt-8 space-y-4 font-sans border border-slate-750">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                    <div>
                      <h3 className="text-xs font-black uppercase tracking-widest text-indigo-400 flex items-center gap-1.5 font-display">
                        📊 WhatsApp Monthly Results Dispatch
                      </h3>
                      <p className="text-[11px] text-indigo-200">
                        Disseminate instant subject scorecards and overall monthly grades to parents over automated or manual WhatsApp contact channels.
                      </p>
                    </div>
                    {activeClassStudents.length > 0 && (
                      <button
                        type="button"
                        onClick={() => {
                          toast.success(`Autopilot Result Webhook triggered: Dispatched ${activeClassStudents.length} evaluation scorecards to parent Whatsapp Groups successfully!`);
                        }}
                        className="bg-indigo-600 hover:bg-slate-900 text-white text-[10px] font-black uppercase py-2 px-3 tracking-wider flex items-center gap-1.5 transition-all cursor-pointer"
                      >
                        ⚡ Broadcast Complete Class results via autopilot
                      </button>
                    )}
                  </div>

                  {activeClassStudents.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {activeClassStudents.map(st => {
                        const scoreObtained = scratchMarks[st.id] || '0';
                        const pct = Math.round((Number(scoreObtained) / maxMarksInput) * 100);
                        const reportText = `Greetings, Respected Parent! ScholarSync monthly scorecard for ${st.name} (Roll: ${st.rollNumber}) has been updated. Exam: ${selectedExamType} | Subject: ${selectedSubject} | Marks: ${scoreObtained}/${maxMarksInput} (${pct}%) | Status: ${pct >= 40 ? 'PASS' : 'RE-STUDY'}. Principal.`;

                        return (
                          <div key={st.id} className="bg-white/5 border border-white/10 p-3.5 space-y-2.5 flex flex-col justify-between">
                            <div>
                              <div className="flex justify-between items-start">
                                <div>
                                  <h4 className="text-xs font-bold text-white uppercase">{st.name}</h4>
                                  <span className="text-[9px] text-indigo-200 font-mono">Roll: #{st.rollNumber}</span>
                                </div>
                                <span className={`text-[9px] font-mono px-1.5 py-0.5 font-bold ${pct >= 40 ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'}`}>
                                  {pct}% ({pct >= 40 ? 'PASS' : 'FAIL'})
                                </span>
                              </div>
                              <p className="text-[10px] text-slate-300 font-mono italic mt-1 bg-white/[0.03] p-1.5 border border-white/5 line-clamp-2">
                                "{reportText}"
                              </p>
                            </div>

                            <div className="flex justify-between items-center pt-2.5 border-t border-white/10">
                              <span className="text-[9px] font-mono text-indigo-400">📲 {st.parentPhone || '0300-1112222'}</span>
                              <a
                                href={`https://api.whatsapp.com/send?phone=${st.parentPhone || '923001234567'}&text=${encodeURIComponent(reportText)}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                onClick={() => {
                                  toast.info(`Result card WhatsApp transmission launched for student ${st.name}!`);
                                }}
                                className="bg-indigo-600 hover:bg-slate-900 text-white font-extrabold text-[9px] px-2.5 py-1 uppercase flex items-center gap-1 transition-all"
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
                      ★ Select and populate a correct class register above to configure WhatsApp scorecard Broadcasters.
                    </div>
                  )}
                </div>
              );
            })()}

          </div>
        )}

        {/* ========== TEACHER TIMETABLE SCHEDULE ========== */}
        {activeTab === 'timetable' && (
          <div id="panel-teacher-timetable" className="space-y-6 animate-fade-in">
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
                                
                                return (
                                  <div 
                                    style={{ borderLeft: `3px solid ${col}`, backgroundColor: `${col}12` }}
                                    className="p-2.5 rounded-r-xl border-t border-r border-b border-l-0 border-gray-150 text-left"
                                  >
                                    <div className="font-bold text-xs truncate" style={{ color: col }}>
                                      {entry.subject}
                                    </div>
                                    <div className="text-[10px] text-slate-700 mt-0.5 truncate font-medium">
                                      🏫 Class: {getClassLabel(entry.classId)}
                                    </div>
                                    <div className="text-[9px] font-mono text-slate-500 mt-1">
                                      {entry.time}
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

        {/* ========== CLASS FEES TRACKER ========== */}
        {activeTab === 'fees' && (
          <div id="panel-teacher-fees" className="space-y-8 animate-fade-in font-sans pb-20">
            
            {/* Action Oriented Header */}
            <div className="bg-white p-6 md:p-8 border rounded-3xl border-slate-100 shadow-xl shadow-slate-100/50 flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-emerald-600 text-white rounded-2xl shadow-lg shadow-emerald-200">
                  <CreditCard size={24} />
                </div>
                <div>
                  <h1 className="text-2xl font-black text-slate-900 tracking-tight uppercase italic leading-none">Class Fee Audit</h1>
                  <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-1">Live Register Collections & Audit (Cash Collection)</p>
                </div>
              </div>
              
              <div className="flex items-center gap-3">
                <button
                  onClick={() => {
                    setShowAddFeeModal(true);
                    setNewFeeStudentId(viewClassStudents[0]?.id || '');
                  }}
                  className="bg-slate-900 hover:bg-emerald-600 text-white px-6 py-3.5 text-xs font-black uppercase tracking-widest flex items-center gap-2 transform transition-all active:scale-95 shadow-xl rounded-2xl"
                >
                  <PlusCircle size={16} />
                  Record Collection
                </button>
                <div className="flex items-center gap-2 bg-slate-50 p-2 rounded-2xl border border-slate-100">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2 italic">Active Register:</span>
                  <select
                    value={activeClassId}
                    onChange={(e) => setActiveClassId(e.target.value)}
                    className="px-4 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-black text-slate-900 focus:outline-none"
                  >
                    {classes.map(cl => (
                      <option key={cl.id} value={cl.id}>{cl.className} ({cl.section})</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* ACTIONABLE LEDGER SYSTEM GRID */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
              {/* LEFT BAR: REGISTRY SELECTOR */}
              <div className="lg:col-span-4 space-y-6">
                <div className="bg-white border border-slate-100 rounded-3xl shadow-xl shadow-slate-100/50 p-6">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="p-2 bg-emerald-600 text-white rounded-xl">
                      <Search size={18} />
                    </div>
                    <h3 className="text-sm font-black text-slate-900 uppercase italic">Ledger Scanner</h3>
                  </div>

                  <div className="space-y-4">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Active Register</label>
                      <select
                        value={activeClassId}
                        onChange={(e) => setActiveClassId(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-100 p-3 rounded-2xl text-xs font-black text-slate-900 focus:outline-none focus:border-emerald-500"
                      >
                        {classes.map(cl => (
                          <option key={cl.id} value={cl.id}>{cl.className} ({cl.section})</option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Search Pupils</label>
                      <input 
                        type="text"
                        placeholder="Name/Roll..."
                        value={feeSearch}
                        onChange={(e) => setFeeSearch(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-100 px-4 py-3 text-xs font-bold rounded-2xl focus:outline-none focus:border-emerald-500"
                      />
                    </div>
                  </div>

                  <div className="mt-8 space-y-1 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                    {viewClassStudents
                      .filter(s => (s.name || '').toLowerCase().includes(feeSearch.toLowerCase()) || s.rollNumber.includes(feeSearch))
                      .map(student => {
                        const isSelected = newFeeStudentId === student.id;
                        return (
                          <button
                            key={student.id}
                            onClick={() => setNewFeeStudentId(student.id)}
                            className={`w-full text-left p-4 rounded-2xl transition-all flex items-center justify-between group ${
                              isSelected ? 'bg-emerald-600 text-white shadow-xl' : 'hover:bg-slate-50 text-slate-600'
                            }`}
                          >
                            <div className="flex items-center gap-3">
                              <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-sm ${
                                isSelected ? 'bg-white/20' : 'bg-slate-100 text-slate-900'
                              }`}>
                                {student.name?.[0].toUpperCase()}
                              </div>
                              <div>
                                <p className="text-[11px] font-black uppercase tracking-tight italic">{student.name}</p>
                                <p className="text-[9px] font-bold opacity-60">ROLL: #{student.rollNumber}</p>
                              </div>
                            </div>
                            {isSelected && <ChevronDown size={14} />}
                          </button>
                        );
                      })}
                  </div>
                </div>
              </div>

              {/* RIGHT PANEL: STUDENT FINANCIAL HISTORY (KHATA) */}
              <div className="lg:col-span-8">
                {newFeeStudentId === '' ? (
                  <div className="h-full bg-slate-50 border-2 border-dashed border-slate-200 rounded-3xl flex flex-col items-center justify-center p-20 text-center">
                    <div className="w-16 h-16 bg-white rounded-2xl shadow-xl flex items-center justify-center mb-6">
                      <CreditCard size={32} className="text-slate-300" />
                    </div>
                    <h2 className="text-xl font-black text-slate-400 uppercase tracking-widest italic">Select Pupil Profile</h2>
                    <p className="text-xs text-slate-400 mt-2 max-w-xs">Filter your register on the left and select a student to review their financial history and authorize cash receipts.</p>
                  </div>
                ) : (
                  (() => {
                    const student = students.find(s => s.id === newFeeStudentId);
                    if (!student) return null;
                    const studentFees = fees.filter(f => f.studentId === student.id).sort((a,b) => b.id.localeCompare(a.id));
                    const totalPaid = studentFees.filter(f => f.status === 'paid').reduce((acc, curr) => acc + curr.amount, 0);
                    const totalArrears = studentFees.filter(f => f.status === 'unpaid').reduce((acc, curr) => acc + curr.amount, 0);

                    return (
                      <div className="bg-white border rounded-3xl border-slate-100 shadow-2xl overflow-hidden animate-fade-in mb-10">
                        <div className="bg-emerald-950 p-8 text-white">
                          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-8">
                            <div className="flex items-center gap-6">
                              <div className="w-20 h-20 bg-emerald-600 rounded-3xl flex items-center justify-center font-black text-3xl shadow-xl border border-white/5">
                                {student.name?.[0].toUpperCase()}
                              </div>
                              <div>
                                <h1 className="text-2xl font-black italic tracking-tight uppercase leading-none">{student.name}</h1>
                                <p className="text-[10px] font-black text-emerald-400 uppercase tracking-[0.3em] mt-2 mb-2 leading-none italic">Class Registry No: {student.rollNumber}</p>
                                <div className="flex gap-2">
                                  <span className="px-3 py-1 bg-white/5 text-white rounded-lg text-[10px] font-black uppercase border border-white/10 tracking-widest transition-colors hover:bg-white/10">Active Record</span>
                                </div>
                              </div>
                            </div>
                            
                            <div className="flex gap-4">
                              <div className="bg-white p-5 rounded-3xl shadow-xl min-w-[120px] text-center border border-slate-100">
                                <p className="text-[9px] font-black text-emerald-600 uppercase tracking-widest mb-1 leading-none">Recovered</p>
                                <p className="text-2xl font-black text-slate-900 font-mono tracking-tighter">${totalPaid}</p>
                              </div>
                              <div className="bg-rose-600 p-5 rounded-3xl shadow-xl min-w-[120px] text-center shadow-rose-900/40">
                                <p className="text-[9px] font-black text-rose-100 uppercase tracking-widest mb-1 leading-none">Arrears</p>
                                <p className="text-2xl font-black text-white font-mono tracking-tighter">${totalArrears}</p>
                              </div>
                            </div>
                          </div>
                        </div>

                        <div className="p-8 space-y-10">
                          {/* ARREARS SUMMARY */}
                          {totalArrears > 0 && (
                            <div className="bg-rose-50 border-2 border-rose-100 p-6 rounded-3xl flex items-center justify-between">
                              <div className="flex items-center gap-4">
                                <div className="p-3 bg-rose-600 text-white rounded-2xl shadow-lg ring-4 ring-rose-100">
                                  <AlertTriangle size={24} />
                                </div>
                                <div>
                                  <h4 className="text-sm font-black text-rose-900 uppercase italic leading-none">Remaining Balance (Balance)</h4>
                                  <p className="text-[10px] font-bold text-rose-600 mt-1 uppercase tracking-widest">Pending recovery for this pupil</p>
                                </div>
                              </div>
                              <p className="text-3xl font-black text-rose-600 animate-pulse font-mono tracking-tighter">${totalArrears}</p>
                            </div>
                          )}

                          {/* PAYMENT HISTORY SECTION */}
                          <div>
                            <div className="flex items-center justify-between mb-6">
                              <div className="flex items-center gap-3">
                                <div className="w-2 h-6 bg-emerald-600 rounded-full"></div>
                                <h3 className="text-lg font-black text-slate-900 uppercase italic leading-none">Payment History (Received)</h3>
                              </div>
                              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest bg-slate-50 px-3 py-1 rounded-full border border-slate-100">Chronological Logs</span>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              {studentFees.filter(f => f.status === 'paid').length === 0 ? (
                                <div className="col-span-full py-10 bg-slate-50 rounded-3xl border border-dashed border-slate-200 text-center">
                                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest italic leading-none">No historical payments found</p>
                                </div>
                              ) : (
                                studentFees.filter(f => f.status === 'paid').map(fee => (
                                  <div key={fee.id} className="bg-white border border-slate-100 p-4 rounded-3xl flex items-center justify-between group hover:border-emerald-200 transition-all shadow-sm">
                                    <div className="flex items-center gap-4">
                                      <div className="w-10 h-10 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center font-black">
                                        <CheckCircle2 size={18} />
                                      </div>
                                      <div>
                                        <p className="text-[11px] font-black text-slate-900 uppercase italic leading-none">${fee.amount} Received</p>
                                        <p className="text-[9px] font-bold text-slate-400 mt-1 uppercase">{fee.month} / {fee.paidDate}</p>
                                      </div>
                                    </div>
                                    <div className="text-right">
                                      <p className="text-[8px] font-black text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-lg uppercase">Success</p>
                                    </div>
                                  </div>
                                ))
                              )}
                            </div>
                          </div>

                          <div className="pt-4">
                            <div className="flex items-center justify-between mb-8">
                              <h3 className="text-lg font-black text-slate-900 uppercase italic leading-none">Live Ledger Entries</h3>
                              <button className="text-[10px] font-black text-emerald-600 uppercase tracking-widest italic border-b-2 border-emerald-600 pb-0.5">Full Audit View</button>
                            </div>

                            <div className="space-y-4">
                              {studentFees.length === 0 ? (
                                <div className="py-20 text-center bg-slate-50 rounded-3xl border border-slate-100 border-dashed">
                                  <p className="text-xs font-black text-slate-400 uppercase tracking-widest italic">Zero Ledger Entries</p>
                                </div>
                              ) : (
                                studentFees.map(fee => (
                                  <div key={fee.id} className={`bg-white border-2 p-5 rounded-3xl hover:shadow-lg transition-all group ${fee.status === 'unpaid' ? 'border-amber-100 bg-amber-50/10' : 'border-slate-50'}`}>
                                    <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
                                      <div className="flex items-center gap-5">
                                        <div className={`p-4 rounded-2xl ${fee.status === 'paid' ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
                                          <CreditCard size={20} />
                                        </div>
                                        <div>
                                          <div className="flex items-center gap-3">
                                            <h4 className="text-sm font-black text-slate-900 uppercase italic tracking-tight leading-none">{fee.month} {fee.feeType}</h4>
                                            <span className={`text-[9px] font-black px-2 py-0.5 rounded-lg uppercase ${fee.status === 'paid' ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>{fee.status}</span>
                                          </div>
                                          <p className="text-[10px] font-bold text-slate-400 mt-1 uppercase tracking-widest">
                                            {fee.status === 'paid' ? `Settled on: ${fee.paidDate}` : 'Outstanding Dues / Arrears'}
                                          </p>
                                          {fee.description && (
                                            <p className="text-[10px] text-slate-500 mt-1 italic italic">{fee.description}</p>
                                          )}
                                        </div>
                                      </div>
                                      
                                      <div className="flex items-center gap-6 w-full md:w-auto">
                                        <div className="text-right">
                                          <p className={`text-lg font-black font-mono tracking-tighter leading-none ${fee.status === 'unpaid' ? 'text-rose-600' : 'text-slate-900'}`}>${fee.amount}</p>
                                          <p className={`text-[9px] font-black uppercase mt-1 ${fee.status === 'paid' ? 'text-emerald-600' : 'text-rose-600'}`}>
                                            {fee.status === 'unpaid' ? 'Recoverable' : 'Deposited'}
                                          </p>
                                        </div>
                                        
                                        {fee.status === 'unpaid' ? (
                                          <button 
                                            onClick={() => {
                                              setFees(prev => prev.map(f => f.id === fee.id ? { ...f, status: 'paid', paymentMethod: 'Cash (Faculty Registry)', paidDate: new Date().toISOString().split('T')[0] } : f));
                                              toast.success(`Success! Collection authorized for ${fee.month}.`);
                                            }}
                                            className="bg-emerald-600 hover:bg-slate-900 text-white p-3 rounded-2xl shadow-lg active:scale-90 transition-all flex items-center justify-center"
                                          >
                                            <CheckCircle2 size={18} />
                                          </button>
                                        ) : (
                                          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-2xl border border-emerald-100">
                                            <CheckCircle2 size={18} />
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                ))
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })()
                )}
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

          {/* HIGH-LIGHTED FEE PAYMENT/LEDGER BUTTON */}
          <button
            id="mobile-nav-fees"
            onClick={() => { setActiveTab('fees'); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
            className={`flex-1 flex flex-col items-center justify-center py-1 transition-all text-center focus:outline-none rounded-lg mx-0.5 ${
              activeTab === 'fees' 
                ? 'text-amber-400 font-bold scale-105 bg-amber-500/10 border border-amber-500/20' 
                : 'text-slate-400 hover:text-amber-400 hover:bg-amber-550/5'
            }`}
          >
            <CreditCard size={18} className={activeTab === 'fees' ? 'text-amber-400' : 'text-slate-400'} />
            <span className="text-[9px] mt-0.5 font-semibold uppercase tracking-wider">Fees</span>
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

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 block">Fee Category</label>
                    <select 
                      value={newFeeType}
                      onChange={(e) => setNewFeeType(e.target.value)}
                      className="w-full bg-white border border-slate-200 px-3 py-2 text-xs font-bold text-slate-700 focus:outline-none focus:border-emerald-500"
                    >
                      {['Tuition Fee', 'Annual Fee', 'Paper Fund', 'Admission Fee', 'Miscellaneous'].map(cat => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                    </select>
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

    </div>
  );
}
