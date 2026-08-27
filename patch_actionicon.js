const fs = require('fs');
let appContent = fs.readFileSync('apps/admin/src/App.tsx', 'utf8');

appContent = appContent.replace('type ActionIconName =', 'export type ActionIconName =');
appContent = appContent.replace('function ActionIcon({ name }', 'export function ActionIcon({ name }');

fs.writeFileSync('apps/admin/src/App.tsx', appContent, 'utf8');
