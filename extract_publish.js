const fs = require('fs');

let content = fs.readFileSync('apps/admin/src/components/CourseWorkspace.tsx', 'utf8');

const regex = /\{courseDrawerTab === "publication" \? \(/;
const match = regex.exec(content);

if (!match) {
  console.log("Publication tab not found");
  process.exit(1);
}

const startIndex = match.index;
let endIndex = content.indexOf(') : null}', startIndex) + 9;

const formJsxInner = content.substring(startIndex, endIndex);

const publishStr = `// @ts-nocheck
import React from 'react';

export const PublishPanel = ({
  courseDrawerTab,
  selectedCourse,
  handlePublishCourse
}) => {
  if (courseDrawerTab !== "publication") return null;
  return (
    ${formJsxInner.replace('{courseDrawerTab === "publication" ? (', '').replace(/\) : null\}\s*$/, '')}
  );
};
`;

fs.writeFileSync('apps/admin/src/components/PublishPanel.tsx', publishStr, 'utf8');

const replacement = `<PublishPanel
  courseDrawerTab={courseDrawerTab}
  selectedCourse={selectedCourse}
  handlePublishCourse={handlePublishCourse}
/>`;

content = content.replace(formJsxInner, replacement);
content = content.replace("import { LessonEditor } from './LessonEditor';", "import { LessonEditor } from './LessonEditor';\nimport { PublishPanel } from './PublishPanel';");

fs.writeFileSync('apps/admin/src/components/CourseWorkspace.tsx', content, 'utf8');
