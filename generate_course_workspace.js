const fs = require('fs');
const jsx = fs.readFileSync('temp_course_workspace.tsx', 'utf8');

// Strip the opening `{isCourseDrawerOpen ? (` and closing `) : null}`
const innerJsx = jsx.replace(/^\{isCourseDrawerOpen \? \(\n?/, '').replace(/\n?\) : null\}$/, '');

const componentStr = `
import React from 'react';

// We will add imports and props later based on tsc output.
export const CourseWorkspace: React.FC<any> = (props) => {
  return (
    ${innerJsx}
  );
};
`;

fs.writeFileSync('apps/admin/src/components/CourseWorkspace.tsx', componentStr, 'utf8');
