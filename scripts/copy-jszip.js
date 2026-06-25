const fs = require('fs');
const path = require('path');

const src = path.join(__dirname, '..', 'node_modules', 'jszip', 'dist', 'jszip.min.js');
const dest = path.join(__dirname, '..', 'www', 'jszip.min.js');

try {
  fs.copyFileSync(src, dest);
  console.log('jszip.min.js copiado a www/');
} catch (err) {
  console.error('No se pudo copiar jszip:', err.message);
  process.exit(1);
}
