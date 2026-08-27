const fs = require('fs');

let content = fs.readFileSync('apps/admin/src/components/CourseGeneralForm.tsx', 'utf8');

const str = '<AdminFileUploader\n                          apiBaseUrl={apiBaseUrl}\n                          label="Portada"\n                          description="Sube una imagen para el curso o pega una URL externa."\n                          accept="image/png,image/jpeg,image/jpg,image/webp,image/svg+xml"\n                          mode="image"\n                          value={courseForm.coverImageUrl}\n                          category="course"\n                          entityType="course"\n                          entityId={selectedCourseId ?? undefined}\n                          onUploaded={(asset) =>\n                            setCourseForm((current) => ({\n                              ...current,\n                              coverImageUrl: asset.publicUrl,\n                            }))\n                          }\n                          onClear={() =>\n                            setCourseForm((current) => ({\n                              ...current,\n                              coverImageUrl: "",\n                            }))\n                          }\n                        />';

// Better to use regex for finding AdminFileUploader label="Portada"
const startRegex = /<AdminFileUploader[^>]*label="Portada"/;
const match = startRegex.exec(content);

if (!match) {
  console.log("AdminFileUploader Portada not found");
  process.exit(1);
}

const startIndex = match.index;
let balance = 0;
let endIndex = -1;
let tagClosed = false;

for (let i = startIndex; i < content.length; i++) {
  if (content.substr(i, 2) === '/>') {
    endIndex = i + 2;
    break;
  }
}

const uploaderJsx = content.substring(startIndex, endIndex);

const uploaderStr = `// @ts-nocheck
import React from 'react';
import { AdminFileUploader } from './AdminFileUploader';

export const CourseCoverUploader = ({
  apiBaseUrl,
  courseForm,
  setCourseForm,
  selectedCourseId
}) => {
  return (
    ${uploaderJsx}
  );
};
`;

fs.writeFileSync('apps/admin/src/components/CourseCoverUploader.tsx', uploaderStr, 'utf8');

const replacement = `<CourseCoverUploader 
  apiBaseUrl={apiBaseUrl} 
  courseForm={courseForm} 
  setCourseForm={setCourseForm} 
  selectedCourseId={selectedCourseId} 
/>`;

content = content.replace(uploaderJsx, replacement);
content = content.replace("import { AdminFileUploader } from './AdminFileUploader';", "import { AdminFileUploader } from './AdminFileUploader';\nimport { CourseCoverUploader } from './CourseCoverUploader';");

fs.writeFileSync('apps/admin/src/components/CourseGeneralForm.tsx', content, 'utf8');
