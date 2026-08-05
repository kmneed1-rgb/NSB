import { useState, useEffect, useRef } from 'react';
import { Toaster, toast } from 'sonner';
import { Download, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { db } from './firebase';
import { collection, getDocs, doc, setDoc, deleteDoc, writeBatch, getDoc, onSnapshot } from 'firebase/firestore';
import { Teacher, Student, Coordinator, Class, TimetableEntry, Attendance, Mark, UserSession, FeeRecord, AppSettings, StudentFeeData } from './types';
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

import { safeStorage } from './lib/safeStorage';

function safeParse<T>(key: string, fallback: T): T {
  try {
    const saved = safeStorage.getItem(key);
    if (!saved || saved === 'undefined' || saved === 'null') return fallback;
    const parsed = JSON.parse(saved);
    if (Array.isArray(fallback)) {
      if (!Array.isArray(parsed) || parsed.length === 0) return fallback;
    }
    return parsed ?? fallback;
  } catch (err) {
    console.warn(`Error parsing localStorage key "${key}":`, err);
    return fallback;
  }
}

export default function App() {
  // Navigation level for landing vs portal
  const [viewPortal, setViewPortal] = useState<boolean>(() => {
    const saved = safeStorage.getItem('acadamis_session');
    return Boolean(saved && saved !== 'undefined' && saved !== 'null');
  });

  // Theme support
  const [darkTheme, setDarkTheme] = useState<boolean>(() => {
    return safeStorage.getItem('acadamis_dark_theme') === 'true';
  });

  useEffect(() => {
    if (darkTheme) {
      document.documentElement.classList.add('dark');
      safeStorage.setItem('acadamis_dark_theme', 'true');
    } else {
      document.documentElement.classList.remove('dark');
      safeStorage.setItem('acadamis_dark_theme', 'false');
    }
  }, [darkTheme]);

  useEffect(() => {
    const handleThemeToggle = () => {
      setDarkTheme(safeStorage.getItem('acadamis_dark_theme') === 'true');
    };
    window.addEventListener('acadamis_toggle_theme', handleThemeToggle);
    return () => window.removeEventListener('acadamis_toggle_theme', handleThemeToggle);
  }, []);

  // --- STATE DEFAULTS & INITIALIZATION ---
  const [teachers, setTeachers] = useState<Teacher[]>(() => 
    safeParse('acadamis_teachers', INITIAL_TEACHERS)
  );

  const [classes, setClasses] = useState<Class[]>(() => 
    safeParse('acadamis_classes', INITIAL_CLASSES)
  );

  const [students, setStudents] = useState<Student[]>(() => 
    safeParse('acadamis_students', INITIAL_STUDENTS)
  );

  const [timetable, setTimetable] = useState<TimetableEntry[]>(() => 
    safeParse('acadamis_timetable', INITIAL_TIMETABLE)
  );

  const [attendance, setAttendance] = useState<Attendance[]>(() => 
    safeParse('acadamis_attendance', INITIAL_ATTENDANCE)
  );

  const [marks, setMarks] = useState<Mark[]>(() => 
    safeParse('acadamis_marks', INITIAL_MARKS)
  );

  const [fees, setFees] = useState<FeeRecord[]>(() => 
    safeParse('acadamis_fees', INITIAL_FEES)
  );

  const [coordinators, setCoordinators] = useState<Coordinator[]>(() => 
    safeParse('acadamis_coordinators', [])
  );

  const [feeStudents, setFeeStudents] = useState<StudentFeeData[]>(() => {
    const saved = safeParse('school_fee_data', []);
    if (saved && saved.length > 0) return saved;
    return INITIAL_STUDENTS.map(s => ({
      id: s.id,
      name: s.name,
      class: s.classId === 'c1' ? 'Grade 10 A' : 'Grade 11 B',
      monthlyFee: 2500,
      payments: [],
      otherFunds: []
    }));
  });

  const [appSettings, setAppSettings] = useState<AppSettings>(() => 
    safeParse('acadamis_app_settings', {
      absentTemplate: "Greetings, Respected Parent! We noticed that your child {student_name} (Roll: {roll_number}) has been marked ABSENT on date {date}. Kindly clarify the reason or contact the school office. Principal.",
      feeTemplate: "Dear parent, your child {name}'s fee for {month} is Rs. {amount} which is due on {date}. NSB 1 Academy.",
      whatsAppAutoFee: true,
      whatsAppAutoAbsence: true,
      whatsAppAutoResult: false,
      autoWhatsAppRedirect: true,
      extraPeriods: {},
      deletedPeriods: {},
      periodColors: {}
    })
  );

  // --- PWA INSTALL PROMPT LOGIC ---
  const [installPromptEvent, setInstallPromptEvent] = useState<any>(null);
  const [showInstallModal, setShowInstallModal] = useState(false);

  useEffect(() => {
    // Register Service Worker
    if ('serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js')
          .then(reg => console.log('SW Registered', reg))
          .catch(err => console.log('SW Error', err));
      });
    }

    const handleBeforeInstallPrompt = (e: Event) => {
      // Prevent the mini-infobar from appearing on mobile
      e.preventDefault();
      // Stash the event so it can be triggered later.
      setInstallPromptEvent(e);
      
      // Show modal after a small delay
      setTimeout(() => {
        setShowInstallModal(true);
      }, 1500);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = () => {
    if (installPromptEvent) {
      installPromptEvent.prompt();
      installPromptEvent.userChoice.then((choiceResult: { outcome: string }) => {
        if (choiceResult.outcome === 'accepted') {
          console.log('User accepted the install prompt');
        }
        setInstallPromptEvent(null);
        setShowInstallModal(false);
      });
    } else {
      toast.info(
        "To install NSB 1 ACADEMY, click the install icon (desktop) in your browser's address bar or select 'Add to Home Screen' from the browser menu (e.g., Safari iOS Share menu).",
        { duration: 6000 }
      );
    }
  };

  // User session state
  const [userSession, setUserSession] = useState<UserSession | null>(() => {
    const saved = safeStorage.getItem('acadamis_session');
    if (!saved || saved === 'undefined' || saved === 'null') return null;
    try {
      const parsed = JSON.parse(saved);
      return parsed && parsed.role ? parsed : null;
    } catch {
      return null;
    }
  });

  // --- FIRESTORE SYNCHRONIZATION SYSTEM ---
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [syncError, setSyncError] = useState<string | null>(null);
  const isSyncComplete = useRef<boolean>(false);

  const prevTeachers = useRef<string>('');
  const prevClasses = useRef<string>('');
  const prevStudents = useRef<string>('');
  const prevTimetable = useRef<string>('');
  const prevAttendance = useRef<string>('');
  const prevMarks = useRef<string>('');
  const prevFees = useRef<string>('');
  const prevCoordinators = useRef<string>('');
  const prevFeeStudents = useRef<string>('');
  const prevAppSettings = useRef<string>('');

  useEffect(() => {
    async function initFirebaseAndSync() {
      try {
        console.log("Checking Firestore collections state on mount...");
        
        // Timeout to ensure offline fallback if network fails
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error("Firestore sync timeout")), 8000)
        );

        // Fetch all collections concurrently with a timeout fallback
        const [
          teachersSnapshot,
          classesSnapshot,
          studentsSnapshot,
          timetableSnapshot,
          attendanceSnapshot,
          marksSnapshot,
          feesSnapshot,
          coordinatorsSnapshot,
          feeDataSnapshot
        ] = await Promise.race([
          Promise.all([
            getDocs(collection(db, "teachers")),
            getDocs(collection(db, "classes")),
            getDocs(collection(db, "students")),
            getDocs(collection(db, "timetable")),
            getDocs(collection(db, "attendance")),
            getDocs(collection(db, "marks")),
            getDocs(collection(db, "fees")),
            getDocs(collection(db, "coordinators")),
            getDocs(collection(db, "fee_data"))
          ]),
          timeoutPromise
        ]) as any;
        
        // Check if collections exist in Cloud Firestore
        const isDbEmpty = teachersSnapshot.empty &&
                          classesSnapshot.empty &&
                          studentsSnapshot.empty;

        if (isDbEmpty) {
          console.log("Firestore database is empty. Seeding initial datasets into Cloud Firestore...");
          
          try {
            await Promise.all([
              ...INITIAL_TEACHERS.map(t => setDoc(doc(db, "teachers", t.id), sanitizeForFirestore(t))),
              ...INITIAL_CLASSES.map(c => setDoc(doc(db, "classes", c.id), sanitizeForFirestore(c))),
              ...INITIAL_STUDENTS.map(s => setDoc(doc(db, "students", s.id), sanitizeForFirestore(s))),
              ...INITIAL_TIMETABLE.map(tm => setDoc(doc(db, "timetable", tm.id), sanitizeForFirestore(tm))),
              ...INITIAL_ATTENDANCE.map(a => setDoc(doc(db, "attendance", a.id), sanitizeForFirestore(a))),
              ...INITIAL_MARKS.map(m => setDoc(doc(db, "marks", m.id), sanitizeForFirestore(m))),
              ...INITIAL_FEES.map(f => setDoc(doc(db, "fees", f.id), sanitizeForFirestore(f)))
            ]);
            console.log("Seeding to Firestore completed successfully.");
          } catch (seedErr) {
            console.warn("Seeding to Firestore encountered warning:", seedErr);
          }

          setTeachers(INITIAL_TEACHERS);
          setClasses(INITIAL_CLASSES);
          setStudents(INITIAL_STUDENTS);
          setTimetable(INITIAL_TIMETABLE);
          setAttendance(INITIAL_ATTENDANCE);
          setMarks(INITIAL_MARKS);
          setFees(INITIAL_FEES);

          prevTeachers.current = JSON.stringify(INITIAL_TEACHERS);
          prevClasses.current = JSON.stringify(INITIAL_CLASSES);
          prevStudents.current = JSON.stringify(INITIAL_STUDENTS);
          prevTimetable.current = JSON.stringify(INITIAL_TIMETABLE);
          prevAttendance.current = JSON.stringify(INITIAL_ATTENDANCE);
          prevMarks.current = JSON.stringify(INITIAL_MARKS);
          prevFees.current = JSON.stringify(INITIAL_FEES);
          prevCoordinators.current = JSON.stringify([]);
          prevFeeStudents.current = JSON.stringify([]);
        } else {
          console.log("Loading datasets from active Cloud Firestore...");
          
          const loadedTeachers: Teacher[] = [];
          teachersSnapshot.forEach(docSnap => loadedTeachers.push(docSnap.data() as Teacher));

          const loadedClasses: Class[] = [];
          classesSnapshot.forEach(docSnap => loadedClasses.push(docSnap.data() as Class));

          const loadedStudents: Student[] = [];
          studentsSnapshot.forEach(docSnap => loadedStudents.push(docSnap.data() as Student));

          const loadedTimetable: TimetableEntry[] = [];
          timetableSnapshot.forEach(docSnap => loadedTimetable.push(docSnap.data() as TimetableEntry));

          const loadedAttendance: Attendance[] = [];
          attendanceSnapshot.forEach(docSnap => loadedAttendance.push(docSnap.data() as Attendance));

          const loadedMarks: Mark[] = [];
          marksSnapshot.forEach(docSnap => loadedMarks.push(docSnap.data() as Mark));

          const loadedFees: FeeRecord[] = [];
          feesSnapshot.forEach(docSnap => loadedFees.push(docSnap.data() as FeeRecord));

          const loadedCoordinators: Coordinator[] = [];
          coordinatorsSnapshot.forEach(docSnap => loadedCoordinators.push(docSnap.data() as Coordinator));

          const loadedFeeStudents: StudentFeeData[] = [];
          feeDataSnapshot.forEach(docSnap => loadedFeeStudents.push(docSnap.data() as StudentFeeData));

          // Load App Settings
          const settingsSnap = await getDoc(doc(db, "app_settings", "global"));
          let loadedSettings: AppSettings | null = null;
          if (settingsSnap.exists()) {
            loadedSettings = settingsSnap.data() as AppSettings;
          }

          const finalTeachers = loadedTeachers.length > 0 ? loadedTeachers : INITIAL_TEACHERS;
          const finalClasses = loadedClasses.length > 0 ? loadedClasses : INITIAL_CLASSES;
          const finalStudents = loadedStudents.length > 0 ? loadedStudents : INITIAL_STUDENTS;
          const finalTimetable = loadedTimetable.length > 0 ? loadedTimetable : INITIAL_TIMETABLE;
          const finalAttendance = loadedAttendance.length > 0 ? loadedAttendance : INITIAL_ATTENDANCE;
          const finalMarks = loadedMarks.length > 0 ? loadedMarks : INITIAL_MARKS;
          const finalFees = loadedFees.length > 0 ? loadedFees : INITIAL_FEES;

          setTeachers(finalTeachers);
          setClasses(finalClasses);
          setStudents(finalStudents);
          setTimetable(finalTimetable);
          setAttendance(finalAttendance);
          setMarks(finalMarks);
          setFees(finalFees);

          if (loadedCoordinators.length > 0) setCoordinators(loadedCoordinators);
          if (loadedFeeStudents.length > 0) {
            setFeeStudents(loadedFeeStudents);
          } else {
            const defaultFeeStudents = finalStudents.map(s => ({
              id: s.id,
              name: s.name,
              class: s.classId === 'c1' ? 'Grade 10 A' : 'Grade 11 B',
              monthlyFee: 2500,
              payments: [],
              otherFunds: []
            }));
            setFeeStudents(defaultFeeStudents);
          }
          if (loadedSettings) setAppSettings(loadedSettings);

          // Background auto-seed if any collection was empty in Firestore
          if (loadedStudents.length === 0) {
            INITIAL_STUDENTS.forEach(s => setDoc(doc(db, "students", s.id), sanitizeForFirestore(s)).catch(() => {}));
          }
          if (loadedClasses.length === 0) {
            INITIAL_CLASSES.forEach(c => setDoc(doc(db, "classes", c.id), sanitizeForFirestore(c)).catch(() => {}));
          }
          if (loadedTeachers.length === 0) {
            INITIAL_TEACHERS.forEach(t => setDoc(doc(db, "teachers", t.id), sanitizeForFirestore(t)).catch(() => {}));
          }
          if (loadedAttendance.length === 0) {
            INITIAL_ATTENDANCE.forEach(a => setDoc(doc(db, "attendance", a.id), sanitizeForFirestore(a)).catch(() => {}));
          }
          if (loadedFees.length === 0) {
            INITIAL_FEES.forEach(f => setDoc(doc(db, "fees", f.id), sanitizeForFirestore(f)).catch(() => {}));
          }

          prevTeachers.current = JSON.stringify(finalTeachers);
          prevClasses.current = JSON.stringify(finalClasses);
          prevStudents.current = JSON.stringify(finalStudents);
          prevTimetable.current = JSON.stringify(finalTimetable);
          prevAttendance.current = JSON.stringify(finalAttendance);
          prevMarks.current = JSON.stringify(finalMarks);
          prevFees.current = JSON.stringify(finalFees);
          prevCoordinators.current = JSON.stringify(loadedCoordinators);
          prevFeeStudents.current = JSON.stringify(loadedFeeStudents.length > 0 ? loadedFeeStudents : []);
          if (loadedSettings) prevAppSettings.current = JSON.stringify(loadedSettings);
        }
        isSyncComplete.current = true;
      } catch (err: any) {
        console.warn("Firestore sync running in background/offline fallback mode:", err?.message);
        setSyncError(err?.message || "Offline fallback");
        setTeachers(prev => prev.length > 0 ? prev : INITIAL_TEACHERS);
        setClasses(prev => prev.length > 0 ? prev : INITIAL_CLASSES);
        setStudents(prev => prev.length > 0 ? prev : INITIAL_STUDENTS);
        setTimetable(prev => prev.length > 0 ? prev : INITIAL_TIMETABLE);
        setAttendance(prev => prev.length > 0 ? prev : INITIAL_ATTENDANCE);
        setMarks(prev => prev.length > 0 ? prev : INITIAL_MARKS);
        setFees(prev => prev.length > 0 ? prev : INITIAL_FEES);
        isSyncComplete.current = true;
      }
    }

    initFirebaseAndSync();
  }, []);

  // --- REALTIME DIFFERENTIAL SYNC ACTIONS ---
  
  // Teachers Sync
  useEffect(() => {
    if (!isSyncComplete.current) return;
    const currentStr = JSON.stringify(teachers);
    if (currentStr === prevTeachers.current) return;

    const current = teachers;
    const prevArr: Teacher[] = prevTeachers.current ? JSON.parse(prevTeachers.current) : [];

    current.forEach(async (t) => {
      const matched = prevArr.find(v => v.id === t.id);
      if (!matched || JSON.stringify(matched) !== JSON.stringify(t)) {
        try {
          await setDoc(doc(db, "teachers", t.id), sanitizeForFirestore(t));
        } catch (e) {
          console.error("Firestore Teacher Set Error:", e);
        }
      }
    });

    prevArr.forEach(async (t) => {
      if (!current.some(item => item.id === t.id)) {
        try {
          await deleteDoc(doc(db, "teachers", t.id));
        } catch (e) {
          console.error("Firestore Teacher Delete Error:", e);
        }
      }
    });

    prevTeachers.current = currentStr;
  }, [teachers]);

  // Coordinators Sync
  useEffect(() => {
    if (!isSyncComplete.current) return;
    const currentStr = JSON.stringify(coordinators);
    if (currentStr === prevCoordinators.current) return;

    const current = coordinators;
    const prevArr: Coordinator[] = prevCoordinators.current ? JSON.parse(prevCoordinators.current) : [];

    current.forEach(async (c) => {
      const matched = prevArr.find(v => v.id === c.id);
      if (!matched || JSON.stringify(matched) !== JSON.stringify(c)) {
        try {
          await setDoc(doc(db, "coordinators", c.id), sanitizeForFirestore(c));
        } catch (e) {
          console.error("Firestore Coordinator Set Error:", e);
        }
      }
    });

    prevArr.forEach(async (c) => {
      if (!current.some(item => item.id === c.id)) {
        try {
          await deleteDoc(doc(db, "coordinators", c.id));
        } catch (e) {
          console.error("Firestore Coordinator Delete Error:", e);
        }
      }
    });

    prevCoordinators.current = currentStr;
    safeStorage.setItem('acadamis_coordinators', currentStr);
  }, [coordinators]);

  // --- UTILS ---
  /**
   * Firestore does not support 'undefined' values in documents.
   * This utility recursively removes undefined fields or converts them to null 
   * if they are optional in the type but missing in the instance.
   */
  const sanitizeForFirestore = (obj: any): any => {
    if (Array.isArray(obj)) {
      return obj.map(v => sanitizeForFirestore(v));
    } else if (obj !== null && typeof obj === 'object') {
      const newObj: any = {};
      Object.keys(obj).forEach(key => {
        const val = obj[key];
        if (val !== undefined) {
          newObj[key] = sanitizeForFirestore(val);
        }
      });
      return newObj;
    }
    return obj;
  };

  // Classes Sync
  useEffect(() => {
    if (!isSyncComplete.current) return;
    const currentStr = JSON.stringify(classes);
    if (currentStr === prevClasses.current) return;

    const current = classes;
    const prevArr: Class[] = prevClasses.current ? JSON.parse(prevClasses.current) : [];

    current.forEach(async (item) => {
      const matched = prevArr.find(v => v.id === item.id);
      if (!matched || JSON.stringify(matched) !== JSON.stringify(item)) {
        try {
          await setDoc(doc(db, "classes", item.id), sanitizeForFirestore(item));
        } catch (e) {
          console.error("Firestore Class Set Error:", e);
        }
      }
    });

    prevArr.forEach(async (item) => {
      if (!current.some(p => p.id === item.id)) {
        try {
          await deleteDoc(doc(db, "classes", item.id));
        } catch (e) {
          console.error("Firestore Class Delete Error:", e);
        }
      }
    });

    prevClasses.current = currentStr;
  }, [classes]);

  // Students Sync
  useEffect(() => {
    if (!isSyncComplete.current) return;
    const currentStr = JSON.stringify(students);
    if (currentStr === prevStudents.current) return;

    const current = students;
    const prevArr: Student[] = prevStudents.current ? JSON.parse(prevStudents.current) : [];

    current.forEach(async (item) => {
      const matched = prevArr.find(v => v.id === item.id);
      if (!matched || JSON.stringify(matched) !== JSON.stringify(item)) {
        try {
          await setDoc(doc(db, "students", item.id), sanitizeForFirestore(item));
        } catch (e) {
          console.error("Firestore Student Set Error:", e);
        }
      }
    });

    prevArr.forEach(async (item) => {
      if (!current.some(p => p.id === item.id)) {
        try {
          await deleteDoc(doc(db, "students", item.id));
        } catch (e) {
          console.error("Firestore Student Delete Error:", e);
        }
      }
    });

    prevStudents.current = currentStr;
  }, [students]);

  // Timetable Sync
  useEffect(() => {
    if (!isSyncComplete.current) return;
    const currentStr = JSON.stringify(timetable);
    if (currentStr === prevTimetable.current) return;

    const current = timetable;
    const prevArr: TimetableEntry[] = prevTimetable.current ? JSON.parse(prevTimetable.current) : [];

    current.forEach(async (item) => {
      const matched = prevArr.find(v => v.id === item.id);
      if (!matched || JSON.stringify(matched) !== JSON.stringify(item)) {
        try {
          await setDoc(doc(db, "timetable", item.id), sanitizeForFirestore(item));
        } catch (e) {
          console.error("Firestore Timetable Set Error:", e);
        }
      }
    });

    prevArr.forEach(async (item) => {
      if (!current.some(p => p.id === item.id)) {
        try {
          await deleteDoc(doc(db, "timetable", item.id));
        } catch (e) {
          console.error("Firestore Timetable Delete Error:", e);
        }
      }
    });

    prevTimetable.current = currentStr;
  }, [timetable]);

  // Attendance Sync
  useEffect(() => {
    if (!isSyncComplete.current) return;
    const currentStr = JSON.stringify(attendance);
    if (currentStr === prevAttendance.current) return;

    const current = attendance;
    const prevArr: Attendance[] = prevAttendance.current ? JSON.parse(prevAttendance.current) : [];

    current.forEach(async (item) => {
      const matched = prevArr.find(v => v.id === item.id);
      if (!matched || JSON.stringify(matched) !== JSON.stringify(item)) {
        try {
          await setDoc(doc(db, "attendance", item.id), sanitizeForFirestore(item));
        } catch (e) {
          console.error("Firestore Attendance Set Error:", e);
        }
      }
    });

    prevArr.forEach(async (item) => {
      if (!current.some(p => p.id === item.id)) {
        try {
          await deleteDoc(doc(db, "attendance", item.id));
        } catch (e) {
          console.error("Firestore Attendance Delete Error:", e);
        }
      }
    });

    prevAttendance.current = currentStr;
  }, [attendance]);

  // Marks Sync
  useEffect(() => {
    if (!isSyncComplete.current) return;
    const currentStr = JSON.stringify(marks);
    if (currentStr === prevMarks.current) return;

    const current = marks;
    const prevArr: Mark[] = prevMarks.current ? JSON.parse(prevMarks.current) : [];

    current.forEach(async (item) => {
      const matched = prevArr.find(v => v.id === item.id);
      if (!matched || JSON.stringify(matched) !== JSON.stringify(item)) {
        try {
          await setDoc(doc(db, "marks", item.id), sanitizeForFirestore(item));
        } catch (e) {
          console.error("Firestore Marks Set Error:", e);
        }
      }
    });

    prevArr.forEach(async (item) => {
      if (!current.some(p => p.id === item.id)) {
        try {
          await deleteDoc(doc(db, "marks", item.id));
        } catch (e) {
          console.error("Firestore Marks Delete Error:", e);
        }
      }
    });

    prevMarks.current = currentStr;
  }, [marks]);

  // Fees Sync
  useEffect(() => {
    if (!isSyncComplete.current) return;
    const currentStr = JSON.stringify(fees);
    if (currentStr === prevFees.current) return;

    const current = fees;
    const prevArr: FeeRecord[] = prevFees.current ? JSON.parse(prevFees.current) : [];

    current.forEach(async (item) => {
      const matched = prevArr.find(v => v.id === item.id);
      if (!matched || JSON.stringify(matched) !== JSON.stringify(item)) {
        try {
          await setDoc(doc(db, "fees", item.id), sanitizeForFirestore(item));
        } catch (e) {
          console.error("Firestore Fees Set Error:", e);
        }
      }
    });

    prevArr.forEach(async (item) => {
      if (!current.some(p => p.id === item.id)) {
        try {
          await deleteDoc(doc(db, "fees", item.id));
        } catch (e) {
          console.error("Firestore Fees Delete Error:", e);
        }
      }
    });

    prevFees.current = currentStr;
  }, [fees]);

  // Student Fee Data Sync (New Engine)
  useEffect(() => {
    if (!isSyncComplete.current) return;
    const currentStr = JSON.stringify(feeStudents);
    if (currentStr === prevFeeStudents.current) return;

    const current = feeStudents;
    const prevArr: StudentFeeData[] = prevFeeStudents.current ? JSON.parse(prevFeeStudents.current) : [];

    current.forEach(async (item) => {
      const matched = prevArr.find(v => v.id === item.id);
      if (!matched || JSON.stringify(matched) !== JSON.stringify(item)) {
        try {
          await setDoc(doc(db, "fee_data", String(item.id)), sanitizeForFirestore(item));
        } catch (e) {
          console.error("Firestore Fee Data Set Error:", e);
        }
      }
    });

    prevArr.forEach(async (item) => {
      if (!current.some(p => p.id === item.id)) {
        try {
          await deleteDoc(doc(db, "fee_data", String(item.id)));
        } catch (e) {
          console.error("Firestore Fee Data Delete Error:", e);
        }
      }
    });

    prevFeeStudents.current = currentStr;
    safeStorage.setItem('school_fee_data', currentStr);
  }, [feeStudents]);

  // Ensure students list stays synced into feeStudents data
  useEffect(() => {
    if (!students || students.length === 0) return;
    setFeeStudents(prevFee => {
      let changed = false;
      const updated = [...prevFee];
      
      students.forEach(s => {
        const cls = classes.find(c => c.id === s.classId);
        const classNameStr = cls ? `${cls.className} ${cls.section}`.trim() : (s.classId || 'Class 10');
        const existingIdx = updated.findIndex(f => String(f.id) === String(s.id));
        if (existingIdx === -1) {
          updated.push({
            id: s.id,
            name: s.name,
            class: classNameStr,
            monthlyFee: 2500,
            payments: [],
            otherFunds: []
          });
          changed = true;
        } else if (updated[existingIdx].name !== s.name || updated[existingIdx].class !== classNameStr) {
          updated[existingIdx] = {
            ...updated[existingIdx],
            name: s.name,
            class: classNameStr
          };
          changed = true;
        }
      });

      return changed ? updated : prevFee;
    });
  }, [students, classes]);

  // App Settings Sync
  useEffect(() => {
    if (!isSyncComplete.current) return;
    const currentStr = JSON.stringify(appSettings);
    if (currentStr === prevAppSettings.current) return;

    const sync = async () => {
      try {
        await setDoc(doc(db, "app_settings", "global"), sanitizeForFirestore(appSettings));
        prevAppSettings.current = currentStr;
        safeStorage.setItem('acadamis_app_settings', currentStr);
      } catch (e) {
        console.error("Firestore Settings Sync Error:", e);
      }
    };

    sync();
  }, [appSettings]);

  // Auto-sync students to feeStudents collection
  useEffect(() => {
    if (!isSyncComplete.current) return;
    
    let changed = false;
    const updatedFeeStudents = students.map(s => {
      const match = feeStudents.find(fs => String(fs.id) === String(s.id));
      if (match) {
        // Just update metadata if needed
        const className = classes.find(c => c.id === s.classId)?.className || match.class;
        if (match.name !== s.name || match.class !== className || match.enrollmentMonth !== s.enrollmentMonth || match.monthlyFee !== (s.baseFee || 0)) {
          changed = true;
          return { ...match, name: s.name, class: className, enrollmentMonth: s.enrollmentMonth, monthlyFee: s.baseFee || 0 };
        }
        return match;
      } else {
        changed = true;
        return {
          id: s.id,
          name: s.name,
          class: classes.find(c => c.id === s.classId)?.className || 'Default',
          monthlyFee: s.baseFee || 0,
          enrollmentMonth: s.enrollmentMonth || 'January',
          payments: [],
          otherFunds: []
        };
      }
    });

    // Remove fee data for students who are no longer in the system
    const finalFeeStudents = updatedFeeStudents.filter(fs => students.some(s => String(s.id) === String(fs.id)));
    if (finalFeeStudents.length !== updatedFeeStudents.length) changed = true;

    if (changed) {
      setFeeStudents(finalFeeStudents);
    }
  }, [students, classes, isSyncComplete.current]);

  // --- LOCALSTORAGE CACHING EFFECTS ---
  useEffect(() => {
    safeStorage.setItem('acadamis_teachers', JSON.stringify(teachers));
  }, [teachers]);

  useEffect(() => {
    safeStorage.setItem('acadamis_classes', JSON.stringify(classes));
  }, [classes]);

  useEffect(() => {
    safeStorage.setItem('acadamis_students', JSON.stringify(students));
  }, [students]);

  useEffect(() => {
    safeStorage.setItem('acadamis_timetable', JSON.stringify(timetable));
  }, [timetable]);

  useEffect(() => {
    safeStorage.setItem('acadamis_attendance', JSON.stringify(attendance));
  }, [attendance]);

  useEffect(() => {
    safeStorage.setItem('acadamis_marks', JSON.stringify(marks));
  }, [marks]);

  useEffect(() => {
    safeStorage.setItem('acadamis_fees', JSON.stringify(fees));
  }, [fees]);

  useEffect(() => {
    if (userSession) {
      safeStorage.setItem('acadamis_session', JSON.stringify(userSession));
    } else {
      safeStorage.removeItem('acadamis_session');
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

      {/* PWA Install Modal Popup */}
      <AnimatePresence>
        {showInstallModal && (
          <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="bg-white w-full max-w-sm rounded-[2.5rem] shadow-2xl overflow-hidden border border-slate-200"
            >
              <div className="p-8 text-center space-y-6">
                <div className="w-20 h-20 bg-indigo-600 text-white rounded-3xl mx-auto flex items-center justify-center shadow-xl shadow-indigo-500/20 rotate-6">
                  <Download size={40} strokeWidth={2.5} />
                </div>
                
                <div className="space-y-2">
                  <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight ">Install Portal</h3>
                  <p className="text-xs font-bold text-slate-500 leading-relaxed uppercase tracking-wide">
                    Add to your home screen for quick access and a better mobile experience.
                  </p>
                </div>

                <div className="flex flex-col gap-3 pt-4">
                  <button 
                    onClick={handleInstallClick}
                    className="w-full py-4 bg-indigo-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-indigo-700 transition-all shadow-lg active:scale-95"
                  >
                    Install Now
                  </button>
                  <button 
                    onClick={() => setShowInstallModal(false)}
                    className="w-full py-4 bg-white border border-slate-200 text-slate-400 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-50 transition-all active:scale-95"
                  >
                    Maybe Later
                  </button>
                </div>
              </div>
              <div className="bg-slate-50 p-4 text-center border-t border-slate-100">
                <p className="text-[8px] font-black text-slate-400 uppercase tracking-[0.2em]">NSB1 School Management System</p>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

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
            coordinators={coordinators}
            onLogin={handleLogin} 
            onBackToLanding={() => setViewPortal(false)}
          />
        )
      ) : (userSession.role === 'principal' || userSession.role === 'coordinator' || userSession.role === 'developer') ? (
        <PrincipalDashboard
          userSession={userSession}
          teachers={teachers}
          setTeachers={setTeachers}
          students={students}
          setStudents={setStudents}
          attendance={attendance}
          setAttendance={setAttendance}
          coordinators={coordinators}
          setCoordinators={setCoordinators}
          classes={classes}
          setClasses={setClasses}
          timetable={timetable}
          setTimetable={setTimetable}
          fees={fees}
          setFees={setFees}
          marks={marks}
          setMarks={setMarks}
          feeStudents={feeStudents}
          setFeeStudents={setFeeStudents}
          appSettings={appSettings}
          setAppSettings={setAppSettings}
          onLogout={handleLogout}
          installPromptEvent={installPromptEvent}
          onInstallApp={handleInstallClick}
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
          installPromptEvent={installPromptEvent}
          onInstallApp={handleInstallClick}
        />
      ) : userSession.role === 'student' ? (
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
          installPromptEvent={installPromptEvent}
          onInstallApp={handleInstallClick}
        />
      ) : (
        <Login 
          teachers={teachers} 
          students={students} 
          coordinators={coordinators}
          onLogin={handleLogin} 
          onBackToLanding={() => setViewPortal(false)}
        />
      )}
    </div>
  );
}
