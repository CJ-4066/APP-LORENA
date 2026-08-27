const fs = require('fs');
let content = fs.readFileSync('apps/admin/src/components/CourseWorkspace.tsx', 'utf8');

content = content.replace("CourseAuditLogEntry\n  ActionIcon", "CourseAuditLogEntry,\n  ActionIcon");

fs.writeFileSync('apps/admin/src/components/CourseWorkspace.tsx', content, 'utf8');
