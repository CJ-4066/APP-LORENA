const fs = require('fs');

let content = fs.readFileSync('apps/admin/src/App.tsx', 'utf8');

const replacement = `<CourseWorkspace
        formatAuditFieldLabel={formatAuditFieldLabel}
        formatDate={formatDate}
        getCourseAuditActionLabel={getCourseAuditActionLabel}
        getCourseAuditElementLabel={getCourseAuditElementLabel}
        summarizeAuditValue={summarizeAuditValue}`;

content = content.replace('<CourseWorkspace', replacement);

fs.writeFileSync('apps/admin/src/App.tsx', content, 'utf8');
