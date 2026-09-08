const fs = require('fs');
const path = require('path');

function stripBom(filePath) {
  const buf = fs.readFileSync(filePath);
  if (buf.length >= 3 && buf[0] === 0xEF && buf[1] === 0xBB && buf[2] === 0xBF) {
    fs.writeFileSync(filePath, buf.slice(3));
    console.log("Stripped BOM from: " + filePath);
  }
}

function walk(dir) {
  const files = fs.readdirSync(dir);
  for (const f of files) {
    if (f === 'node_modules' || f === '.git' || f === 'dist') continue;
    const full = path.join(dir, f);
    if (fs.statSync(full).isDirectory()) {
      walk(full);
    } else if (f.endsWith('.json') || f.endsWith('.js') || f.endsWith('.ts') || f.endsWith('.cjs')) {
      stripBom(full);
    }
  }
}

walk('.');