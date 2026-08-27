const fs = require('fs');
const path = require('path');
const filePath = path.join(__dirname, 'apps/api/src/data/mock-store.ts');
let content = fs.readFileSync(filePath, 'utf8');

const replacement = `        .map((lesson, lessonIndex) => ({
          ...lesson,
          order: lesson.order ?? lessonIndex + 1,
          status: normalizeCourseStatus(lesson.status),
          isActive: lesson.isActive ?? lesson.status !== courseArchivedStatus,
          mediaType: normalizeMediaType(lesson.format, lesson.resourceUrl, lesson.mimeType),
        }))`;

content = content.replace(
/        \.map\(\(lesson, lessonIndex\) => \(\{\n          \.\.\.lesson,\n          order: lesson\.order \?\? lessonIndex \+ 1,\n          status: normalizeCourseStatus\(lesson\.status\),\n          isActive: lesson\.isActive \?\? lesson\.status !== courseArchivedStatus,\n        \}\)\)/g,
replacement
);

fs.writeFileSync(filePath, content, 'utf8');
