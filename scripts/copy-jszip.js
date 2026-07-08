const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const source = path.join(root, 'node_modules', 'jszip', 'dist', 'jszip.min.js');
const targetDir = path.join(root, 'www', 'lib');
const target = path.join(targetDir, 'jszip.min.js');

if (!fs.existsSync(source)) {
  throw new Error('Missing node_modules/jszip/dist/jszip.min.js. Run npm install first.');
}

fs.mkdirSync(targetDir, { recursive: true });
fs.copyFileSync(source, target);
console.log(`Copied ${path.relative(root, target)}`);
