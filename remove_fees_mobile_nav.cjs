const fs = require('fs');
let file = fs.readFileSync('src/components/TeacherDashboard.tsx', 'utf-8');

const mobileMenuRegex = /<button[^>]+id="mobile-nav-fees"[^>]*>[\s\S]*?<\/button>/m;
file = file.replace(mobileMenuRegex, "");

const dashboardTileRegex = /<div \s*onClick=\{\(\) => \{\s*setActiveTab\('fees'\);\s*\}\}[\s\S]*?<CreditCard size=\{18\} \/>[\s\S]*?<\/div>\s*<\/div>\s*<\/div>/m;
file = file.replace(dashboardTileRegex, "");

fs.writeFileSync('src/components/TeacherDashboard.tsx', file);
