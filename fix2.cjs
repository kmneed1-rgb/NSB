const fs = require('fs');
let file = fs.readFileSync('src/components/PrincipalDashboard.tsx', 'utf-8');

file = file.replace(/value={tUsername}/g, "value={modalMode === 'add' ? tName : tUsername}");
file = file.replace(/value={sUsername}/g, "value={modalMode === 'add' ? sName : sUsername}");
file = file.replace(/placeholder="ali123"/g, 'placeholder="Same as Name"');

fs.writeFileSync('src/components/PrincipalDashboard.tsx', file);
console.log('Fixed PrincipalDashboard.tsx UI');
