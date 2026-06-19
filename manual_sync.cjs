const fs = require('fs');

let content = fs.readFileSync('src/components/PrincipalDashboard.tsx', 'utf8');

// Need to import firebase 
if(!content.includes("import { db }")) {
  content = content.replace("import { Users, User, ShieldAlert,", "import { db } from '../firebase';\nimport { collection, getDocs, doc, setDoc, deleteDoc } from 'firebase/firestore';\nimport { Users, User, ShieldAlert,");
} else if (!content.includes("from 'firebase/firestore'")) {
    content = content.replace("import { db } from '../firebase';", "import { db } from '../firebase';\nimport { collection, getDocs, doc, setDoc, deleteDoc } from 'firebase/firestore';");
}

const syncUI = `
            {/* ========== MANUAL FIREBASE DATA SYNC ========== */}
            <div className="bg-white rounded-none p-8 border border-slate-200 shadow-sm border-t-4 border-t-emerald-600 mt-8 mb-8">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-emerald-50 rounded-none border border-emerald-100">
                  <Database size={24} className="text-emerald-600" />
                </div>
                <div>
                  <h3 className="text-xl font-bold font-sans text-slate-800">Cloud Data Synchronization</h3>
                  <p className="text-sm text-slate-500">Manually push or pull all academic records to/from Firebase</p>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-4">
                <button
                  type="button"
                  onClick={async () => {
                    const confirm = window.confirm("Are you sure you want to download all data from Firebase? This will overwrite your local unsaved data.");
                    if(!confirm) return;
                    
                    toast.info("Downloading data from Cloud...");
                    try {
                      const collections = ['teachers', 'classes', 'students', 'timetable', 'attendance', 'marks', 'fees', 'coordinators'];
                      for (const col of collections) {
                        const snapshot = await getDocs(collection(db, col));
                        const items = [];
                        snapshot.forEach(docSnap => items.push(docSnap.data()));
                        localStorage.setItem('acadamis_' + col, JSON.stringify(items));
                      }
                      toast.success("Successfully downloaded all data from cloud!");
                      setTimeout(() => window.location.reload(), 1500);
                    } catch (error: any) {
                      toast.error("Error downloading data: " + error.message);
                    }
                  }}
                  className="bg-sky-600 hover:bg-sky-700 text-white px-6 py-3 rounded-lg font-bold shadow-md flex-1 text-center flex items-center justify-center gap-2"
                >
                  <Download Cloud size={18} />
                  Download from Firebase
                </button>

                <button
                  type="button"
                  onClick={async () => {
                    const confirm = window.confirm("Are you sure you want to upload all local data to Firebase? This will overwrite current Cloud data.");
                    if(!confirm) return;

                    toast.info("Uploading data to Cloud...");
                    try {
                      const collections = ['teachers', 'classes', 'students', 'timetable', 'attendance', 'marks', 'fees', 'coordinators'];
                      for (const col of collections) {
                        const localData = localStorage.getItem('acadamis_' + col);
                        if (localData) {
                          const items = JSON.parse(localData);
                          for (const item of items) {
                            if(item.id) {
                              await setDoc(doc(db, col, item.id), item);
                            }
                          }
                        }
                      }
                      toast.success("Successfully uploaded all local data to cloud!");
                    } catch (error: any) {
                      toast.error("Error uploading data: " + error.message);
                    }
                  }}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-3 rounded-lg font-bold shadow-md flex-1 text-center flex items-center justify-center gap-2"
                >
                  <UploadCloud size={18} />
                  Upload to Firebase
                </button>
              </div>
            </div>
`;

content = content.replace('{/* Coordinator/Principal Profile Settings (Change Password) */}', syncUI + '\n            {/* Coordinator/Principal Profile Settings (Change Password) */}');
content = content.replace("Settings, LogOut,", "Settings, LogOut, Database, DownloadCloud, UploadCloud,");

fs.writeFileSync('src/components/PrincipalDashboard.tsx', content);
console.log("Done adding manual db sync");
