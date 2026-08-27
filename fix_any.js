const fs = require('fs');

let content = fs.readFileSync('apps/admin/src/components/CourseWorkspace.tsx', 'utf8');

// A quick and dirty way is to just replace common parameter patterns that TS is complaining about
content = content.replace(/\(current\)/g, '(current: any)');
content = content.replace(/\(prev\)/g, '(prev: any)');
content = content.replace(/\(module\)/g, '(module: any)');
content = content.replace(/\(lesson\)/g, '(lesson: any)');
content = content.replace(/\(resource\)/g, '(resource: any)');
content = content.replace(/\(detail\)/g, '(detail: any)');
content = content.replace(/\(category\)/g, '(category: any)');
content = content.replace(/\(course\)/g, '(course: any)');
content = content.replace(/\(pdf\)/g, '(pdf: any)');
content = content.replace(/\(entry\)/g, '(entry: any)');

fs.writeFileSync('apps/admin/src/components/CourseWorkspace.tsx', content, 'utf8');
