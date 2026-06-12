import { useState, useEffect } from 'react';
import { Toaster } from 'sonner';
import { Teacher, Student, Class, TimetableEntry, Attendance, Mark, UserSession, FeeRecord } from './types';
import { 
  INITIAL_TEACHERS, 
  INITIAL_CLASSES, 
  INITIAL_STUDENTS, 
  INITIAL_TIMETABLE, 
  INITIAL_ATTENDANCE, 
  INITIAL_MARKS,
  INITIAL_FEES
} from './initialData';
import LandingPage from './components/LandingPage';
import Login from './components/Login';
import PrincipalDashboard from './components/PrincipalDashboard';
import TeacherDashboard from './components/TeacherDashboard';
import StudentDashboard from './components/StudentDashboard';

export default function App() {
  // Navigation level for landing vs portal
  const [viewPortal, setViewPortal] = useState<boolean>(() => {
    const saved = localStorage.getItem('acadamis_session');
    return saved ? true : false;
  });

  // Theme support
  const [darkTheme, setDarkTheme] = useState<boolean>(() => {
    return localStorage.getItem('acadamis_dark_theme') === 'true';
  });

  useEffect(() => {
    if (darkTheme) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('acadamis_dark_theme', 'true');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('acadamis_dark_theme', 'false');
    }
  }, [darkTheme]);

  useEffect(() => {
    const handleThemeToggle = () => {
      setDarkTheme(localStorage.getItem('acadamis_dark_theme') === 'true');
    };
    window.addEventListener('acadamis_toggle_theme', handleThemeToggle);
    return () => window.removeEventListener('acadamis_toggle_theme', handleThemeToggle);
  }, []);

  // --- STATE DEFAULTS & INITIALIZATION ---
  const [teachers, setTeachers] = useState<Teacher[]>(() => {
    const saved = localStorage.getItem('acadamis_teachers');
    return saved ? JSON.parse(saved) : INITIAL_TEACHERS;
  });

  const [classes, setClasses] = useState<Class[]>(() => {
    const saved = localStorage.getItem('acadamis_classes');
    return saved ? JSON.parse(saved) : INITIAL_CLASSES;
  });

  const [students, setStudents] = useState<Student[]>(() => {
    const saved = localStorage.getItem('acadamis_students');
    return saved ? JSON.parse(saved) : INITIAL_STUDENTS;
  });

  const [timetable, setTimetable] = useState<TimetableEntry[]>(() => {
    const saved = localStorage.getItem('acadamis_timetable');
    return saved ? JSON.parse(saved) : INITIAL_TIMETABLE;
  });

  const [attendance, setAttendance] = useState<Attendance[]>(() => {
    const saved = localStorage.getItem('acadamis_attendance');
    return saved ? JSON.parse(saved) : INITIAL_ATTENDANCE;
  });

  const [marks, setMarks] = useState<Mark[]>(() => {
    const saved = localStorage.getItem('acadamis_marks');
    return saved ? JSON.parse(saved) : INITIAL_MARKS;
  });

  const [fees, setFees] = useState<FeeRecord[]>(() => {
    const saved = localStorage.getItem('acadamis_fees');
    return saved ? JSON.parse(saved) : INITIAL_FEES;
  });

  // User session state
  const [userSession, setUserSession] = useState<UserSession | null>(() => {
    const saved = localStorage.getItem('acadamis_session');
    return saved ? JSON.parse(saved) : null;
  });

  // --- LOCALSTORAGE CACHING EFFECTS ---
  useEffect(() => {
    localStorage.setItem('acadamis_teachers', JSON.stringify(teachers));
  }, [teachers]);

  useEffect(() => {
    localStorage.setItem('acadamis_classes', JSON.stringify(classes));
  }, [classes]);

  useEffect(() => {
    localStorage.setItem('acadamis_students', JSON.stringify(students));
  }, [students]);

  useEffect(() => {
    localStorage.setItem('acadamis_timetable', JSON.stringify(timetable));
  }, [timetable]);

  useEffect(() => {
    localStorage.setItem('acadamis_attendance', JSON.stringify(attendance));
  }, [attendance]);

  useEffect(() => {
    localStorage.setItem('acadamis_marks', JSON.stringify(marks));
  }, [marks]);

  useEffect(() => {
    localStorage.setItem('acadamis_fees', JSON.stringify(fees));
  }, [fees]);

  useEffect(() => {
    if (userSession) {
      localStorage.setItem('acadamis_session', JSON.stringify(userSession));
    } else {
      localStorage.removeItem('acadamis_session');
    }
  }, [userSession]);

  // --- ACTIONS ---
  const handleLogin = (session: UserSession) => {
    setUserSession(session);
    setViewPortal(true);
  };

  const handleLogout = () => {
    setUserSession(null);
  };

  // --- RENDER ROUTING ENGINE ---
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-950 text-gray-900 dark:text-slate-100 font-sans antialiased selection:bg-blue-500 selection:text-white transition-colors duration-200">
      <Toaster position="top-right" richColors />
      {!userSession ? (
        !viewPortal ? (
          <LandingPage
            teachers={teachers}
            students={students}
            classes={classes}
            onEnterPortal={() => setViewPortal(true)}
          />
        ) : (
          <Login 
            teachers={teachers} 
            students={students} 
            onLogin={handleLogin} 
            onBackToLanding={() => setViewPortal(false)}
          />
        )
      ) : (userSession.role === 'principal' || userSession.role === 'coordinator') ? (
        <PrincipalDashboard
          userSession={userSession}
          teachers={teachers}
          setTeachers={setTeachers}
          students={students}
          setStudents={setStudents}
          classes={classes}
          setClasses={setClasses}
          timetable={timetable}
          setTimetable={setTimetable}
          fees={fees}
          setFees={setFees}
          onLogout={handleLogout}
        />
      ) : userSession.role === 'teacher' ? (
        <TeacherDashboard
          userSession={userSession}
          teachers={teachers}
          setTeachers={setTeachers}
          students={students}
          setStudents={setStudents}
          classes={classes}
          timetable={timetable}
          attendance={attendance}
          setAttendance={setAttendance}
          marks={marks}
          setMarks={setMarks}
          fees={fees}
          setFees={setFees}
          onLogout={handleLogout}
        />
      ) : (
        <StudentDashboard
          userSession={userSession}
          teachers={teachers}
          setTeachers={setTeachers}
          students={students}
          setStudents={setStudents}
          classes={classes}
          timetable={timetable}
          attendance={attendance}
          marks={marks}
          fees={fees}
          setFees={setFees}
          onLogout={handleLogout}
        />
      )}
    </div>
  );
}
