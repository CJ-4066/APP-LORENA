const fs = require('fs');
let content = fs.readFileSync('apps/admin/src/components/CourseGeneralForm.tsx', 'utf8');

content = content.replace("import { AdminFileUploader } from './AdminFileUploader';", "import { AdminFileUploader } from './AdminFileUploader';\nimport { useAutosave } from '../hooks/useCourseEditor';");

const autosaveHook = `
  const { saveStatus } = useAutosave(courseForm, 1500, () => {
    if (savingCourseId === null) {
       handleSaveCourse();
    }
  });
`;

content = content.replace("return (", autosaveHook + "\n  return (");

// Add visual saveStatus near the submit button
const buttonRegex = /<button type="submit" className="primary-button" disabled=\{savingCourseId !== null\}>[\s\S]*?<\/button>/;
const buttonMatch = buttonRegex.exec(content);

if (buttonMatch) {
  const newButton = `<div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
    ${buttonMatch[0]}
    {saveStatus === 'saving' && <span className="text-secondary">Guardando...</span>}
    {saveStatus === 'saved' && <span className="text-success">Guardado</span>}
    {saveStatus === 'error' && <span className="text-error">Error al guardar</span>}
  </div>`;
  content = content.replace(buttonMatch[0], newButton);
}

fs.writeFileSync('apps/admin/src/components/CourseGeneralForm.tsx', content, 'utf8');
