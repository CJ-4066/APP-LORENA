const fs = require('fs');
const path = require('path');

const appTsxPath = path.join(__dirname, 'apps/admin/src/App.tsx');
let content = fs.readFileSync(appTsxPath, 'utf8');

// The block starts around 12737: `{isCourseDrawerOpen ? (`
// Let's find the exact indices.
const startToken = '{isCourseDrawerOpen ? (';
let startIndex = content.indexOf(startToken);
if (startIndex === -1) {
  // Maybe it's changed? Let's check the line.
  console.log("Could not find start token");
  process.exit(1);
}

// Find the matching closing brace/parenthesis for the ternary.
// Or we can just find the end of the `isCourseDrawerOpen ? (...) : null` block.
let balance = 0;
let endIndex = -1;
for (let i = startIndex; i < content.length; i++) {
  if (content[i] === '(') balance++;
  if (content[i] === ')') {
    balance--;
    if (balance === 0) {
       // We matched the `(` after `?`. Let's see if the next characters are ` : null}`
       const nextStr = content.substring(i + 1, i + 20).trim();
       if (nextStr.startsWith(': null}')) {
         endIndex = i + 1 + content.substring(i + 1).indexOf('}') + 1;
         break;
       }
    }
  }
}

if (endIndex === -1) {
  console.log("Could not find end index");
  process.exit(1);
}

const componentContent = content.substring(startIndex, endIndex);
console.log("Found block of length:", componentContent.length);

// Instead of extracting it completely now, let's just dump the block to a temporary file so I can analyze it.
fs.writeFileSync('temp_course_workspace.tsx', componentContent, 'utf8');
