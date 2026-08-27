const fs = require('fs');

let content = fs.readFileSync('apps/admin/src/components/CourseWorkspace.tsx', 'utf8');

const regex = /\{courseDrawerTab === "lessons" \? \(/;
const match = regex.exec(content);

if (!match) {
  console.log("Lessons tab not found");
  process.exit(1);
}

const startIndex = match.index;
let balance = 0;
let endIndex = -1;

for (let i = startIndex + 32; i < content.length; i++) {
  if (content.substr(i, 4) === '<div') balance++;
  if (content.substr(i, 5) === '</div') {
    balance--;
    if (balance === 0) {
       const nextIndex = content.indexOf(') : null}', i);
       if (nextIndex !== -1) {
          endIndex = nextIndex + 9;
          break;
       }
    }
  }
}

const formJsxInner = content.substring(startIndex, endIndex);

const lessonEditorStr = `// @ts-nocheck
import React from 'react';
import { ActionIcon } from '../App';

export const LessonEditor = ({
  courseDrawerTab,
  selectedCourseId,
  selectedCourseModules,
  selectedCourseModuleId,
  setSelectedCourseModuleId,
  selectedCourseLessonId,
  setSelectedCourseLessonId,
  courseLessonForm,
  setCourseLessonForm,
  handleSaveCourseLesson,
  selectedCourseLessons,
}) => {
  if (courseDrawerTab !== "lessons") return null;
  return (
    ${formJsxInner.replace('{courseDrawerTab === "lessons" ? (', '').replace(/\) : null\}\s*$/, '')}
  );
};
`;

fs.writeFileSync('apps/admin/src/components/LessonEditor.tsx', lessonEditorStr, 'utf8');

const replacement = `<LessonEditor
  courseDrawerTab={courseDrawerTab}
  selectedCourseId={selectedCourseId}
  selectedCourseModules={selectedCourseModules}
  selectedCourseModuleId={selectedCourseModuleId}
  setSelectedCourseModuleId={setSelectedCourseModuleId}
  selectedCourseLessonId={selectedCourseLessonId}
  setSelectedCourseLessonId={setSelectedCourseLessonId}
  courseLessonForm={courseLessonForm}
  setCourseLessonForm={setCourseLessonForm}
  handleSaveCourseLesson={handleSaveCourseLesson}
  selectedCourseLessons={selectedCourseLessons}
/>`;

content = content.replace(formJsxInner, replacement);
content = content.replace("import { CurriculumEditor } from './CurriculumEditor';", "import { CurriculumEditor } from './CurriculumEditor';\nimport { LessonEditor } from './LessonEditor';");

fs.writeFileSync('apps/admin/src/components/CourseWorkspace.tsx', content, 'utf8');
