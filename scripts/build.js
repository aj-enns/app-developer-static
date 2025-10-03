const fs = require('fs');
const path = require('path');

const repoRoot = path.join(__dirname, '..');
const outDir = path.join(repoRoot, 'build');
const exts = /\.(html|css|js|png|svg|jpg|jpeg|webp)$/i;

if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

const entries = fs.readdirSync(repoRoot);
const files = entries.filter((name) => {
  try {
    const full = path.join(repoRoot, name);
    return fs.statSync(full).isFile() && exts.test(name);
  } catch (e) {
    return false;
  }
});

files.forEach((f) => {
  const src = path.join(repoRoot, f);
  const dest = path.join(outDir, f);
  fs.copyFileSync(src, dest);
  console.log(`copied ${f}`);
});

console.log(`build -> ${outDir}`);
