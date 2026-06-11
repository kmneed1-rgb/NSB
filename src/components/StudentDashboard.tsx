import React, { useState } from 'react';
import { motion } from 'motion/react';
import { 
  Award, Calendar, Clock, LogOut, CheckSquare, Sparkles, BookOpen, 
  Menu, X, TrendingUp, Info, User, CheckCircle2, AlertCircle, CreditCard
} from 'lucide-react';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';
import { Teacher, Student, Class, TimetableEntry, Attendance, Mark, UserSession, FeeRecord } from '../types';
import CashPaymentEntry from './CashPaymentEntry';
import AttendanceSwipeOverlay from './AttendanceSwipeOverlay';

interface StudentDashboardProps {
  userSession: UserSession;
  teachers: Teacher[];
  setTeachers: React.Dispatch<React.SetStateAction<Teacher[]>>;
  students: Student[];
  setStudents: React.Dispatch<React.SetStateAction<Student[]>>;
  classes: Class[];
  timetable: TimetableEntry[];
  attendance: Attendance[];
  marks: Mark[];
  fees: FeeRecord[];
  setFees: React.Dispatch<React.SetStateAction<FeeRecord[]>>;
  onLogout: () => void;
}

type TabType = 'dashboard' | 'attendance' | 'marks' | 'timetable' | 'fees';

