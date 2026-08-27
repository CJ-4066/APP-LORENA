const fs = require('fs');
const path = require('path');
const content = fs.readFileSync(path.join(__dirname, 'apps/api/src/data/persistent-store.ts'), 'utf8');

const match = content.match(/function normalizeCourseRecord\([\s\S]*?return normalized;\n\}/);
if (match) {
  console.log(match[0]);
}
