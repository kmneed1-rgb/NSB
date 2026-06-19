const fs = require('fs');
let file = fs.readFileSync('src/components/TeacherDashboard.tsx', 'utf-8');

const regex1 = /<div \s*onClick=\{\(\) => \{\s*setActiveTab\('fees'\);\s*\}\}[\s\S]*?<CreditCard size=\{18\} \/>[\s\S]*?<\/div>\s*<\/div>/m;
file = file.replace(regex1, "");

const regex2 = /\{\/\* HIGH-LIGHTED FEE PAYMENT\/LEDGER BUTTON \*\/\}\s*<button\s*id="mobile-nav-fees"[\s\S]*?<\/button>/m;
file = file.replace(regex2, "");

if (file.includes('id="mobile-nav-fees"')) {
   console.log("MOBILE NAV STILL THERE");
} else {
   console.log("MOBILE NAV GONE");
}

fs.writeFileSync('src/components/TeacherDashboard.tsx', file);
