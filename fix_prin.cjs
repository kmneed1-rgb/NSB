const fs = require('fs');
let content = fs.readFileSync('src/components/PrincipalDashboard.tsx', 'utf8');

if (!content.includes("from '../firebase'")) {
    content = content.replace("import {\n  Users,", "import {\n  Users,\n  DownloadCloud,\n  UploadCloud,\n  Database,");
    content = content.replace("import React,", "import { db } from '../firebase';\nimport { collection, getDocs, doc, setDoc } from 'firebase/firestore';\nimport React,");
}
fs.writeFileSync('src/components/PrincipalDashboard.tsx', content);
console.log("Fixed imports");
