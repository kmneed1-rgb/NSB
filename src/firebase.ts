import { initializeApp } from "firebase/app";
import { getAnalytics, isSupported } from "firebase/analytics";
import { initializeFirestore, doc, getDocFromServer } from "firebase/firestore";
import { getAuth } from "firebase/auth";

// Your web app's Firebase configuration verified from user's request details
const firebaseConfig = {
  apiKey: "AIzaSyBwOQ-k82MZA8S3hAE29gpqY_5ooe6_3Y0",
  authDomain: "nsb1-64716.firebaseapp.com",
  projectId: "nsb1-64716",
  storageBucket: "nsb1-64716.firebasestorage.app",
  messagingSenderId: "821004745677",
  appId: "1:821004745677:web:0b09d8f7eeb6eb969e6284",
  measurementId: ""
};

// Initialize Firebase App
const app = initializeApp(firebaseConfig);

// Initialize main services with long-polling backup enabled for iframe sandboxes
export const db = initializeFirestore(app, {
  experimentalAutoDetectLongPolling: true,
}, "ai-studio-2dbc5800-6fd1-4ddd-a4ca-dc94aecfd377");
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
