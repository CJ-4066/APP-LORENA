const fs = require('fs');

let content = fs.readFileSync('apps/admin/src/components/CurriculumEditor.tsx', 'utf8');

content = content.replace('{courseDrawerTab === "modules" ? (', '');
content = content.replace(/ \) : null\}$/, '');

content = content.replace('return (', 'if (courseDrawerTab !== "modules") return null;\n  return (');

fs.writeFileSync('apps/admin/src/components/CurriculumEditor.tsx', content, 'utf8');
