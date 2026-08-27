const fs = require('fs');
let appContent = fs.readFileSync('apps/admin/src/App.tsx', 'utf8');

if (!appContent.includes('import { CourseWorkspace }')) {
  appContent = appContent.replace(
    'import { AdminFileUploader } from "./components/AdminFileUploader";',
    'import { AdminFileUploader } from "./components/AdminFileUploader";\nimport { CourseWorkspace } from "./components/CourseWorkspace";'
  );
}

fs.writeFileSync('apps/admin/src/App.tsx', appContent, 'utf8');
