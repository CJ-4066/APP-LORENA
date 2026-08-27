const fs = require('fs');

let content = fs.readFileSync('apps/admin/src/components/CourseWorkspace.tsx', 'utf8');

const regex = /<form[^>]+onSubmit=\{\(event\) => void handleSaveCourse\(event\)\}[^>]*>/;
const match = regex.exec(content);

if (!match) {
  console.log("Form not found");
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

const generalFormStr = `// @ts-nocheck
import React from 'react';
import { AdminFileUploader } from './AdminFileUploader';

export const CourseGeneralForm = ({
  courseForm,
  setCourseForm,
  handleSaveCourse,
  savingCourseId,
  isCreatingCourse,
  handleCloseCourseDrawer,
  apiBaseUrl,
  selectedCourseId
}) => {
  return (
    ${formJsx}
  );
};
`;

fs.writeFileSync('apps/admin/src/components/CourseGeneralForm.tsx', generalFormStr, 'utf8');

const replacement = `<CourseGeneralForm 
  courseForm={courseForm} 
  setCourseForm={setCourseForm} 
  handleSaveCourse={handleSaveCourse} 
  savingCourseId={savingCourseId} 
  isCreatingCourse={isCreatingCourse} 
  handleCloseCourseDrawer={handleCloseCourseDrawer} 
  apiBaseUrl={apiBaseUrl} 
  selectedCourseId={selectedCourseId} 
/>`;

content = content.replace(formJsx, replacement);
content = content.replace("import { AdminFileUploader } from './AdminFileUploader';", "import { AdminFileUploader } from './AdminFileUploader';\nimport { CourseGeneralForm } from './CourseGeneralForm';");

fs.writeFileSync('apps/admin/src/components/CourseWorkspace.tsx', content, 'utf8');
