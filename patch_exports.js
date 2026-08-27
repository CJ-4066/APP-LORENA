const fs = require('fs');
let appContent = fs.readFileSync('apps/admin/src/App.tsx', 'utf8');

appContent = appContent.replace(/type AdminCourse =/g, 'export type AdminCourse =');
appContent = appContent.replace(/type AdminCourseModule =/g, 'export type AdminCourseModule =');
appContent = appContent.replace(/type AdminCourseLesson =/g, 'export type AdminCourseLesson =');
appContent = appContent.replace(/type AdminCourseResource =/g, 'export type AdminCourseResource =');
appContent = appContent.replace(/type AdminLibraryPdf =/g, 'export type AdminLibraryPdf =');
appContent = appContent.replace(/type CourseAuditLogEntry =/g, 'export type CourseAuditLogEntry =');

fs.writeFileSync('apps/admin/src/App.tsx', appContent, 'utf8');
