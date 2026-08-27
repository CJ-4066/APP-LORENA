const fs = require('fs');

let content = fs.readFileSync('apps/admin/src/components/CourseWorkspace.tsx', 'utf8');

const startRegex = /\{courseDrawerTab === "modules" \? \(\n\s*<div className="course-subview-grid course-subview-grid-modules">/;
const match = startRegex.exec(content);

if (!match) {
  console.log("Modules tab not found");
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
       // found the end of the div, let's look for `) : null}`
       const nextIndex = content.indexOf(') : null}', i);
       if (nextIndex !== -1) {
          endIndex = nextIndex + 9;
          break;
       }
    }
  }
}

if (endIndex === -1) {
  console.log("End modules not found");
  process.exit(1);
}

const formJsxInner = content.substring(startIndex, endIndex);

const curriculumStr = `// @ts-nocheck
import React from 'react';
import { ActionIcon } from '../App';

export const CurriculumEditor = ({
  courseDrawerTab,
  selectedCourseId,
  selectedCourseModules,
  selectedCourseModuleId,
  courseModuleForm,
  setCourseModuleForm,
  setSelectedCourseModuleId,
  setSelectedCourseLessonId,
  handleSaveCourseModule,
  courseLessonForm,
  setCourseLessonForm,
  handleSaveCourseLesson,
  selectedCourseLessons,
  selectedCourseLessonId
}) => {
  return (
    ${formJsxInner}
  );
};
`;

fs.writeFileSync('apps/admin/src/components/CurriculumEditor.tsx', curriculumStr, 'utf8');

const replacement = `<CurriculumEditor
  courseDrawerTab={courseDrawerTab}
  selectedCourseId={selectedCourseId}
  selectedCourseModules={selectedCourseModules}
  selectedCourseModuleId={selectedCourseModuleId}
  courseModuleForm={courseModuleForm}
  setCourseModuleForm={setCourseModuleForm}
  setSelectedCourseModuleId={setSelectedCourseModuleId}
  setSelectedCourseLessonId={setSelectedCourseLessonId}
  handleSaveCourseModule={handleSaveCourseModule}
  courseLessonForm={courseLessonForm}
  setCourseLessonForm={setCourseLessonForm}
  handleSaveCourseLesson={handleSaveCourseLesson}
  selectedCourseLessons={selectedCourseLessons}
  selectedCourseLessonId={selectedCourseLessonId}
/>`;

content = content.replace(formJsxInner, replacement);
content = content.replace("import { AdminFileUploader } from './AdminFileUploader';", "import { AdminFileUploader } from './AdminFileUploader';\nimport { CurriculumEditor } from './CurriculumEditor';");

fs.writeFileSync('apps/admin/src/components/CourseWorkspace.tsx', content, 'utf8');
