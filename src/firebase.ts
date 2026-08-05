import { initializeApp } from "firebase/app";
import { getAnalytics, isSupported } from "firebase/analytics";
import { initializeFirestore, doc, getDocFromServer } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import firebaseConfig from "../firebase-applet-config.json";

// Initialize Firebase App
const app = initializeApp(firebaseConfig);

// Initialize main services with aggressive long-polling for iframe environments
export const db = initializeFirestore(app, {
  experimentalForceLongPolling: true,
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
  } catch (error) {
    if (error instanceof Error && error.message.includes("offline")) {
      console.warn("Doc connection offline alert:", error.message);
      return false;
    }
    // Any response, even permission error, indicates successful connection reached
    return true;
  }
}
