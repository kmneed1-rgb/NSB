// One-off diagnostic: checks Firestore read/write health for this project.
// Safe to delete afterwards. Run: npx tsx check-firestore.ts
import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs, doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import firebaseConfig from "./firebase-applet-config.json";

const app = initializeApp(firebaseConfig);
const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);

const COLLECTIONS = ['students', 'teachers', 'classes', 'attendance', 'marks', 'fees', 'coordinators', 'fee_data', 'assignments', 'timetable'];

async function main() {
  console.log('--- FIRESTORE READ CHECK ---');
  for (const col of COLLECTIONS) {
    try {
      const snap = await getDocs(collection(db, col));
      const latest = snap.docs.reduce((acc, d) => {
        const rt: any = (d as any).readTime;
        return rt && (!acc || rt > acc) ? rt : acc;
      }, undefined as any);
      console.log(`${col.padEnd(13)} docs=${String(snap.size).padEnd(4)} latestReadTime=${latest ?? 'n/a'}`);
    } catch (err: any) {
      console.log(`${col.padEnd(13)} READ FAILED: ${err?.code || ''} ${err?.message}`);
    }
  }

  try {
    const s = await getDoc(doc(db, 'app_settings', 'global'));
    console.log(`app_settings/global exists=${s.exists()} updateTime=${(s as any).updateTime ?? 'n/a'}`);
  } catch (err: any) {
    console.log(`app_settings/global READ FAILED: ${err?.code || ''} ${err?.message}`);
  }

  // Freshness check: fetch one student doc and show its last write time
  try {
    const snap = await getDocs(collection(db, 'students'));
    const first = snap.docs[0];
    if (first) {
      const fresh = await getDoc(doc(db, 'students', first.id));
      console.log(`sample student doc: id=${first.id} updateTime=${(fresh as any).updateTime ?? 'n/a'}`);
      console.log(`(current UTC time: ${new Date().toISOString()})`);
    }
  } catch (err: any) {
    console.log(`freshness check FAILED: ${err?.code || ''} ${err?.message}`);
  }

  console.log('--- FIRESTORE WRITE TEST (test/connection) ---');
  try {
    await setDoc(doc(db, 'test', 'connection'), { ping: serverTimestamp(), note: 'diagnostic write' });
    console.log('WRITE OK — Firestore is accepting writes ✅');
  } catch (err: any) {
    console.log(`WRITE FAILED: ${err?.code || ''} ${err?.message} ❌`);
  }
}

main().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
