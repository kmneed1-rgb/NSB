import { useState, useEffect, useRef, useCallback } from 'react';
import { Toaster, toast } from 'sonner';
import { Download, Shield, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { sbQueueWrite, sbQueueDelete, flushSupabase, loadAllFromSupabase, subscribeRecords, mergePendingRows, isRowPending, getPendingCount } from './lib/supabaseSync';
import { Teacher, Student, Coordinator, Class, TimetableEntry, Attendance, Mark, UserSession, FeeRecord, AppSettings, StudentFeeData, Assignment } from './types';
import { DEFAULT_APP_SETTINGS, withAppControlDefaults, getPortalBlockMessage, getRoleLoginBlockMessage } from './lib/appControl';
import {
  absorbNotificationsFromRows,
  startNotificationSync,
  filterNotificationsForUser,
  getDeviceId,
  deleteCloudNotificationRows,
  PortalNotification,
} from './lib/notificationUtils';
import {
  playNotifyTone,
  playBellTone,
  vibrateDevice,
  toneEnabledFor,
  unlockAudioOnFirstGesture,
} from './lib/notifySound';
import DeveloperDashboard from './components/DeveloperDashboard';
import BroadcastOverlay from './components/BroadcastOverlay';
import SplashScreen from './components/SplashScreen';
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

/**
 * `app_settings` table mein settings ka asli row id = `global` hota hai.
 * Baaki rows (`notif_*`) notifications hain — inhe settings samajhna bug tha.
 */
function pickSettingsRow(rows: any[] | undefined): any | null {
  const list = rows || [];
  return (
    list.find(r => String(r?.id) === 'global') ||
    list.find(r => !String(r?.id || '').startsWith('notif_')) ||
    null
  );
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

  const [assignments, setAssignments] = useState<Assignment[]>(() => 
    safeParse('acadamis_assignments', [])
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
    withAppControlDefaults(safeParse('acadamis_app_settings', DEFAULT_APP_SETTINGS))
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
  // Real-time listeners tab hi setup hon jab initial sync complete ho
  const [syncReady, setSyncReady] = useState(false);
  // Boot loading splash — initial sync ke doran dikhta hai (safety timeout ke saath).
  const [showSplash, setShowSplash] = useState(true);
  const isSyncComplete = useRef<boolean>(false);
  // Notification tone callback (realtime closure se call hota hai — stale state se bachne ke liye ref)
  const playToneForNewNotificationsRef = useRef<(items: PortalNotification[]) => void>(() => {});
  

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
  const prevAssignments = useRef<string>('');

  // --- OFFLINE-FIRST SYNC CORE ---
  // 1. applyData  → cloud load + pending offline rows protect karke state/cache apply
  // 2. runSync    → outbox flush + cloud merge (online event, retry timer, manual)
  // 3. flushBatch → sirf pending writes cloud par (har change ke baad debounced)
  // Offline par data localStorage (local DB) mein save hota rehta hai; internet
  // wapas aane par persistent outbox Supabase push hota hai — local copy delete
  // NAHI hoti (offline read ke liye hamesha bani rahti hai).
  const [isOnline, setIsOnline] = useState<boolean>(() =>
    typeof navigator === 'undefined' || navigator.onLine !== false
  );
  const [pendingCount, setPendingCount] = useState<number>(0);
  const [syncPaused, setSyncPaused] = useState(false);
  const retryTimer = useRef<any>(null);
  const retryDelay = useRef(5000);
  const batchTimer = useRef<any>(null);

  const applyData = useCallback(async (reason: string): Promise<boolean> => {
    const result = await loadAllFromSupabase();
    if (!result.ok) return false; // offline/partial failure — local data ko chhune nahi
    const data = result.tables;

    const applyList = <T extends { id: any }>(
      col: string,
      list: any[] | undefined,
      prevRef: React.MutableRefObject<string>,
      setter: (v: T[]) => void,
      storeKey: string
    ) => {
      if (!list) return;
      const merged = mergePendingRows(col, list) as T[]; // pending offline rows protect
      const str = JSON.stringify(merged);
      if (str === prevRef.current) return;
      setter(merged);
      prevRef.current = str;
      safeStorage.setItem(storeKey, str); // local cache hamesha update, kabhi delete nahi
    };

    applyList<Teacher>('teachers', data['teachers'], prevTeachers, setTeachers, 'acadamis_teachers');
    applyList<Class>('classes', data['classes'], prevClasses, setClasses, 'acadamis_classes');
    applyList<Student>('students', data['students'], prevStudents, setStudents, 'acadamis_students');
    applyList<TimetableEntry>('timetable', data['timetable'], prevTimetable, setTimetable, 'acadamis_timetable');
    applyList<Attendance>('attendance', data['attendance'], prevAttendance, setAttendance, 'acadamis_attendance');
    applyList<Mark>('marks', data['marks'], prevMarks, setMarks, 'acadamis_marks');
    applyList<FeeRecord>('fees', data['fees'], prevFees, setFees, 'acadamis_fees');
    applyList<Coordinator>('coordinators', data['coordinators'], prevCoordinators, setCoordinators, 'acadamis_coordinators');
    applyList<StudentFeeData>('fee_data', data['fee_data'], prevFeeStudents, setFeeStudents, 'school_fee_data');
    applyList<Assignment>('assignments', data['assignments'], prevAssignments, setAssignments, 'acadamis_assignments');

    const settingsRow = pickSettingsRow(data['app_settings']);
    if (settingsRow && !isRowPending('app_settings', 'global')) {
      const s = withAppControlDefaults(settingsRow as AppSettings);
      const sStr = JSON.stringify(s);
      if (sStr !== prevAppSettings.current) {
        setAppSettings(s);
        prevAppSettings.current = sStr;
        safeStorage.setItem('acadamis_app_settings', sStr);
      }
    }

    // Notifications (`app_settings` ke `notif_*` rows) — cross-device merge + tone
    const absorbed = absorbNotificationsFromRows(data['app_settings'] || []);
    if (absorbed.added.length > 0) playToneForNewNotificationsRef.current(absorbed.added);
    if (absorbed.droppedIds.length > 0) deleteCloudNotificationRows(absorbed.droppedIds);
    console.log(`[Sync:RT] Supabase update applied (${reason})`);
    return true;
  }, []);

  // Retry timer — exponential backoff 5s → 60s, jab tak sync success na ho jaye.
  const runSyncRef = useRef<() => Promise<boolean>>(async () => true);
  const scheduleRetry = useCallback(() => {
    if (retryTimer.current) clearTimeout(retryTimer.current);
    retryTimer.current = setTimeout(() => { runSyncRef.current().catch(() => {}); }, retryDelay.current);
    retryDelay.current = Math.min(retryDelay.current * 2, 60000);
  }, []);

  // Online par foran: pending offline data Supabase + cloud se latest merge.
  const runSync = useCallback(async (): Promise<boolean> => {
    if (typeof navigator !== 'undefined' && navigator.onLine === false) {
      setIsOnline(false);
      setSyncError('Offline — data saved locally');
      setSyncPaused(true);
      setPendingCount(getPendingCount());
      scheduleRetry();
      return false;
    }
    const flushed = await flushSupabase();
    const applied = await applyData('sync');
    const ok = flushed && applied;
    setPendingCount(getPendingCount());
    if (ok) {
      setSyncError(null);
      setSyncPaused(false);
      retryDelay.current = 5000;
      if (retryTimer.current) { clearTimeout(retryTimer.current); retryTimer.current = null; }
    } else {
      setSyncError('Cloud sync failed — changes saved locally, retrying');
      setSyncPaused(true);
      scheduleRetry();
    }
    return ok;
  }, [applyData, scheduleRetry]);

  useEffect(() => { runSyncRef.current = runSync; }, [runSync]);

  // --- QUEUED SUPABASE WRITER ---
  // Har write/delete persistent offline outbox (localStorage) mein jata hai aur
  // debounce ke baad batched upsert se flush hota hai. Offline = outbox safe.

  const queueBatchWrite = (col: string, id: string, data: any) => {
    sbQueueWrite(col, id, data);
    flushBatchDebounced();
  };

  const queueBatchDelete = (col: string, id: string) => {
    sbQueueDelete(col, id);
    flushBatchDebounced();
  };

  const flushBatch = async () => {
    const ok = await flushSupabase();
    setPendingCount(getPendingCount());
    if (ok) {
      setSyncError(null);
      setSyncPaused(false);
      retryDelay.current = 5000;
      if (retryTimer.current) { clearTimeout(retryTimer.current); retryTimer.current = null; }
    } else {
      // Outbox localStorage mein save hai — retry timer se auto push hoga.
      setSyncError('Cloud sync failed — changes saved locally, retrying');
      setSyncPaused(true);
      scheduleRetry();
    }
  };

  // Debounce network round-trips (koi quota nahi, sirf efficiency).
  const flushBatchDebounced = () => {
    if (batchTimer.current) clearTimeout(batchTimer.current);
    batchTimer.current = setTimeout(() => {
      flushBatch();
    }, 1200);
  };

  // Flush any remaining writes before the tab is closed/navigated away.
  useEffect(() => {
    const flush = () => flushBatch();
    window.addEventListener('beforeunload', flush);
    document.addEventListener('visibilitychange', flush);
    return () => {
      window.removeEventListener('beforeunload', flush);
      document.removeEventListener('visibilitychange', flush);
      if (batchTimer.current) clearTimeout(batchTimer.current);
    };
  }, []);

  


  




  // --- REALTIME LISTENER — Supabase WebSocket push se live cross-device sync ---
  // Ek hi channel SARI tables par; koi bhi INSERT/UPDATE/DELETE → debounce ke
  // baad applyData() cloud se state refresh karta hai. Pending offline rows
  // (outbox) cloud ke stale copy se protect rehti hain.
  useEffect(() => {
    if (!userSession || !syncReady) return;

    let rtTimer: any = null;
    const unsub = subscribeRecords(() => {
      if (!isSyncComplete.current) return;
      if (rtTimer) clearTimeout(rtTimer);
      rtTimer = setTimeout(() => { applyData('realtime').catch(() => {}); }, 400);
    });

    console.log('[Sync:RT] Supabase realtime listener active');
    return () => {
      unsub();
      if (rtTimer) clearTimeout(rtTimer);
    };
  }, [userSession, syncReady, applyData]);


  useEffect(() => {
    async function initBackendAndSync() {
      // localStorage-backed initial state (safeParse se aayi) — isi ko offline
      // fallback ke taur par preserve karna hai; cloud fail hone par yahi rehti hai.
      const snapshotPrevRefs = () => {
        prevTeachers.current = JSON.stringify(teachers);
        prevClasses.current = JSON.stringify(classes);
        prevStudents.current = JSON.stringify(students);
        prevTimetable.current = JSON.stringify(timetable);
        prevAttendance.current = JSON.stringify(attendance);
        prevMarks.current = JSON.stringify(marks);
        prevFees.current = JSON.stringify(fees);
        prevCoordinators.current = JSON.stringify(coordinators);
        prevFeeStudents.current = JSON.stringify(feeStudents);
        prevAssignments.current = JSON.stringify(assignments);
        prevAppSettings.current = JSON.stringify(appSettings);
      };

      try {
        console.log("Checking Supabase connectivity...");

        // Browser already jaanta hai ke network nahi — 15s timeout mat ruko.
        if (typeof navigator !== 'undefined' && navigator.onLine === false) {
          throw new Error("Offline — data saved locally");
        }

        const timeoutPromise = new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error("Supabase connection timeout")), 15000)
        );

        const result = await Promise.race([loadAllFromSupabase(), timeoutPromise]);
        const data = result.tables;
        const loadedTeachers = data['teachers'] || [];
        const loadedClasses = data['classes'] || [];
        const loadedStudents = data['students'] || [];
        const loadedTimetable = data['timetable'] || [];
        const loadedAttendance = data['attendance'] || [];
        const loadedMarks = data['marks'] || [];
        const loadedFees = data['fees'] || [];
        const loadedCoordinators = data['coordinators'] || [];
        const loadedFeeStudents = data['fee_data'] || [];
        const loadedAssignments = data['assignments'] || [];
        const loadedSettings = pickSettingsRow(data['app_settings']) as AppSettings | null;

        if (!result.ok) {
          // Cloud unreachable / partial failure — LOCAL data ko chhuein mat.
          console.warn('[Sync] Supabase load failed — offline fallback, local data preserved');
          snapshotPrevRefs();
          setSyncError('Cloud unreachable — data saved locally');
          setPendingCount(getPendingCount());
          isSyncComplete.current = true;
          setSyncReady(true);
          scheduleRetry();
          return;
        }

        // ===== CLOUD OK =====
        // Jo column cloud par khali hai use LOCAL cache se lo (seed), aur prev
        // ref '' rakh kar pehle diff pass mein cloud par push karwa do.
        const cloudOr = <T,>(col: string, cloud: any[], local: T[]): T[] =>
          cloud.length > 0 ? (mergePendingRows(col, cloud) as T[]) : local;

        const finalTeachers = cloudOr<Teacher>('teachers', loadedTeachers, teachers);
        const finalClasses = cloudOr<Class>('classes', loadedClasses, classes);
        const finalStudents = cloudOr<Student>('students', loadedStudents, students);
        const finalTimetable = cloudOr<TimetableEntry>('timetable', loadedTimetable, timetable);
        const finalAttendance = cloudOr<Attendance>('attendance', loadedAttendance, attendance);
        const finalMarks = cloudOr<Mark>('marks', loadedMarks, marks);
        const finalFees = cloudOr<FeeRecord>('fees', loadedFees, fees);
        const finalCoordinators = cloudOr<Coordinator>('coordinators', loadedCoordinators, coordinators);
        const finalAssignments = cloudOr<Assignment>('assignments', loadedAssignments, assignments);
          // ===== APPLY — cloud data + local pending overlay (local cache kabhi delete nahi) =====
          console.log("Loading datasets from Supabase...");

          const defaultFeeStudents: StudentFeeData[] = finalStudents.map(s => ({
            id: s.id,
            name: s.name,
            class: s.classId === 'c1' ? 'Grade 10 A' : 'Grade 11 B',
            monthlyFee: 2500,
            payments: [],
            otherFunds: [],
            dues: []
          }));
          const finalFeeStudents = cloudOr<StudentFeeData>('fee_data', loadedFeeStudents,
            feeStudents.length > 0 ? feeStudents : defaultFeeStudents);

          let finalSettings = appSettings;
          if (loadedSettings) {
            const mergedSettings = mergePendingRows('app_settings', [loadedSettings]);
            finalSettings = withAppControlDefaults((mergedSettings[0] || loadedSettings) as AppSettings);
          }

          setTeachers(finalTeachers);
          setClasses(finalClasses);
          setStudents(finalStudents);
          setTimetable(finalTimetable);
          setAttendance(finalAttendance);
          setMarks(finalMarks);
          setFees(finalFees);
          setCoordinators(finalCoordinators);
          setAssignments(finalAssignments);
          setFeeStudents(finalFeeStudents);
          setAppSettings(finalSettings);

          // Prev refs: cloud mein data hai → baseline = applied value; cloud khali →
          // '' taki pehla diff pass LOCAL data cloud par push kare (offline → cloud).
          prevTeachers.current = loadedTeachers.length > 0 ? JSON.stringify(finalTeachers) : '';
          prevClasses.current = loadedClasses.length > 0 ? JSON.stringify(finalClasses) : '';
          prevStudents.current = loadedStudents.length > 0 ? JSON.stringify(finalStudents) : '';
          prevTimetable.current = loadedTimetable.length > 0 ? JSON.stringify(finalTimetable) : '';
          prevAttendance.current = loadedAttendance.length > 0 ? JSON.stringify(finalAttendance) : '';
          prevMarks.current = loadedMarks.length > 0 ? JSON.stringify(finalMarks) : '';
          prevFees.current = loadedFees.length > 0 ? JSON.stringify(finalFees) : '';
          prevCoordinators.current = loadedCoordinators.length > 0 ? JSON.stringify(finalCoordinators) : '';
          prevFeeStudents.current = loadedFeeStudents.length > 0 ? JSON.stringify(finalFeeStudents) : '';
          prevAssignments.current = loadedAssignments.length > 0 ? JSON.stringify(finalAssignments) : '';
          prevAppSettings.current = loadedSettings ? JSON.stringify(finalSettings) : '';

          // localStorage cache refresh — local copy hamesha bani rahe (offline read);
          // yahan SIRF update hoti hai, delete kabhi nahi hoti.
          safeStorage.setItem('acadamis_teachers', JSON.stringify(finalTeachers));
          safeStorage.setItem('acadamis_classes', JSON.stringify(finalClasses));
          safeStorage.setItem('acadamis_students', JSON.stringify(finalStudents));
          safeStorage.setItem('acadamis_timetable', JSON.stringify(finalTimetable));
          safeStorage.setItem('acadamis_attendance', JSON.stringify(finalAttendance));
          safeStorage.setItem('acadamis_marks', JSON.stringify(finalMarks));
          safeStorage.setItem('acadamis_fees', JSON.stringify(finalFees));
          safeStorage.setItem('acadamis_coordinators', JSON.stringify(finalCoordinators));
          safeStorage.setItem('acadamis_assignments', JSON.stringify(finalAssignments));
          safeStorage.setItem('school_fee_data', JSON.stringify(finalFeeStudents));
          safeStorage.setItem('acadamis_app_settings', JSON.stringify(finalSettings));

        isSyncComplete.current = true;
        setSyncReady(true);
        setSyncError(null);
        setPendingCount(getPendingCount());
        // Pichle session ke offline writes (persistent outbox) + cloud-khali diff pushes
        flushBatch();
      } catch (err: any) {
        console.warn("Supabase sync running in background/offline fallback mode:", err?.message);
        // Timeout/network fail → LOCAL data (localStorage) ko hi rehne do (wipe nahi).
        snapshotPrevRefs();
        setSyncError(err?.message || "Offline — data saved locally");
        setPendingCount(getPendingCount());
        isSyncComplete.current = true;
        setSyncReady(true);
        scheduleRetry();
      }
    }

    initBackendAndSync();
  }, []);

  // --- NETWORK STATUS + AUTO-RETRY ---
  // Internet wapas aaye → foran pending offline data Supabase; gayab → local mode.
  useEffect(() => {
    const handleOnline = () => {
      console.log('[Sync] Network online — flushing offline data to Supabase');
      setIsOnline(true);
      retryDelay.current = 5000;
      runSyncRef.current().catch(() => {});
    };
    const handleOffline = () => {
      console.log('[Sync] Network offline — data saving to local DB');
      setIsOnline(false);
      setSyncError('Offline — data saved locally');
      setPendingCount(getPendingCount());
    };
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      if (retryTimer.current) clearTimeout(retryTimer.current);
    };
  }, []);

  // Pending offline changes ka live count (banner ke liye)
  useEffect(() => {
    const timer = setInterval(() => {
      setPendingCount(prev => {
        const n = getPendingCount();
        return n === prev ? prev : n;
      });
    }, 2500);
    return () => clearInterval(timer);
  }, []);

  // --- REALTIME DIFFERENTIAL SYNC ACTIONS ---
  
  // Teachers Sync
  useEffect(() => {
    if (!isSyncComplete.current) return;
    const currentStr = JSON.stringify(teachers);
    if (currentStr === prevTeachers.current) return;

    const current = teachers;
    const prevArr: Teacher[] = prevTeachers.current ? JSON.parse(prevTeachers.current) : [];

    current.forEach((t) => {
      const matched = prevArr.find(v => v.id === t.id);
      if (!matched || JSON.stringify(matched) !== JSON.stringify(t)) {
        queueBatchWrite("teachers", t.id, t);
      }
    });

    prevArr.forEach((t) => {
      if (!current.some(item => item.id === t.id)) {
        queueBatchDelete("teachers", t.id);
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

    current.forEach((c) => {
      const matched = prevArr.find(v => v.id === c.id);
      if (!matched || JSON.stringify(matched) !== JSON.stringify(c)) {
        queueBatchWrite("coordinators", c.id, c);
      }
    });

    prevArr.forEach((c) => {
      if (!current.some(item => item.id === c.id)) {
        queueBatchDelete("coordinators", c.id);
      }
    });

    prevCoordinators.current = currentStr;
    safeStorage.setItem('acadamis_coordinators', currentStr);
  }, [coordinators]);

  // Assignments Sync
  useEffect(() => {
    if (!isSyncComplete.current) return;
    const currentStr = JSON.stringify(assignments);
    if (currentStr === prevAssignments.current) return;

    const current = assignments;
    const prevArr: Assignment[] = prevAssignments.current ? JSON.parse(prevAssignments.current) : [];

    current.forEach((item) => {
      const matched = prevArr.find(v => v.id === item.id);
      if (!matched || JSON.stringify(matched) !== JSON.stringify(item)) {
        queueBatchWrite("assignments", item.id, item);
      }
    });

    prevArr.forEach((item) => {
      if (!current.some(p => p.id === item.id)) {
        queueBatchDelete("assignments", item.id);
      }
    });

    prevAssignments.current = currentStr;
    safeStorage.setItem('acadamis_assignments', currentStr);
  }, [assignments]);

  // --- UTILS ---

  // Classes Sync
  useEffect(() => {
    if (!isSyncComplete.current) return;
    const currentStr = JSON.stringify(classes);
    if (currentStr === prevClasses.current) return;

    const current = classes;
    const prevArr: Class[] = prevClasses.current ? JSON.parse(prevClasses.current) : [];

    current.forEach((item) => {
      const matched = prevArr.find(v => v.id === item.id);
      if (!matched || JSON.stringify(matched) !== JSON.stringify(item)) {
        queueBatchWrite("classes", item.id, item);
      }
    });

    prevArr.forEach((item) => {
      if (!current.some(p => p.id === item.id)) {
        queueBatchDelete("classes", item.id);
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

    current.forEach((item) => {
      const matched = prevArr.find(v => v.id === item.id);
      if (!matched || JSON.stringify(matched) !== JSON.stringify(item)) {
        queueBatchWrite("students", item.id, item);
      }
    });

    prevArr.forEach((item) => {
      if (!current.some(p => p.id === item.id)) {
        queueBatchDelete("students", item.id);
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

    current.forEach((item) => {
      const matched = prevArr.find(v => v.id === item.id);
      if (!matched || JSON.stringify(matched) !== JSON.stringify(item)) {
        queueBatchWrite("timetable", item.id, item);
      }
    });

    prevArr.forEach((item) => {
      if (!current.some(p => p.id === item.id)) {
        queueBatchDelete("timetable", item.id);
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

    current.forEach((item) => {
      const matched = prevArr.find(v => v.id === item.id);
      if (!matched || JSON.stringify(matched) !== JSON.stringify(item)) {
        queueBatchWrite("attendance", item.id, item);
      }
    });

    prevArr.forEach((item) => {
      if (!current.some(p => p.id === item.id)) {
        queueBatchDelete("attendance", item.id);
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

    current.forEach((item) => {
      const matched = prevArr.find(v => v.id === item.id);
      if (!matched || JSON.stringify(matched) !== JSON.stringify(item)) {
        queueBatchWrite("marks", item.id, item);
      }
    });

    prevArr.forEach((item) => {
      if (!current.some(p => p.id === item.id)) {
        queueBatchDelete("marks", item.id);
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

    current.forEach((item) => {
      const matched = prevArr.find(v => v.id === item.id);
      if (!matched || JSON.stringify(matched) !== JSON.stringify(item)) {
        queueBatchWrite("fees", item.id, item);
      }
    });

    prevArr.forEach((item) => {
      if (!current.some(p => p.id === item.id)) {
        queueBatchDelete("fees", item.id);
      }
    });

    prevFees.current = currentStr;
    safeStorage.setItem('acadamis_fees', currentStr);
  }, [fees]);

  // Student Fee Data Sync (New Engine)
  useEffect(() => {
    if (!isSyncComplete.current) return;
    const currentStr = JSON.stringify(feeStudents);
    if (currentStr === prevFeeStudents.current) return;

    const current = feeStudents;
    const prevArr: StudentFeeData[] = prevFeeStudents.current ? JSON.parse(prevFeeStudents.current) : [];

    current.forEach((item) => {
      const matched = prevArr.find(v => v.id === item.id);
      if (!matched || JSON.stringify(matched) !== JSON.stringify(item)) {
        queueBatchWrite("fee_data", String(item.id), item);
      }
    });

    prevArr.forEach((item) => {
      if (!current.some(p => p.id === item.id)) {
        queueBatchDelete("fee_data", String(item.id));
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
            otherFunds: [],
            dues: []
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
        sbQueueWrite("app_settings", "global", appSettings);
        await flushSupabase();
        prevAppSettings.current = currentStr;
        safeStorage.setItem('acadamis_app_settings', currentStr);
      } catch (e) {
        console.error("Supabase Settings Sync Error:", e);
      }
    };

    sync();
  }, [appSettings]);

  // --- NOTIFICATIONS: naye items par tone/vibration (sirf doosri device se aayi notifications) ---
  const playToneForNewNotifications = useCallback((items: PortalNotification[]) => {
    const mine = getDeviceId();
    const fresh = (items || []).filter(n => n?.origin !== mine);
    if (fresh.length === 0) return;
    const myClassId = userSession?.role === 'student'
      ? students.find(s => String(s.id) === String(userSession?.id))?.classId
      : undefined;
    const visible = filterNotificationsForUser(fresh, {
      role: userSession?.role,
      userId: userSession?.id,
      teacherId: userSession?.role === 'teacher' ? userSession?.id : undefined,
      classId: myClassId,
    });
    if (visible.length === 0) return;
    if (toneEnabledFor(appSettings.notifySound !== false)) {
      const isBell = visible.some(n => n.sound === 'bell' || n.type === 'period_bell');
      if (isBell) playBellTone();
      else playNotifyTone();
    }
    vibrateDevice();
  }, [userSession, students, appSettings.notifySound]);

  useEffect(() => {
    playToneForNewNotificationsRef.current = playToneForNewNotifications;
  }, [playToneForNewNotifications]);

  // Ek dafa audio unlock (browser autoplay policy) + cloud se notifications ka pehla merge
  useEffect(() => {
    unlockAudioOnFirstGesture();
  }, []);

  // --- BOOT SPLASH — initial sync complete hone par (ya safety timeout) ghayab ---
  // App render peeche chalta rehta hai (overlay style), is liye kisi feature mein
  // dakhal nahi daalta — sirf fresh data ke saath smooth intro deta hai.
  useEffect(() => {
    if (syncReady) {
      const t = setTimeout(() => setShowSplash(false), 400);
      return () => clearTimeout(t);
    }
  }, [syncReady]);

  // Safety: net bahut slow / hang ho to bhi splash 6s baad khud hat jaye (app phir bhi khule).
  useEffect(() => {
    const t = setTimeout(() => setShowSplash(false), 6000);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    if (!syncReady) return;
    let cancelled = false;
    startNotificationSync()
      .then(res => {
        if (!cancelled && res.added.length > 0) playToneForNewNotifications(res.added);
      })
      .catch(() => { /* offline — local cache chalta rahega */ });
    return () => { cancelled = true; };
  }, [syncReady, playToneForNewNotifications]);

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
          otherFunds: [],
          dues: []
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

  // --- LOCALSTORAGE CACHING (DEBOUNCED) ---
  // Writes are deferred 400ms so rapid typing/editing doesn't block the UI
  // with synchronous localStorage writes on every keystroke.
  const cacheTimer = useRef<any>(null);

  useEffect(() => {
    if (cacheTimer.current) clearTimeout(cacheTimer.current);
    cacheTimer.current = setTimeout(() => {
      safeStorage.setItem('acadamis_teachers', JSON.stringify(teachers));
      safeStorage.setItem('acadamis_classes', JSON.stringify(classes));
      safeStorage.setItem('acadamis_students', JSON.stringify(students));
      safeStorage.setItem('acadamis_timetable', JSON.stringify(timetable));
      safeStorage.setItem('acadamis_attendance', JSON.stringify(attendance));
      safeStorage.setItem('acadamis_marks', JSON.stringify(marks));
      safeStorage.setItem('acadamis_fees', JSON.stringify(fees));
    }, 400);

    return () => {
      if (cacheTimer.current) clearTimeout(cacheTimer.current);
    };
  }, [teachers, classes, students, timetable, attendance, marks, fees]);

  useEffect(() => {
    if (userSession) {
      safeStorage.setItem('acadamis_session', JSON.stringify(userSession));
    } else {
      safeStorage.removeItem('acadamis_session');
    }
  }, [userSession]);

  // --- FORCE SYNC — manual full upload to Supabase ---
  const pushLocalToCloud = useCallback(async () => {
    if (!userSession) return;

    try {
      console.log("Pushing local data to Supabase...");

      const uploadConfig: { col: string; data: any[] | any; type: 'list' | 'object'; docId?: string }[] = [
        { col: 'teachers', data: teachers, type: 'list' },
        { col: 'classes', data: classes, type: 'list' },
        { col: 'students', data: students, type: 'list' },
        { col: 'timetable', data: timetable, type: 'list' },
        { col: 'attendance', data: attendance, type: 'list' },
        { col: 'marks', data: marks, type: 'list' },
        { col: 'fees', data: fees, type: 'list' },
        { col: 'coordinators', data: coordinators, type: 'list' },
        { col: 'fee_data', data: feeStudents, type: 'list' },
        { col: 'app_settings', data: appSettings, type: 'object', docId: 'global' }
      ];

      for (const item of uploadConfig) {
        if (item.type === 'list' && Array.isArray(item.data)) {
          const listItems = item.data;
          for (const listItem of listItems) {
            if (listItem && listItem.id) {
              sbQueueWrite(item.col, String(listItem.id), listItem);
            }
          }
        } else if (item.type === 'object' && item.docId) {
          sbQueueWrite(item.col, item.docId, item.data);
        }
      }
      const ok = await flushSupabase();
      if (!ok) throw new Error("Supabase flush failed");

      console.log("Push to Supabase complete");
    } catch (err) {
      console.warn("Push to Supabase failed:", err);
      // Rethrow so callers (e.g. the Force Sync button) can surface the failure
      throw err;
    }
  }, [userSession, teachers, classes, students, timetable, attendance, marks, fees, coordinators, feeStudents, appSettings]);

  // Push interval removed — see note above pushLocalToCloud (quota fix).


  // --- ACTIONS ---
  const handleLogin = (session: UserSession) => {
    // CHOKE POINT: developer ne is role ka login band kiya ho to session set hi na karo.
    const blocked = getRoleLoginBlockMessage(appSettings, session.role);
    if (blocked) {
      toast.error(blocked);
      return;
    }
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

      {/* Boot loading splash (school logo + spinner) — initial sync ke doran */}
      {showSplash && <SplashScreen />}

      {/* Developer (admin) ki full-screen broadcast — sirf target role ko, ek dafa */}
      {userSession && (
        <BroadcastOverlay userSession={userSession} broadcast={appSettings.broadcast || null} />
      )}

      {/* Offline / cloud sync health banner */}
      {(!isOnline || syncError) && (
        <div className="fixed top-2 left-1/2 -translate-x-1/2 z-[10000] bg-amber-500 text-white text-[10px] font-black uppercase tracking-wider px-4 py-2 rounded-full shadow-lg print:hidden max-w-[90vw] truncate flex items-center gap-2">
          {!isOnline ? 'Offline — data saved locally' : `Cloud sync issue: ${syncError} — data saved locally`}
          {pendingCount > 0 && ` · ${pendingCount} pending`}
          {syncPaused && (
            <button
              onClick={() => { retryDelay.current = 5000; setSyncPaused(false); runSync(); }}
              className="px-2 py-0.5 bg-white text-amber-700 rounded-full text-[9px] font-black uppercase hover:bg-amber-100 transition-colors cursor-pointer shrink-0"
            >
              Retry Now
            </button>
          )}
        </div>
      )}

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
            portalNotice={getPortalBlockMessage(appSettings)}
            appSettings={appSettings}
          />
        )
      ) : userSession.role === 'developer' ? (
        <DeveloperDashboard
          userSession={userSession}
          appSettings={appSettings}
          setAppSettings={setAppSettings}
          onLogout={handleLogout}
        />
      ) : (getPortalBlockMessage(appSettings) || getRoleLoginBlockMessage(appSettings, userSession.role)) ? (
        // ===== Portal OFF / Subscription expired / Role login band → non-developer users blocked =====
        <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-6">
          <div className="max-w-md w-full border border-rose-500/40 bg-rose-950/30 p-8 space-y-5 text-center">
            <div className="w-16 h-16 bg-rose-600/20 border border-rose-500/50 rounded-2xl mx-auto flex items-center justify-center">
              <Shield size={30} className="text-rose-400" />
            </div>
            <h1 className="text-lg font-black uppercase tracking-widest text-rose-300">
              {getPortalBlockMessage(appSettings) ? 'Portal Offline' : 'Login Disabled'}
            </h1>
            <p className="text-sm text-slate-300 leading-relaxed">
              {getPortalBlockMessage(appSettings) || getRoleLoginBlockMessage(appSettings, userSession.role)}
            </p>
            <button
              onClick={handleLogout}
              className="w-full py-3 bg-rose-600 hover:bg-rose-500 text-xs font-black uppercase tracking-widest"
            >
              Logout
            </button>
          </div>
        </div>
      ) : (userSession.role === 'principal' || userSession.role === 'coordinator') ? (
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
          assignments={assignments}
          setAssignments={setAssignments}
          onLogout={handleLogout}
          installPromptEvent={installPromptEvent}
          onInstallApp={handleInstallClick}
          pushLocalToCloud={pushLocalToCloud}
        />
      ) : userSession.role === 'teacher' ? (
        <TeacherDashboard
          userSession={userSession}
          teachers={teachers}
          setTeachers={setTeachers}
          students={students}
          setStudents={setStudents}
          classes={classes}
          setClasses={setClasses}
          timetable={timetable}
          setTimetable={setTimetable}
          attendance={attendance}
          setAttendance={setAttendance}
          marks={marks}
          setMarks={setMarks}
          fees={fees}
          setFees={setFees}
          assignments={assignments}
          setAssignments={setAssignments}
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
          setClasses={setClasses}
          timetable={timetable}
          setTimetable={setTimetable}
          attendance={attendance}
          setAttendance={setAttendance}
          marks={marks}
          setMarks={setMarks}
          fees={fees}
          setFees={setFees}
          assignments={assignments}
          setAssignments={setAssignments}
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
          portalNotice={getPortalBlockMessage(appSettings)}
          appSettings={appSettings}
        />
      )}
    </div>
  );
}
