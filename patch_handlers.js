const fs = require('fs');
let content = fs.readFileSync('apps/admin/src/App.tsx', 'utf8');

content = content.replace(/async \(event: React.FormEvent\) => \{\n\s*event\.preventDefault\(\);/g, 'async (event?: React.FormEvent) => {\n      if (event) event.preventDefault();');

fs.writeFileSync('apps/admin/src/App.tsx', content, 'utf8');
