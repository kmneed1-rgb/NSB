const fs = require('fs');
let file = fs.readFileSync('src/components/TeacherDashboard.tsx', 'utf-8');

const targetMenu = "{ id: 'fees', label: 'Finances', icon: CreditCard },";
file = file.replace(targetMenu, "");

const start = file.indexOf("{/* ========== CLASS FEES TRACKER ========== */}");
const end = file.indexOf("{/* ========== SETTINGS TAB (CHANGE ID/PASSWORD) ========== */}");

if (start !== -1 && end !== -1) {
  file = file.substring(0, start) + file.substring(end);
}

fs.writeFileSync('src/components/TeacherDashboard.tsx', file);
