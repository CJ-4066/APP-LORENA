const fs = require('fs');
const path = require('path');
const filePath = path.join(__dirname, 'apps/api/src/data/mock-store.ts');
let content = fs.readFileSync(filePath, 'utf8');

// Add import
if (!content.includes('normalizeMediaType')) {
  content = content.replace(
    'import { randomUUID } from "node:crypto";',
    'import { randomUUID } from "node:crypto";\nimport { normalizeMediaType } from "./media-type.js";'
  );
}

// Replace format
content = content.replace(
/format: input\.format\?\.trim\(\) \|\| "video",/g,
'format: input.format?.trim() || "video",\n        mediaType: normalizeMediaType(input.format, input.resourceUrl, input.mimeType),\n        mimeType: input.mimeType || undefined,'
);

// also in CreateCourseFromResourceInput
content = content.replace(
  /resourceKind: string;/g,
  'resourceKind: string;\n  mimeType?: string | null;'
);

fs.writeFileSync(filePath, content, 'utf8');
