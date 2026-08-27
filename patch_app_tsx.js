const fs = require('fs');
const path = require('path');
const filePath = path.join(__dirname, 'apps/admin/src/App.tsx');
let content = fs.readFileSync(filePath, 'utf8');

content = content.replace(
/        format: string;\n        durationMinutes: number;/g,
'        format: string;\n        mediaType?: string;\n        mimeType?: string | null;\n        durationMinutes: number;'
);

content = content.replace(
/    kind: string;\n    description: string;/g,
'    kind: string;\n    mediaType?: string;\n    mimeType?: string | null;\n    description: string;'
);

fs.writeFileSync(filePath, content, 'utf8');
