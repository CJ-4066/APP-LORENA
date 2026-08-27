const fs = require('fs');

const missingProps = fs.readFileSync('apps/admin/missing_props.txt', 'utf8').split('\n').filter(Boolean);

let propsInterface = `export interface CourseWorkspaceProps {\n`;
missingProps.forEach(prop => {
  if (prop[0] === prop[0].toUpperCase()) return;
  propsInterface += `  ${prop}: any;\n`;
});
propsInterface += `}\n`;

let componentSignature = `export const CourseWorkspace: React.FC<CourseWorkspaceProps> = ({
${missingProps.filter(p => p[0] !== p[0].toUpperCase()).map(p => `  ${p},`).join('\n')}
}) => {\n`;

const jsx = fs.readFileSync('temp_course_workspace.tsx', 'utf8')
  .replace(/^\{isCourseDrawerOpen \? \(\n?/, '')
  .replace(/\n?\) : null\}$/, '');

const finalFile = `import React from 'react';
import { ActionIcon } from './ActionIcon';
import { AdminFileUploader } from './AdminFileUploader';
import { 
  CourseWorkspaceTab, 
  AdminCourse, 
  AdminCourseModule, 
  AdminCourseLesson, 
  AdminCourseResource, 
  AdminLibraryPdf,
  CourseAuditLogEntry
} from '../App';

${propsInterface}
${componentSignature}
  return (\n    ${jsx}\n  );\n};
`;

fs.writeFileSync('apps/admin/src/components/CourseWorkspace.tsx', finalFile, 'utf8');
