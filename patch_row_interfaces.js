const fs = require('fs');
const path = require('path');
const filePath = path.join(__dirname, 'apps/api/src/data/persistent-store.ts');
let content = fs.readFileSync(filePath, 'utf8');

// CourseLessonRow
content = content.replace(
  /format: string;\n  duration_minutes: number;/,
  'format: string;\n  media_type: string | null;\n  mime_type: string | null;\n  duration_minutes: number;'
);

// CourseResourceRecord
content = content.replace(
  /kind: string;\n  description: string;/,
  'kind: string;\n  mediaType?: string;\n  mimeType?: string | null;\n  description: string;'
);

// We need to check if there's a CourseResourceRow
content = content.replace(
  /kind: string;\n  description: string;\n  url: string;/,
  'kind: string;\n  media_type: string | null;\n  mime_type: string | null;\n  description: string;\n  url: string;'
);

// mapCourseRow
content = content.replace(
  /format: lesson\.format,\n          durationMinutes: Number\(lesson\.duration_minutes\),/,
  'format: lesson.format,\n          mediaType: lesson.media_type ?? undefined,\n          mimeType: lesson.mime_type ?? undefined,\n          durationMinutes: Number(lesson.duration_minutes),'
);

fs.writeFileSync(filePath, content, 'utf8');
