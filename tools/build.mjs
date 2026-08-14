#!/usr/bin/env node
// Zero-dependency static site builder.
// Stitches src/partials/{header,footer}.html around each src/pages/<fragment>.html,
// generating the sidebar nav from src/pages.json, and writes the result to the
// repo root as plain static HTML — exactly what GitHub Pages serves, byte for byte.
//
// Usage: node tools/build.mjs
// Run this after editing anything in src/, then commit both src/ and the
// generated root-level HTML files together. See README.md to add a new module.

import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const srcDir = path.join(root, 'src');

// Case-sensitive existence check — fs.existsSync() is case-insensitive on
// Windows/macOS, which is exactly how a casing bug slips past local testing
// and only breaks once GitHub Pages (case-sensitive) serves it.
function existsCaseSensitive(relPath) {
  const parts = relPath.split('/').filter(Boolean);
  let dir = root;
  for (const part of parts) {
    let entries;
    try { entries = readdirSync(dir); } catch { return false; }
    if (!entries.includes(part)) return false;
    dir = path.join(dir, part);
  }
  return true;
}

// Scans one generated page's href/src attributes for the three link
// mistakes that silently break GitHub Pages: wrong-case local targets,
// "../" paths (invalid once every page lives flat at the repo root), and
// leading-slash absolute paths (break under the project-page subpath,
// e.g. datacenterninjas.github.io/powerbiisbr/ — a leading "/" resolves to
// the domain root instead).
function verifyLinks(html, sourceFile, validPages) {
  const errors = [];
  // Strip <script> blocks first — pages render several sections (chart
  // accordions, formatting cards, etc.) from JS template literals like
  // `<img src="${v.src}">`, and that raw, not-yet-evaluated text would
  // otherwise be scanned as if "${v.src}" were a literal link target.
  const markup = html.replace(/<script[\s\S]*?<\/script>/g, '');
  const re = /(?:href|src)="([^"]*)"/g;
  let m;
  while ((m = re.exec(markup))) {
    const link = m[1];
    if (!link) continue;
    if (link.includes('${')) continue; // unevaluated JS template literal, not a real link
    if (link.startsWith('#')) continue;
    if (/^[a-z][a-z0-9+.-]*:/i.test(link)) continue; // http:, https:, mailto:, data:, javascript:, tel:
    if (link.startsWith('//')) continue; // protocol-relative external

    if (link.startsWith('/')) {
      errors.push(`${sourceFile}: absolute path "${link}" will break under the GitHub Pages project subpath — use a root-relative path with no leading slash`);
      continue;
    }
    if (link.includes('../')) {
      errors.push(`${sourceFile}: "../" path not allowed (every page lives flat at the repo root): "${link}"`);
      continue;
    }

    const cleanLink = link.split('#')[0].split('?')[0];
    if (!cleanLink) continue;
    if (!existsCaseSensitive(cleanLink)) {
      errors.push(`${sourceFile}: local link target not found on disk with this exact casing: "${link}"`);
      continue;
    }
    if (cleanLink.endsWith('.html') && !cleanLink.includes('/') && !validPages.has(cleanLink)) {
      errors.push(`${sourceFile}: links to "${link}", a root .html file not declared in src/pages.json`);
    }
  }
  return errors;
}

// Several pages build their content from JS data arrays rendered into
// accordions at runtime (the CHARTS/visual/TAKEAWAY pattern) — asset paths
// there are JS string literals like `src:'images/foo.svg'`, not HTML
// attributes, and live inside <script> blocks that verifyLinks() above
// deliberately skips. Scan the FULL, unstripped html for any quoted
// reference into the two committed-asset directories, regardless of
// surrounding syntax, so a casing bug in a JS-templated path is caught too.
function verifyAssetPaths(html, sourceFile) {
  const errors = [];
  const re = /['"](images\/[^'"]+|datasets\/[^'"]+\.csv)['"]/g;
  const seen = new Set();
  let m;
  while ((m = re.exec(html))) {
    const link = m[1];
    if (seen.has(link)) continue;
    seen.add(link);
    if (!existsCaseSensitive(link)) {
      errors.push(`${sourceFile}: asset path not found on disk with this exact casing: "${link}"`);
    }
  }
  return errors;
}

const pages = JSON.parse(readFileSync(path.join(srcDir, 'pages.json'), 'utf8'));
const headerTpl = readFileSync(path.join(srcDir, 'partials', 'header.html'), 'utf8');
const footerTpl = readFileSync(path.join(srcDir, 'partials', 'footer.html'), 'utf8');

function buildNav(currentId) {
  const groups = [];
  const groupIndex = new Map();
  for (const p of pages) {
    if (!groupIndex.has(p.group)) {
      groupIndex.set(p.group, groups.length);
      groups.push({ name: p.group, items: [] });
    }
    groups[groupIndex.get(p.group)].items.push(p);
  }
  return groups.map(g => {
    const buttons = g.items.map(p => {
      const active = p.id === currentId ? ' active' : '';
      return `      <a class="navbtn${active}" href="${p.file}"><span class="num">${p.num}</span> ${p.label}</a>`;
    }).join('\n');
    return `    <div class="navgroup">\n      <div class="label">${g.name}</div>\n${buttons}\n    </div>`;
  }).join('\n');
}

const seenFiles = new Set();
const built = [];
for (const p of pages) {
  if (seenFiles.has(p.file)) throw new Error(`Duplicate output file in pages.json: ${p.file}`);
  seenFiles.add(p.file);

  const content = readFileSync(path.join(srcDir, 'pages', p.fragment), 'utf8');
  const nav = buildNav(p.id);

  const header = headerTpl
    .replace('<!--TITLE-->', p.title)
    .replace('<!--CRUMB-->', p.crumb)
    .replace('<!--NAV-->', nav);

  const html = header + content + footerTpl;
  writeFileSync(path.join(root, p.file), html, 'utf8');
  built.push({ file: p.file, html });
  console.log(`built ${p.file}`);
}

console.log(`\n${pages.length} pages built.`);

// Verification pass — runs after every page is written, so a page's own
// links can be checked against files other pages just created.
const validPages = new Set(pages.map(p => p.file));
const linkErrors = built.flatMap(({ file, html }) =>
  [...verifyLinks(html, file, validPages), ...verifyAssetPaths(html, file)]);

if (linkErrors.length) {
  console.error(`\n${linkErrors.length} link problem(s) found:\n`);
  linkErrors.forEach(e => console.error(`  ✗ ${e}`));
  console.error('\nFix these before committing — each one is a link that works locally but breaks on GitHub Pages.');
  process.exit(1);
}
console.log('Link check passed — no bad casing, "../" paths, absolute paths, or undeclared page links.');
