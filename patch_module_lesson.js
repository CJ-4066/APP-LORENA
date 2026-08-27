const fs = require('fs');

// ModuleEditor
let contentM = fs.readFileSync('apps/admin/src/components/ModuleEditor.tsx', 'utf8');
contentM = contentM.replace("import React from 'react';", "import React from 'react';\nimport { useAutosave } from '../hooks/useCourseEditor';");

const autosaveM = `
  const { saveStatus } = useAutosave(courseModuleForm, 1500, () => {
    if (selectedCourseModuleId && courseModuleForm.title) {
       handleSaveCourseModule();
    }
  });
`;
contentM = contentM.replace("return (", autosaveM + "\n  return (");

const buttonRegexM = /<button type="submit" className="primary-button">[\s\S]*?<\/button>/;
const buttonMatchM = buttonRegexM.exec(contentM);
if (buttonMatchM) {
  const newButtonM = `<div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
    ${buttonMatchM[0]}
    {saveStatus === 'saving' && <span className="text-secondary">Guardando...</span>}
    {saveStatus === 'saved' && <span className="text-success">Guardado</span>}
    {saveStatus === 'error' && <span className="text-error">Error al guardar</span>}
  </div>`;
  contentM = contentM.replace(buttonMatchM[0], newButtonM);
}
fs.writeFileSync('apps/admin/src/components/ModuleEditor.tsx', contentM, 'utf8');

// LessonEditor
let contentL = fs.readFileSync('apps/admin/src/components/LessonEditor.tsx', 'utf8');
contentL = contentL.replace("import React from 'react';", "import React from 'react';\nimport { useAutosave } from '../hooks/useCourseEditor';");

const autosaveL = `
  const { saveStatus } = useAutosave(courseLessonForm, 1500, () => {
    if (selectedCourseLessonId && courseLessonForm.title) {
       handleSaveCourseLesson();
    }
  });
`;
contentL = contentL.replace("return (", autosaveL + "\n  return (");

const buttonRegexL = /<button type="submit" className="primary-button">[\s\S]*?<\/button>/;
const buttonMatchL = buttonRegexL.exec(contentL);
if (buttonMatchL) {
  const newButtonL = `<div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
    ${buttonMatchL[0]}
    {saveStatus === 'saving' && <span className="text-secondary">Guardando...</span>}
    {saveStatus === 'saved' && <span className="text-success">Guardado</span>}
    {saveStatus === 'error' && <span className="text-error">Error al guardar</span>}
  </div>`;
  contentL = contentL.replace(buttonMatchL[0], newButtonL);
}
fs.writeFileSync('apps/admin/src/components/LessonEditor.tsx', contentL, 'utf8');

