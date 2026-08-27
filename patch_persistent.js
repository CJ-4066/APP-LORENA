const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'apps/api/src/data/persistent-store.ts');
let content = fs.readFileSync(filePath, 'utf8');

// Add import
if (!content.includes('normalizeMediaType')) {
  content = content.replace(
    'import { getAppEnv } from "../infrastructure/env.js";',
    'import { getAppEnv } from "../infrastructure/env.js";\nimport { normalizeMediaType } from "./media-type.js";'
  );
}

// Replace normalizeCourseResourceKind
content = content.replace(
/function normalizeCourseResourceKind\([\s\S]*?\n\}/m,
`function normalizeCourseResourceKind(kind: string, url: string): string {
  return normalizeMediaType(kind, url, null);
}`
);

// We need to make sure course lessons get mediaType and mimeType
content = content.replace(
  /format: normalizeCourseResourceKind\(resource\.kind, resource\.url\),/g,
  'format: normalizeCourseResourceKind(resource.kind, resource.url),\n    mediaType: normalizeMediaType(resource.kind, resource.url, null),'
);

// We also need to map the DB results to have mediaType and mimeType
// Inside mapCourseLessonRow (if it exists, wait, course_lessons are part of CourseRow? No, they are joined or fetched separately? Let's check how courses are fetched.)
fs.writeFileSync(filePath, content, 'utf8');