export default function StudentDashboard({
  userSession,
  teachers,
  setTeachers,
  students,
  setStudents,
  classes,
  timetable,
  attendance,
  marks,
  fees,
  setFees,
  onLogout
}: StudentDashboardProps) {
  const [activeTab, setActiveTab] = useState<TabType>('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Find student's personal profile card
  const studentProfile = students.find(s => s.id === userSession.id);
  const studentId = studentProfile?.id || '';
  const currentClassId = studentProfile?.classId || '';

  // Get classroom properties
  const assignedClass = classes.find(c => c.id === currentClassId);
  const classTeacherId = assignedClass?.classTeacherId || '';
  const classTeacherObj = teachers.find(t => t.id === classTeacherId);

  // FILTERED STUDENT METRICS
  const myAttendance = attendance.filter(a => a.studentId === studentId);
  const totalDays = myAttendance.length;
  const presentDays = myAttendance.filter(a => a.status === 'present').length;
  const attendancePercent = totalDays > 0 ? Math.round((presentDays / totalDays) * 100) : 100;

  const myMarks = marks.filter(m => m.studentId === studentId);

  // Performance trends data formatting for Recharts Line Chart
  const examOrder = ['Unit Test', 'Half Yearly', 'Final'];
  const uniqueSubjects = Array.from(new Set(myMarks.map(m => m.subject)));
  const SUBJECT_COLORS: Record<string, string> = {
    Maths: '#6366f1',     // Indigo
    Mathematics: '#6366f1',
    Science: '#10b981',   // Emerald
    English: '#f59e0b',   // Amber
    History: '#ef4444',   // Red
    Urdu: '#8b5cf6',      // Purple
    Geography: '#06b6d4', // Cyan
    Civics: '#ec4899',    // Pink
    Islamiat: '#14b8a6',  // Teal
    Computer: '#3b82f6',  // Blue
  };
  const PALETTE = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#ec4899', '#14b8a6', '#3b82f6', '#f97316'];
  const getSubjectColor = (sub: string, index: number) => SUBJECT_COLORS[sub] || PALETTE[index % PALETTE.length];

  const trendChartData = examOrder.map(exam => {
    const entry: Record<string, any> = { name: exam };
    let hasValue = false;
    uniqueSubjects.forEach(sub => {
      const match = myMarks.find(m => m.examType === exam && m.subject === sub);
      if (match) {
        entry[sub] = Math.round((match.marksObtained / match.maxMarks) * 100);
        hasValue = true;
      } else {
        entry[sub] = null;
      }
    });
    return { entry, hasValue };
  })
  .filter(item => item.hasValue)
  .map(item => item.entry);

  // FEE PORTAL LOCAL STATES
  const [selectedPayFee, setSelectedPayFee] = useState<FeeRecord | null>(null);
  const [payMethod, setPayMethod] = useState<string>('Credit Card');
  const [swipeSuccess, setSwipeSuccess] = useState<boolean>(false);
  const [isAttendanceOverlayOpen, setIsAttendanceOverlayOpen] = useState(false);
  const [feeChallanPrint, setFeeChallanPrint] = useState<FeeRecord | null>(null);

  const handleCompletePayment = () => {
    if (!selectedPayFee) return;
    
    // update parent fees state
    setFees(prev => prev.map(f => {
      if (f.id === selectedPayFee.id) {
        return {
          ...f,
          status: 'paid',
          paidDate: new Date().toISOString().split('T')[0],
          paymentMethod: payMethod
        };
      }
      return f;
    }));

    setSwipeSuccess(true);
    setTimeout(() => {
      setSwipeSuccess(false);
      setSelectedPayFee(null);
    }, 2500);
  };

  // Get teacher's name helper
  const getTeacherName = (tId: string) => {
    const t = teachers.find(item => item.id === tId);
    return t ? t.name : 'Unknown Faculty';
  };

  // Convert scores into letter grade categories
  const calculateGrade = (obtained: number, max: number): { letter: string; color: string } => {
    const pct = (obtained / max) * 100;
    if (pct >= 90) return { letter: 'A+', color: 'text-emerald-700 bg-emerald-50 border-emerald-200' };
    if (pct >= 80) return { letter: 'A', color: 'text-emerald-600 bg-emerald-50 border-emerald-100' };
    if (pct >= 70) return { letter: 'B', color: 'text-blue-600 bg-blue-50 border-blue-100' };
    if (pct >= 60) return { letter: 'C', color: 'text-yellow-700 bg-yellow-50 border-yellow-200' };
    if (pct >= 50) return { letter: 'D', color: 'text-orange-700 bg-orange-50 border-orange-200' };
    return { letter: 'F', color: 'text-red-700 bg-red-50 border-red-200' };
  };

  // Group Timetable elements neatly
  const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
  
  const getPeriodsList = () => {
    const defaultPeriods = ['Period 1', 'Period 2', 'Period 3', 'Period 4', 'Period 5'];
    try {
      const saved = localStorage.getItem('acadamis_extra_periods');
      const deletedSaved = localStorage.getItem('acadamis_deleted_periods');
      const deleted = deletedSaved ? JSON.parse(deletedSaved) : {};
      const classDeleted = (currentClassId ? (deleted[currentClassId] || []) : []) as string[];

      let baseList = [...defaultPeriods];
      if (saved) {
        const extra = JSON.parse(saved);
        // Load extra periods for student's class, or fall back to any extra periods across all classes if class-specific not set
        const classExtras = (currentClassId ? (extra[currentClassId] || []) : Object.values(extra).flat()) as string[];
        baseList = [...baseList, ...classExtras];
      }

      const unique = Array.from(new Set(baseList)).filter(p => !classDeleted.includes(p));
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

  return (
    <div id="student-dashboard-root" className="min-h-screen bg-gray-50 flex flex-col md:flex-row pb-16 md:pb-0 relative">
      
      <AttendanceSwipeOverlay isOpen={isAttendanceOverlayOpen} onClose={() => setIsAttendanceOverlayOpen(false)}>
        {/* Simplified Attendance view inside the overlay */}
         <div className="space-y-4">
            <div className="text-center">
                <span className="text-4xl font-black text-indigo-600">{attendancePercent}%</span>
                <p className="text-sm font-bold text-gray-500">Attendance Rate</p>
            </div>
            <div className="border-t pt-4">
                <p className="text-xs font-bold uppercase text-gray-400">Log Summary</p>
                <div className="mt-2 text-sm text-gray-700">
                    <p>Total Days: {totalDays}</p>
                    <p className="text-emerald-600">Present Days: {presentDays}</p>
                    <p className="text-rose-600">Absent Days: {totalDays - presentDays}</p>
                </div>
            </div>
         </div>
      </AttendanceSwipeOverlay>

      {/* Mobile Top Navigation Indicator */}
      <div id="student-mobile-bar" className="md:hidden flex items-center justify-between px-4 py-3 bg-white border-b border-gray-200 shadow-sm z-20">
        <div className="flex items-center gap-2">
          <BookOpen className="text-indigo-600" size={20} />
          <span className="font-bold text-gray-900 tracking-tight">Student Campus</span>
        </div>
        <div className="flex items-center gap-2">
          <button 
             onClick={onLogout}
             className="px-3 py-1.5 rounded-lg border border-rose-200 text-rose-600 bg-rose-50 hover:bg-rose-600 hover:text-white flex items-center gap-1.5 font-black text-[10px] uppercase transition-all shadow-sm"
             title="Logout"
          >
            <LogOut size={16} />
            EXIT
          </button>
          <button 
            id="student-sidebar-toggle" 
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-1.5 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-100"
          >
            <Menu size={20} />
          </button>
        </div>
      </div>

      {/* Dropdown sidebar cover overlay */}
      {sidebarOpen && (
        <div 
          onClick={() => setSidebarOpen(false)} 
          className="fixed inset-0 bg-black/40 z-30 md:hidden"
        />
      )}

      {/* Student Nav Drawer */}
      <div 
        id="sidebar-student" 
        className={`fixed md:sticky top-0 left-0 h-screen w-64 bg-white border-r border-slate-100 flex flex-col justify-between z-40 transition-transform duration-300 transform md:transform-none ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        } font-sans`}
      >
        <div>
          {/* Institutional Branding */}
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
              <p className="text-slate-400 font-bold text-[9px] tracking-[0.3em] uppercase mt-1">Student Portal</p>
            </div>
          </div>

          {/* Minimalist Navigation */}
          <nav className="p-4 space-y-1 mt-6">
            {[
              { id: 'dashboard', label: 'Campus', icon: Sparkles },
              { id: 'attendance', label: 'Presence', icon: CheckSquare },
              { id: 'marks', label: 'Grades', icon: Award },
              { id: 'timetable', label: 'Classes', icon: Calendar },
              { id: 'fees', label: 'Payments', icon: CreditCard }
            ].map((item) => (
              <button
                key={item.id}
                onClick={() => { 
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

        {/* Minimalist Account Section */}
        <div className="p-6 border-t border-slate-50">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-8 h-8 rounded-none bg-slate-900 flex items-center justify-center text-white font-black text-[10px] italic">
              {(userSession.name?.[0] || 'U').toUpperCase()}
            </div>
            <div className="truncate">
              <p className="text-slate-900 text-[11px] font-black uppercase tracking-tight truncate">{userSession.name}</p>
              <p className="text-slate-400 text-[9px] font-bold uppercase tracking-widest truncate">Roll #{studentProfile?.rollNumber}</p>
            </div>
          </div>
          
          <button
            onClick={onLogout}
            className="w-full py-4 bg-rose-600 text-white hover:bg-rose-700 transition-all text-xs font-black uppercase tracking-widest text-center cursor-pointer flex items-center justify-center gap-2 shadow-lg shadow-rose-100"
          >
            <LogOut size={16} />
            EXIT CAMPUS PORTAL
          </button>
        </div>
      </div>

      {/* Main Panel Content */}
      <main className="flex-1 min-h-screen flex flex-col p-4 md:p-8 lg:p-10 max-w-7xl mx-auto w-full text-slate-800 font-sans">
        
        {/* ========== STUDENT DASHBOARD HOME ========== */}
        {activeTab === 'dashboard' && (
          <div id="panel-student-home" className="space-y-8 animate-fade-in">
            {/* Greeting Header */}
            <div className="bg-white rounded-none p-6 md:p-8 border border-slate-200 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-6 border-t-4 border-t-indigo-600">
              <div>
                <span className="text-[10px] font-extrabold text-indigo-600 uppercase tracking-widest block mb-1">STUDENT ADVISORY</span>
                <h1 className="text-2xl font-black text-slate-900 tracking-tight font-display uppercase">Hello, {userSession.name}!</h1>
                <p className="text-sm text-slate-500 mt-1">
                  Enrolled in <strong className="text-indigo-800 font-bold">{assignedClass ? `${assignedClass.className} - ${assignedClass.section}` : 'N/A Class'}</strong>.
                  {classTeacherObj && (
                    <span> Advisory Teacher: <strong className="text-slate-800">{classTeacherObj.name}</strong>.</span>
                  )}
                </p>
              </div>

              <div className="flex gap-2.5">
                <div className="p-4 bg-indigo-50 rounded-none border border-indigo-100/60 text-center">
                  <h4 className="text-[10px] font-bold text-indigo-400 uppercase tracking-wider">Attendance Rate</h4>
                  <p className="text-xl font-bold text-indigo-950 mt-1">{attendancePercent}%</p>
                </div>

                <div className="p-4 bg-emerald-50 rounded-none border border-emerald-100/60 text-center">
                  <h4 className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider">Marks Logged</h4>
                  <p className="text-xl font-bold text-emerald-900 mt-1">{myMarks.length} elements</p>
                </div>
              </div>
            </div>

            {/* Widgets Section Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              {/* Attendance Card widget - Geometric style */}
              <motion.div 
                draggable="x"
                dragConstraints={{ left: 0, right: 0 }}
                onDragEnd={(_, info) => {
                  if (info.offset.x > 100 || info.offset.x < -100) {
                    setIsAttendanceOverlayOpen(true);
                  }
                }}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.95 }}
                className="bg-white p-6 border-b-4 border-indigo-500 shadow-sm rounded-none hover:shadow-md transition-all cursor-pointer flex flex-col justify-between"
              >
                <div onClick={() => setActiveTab('attendance')}>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-base font-bold text-slate-900 uppercase tracking-wide font-display flex items-center gap-1.5">
                      <CheckCircle2 className="text-indigo-600" size={18} />
                      My Attendance Gauge
                      <span className="text-[9px] text-gray-400 font-normal italic">(Swipe to open)</span>
                    </h3>
                    <span className="text-xs font-mono font-bold text-indigo-100 bg-indigo-700 px-1.5 py-0.5">{presentDays}/{totalDays} Days</span>
                  </div>

                  {/* Attendance visual bar */}
                  <div className="my-5">
                    <div className="h-3 w-full bg-slate-100 rounded-none overflow-hidden border border-slate-200">
                      <div 
                        className={`h-full rounded-none transition-all duration-500 ${
                          attendancePercent >= 75 ? 'bg-emerald-500' : 'bg-rose-500'
                        }`}
                        style={{ width: `${attendancePercent}%` }}
                      />
                    </div>
                    <p className="text-[11px] text-slate-500 mt-2">
                      {attendancePercent >= 75 
                        ? 'Good Job! Your attendance is matching the required collegiate percentage index.' 
                        : 'Warning: Your attendance is below standard requirements (75%). please attend regular lectures.'}
                    </p>
                  </div>
                </div>

                <span className="text-xs font-bold text-indigo-600 mt-4 flex items-center gap-1 hover:underline">
                  Inspect Attendance Logs →
                </span>
              </motion.div>

              {/* Marks Quick Peek Widget - Geometric style */}
              <div 
                onClick={() => setActiveTab('marks')}
                className="bg-white p-6 border-b-4 border-amber-500 shadow-sm rounded-none hover:shadow-md transition-all cursor-pointer flex flex-col justify-between"
              >
                <div>
                  <h3 className="text-base font-bold text-slate-900 uppercase tracking-wide font-display flex items-center gap-1.5 mb-3">
                    <Award className="text-amber-500" size={18} />
                    Report Card Highlights
                  </h3>
                  
                  {myMarks.length > 0 ? (
                    <div className="space-y-2 py-1">
                      {myMarks.slice(0, 3).map((item) => {
                        const grade = calculateGrade(item.marksObtained, item.maxMarks);
                        return (
                          <div key={item.id} className="flex justify-between items-center text-xs">
                            <div>
                              <span className="font-semibold text-slate-900">{item.subject}</span>
                              <span className="text-slate-400 font-medium ml-1.5">({item.examType})</span>
                            </div>
                            <span className={`font-mono font-bold px-1.5 py-0.5 rounded-none text-[10px] border-l-2 bg-slate-50 ${grade.color}`}>
                              Grade {grade.letter} ({item.marksObtained}/{item.maxMarks})
                            </span>
                          </div>
                        );
                      })}
                      {myMarks.length > 3 && (
                        <p className="text-[10px] text-indigo-600 text-right font-medium italic">+{myMarks.length - 3} more entries recorded...</p>
                      )}
                    </div>
                  ) : (
                    <p className="text-xs text-slate-400 py-4 italic font-sans text-center bg-slate-50/50 border border-slate-100">No academic grades has been entered by instructors yet.</p>
                  )}
                </div>

                <span className="text-xs font-bold text-indigo-600 mt-4 flex items-center gap-1 hover:underline">
                  Launch View Academic marks →
                </span>
              </div>

            </div>

            {/* ========== ACADEMIC PERFORMANCE TREND CHART ========== */}
            <div id="academic-performance-trend-block" className="bg-white border border-slate-200 p-6 shadow-sm border-t-4 border-t-indigo-600">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                <div>
                  <h3 className="text-base font-bold text-slate-900 uppercase tracking-wide font-display flex items-center gap-2">
                    <TrendingUp className="text-indigo-600" size={18} />
                    Academic Performance Trends
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Visualizing normalized percentage scores scored across sequential evaluation cycles.
                  </p>
                </div>

                <div className="flex flex-wrap gap-2 text-[10px] font-bold uppercase font-mono">
                  <span className="bg-slate-100 text-slate-600 px-2 py-1">Normalized to %</span>
                  {uniqueSubjects.length > 0 && (
                    <span className="bg-indigo-50 text-indigo-700 px-2 py-1 border border-indigo-150">
                      {uniqueSubjects.length} Subjects Tracked
                    </span>
                  )}
                </div>
              </div>

              {trendChartData.length === 0 ? (
                <div className="py-12 text-center text-slate-400 bg-slate-50 border border-slate-100 italic text-xs font-medium">
                  📈 Academic trend graphs will automatically generate once scorecard details are populated by teachers.
                </div>
              ) : (
                <div className="w-full h-[320px] -ml-4 pr-2 select-none">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={trendChartData} margin={{ top: 10, right: 15, left: -10, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                      <XAxis 
                        dataKey="name" 
                        stroke="#64748b" 
                        fontSize={10} 
                        fontWeight={700}
                        tickLine={false}
                        axisLine={false}
                        dy={8}
                      />
                      <YAxis 
                        stroke="#64748b" 
                        fontSize={10} 
                        fontWeight={700}
                        domain={[0, 100]} 
                        unit="%" 
                        tickLine={false}
                        axisLine={false}
                        dx={-8}
                      />
                      <Tooltip 
                        contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '4px', color: '#fff', fontSize: '11px' }}
                        labelStyle={{ fontWeight: 'black', color: '#38bdf8', marginBottom: '4px', textTransform: 'uppercase' }}
                        itemStyle={{ padding: '2px 0' }}
                      />
                      <Legend 
                        verticalAlign="top" 
                        height={40} 
                        iconType="circle" 
                        iconSize={8}
                        wrapperStyle={{ fontSize: '11px', fontWeight: 650, textTransform: 'uppercase' }}
                      />
                      {uniqueSubjects.map((sub, idx) => (
                        <Line
                          key={sub}
                          type="monotone"
                          dataKey={sub}
                          stroke={getSubjectColor(sub, idx)}
                          strokeWidth={3}
                          activeDot={{ r: 6, stroke: '#fff', strokeWidth: 2 }}
                          dot={{ r: 4, strokeWidth: 2 }}
                          connectNulls
                        />
                      ))}
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>

            {/* Sandbox details */}
            <div className="bg-slate-900 text-white rounded-none p-5 border border-slate-800 flex items-start gap-3 shadow-xs">
              <Info size={18} className="text-indigo-400 shrink-0 mt-0.5" />
              <div>
                <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest">Dynamic Sandbox Update :</span>
                <p className="text-xs text-slate-300 mt-1 font-sans">
                  You can test this portal's response: Log out, log in as principal/teacher, edit attendance logs or enter new exam scores for "Jane Doe", then re-login as student student@school.com to see instant student view synchronization.
                </p>
              </div>
            </div>

          </div>
        )}

        {/* ========== ATTENDANCE LOG BOOK ========== */}
        {activeTab === 'attendance' && (
          <div id="panel-student-attendance" className="space-y-6 animate-fade-in">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Attendance Log History</h1>
              <p className="text-xs text-gray-500 mt-0.5">Evaluate cumulative presence, date stamps, and verify teacher registers.</p>
            </div>

            {/* Attendance Gauge Bar chart summary */}
            <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-xs grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
              <div className="text-center md:border-r border-gray-100 py-2">
                <span className="text-xs font-bold uppercase tracking-wider text-gray-400">Total Classes Conducted</span>
                <h3 className="text-4xl font-black text-gray-900 mt-2">{totalDays} Sessions</h3>
              </div>

              <div className="text-center md:border-r border-gray-100 py-2">
                <span className="text-xs font-bold uppercase tracking-wider text-gray-400">Total days Attended</span>
                <h3 className="text-4xl font-black text-emerald-600 mt-2">{presentDays} Present</h3>
                <p className="text-xs text-gray-400 mt-0.5">{totalDays - presentDays} absent logs</p>
              </div>

              <div className="text-center py-2">
                <span className="text-xs font-bold uppercase tracking-wider text-gray-400">Overall Ratio</span>
                <h3 className={`text-4xl font-black mt-2 ${attendancePercent >= 75 ? 'text-indigo-600' : 'text-rose-600'}`}>
                  {attendancePercent}%
                </h3>
              </div>
            </div>

            {/* Attendance Days list table */}
            <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-xs">
              <div className="p-4 bg-gray-50/50 border-b border-gray-100">
                <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500">Attendance Log Journal</h3>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b border-gray-100 text-xs font-bold text-gray-500 uppercase tracking-widest bg-gray-50">
                      <th className="px-6 py-3.5">Log Date</th>
                      <th className="px-6 py-3.5">Academic Calendar Period</th>
                      <th className="px-6 py-3.5 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 text-sm">
                    {myAttendance.length > 0 ? (
                      myAttendance.map(log => (
                        <tr key={log.id} className="hover:bg-gray-55/20 transition-colors">
                          <td className="px-6 py-4 font-bold text-slate-800">{log.date}</td>
                          <td className="px-6 py-4 text-xs font-semibold text-gray-500">General Academic Session</td>
                          <td className="px-6 py-4">
                            <div className="flex justify-center text-center">
                              <span className={`inline-flex px-3 py-1 text-xs font-extrabold rounded-full ${
                                log.status === 'present'
                                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                                  : 'bg-rose-50 text-rose-700 border border-rose-100'
                              }`}>
                                {log.status.toUpperCase()}
                              </span>
                            </div>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={3} className="px-6 py-12 text-center text-gray-400 italic text-sm font-medium">
                          No attendance records have been registered for your ID.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

          </div>
        )}

        {/* ========== REPORT CARD MARKS VIEW ========== */}
        {activeTab === 'marks' && (
          <div id="panel-student-marks" className="space-y-6 animate-fade-in">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Academic Score Sheets</h1>
              <p className="text-xs text-gray-500 mt-0.5">Review scores, max markings, automated letter grades, and subject distributions.</p>
            </div>

            {/* ========== ACADEMIC PERFORMANCE TREND CHART ========== */}
            {trendChartData.length > 0 && (
              <div id="academic-marks-trend-graph" className="bg-white border border-slate-200 p-6 shadow-sm border-t-4 border-t-amber-500">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                  <div>
                    <h3 className="text-base font-bold text-slate-900 uppercase tracking-wide font-display flex items-center gap-2">
                      <TrendingUp className="text-amber-500" size={18} />
                      Academic Performance Trends
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Progress tracking of subject scores across unit and summative tests.
                    </p>
                  </div>
                  <div className="bg-amber-50 text-amber-900 border border-amber-150 px-2.5 py-1 text-[10px] font-bold uppercase font-mono">
                    Scores Shown in % Scale
                  </div>
                </div>

                <div className="w-full h-[280px] -ml-4 pr-2 select-none">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={trendChartData} margin={{ top: 10, right: 15, left: -10, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                      <XAxis 
                        dataKey="name" 
                        stroke="#64748b" 
                        fontSize={10} 
                        fontWeight={700}
                        tickLine={false}
                        axisLine={false}
                        dy={8}
                      />
                      <YAxis 
                        stroke="#64748b" 
                        fontSize={10} 
                        fontWeight={700}
                        domain={[0, 100]} 
                        unit="%" 
                        tickLine={false}
                        axisLine={false}
                        dx={-8}
                      />
                      <Tooltip 
                        contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '4px', color: '#fff', fontSize: '11px' }}
                        labelStyle={{ fontWeight: 'black', color: '#f59e0b', marginBottom: '4px', textTransform: 'uppercase' }}
                        itemStyle={{ padding: '2px 0' }}
                      />
                      <Legend 
                        verticalAlign="top" 
                        height={40} 
                        iconType="circle" 
                        iconSize={8}
                        wrapperStyle={{ fontSize: '11px', fontWeight: 650, textTransform: 'uppercase' }}
                      />
                      {uniqueSubjects.map((sub, idx) => (
                        <Line
                          key={sub}
                          type="monotone"
                          dataKey={sub}
                          stroke={getSubjectColor(sub, idx)}
                          strokeWidth={3}
                          activeDot={{ r: 6, stroke: '#fff', strokeWidth: 2 }}
                          dot={{ r: 4, strokeWidth: 2 }}
                          connectNulls
                        />
                      ))}
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}

            {/* List marks entries grouped by Exam Cycles */}
            {['Unit Test', 'Half Yearly', 'Final'].map(exam => {
              const examMarks = myMarks.filter(m => m.examType === exam);
              if (examMarks.length === 0) return null;

              return (
                <div key={exam} className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-xs">
                  <div className="p-4 bg-gray-50 border-b border-gray-100">
                    <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wide">
                      {exam} Assessment marks
                    </h3>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left">
                      <thead>
                        <tr className="border-b border-gray-100 text-[10px] font-bold text-gray-400 uppercase tracking-widest bg-gray-50/20">
                          <th className="px-6 py-3">Subject Name</th>
                          <th className="px-6 py-3">Marking Scored</th>
                          <th className="px-6 py-3">Percentage Scored</th>
                          <th className="px-6 py-3 text-center">Letter Grade</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100 text-sm">
                        {examMarks.map(item => {
                          const grade = calculateGrade(item.marksObtained, item.maxMarks);
                          const pct = Math.round((item.marksObtained / item.maxMarks) * 100);
                          return (
                            <tr key={item.id} className="hover:bg-gray-55/20">
                              <td className="px-6 py-4 font-bold text-slate-900">{item.subject}</td>
                              <td className="px-6 py-4 font-mono font-semibold text-gray-700">
                                {item.marksObtained} / {item.maxMarks}
                              </td>
                              <td className="px-6 py-4 text-xs font-semibold text-gray-500">{pct}%</td>
                              <td className="px-6 py-4">
                                <div className="flex justify-center">
                                  <span className={`inline-flex px-3 py-1 font-extrabold text-xs rounded-xl border ${grade.color}`}>
                                    Grade {grade.letter}
                                  </span>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              );
            })}

            {myMarks.length === 0 && (
              <div className="py-12 text-center text-gray-400 bg-white border border-dashed border-gray-200 rounded-xl">
                No score records have been logged into your student register yet.
              </div>
            )}
          </div>
        )}

        {/* ========== STUDENT PORTAL TIMETABLE GRID ========== */}
        {activeTab === 'timetable' && (
          <div id="panel-student-timetable" className="space-y-6 animate-fade-in">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Weekly Subject Schedule</h1>
              <p className="text-xs text-gray-500 mt-0.5">Inspect weekly blocks, periods, assigned subject sessions, and faculty teachers.</p>
            </div>

            {/* Grid display */}
            <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-xs">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[700px] border-collapse text-left">
                  <thead>
                    <tr className="bg-gray-100/60 border-b border-gray-200">
                      <th className="px-4 py-3.5 text-xs font-bold text-gray-500 uppercase tracking-widest w-28">
                        Weekday
                      </th>
                      {PERIODS.map(p => (
                        <th key={p} className="px-4 py-3.5 text-xs font-bold text-gray-500 uppercase tracking-wider text-center border-l border-gray-100">
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
                          const entry = timetable.find(
                            tt => tt.classId === currentClassId && 
                                 tt.day === day && 
                                 tt.period === p
                          );

                          return (
                            <td key={p} className="px-3 py-3 text-center border-l border-gray-200 align-top min-w-36">
                              {(() => {
                                if (!entry) return (
                                  <span className="text-[11px] text-gray-300 font-medium italic block py-4 select-none">
                                    Free Period
                                  </span>
                                );
                                
                                let col = '#6366f1'; // default indigo
                                try {
                                  const savedColors = localStorage.getItem('acadamis_period_colors');
                                  if (savedColors) {
                                    const parsedColors = JSON.parse(savedColors);
                                    col = parsedColors[`${entry.classId}_${p}`] || '#6366f1';
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
                                      👤 {getTeacherName(entry.teacherId)}
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

        {/* ========== TUITION FEES DESK ========== */}
        {activeTab === 'fees' && (
          <div id="panel-student-fees" className="space-y-6 animate-fade-in font-sans font-medium">
            <div>
              <h1 className="text-2xl font-black text-slate-900 uppercase font-display tracking-tight">Student Account Ledger</h1>
            </div>

            <div className="animate-fade-in-up">
              <CashPaymentEntry studentId={studentId} fees={fees} setFees={setFees} studentName={userSession.name} />
            </div>
          </div>
        )}

      </main>

      {/* ========== MOBILE RESPONSIVE BOTTOM FOOTER NAVIGATION ========== */}
      <div id="student-mobile-footer-nav" className="md:hidden fixed bottom-0 left-0 right-0 bg-slate-900 border-t border-slate-800 text-white z-50 shadow-2xl px-2 pb-safe select-none">
        <div className="flex justify-around items-center h-16 relative">
          
          <button
            id="mobile-nav-dashboard"
            onClick={() => { setActiveTab('dashboard'); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
            className={`flex-1 flex flex-col items-center justify-center py-1 transition-all text-center focus:outline-none ${
              activeTab === 'dashboard' ? 'text-indigo-400 font-bold scale-105' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Sparkles size={18} />
            <span className="text-[9px] mt-0.5 font-semibold uppercase tracking-wider">Campus</span>
          </button>
          
          <button
            id="mobile-nav-attendance"
            onClick={() => { setActiveTab('attendance'); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
            className={`flex-1 flex flex-col items-center justify-center py-1 transition-all text-center focus:outline-none ${
              activeTab === 'attendance' ? 'text-indigo-400 font-bold scale-105' : 'text-slate-400 hover:text-white'
            }`}
          >
            <CheckSquare size={18} />
            <span className="text-[9px] mt-0.5 font-semibold uppercase tracking-wider">Attd</span>
          </button>

          <button
            id="mobile-nav-marks"
            onClick={() => { setActiveTab('marks'); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
            className={`flex-1 flex flex-col items-center justify-center py-1 transition-all text-center focus:outline-none ${
              activeTab === 'marks' ? 'text-indigo-400 font-bold scale-105' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Award size={18} />
            <span className="text-[9px] mt-0.5 font-semibold uppercase tracking-wider">Marks</span>
          </button>
          <button
            id="mobile-nav-timetable"
            onClick={() => { setActiveTab('timetable'); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
            className={`flex-1 flex flex-col items-center justify-center py-1 transition-all text-center focus:outline-none ${
              activeTab === 'timetable' ? 'text-indigo-400 font-bold scale-105' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Calendar size={18} />
            <span className="text-[9px] mt-0.5 font-semibold uppercase tracking-wider">Schedule</span>
          </button>

        </div>
      </div>

    </div>
  );
}
