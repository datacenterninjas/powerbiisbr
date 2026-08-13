#!/usr/bin/env node
// Zero-dependency static site builder.
// Stitches src/partials/{header,footer}.html around each src/pages/<fragment>.html,
// generating the sidebar nav from src/pages.json, and writes the result to the
// repo root as plain static HTML — exactly what GitHub Pages serves, byte for byte.
//
// Usage: node tools/build.mjs
// Run this after editing anything in src/, then commit both src/ and the
// generated root-level HTML files together. See README.md to add a new module.

import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const srcDir = path.join(root, 'src');

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
for (const p of pages) {
  if (seenFiles.has(p.file)) throw new Error(`Duplicate output file in pages.json: ${p.file}`);
  seenFiles.add(p.file);

  const content = readFileSync(path.join(srcDir, 'pages', p.fragment), 'utf8');
  const nav = buildNav(p.id);

  const header = headerTpl
    .replace('<!--TITLE-->', p.title)
    .replace('<!--CRUMB-->', p.crumb)
    .replace('<!--NAV-->', nav);

  writeFileSync(path.join(root, p.file), header + content + footerTpl, 'utf8');
  console.log(`built ${p.file}`);
}

console.log(`\n${pages.length} pages built.`);
