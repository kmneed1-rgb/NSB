const fs = require('fs');
let content = fs.readFileSync('src/components/PrincipalDashboard.tsx', 'utf8');

const regex = /import \{ (.*?) \} from 'lucide-react';/s;
const match = content.match(regex);
if (match) {
  let imports = match[1];
  if (!imports.includes('DownloadCloud')) imports += ', DownloadCloud';
  if (!imports.includes('UploadCloud')) imports += ', UploadCloud';
  if (!imports.includes('Database')) imports += ', Database';
  content = content.replace(regex, `import { ${imports} } from 'lucide-react';`);
}

fs.writeFileSync('src/components/PrincipalDashboard.tsx', content);
console.log('Lucide imports updated');
