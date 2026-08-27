const fs = require('fs');

let appContent = fs.readFileSync('apps/admin/src/App.tsx', 'utf8');

// Export types if they aren't
appContent = appContent.replace(/type CourseWorkspaceTab =/g, 'export type CourseWorkspaceTab =');
appContent = appContent.replace(/interface AdminCourse /g, 'export interface AdminCourse ');
appContent = appContent.replace(/interface AdminCourseModule /g, 'export interface AdminCourseModule ');
appContent = appContent.replace(/interface AdminCourseLesson /g, 'export interface AdminCourseLesson ');
appContent = appContent.replace(/interface AdminCourseResource /g, 'export interface AdminCourseResource ');
appContent = appContent.replace(/interface AdminLibraryPdf /g, 'export interface AdminLibraryPdf ');
appContent = appContent.replace(/interface CourseAuditLogEntry /g, 'export interface CourseAuditLogEntry ');
appContent = appContent.replace('type ActionIconName =', 'export type ActionIconName =');
appContent = appContent.replace('function ActionIcon({ name }', 'export function ActionIcon({ name }');

fs.writeFileSync('apps/admin/src/App.tsx', appContent, 'utf8');
