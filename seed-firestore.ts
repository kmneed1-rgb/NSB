import { initializeApp } from "firebase/app";
import { getFirestore, collection, doc, setDoc, writeBatch } from "firebase/firestore";
import firebaseConfig from "./firebase-applet-config.json";
import { 
  INITIAL_TEACHERS, 
  INITIAL_CLASSES, 
  INITIAL_STUDENTS, 
  INITIAL_TIMETABLE, 
  INITIAL_ATTENDANCE, 
  INITIAL_MARKS,
  INITIAL_FEES
} from "./src/initialData";

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

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

async function seedCollection<T extends { id: string }>(colName: string, items: T[]) {
  console.log(`Seeding ${colName} with ${items.length} documents...`);
  const batch = writeBatch(db);
  let count = 0;
  
  for (const item of items) {
    const ref = doc(db, colName, item.id);
    batch.set(ref, sanitizeForFirestore(item));
    count++;
    
    if (count >= 450) {
      await batch.commit();
      console.log(`  Committed batch of ${count} documents`);
      count = 0;
    }
  }
  
  if (count > 0) {
    await batch.commit();
    console.log(`  Committed final batch of ${count} documents`);
  }
  
  console.log(`✅ ${colName} seeded successfully!`);
}

async function seedAll() {
  try {
    console.log("🚀 Starting Firestore seeding...\n");
    
    await seedCollection("teachers", INITIAL_TEACHERS);
    await seedCollection("classes", INITIAL_CLASSES);
    await seedCollection("students", INITIAL_STUDENTS);
    await seedCollection("timetable", INITIAL_TIMETABLE);
    await seedCollection("attendance", INITIAL_ATTENDANCE);
    await seedCollection("marks", INITIAL_MARKS);
    await seedCollection("fees", INITIAL_FEES);
    
    // Seed fee_data (student fee ledger)
    const feeStudents = INITIAL_STUDENTS.map(s => ({
      id: s.id,
      name: s.name,
      class: s.classId === 'c1' ? 'Grade 10 A' : 
             s.classId === 'c2' ? 'Grade 11 B' :
             s.classId === 'c3' ? 'Grade 10 B' : 'Grade 11 A',
      monthlyFee: s.baseFee || (s.classId?.startsWith('c1') || s.classId?.startsWith('c3') ? 2500 : 3000),
      enrollmentMonth: s.enrollmentMonth || 'April',
      payments: [],
      otherFunds: [],
      dues: []
    }));
    await seedCollection("fee_data", feeStudents);
    
    // Seed app_settings
    const settingsRef = doc(db, "app_settings", "global");
    await setDoc(settingsRef, {
      absentTemplate: "Greetings, Respected Parent! We noticed that your child {student_name} (Roll: {roll_number}) has been marked ABSENT on date {date}. Kindly clarify the reason or contact the school office. Principal.",
      feeTemplate: "Dear parent, your child {name}'s fee for {month} is {amount} which is due on {date}. NSB 1 Academy.",
      resultTemplate: "Greetings, Respected Parent! Result of {student_name} (Roll: {roll_number}, {class_name}) for {exam_name}:\n{subjects}\nTotal: {total_obtained}/{total_max} ({percentage}%). Status: {status}.\n- NSB 1 Academy.",
      whatsAppAutoFee: true,
      whatsAppAutoAbsence: true,
      whatsAppAutoResult: false,
      autoWhatsAppRedirect: true,
      extraPeriods: {},
      deletedPeriods: {},
      periodColors: {}
    });
    console.log("✅ app_settings seeded successfully!");
    
    console.log("\n🎉 All collections seeded successfully!");
    console.log("You can now run the app: npm run dev");
  } catch (error) {
    console.error("❌ Seeding failed:", error);
  }
}

seedAll();