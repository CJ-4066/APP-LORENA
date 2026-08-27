const fs = require('fs');
let appContent = fs.readFileSync('apps/admin/src/App.tsx', 'utf8');

appContent = appContent.replace(/export export /g, 'export ');

fs.writeFileSync('apps/admin/src/App.tsx', appContent, 'utf8');
