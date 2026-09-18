// Checks the asset/import surface. It does not determine copyright or trademark rights.
import { readFile, readdir } from 'node:fs/promises';
import { extname, join } from 'node:path';
import assert from 'node:assert/strict';

const pkg = JSON.parse(await readFile('package.json', 'utf8'));
const sourceFiles = [];
async function walk(path) {
  for (const entry of await readdir(path, { withFileTypes: true })) {
    const name = join(path, entry.name);
    if (entry.isDirectory()) await walk(name); else sourceFiles.push(name);
  }
}
await walk('src');
sourceFiles.push('index.html', 'server.mjs');
const issues = [], references = new Set();
for (const file of sourceFiles) {
  if (!['.js', '.mjs', '.css', '.html'].includes(extname(file))) { issues.push(`${file}: review unclassified asset type`); continue; }
  const source = await readFile(file, 'utf8');
  if (extname(file) === '.css' && /@import|@font-face|url\(\s*['"]?(?:https?:)?\/\//i.test(source)) issues.push(`${file}: external or bundled font/style asset declaration`);
  for (const match of source.matchAll(/(?:\bfrom\s+|\bimport\s*\(\s*|\bimport\s+)['"]([^'"]+)['"]/g)) {
    if (!match[1].startsWith('.') && !match[1].startsWith('node:')) issues.push(`${file}: nonlocal import ${match[1]}`);
  }
  if (/<(?:img|script|link|iframe|audio|video|source)\b[^>]*(?:src|href)\s*=\s*['"](?:https?:)?\/\//i.test(source)) issues.push(`${file}: remote asset element`);
  for (const match of source.matchAll(/<a\b[^>]*href=['"](https?:\/\/[^'"]+)['"]/g)) references.add(match[1]);
}
assert.deepEqual(Object.keys(pkg.dependencies || {}), [], 'Review added runtime packages and their licenses.');
assert.deepEqual(Object.keys(pkg.optionalDependencies || {}), [], 'Review added optional packages and their licenses.');
assert.ok(pkg.files && !pkg.files.some(file => file === '.' || /artifacts|node_modules|^scripts|^test/.test(file)), 'Keep development/runtime caches outside package contents.');
assert.deepEqual(issues, [], 'Asset provenance checks need review.');
console.log(`PASS: ${sourceFiles.length} application source files; no remote asset declarations or third-party package imports detected.`);
console.log(`Scientific outbound links: ${references.size}. These are references, not bundled assets.`);
console.log('This check does not establish originality, licensing rights, or legal clearance.');
