import { useState, useEffect, useRef } from 'react';
import { Toaster, toast } from 'sonner';
import { Download, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { db } from './firebase';
import { collection, getDocs, doc, setDoc, deleteDoc, writeBatch, getDoc } from 'firebase/firestore';
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
    return saved ? JSON.parse(saved) : [];
  });

  const [classes, setClasses] = useState<Class[]>(() => {
    const saved = localStorage.getItem('acadamis_classes');
    return saved ? JSON.parse(saved) : [];
  });

  const [students, setStudents] = useState<Student[]>(() => {
    const saved = localStorage.getItem('acadamis_students');
    return saved ? JSON.parse(saved) : [];
  });

  const [timetable, setTimetable] = useState<TimetableEntry[]>(() => {
    const saved = localStorage.getItem('acadamis_timetable');
    return saved ? JSON.parse(saved) : [];
  });

  const [attendance, setAttendance] = useState<Attendance[]>(() => {
    const saved = localStorage.getItem('acadamis_attendance');
    return saved ? JSON.parse(saved) : [];
  });

  const [marks, setMarks] = useState<Mark[]>(() => {
    const saved = localStorage.getItem('acadamis_marks');
    return saved ? JSON.parse(saved) : [];
  });

  const [fees, setFees] = useState<FeeRecord[]>(() => {
    const saved = localStorage.getItem('acadamis_fees');
    return saved ? JSON.parse(saved) : [];
  });

  const [coordinators, setCoordinators] = useState<Coordinator[]>(() => {
    const saved = localStorage.getItem('acadamis_coordinators');
    return saved ? JSON.parse(saved) : [];
  });

  const [feeStudents, setFeeStudents] = useState<StudentFeeData[]>(() => {
    const saved = localStorage.getItem('school_fee_data');
    return saved ? JSON.parse(saved) : [];
  });

  const [appSettings, setAppSettings] = useState<AppSettings>(() => {
    const saved = localStorage.getItem('acadamis_app_settings');
    return saved ? JSON.parse(saved) : {
      absentTemplate: "Dear parent, your child {name} is absent today {date}. NSB 1 Academy.",
      feeTemplate: "Dear parent, your child {name}'s fee for {month} is Rs. {amount} which is due on {date}. NSB 1 Academy.",
      whatsAppAutoFee: true,
      whatsAppAutoAbsence: true,
      whatsAppAutoResult: false,
      autoWhatsAppRedirect: true,
      extraPeriods: {},
      deletedPeriods: {},
      periodColors: {}
    };
  });

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
    }
  };

  // User session state
  const [userSession, setUserSession] = useState<UserSession | null>(() => {
    const saved = localStorage.getItem('acadamis_session');
    return saved ? JSON.parse(saved) : null;
  });

  // --- FIRESTORE SYNCHRONIZATION SYSTEM ---
  const [isSyncing, setIsSyncing] = useState<boolean>(true);
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
        const teachersSnapshot = await getDocs(collection(db, "teachers"));
        
        // Detect if previously seeded fake/mock data is present in Firestore
        const hasFakeData = !teachersSnapshot.empty && teachersSnapshot.docs.some(doc => ['t1', 't2', 't3'].includes(doc.id));
        
        if (hasFakeData) {
          console.log("Detected seeded fake data in Firestore. Purging all collections...");
          
          const deleteCollectionDocs = async (collectionName: string) => {
            const snapshot = await getDocs(collection(db, collectionName));
            if (snapshot.empty) return;
            const batch = writeBatch(db);
            snapshot.docs.forEach(docSnap => {
              batch.delete(doc(db, collectionName, docSnap.id));
            });
            await batch.commit();
          };

          await deleteCollectionDocs("teachers");
          await deleteCollectionDocs("classes");
          await deleteCollectionDocs("students");
          await deleteCollectionDocs("timetable");
          await deleteCollectionDocs("attendance");
          await deleteCollectionDocs("marks");
          await deleteCollectionDocs("fees");

          // Clear local storage completely for school states
          localStorage.removeItem('acadamis_teachers');
          localStorage.removeItem('acadamis_classes');
          localStorage.removeItem('acadamis_students');
          localStorage.removeItem('acadamis_timetable');
          localStorage.removeItem('acadamis_attendance');
          localStorage.removeItem('acadamis_marks');
          localStorage.removeItem('acadamis_fees');

          // Reset school states to empty
          setTeachers([]);
          setClasses([]);
          setStudents([]);
          setTimetable([]);
          setAttendance([]);
          setMarks([]);
          setFees([]);

          prevTeachers.current = JSON.stringify([]);
          prevClasses.current = JSON.stringify([]);
          prevStudents.current = JSON.stringify([]);
          prevTimetable.current = JSON.stringify([]);
          prevAttendance.current = JSON.stringify([]);
          prevMarks.current = JSON.stringify([]);
          prevFees.current = JSON.stringify([]);

          toast.success("ScholarSync cleared of all fake data! Ready for custom setup.");
        } else if (teachersSnapshot.empty) {
          console.log("Firestore database is empty. Ready for actual school setup.");
          
          setTeachers([]);
          setClasses([]);
          setStudents([]);
          setTimetable([]);
          setAttendance([]);
          setMarks([]);
          setFees([]);

          prevTeachers.current = JSON.stringify([]);
          prevClasses.current = JSON.stringify([]);
          prevStudents.current = JSON.stringify([]);
          prevTimetable.current = JSON.stringify([]);
          prevAttendance.current = JSON.stringify([]);
          prevMarks.current = JSON.stringify([]);
          prevFees.current = JSON.stringify([]);
          
          toast.success("Connected with fresh, clean Cloud Firestore database!");
        } else {
          console.log("Loading datasets from active Cloud Firestore...");
          
          const classesSnapshot = await getDocs(collection(db, "classes"));
          const studentsSnapshot = await getDocs(collection(db, "students"));
          const timetableSnapshot = await getDocs(collection(db, "timetable"));
          const attendanceSnapshot = await getDocs(collection(db, "attendance"));
          const marksSnapshot = await getDocs(collection(db, "marks"));
          const feesSnapshot = await getDocs(collection(db, "fees"));
          const coordinatorsSnapshot = await getDocs(collection(db, "coordinators"));

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

          // Load StudentFeeData (new engine)
          const feeDataSnapshot = await getDocs(collection(db, "fee_data"));
          const loadedFeeStudents: StudentFeeData[] = [];
          feeDataSnapshot.forEach(docSnap => loadedFeeStudents.push(docSnap.data() as StudentFeeData));

          // Load App Settings
          const settingsSnap = await getDoc(doc(db, "app_settings", "global"));
          let loadedSettings: AppSettings | null = null;
          if (settingsSnap.exists()) {
            loadedSettings = settingsSnap.data() as AppSettings;
          }

          setTeachers(loadedTeachers);
          setClasses(loadedClasses);
          setStudents(loadedStudents);
          setTimetable(loadedTimetable);
          setAttendance(loadedAttendance);
          setMarks(loadedMarks);
          setFees(loadedFees);
          setCoordinators(loadedCoordinators);
          if (loadedFeeStudents.length > 0) setFeeStudents(loadedFeeStudents);
          if (loadedSettings) setAppSettings(loadedSettings);

          prevTeachers.current = JSON.stringify(loadedTeachers);
          prevClasses.current = JSON.stringify(loadedClasses);
          prevStudents.current = JSON.stringify(loadedStudents);
          prevTimetable.current = JSON.stringify(loadedTimetable);
          prevAttendance.current = JSON.stringify(loadedAttendance);
          prevMarks.current = JSON.stringify(loadedMarks);
          prevFees.current = JSON.stringify(loadedFees);
          prevCoordinators.current = JSON.stringify(loadedCoordinators);
          prevFeeStudents.current = JSON.stringify(loadedFeeStudents);
          if (loadedSettings) prevAppSettings.current = JSON.stringify(loadedSettings);

          toast.success("ScholarSync connected with Cloud Firestore Ledger!");
        }
        isSyncComplete.current = true;
        setIsSyncing(false);
      } catch (err: any) {
        console.error("Firebase synchronization failure, offline backup active:", err);
        setSyncError(err.message || "Failed connection");
        setIsSyncing(false);
        // Fallback to offline compatibility
        isSyncComplete.current = true;
        toast.warning("Cloud database offline. Local safety mode active.");
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
    localStorage.setItem('acadamis_coordinators', currentStr);
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
    localStorage.setItem('school_fee_data', currentStr);
  }, [feeStudents]);

  // App Settings Sync
  useEffect(() => {
    if (!isSyncComplete.current) return;
    const currentStr = JSON.stringify(appSettings);
    if (currentStr === prevAppSettings.current) return;

    const sync = async () => {
      try {
        await setDoc(doc(db, "app_settings", "global"), sanitizeForFirestore(appSettings));
        prevAppSettings.current = currentStr;
        localStorage.setItem('acadamis_app_settings', currentStr);
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
  if (isSyncing) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col justify-center items-center p-6 text-center font-sans select-none">
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
                    <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight italic text-slate-900">Install Portal</h3>
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
                  <p className="text-[8px] font-black text-slate-400 uppercase tracking-[0.2em]">Smart School Management System</p>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        <div className="space-y-6 max-w-sm w-full animate-fade-in">
          {/* Animated Spinner with school academic icon */}
          <div className="relative w-16 h-16 mx-auto">
            <div className="absolute inset-0 rounded-full border-4 border-slate-900"></div>
            <div className="absolute inset-x-0 inset-y-0 rounded-full border-4 border-indigo-500 border-t-transparent animate-spin"></div>
            <span className="absolute inset-0 flex items-center justify-center text-xl">🏫</span>
          </div>

          <div className="space-y-2">
            <h1 className="text-sm font-black uppercase tracking-widest text-slate-100">
              ScholarSync Cloud Security
            </h1>
            <p className="text-[10px] text-slate-400 font-mono tracking-wider animate-pulse uppercase">
              Establishing real-time ledger synchronization...
            </p>
          </div>

          <p className="text-[10px] text-slate-500 leading-relaxed font-mono">
            Scanning academic class structures, teachers rosters, dynamic timetables, and billing accounts from active Firestore cloud databases...
          </p>
        </div>
      </div>
    );
  }

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
                  <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight italic">Install Portal</h3>
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
                <p className="text-[8px] font-black text-slate-400 uppercase tracking-[0.2em]">Smart School Management System</p>
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
          installPromptEvent={installPromptEvent}
          onInstallApp={handleInstallClick}
        />
      )}
    </div>
  );
}
