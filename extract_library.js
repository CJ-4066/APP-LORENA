const fs = require('fs');

let content = fs.readFileSync('apps/admin/src/components/CourseWorkspace.tsx', 'utf8');

const regex = /\{courseDrawerTab === "library" \? \(/;
const match = regex.exec(content);

if (!match) {
  console.log("Library tab not found");
  process.exit(1);
}

const startIndex = match.index;
// we have to count brackets since it contains <> and </>.
let balance = 0;
let endIndex = -1;

for (let i = startIndex + 32; i < content.length; i++) {
  if (content.substr(i, 2) === '<>') balance++;
  if (content.substr(i, 3) === '</>') {
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

const libStr = `// @ts-nocheck
import React from 'react';
import { ActionIcon } from '../App';
import { AdminFileUploader } from './AdminFileUploader';

export const LessonResourceEditor = ({
  courseDrawerTab,
  libraryBulkNotice,
  setLibraryBulkNotice,
  libraryPdfFile,
  setLibraryPdfFile,
  libraryPdfForm,
  setLibraryPdfForm,
  handleSaveLibraryPdf,
  selectedLibraryPdfId,
  apiBaseUrl,
  selectedLibraryCourse,
  libraryCategorySuggestions,
  selectedCourseId,
  selectedCourse,
  courses,
  libraryPdfs,
  prettifyLibraryFileTitle,
  resetLibraryPdfDraft,
  handleLibraryPdfAction,
  openLibraryPdfEditor,
  handleAutoAttachCourseResource,
  selectedCourseResources,
  courseResourceForm,
  setCourseResourceForm,
  handleSaveCourseResource,
  selectedCourseResourceId,
  setSelectedCourseResourceId
}) => {
  if (courseDrawerTab !== "library") return null;
  return (
    ${formJsxInner.replace('{courseDrawerTab === "library" ? (', '').replace(/\) : null\}\s*$/, '')}
  );
};
`;

fs.writeFileSync('apps/admin/src/components/LessonResourceEditor.tsx', libStr, 'utf8');

const replacement = `<LessonResourceEditor
  courseDrawerTab={courseDrawerTab}
  libraryBulkNotice={libraryBulkNotice}
  setLibraryBulkNotice={setLibraryBulkNotice}
  libraryPdfFile={libraryPdfFile}
  setLibraryPdfFile={setLibraryPdfFile}
  libraryPdfForm={libraryPdfForm}
  setLibraryPdfForm={setLibraryPdfForm}
  handleSaveLibraryPdf={handleSaveLibraryPdf}
  selectedLibraryPdfId={selectedLibraryPdfId}
  apiBaseUrl={apiBaseUrl}
  selectedLibraryCourse={selectedLibraryCourse}
  libraryCategorySuggestions={libraryCategorySuggestions}
  selectedCourseId={selectedCourseId}
  selectedCourse={selectedCourse}
  courses={courses}
  libraryPdfs={libraryPdfs}
  prettifyLibraryFileTitle={prettifyLibraryFileTitle}
  resetLibraryPdfDraft={resetLibraryPdfDraft}
  handleLibraryPdfAction={handleLibraryPdfAction}
  openLibraryPdfEditor={openLibraryPdfEditor}
  handleAutoAttachCourseResource={handleAutoAttachCourseResource}
  selectedCourseResources={selectedCourseResources}
  courseResourceForm={courseResourceForm}
  setCourseResourceForm={setCourseResourceForm}
  handleSaveCourseResource={handleSaveCourseResource}
  selectedCourseResourceId={selectedCourseResourceId}
  setSelectedCourseResourceId={setSelectedCourseResourceId}
/>`;

content = content.replace(formJsxInner, replacement);
content = content.replace("import { PublishPanel } from './PublishPanel';", "import { PublishPanel } from './PublishPanel';\nimport { LessonResourceEditor } from './LessonResourceEditor';");

fs.writeFileSync('apps/admin/src/components/CourseWorkspace.tsx', content, 'utf8');
