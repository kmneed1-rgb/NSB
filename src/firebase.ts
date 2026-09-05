import { initializeApp } from "firebase/app";
import { getAnalytics, isSupported } from "firebase/analytics";
import { initializeFirestore, doc, getDocFromServer, persistentLocalCache, persistentMultipleTabManager } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import firebaseConfig from "../firebase-applet-config.json";

// Initialize Firebase App
const app = initializeApp(firebaseConfig);

// Initialize main services.
// - Multi-tab persistent cache: lets several portals (Principal/Teacher/Student)
//   stay open in separate tabs/windows at the same time. The old single-tab
//   `enableIndexedDbPersistence` used to fail with "Failed to obtain exclusive
//   access to the persistence layer", which left the second portal's writes
//   stuck locally so they never reached Firestore or the other portal.
// - Auto long-polling: uses WebChannel streaming when possible and falls back
//   to long-polling in restricted (iframe/proxy) environments.
export const db = initializeFirestore(app, {
  localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }),
  experimentalAutoDetectLongPolling: true,
}, firebaseConfig.firestoreDatabaseId);

export const auth = getAuth(app);

// Safe initialization for Analytics (may fail in sandboxed browser testing block)
let analytics: any = null;
if (typeof window !== "undefined" && firebaseConfig.measurementId) {
  isSupported().then((supported) => {
    if (supported) {
      try {
        analytics = getAnalytics(app);
      } catch (error) {
        console.warn("Firebase Analytics could not be initialized in this window context:", error);
      }
    }
  }).catch((error) => {
    console.warn("Firebase Analytics support check failed:", error);
  });
}

export { analytics };

// Connection verification test function
export async function testFirebaseConnection(): Promise<boolean> {
  try {
    // Attempt an offline-safe check by fetching a test document
    await getDocFromServer(doc(db, "test", "connection"));
    return true;
  } catch (error: any) {
    const code: string = error?.code || "";
    const msg: string = error?.message || "";
    // Security rules blocking access — a REAL failure the user must know about.
    if (code === "permission-denied" || /permission/i.test(msg)) {
      console.warn("Firestore rules blocked the connection test:", msg);
      return false;
    }
    if (code === "unavailable" || /offline/i.test(msg)) {
      console.warn("Doc connection offline alert:", msg);
      return false;
    }
    // Any other server response still proves the backend was reached.
    return true;
  }
}
