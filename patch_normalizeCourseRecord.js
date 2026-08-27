const fs = require('fs');
const path = require('path');
const filePath = path.join(__dirname, 'apps/api/src/data/persistent-store.ts');
let content = fs.readFileSync(filePath, 'utf8');

const replacement = `        .map((lesson, lessonIndex) => ({
          ...lesson,
          order: lesson.order ?? lessonIndex + 1,
          status: normalizeCourseStatus(lesson.status),
          isActive: lesson.isActive ?? lesson.status !== "archived",
          mediaType: normalizeMediaType(lesson.format, lesson.resourceUrl, (lesson as any).mimeType),
        }))`;

content = content.replace(
/        \.map\(\(lesson, lessonIndex\) => \(\{\n          \.\.\.lesson,\n          order: lesson\.order \?\? lessonIndex \+ 1,\n          status: normalizeCourseStatus\(lesson\.status\),\n          isActive: lesson\.isActive \?\? lesson\.status !== "archived",\n        \}\)\)/g,
replacement
);

// We should also patch attachPublishedCourseResources where lessons are updated.
content = content.replace(
  /format: normalizeCourseResourceKind\(resource\.kind, url\),/g,
  'format: normalizeCourseResourceKind(resource.kind, url),\n                mediaType: normalizeMediaType(resource.kind, url, null),'
);

fs.writeFileSync(filePath, content, 'utf8');
