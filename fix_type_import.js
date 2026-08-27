const fs = require('fs');
let content = fs.readFileSync('apps/admin/src/components/CourseWorkspace.tsx', 'utf8');

content = content.replace("import { \n  CourseWorkspaceTab", "import type { \n  CourseWorkspaceTab");

fs.writeFileSync('apps/admin/src/components/CourseWorkspace.tsx', content, 'utf8');
