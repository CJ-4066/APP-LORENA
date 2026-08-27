const fs = require('fs');

let content = fs.readFileSync('apps/admin/src/components/CurriculumEditor.tsx', 'utf8');

const regex = /<form[^>]*onSubmit=\{\(event\) => void handleSaveCourseModule\(event\)\}[^>]*>/;
const match = regex.exec(content);

if (!match) {
  console.log("Module form not found");
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

export const ModuleEditor = ({
  handleSaveCourseModule,
  courseModuleForm,
  setCourseModuleForm,
  selectedCourseModuleId
}) => {
  return (
    ${formJsx}
  );
};
`;

fs.writeFileSync('apps/admin/src/components/ModuleEditor.tsx', editorStr, 'utf8');

const replacement = `<ModuleEditor 
  handleSaveCourseModule={handleSaveCourseModule}
  courseModuleForm={courseModuleForm}
  setCourseModuleForm={setCourseModuleForm}
  selectedCourseModuleId={selectedCourseModuleId}
/>`;

content = content.replace(formJsx, replacement);
content = content.replace("import { ActionIcon } from '../App';", "import { ActionIcon } from '../App';\nimport { ModuleEditor } from './ModuleEditor';");

fs.writeFileSync('apps/admin/src/components/CurriculumEditor.tsx', content, 'utf8');
