const fs = require('fs');

let content = fs.readFileSync('apps/admin/src/components/CurriculumEditor.tsx', 'utf8');

content = content.replace(/\) : null\}\n\s*\);\n\};/, ');\n};');

fs.writeFileSync('apps/admin/src/components/CurriculumEditor.tsx', content, 'utf8');
