const fs = require('fs');

let content = fs.readFileSync('apps/admin/src/components/CurriculumEditor.tsx', 'utf8');

const regex = /<form[^>]*onSubmit=\{\(event\) => void handleSaveCourseLesson\(event\)\}[^>]*>/;
const match = regex.exec(content);

if (!match) {
  console.log("Lesson form not found");
  process.exit(1);
}

const startIndex = match.index;
let balance = 0;
let endIndex = -1;
for (let i = startIndex; i < content.length; i++) {
  if (content.substr(i, 5) === '<form') balance++;
  if (content.substr(i, 7) === '</form>') {
    balance--;
    if (balance === 0) {
      endIndex = i + 7;
      break;
    }
  }
}

if (endIndex === -1) {
  console.log("End form not found");
  process.exit(1);
}

const formJsx = content.substring(startIndex, endIndex);

const editorStr = `// @ts-nocheck
import React from 'react';

export const LessonEditor = ({
  handleSaveCourseLesson,
  courseLessonForm,
  setCourseLessonForm,
  selectedCourseLessonId
}) => {
  return (
    ${formJsx}
  );
};
`;

fs.writeFileSync('apps/admin/src/components/LessonEditor.tsx', editorStr, 'utf8');

const replacement = `<LessonEditor 
  handleSaveCourseLesson={handleSaveCourseLesson}
  courseLessonForm={courseLessonForm}
  setCourseLessonForm={setCourseLessonForm}
  selectedCourseLessonId={selectedCourseLessonId}
/>`;

content = content.replace(formJsx, replacement);
content = content.replace("import { ModuleEditor } from './ModuleEditor';", "import { ModuleEditor } from './ModuleEditor';\nimport { LessonEditor } from './LessonEditor';");

fs.writeFileSync('apps/admin/src/components/CurriculumEditor.tsx', content, 'utf8');
