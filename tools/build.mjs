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

// Human-readable display labels for the GLOSSARY keys below — the one bit of
// glossary content that isn't auto-derivable from the shared GLOSSARY object
// itself (there's no reliable way to turn "smallmultiples" back into "Small
// Multiples" programmatically). Definitions are pulled from footer.html's
// GLOSSARY object at build time, so they can never drift out of sync with
// the same popovers every .term button on the site already uses — only
// labels need updating here, and only when a NEW term key is added.
const GLOSSARY_LABELS = {
  dimension: 'Dimension', measure: 'Measure', fact: 'Fact', axis: 'Axis', legend: 'Legend',
  values: 'Values', tooltip: 'Tooltip', smallmultiples: 'Small Multiples', filter: 'Filter',
  slicer: 'Slicer', drilldown: 'Drill Down', drillthrough: 'Drill Through', bookmark: 'Bookmark',
  hierarchy: 'Hierarchy', cardinality: 'Cardinality', relationship: 'Relationship',
  starschema: 'Star Schema', calculatedcolumn: 'Calculated Column', dax: 'DAX',
  aggregation: 'Aggregation', group: 'Group', binning: 'Binning',
  conditionalformatting: 'Conditional Formatting', customvisual: 'Custom Visual',
  implicitmeasure: 'Implicit Measure', iterator: 'Iterator', rowcontext: 'Row Context',
  filtercontext: 'Filter Context', contexttransition: 'Context Transition',
  datetable: 'Date Table', timeintelligence: 'Time Intelligence', granularity: 'Granularity',
};

// Extracts the GLOSSARY object literal straight out of footer.html and
// evaluates it — this is the single source of truth every .term popover on
// the site already reads from, so the generated glossary page can never
// drift out of sync with a definition edited there.
function extractGlossary(footerHtml) {
  const m = footerHtml.match(/const GLOSSARY = (\{[\s\S]*?\n\});/);
  if (!m) throw new Error('Could not find "const GLOSSARY = {...};" in src/partials/footer.html — glossary page would go stale.');
  const glossary = new Function(`return ${m[1]}`)();
  const missingLabels = Object.keys(glossary).filter(k => !GLOSSARY_LABELS[k]);
  if (missingLabels.length) {
    throw new Error(`New GLOSSARY term(s) added without a display label in tools/build.mjs's GLOSSARY_LABELS: ${missingLabels.join(', ')}`);
  }
  return Object.entries(glossary)
    .map(([key, definition]) => ({ key, label: GLOSSARY_LABELS[key], definition }))
    .sort((a, b) => a.label.localeCompare(b.label));
}

function glossaryHTML(terms) {
  return terms.map(t => `
      <div class="card" style="margin-bottom:10px;padding:16px 20px">
        <h3 style="margin:0 0 6px;font-size:1rem">${t.label}</h3>
        <p style="font-size:.9rem;margin:0">${t.definition}</p>
      </div>`).join('');
}

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
    const groupIds = g.items.map(p => p.id).join(',');
    const buttons = g.items.map(p => {
      const active = p.id === currentId ? ' active' : '';
      return `      <div class="navitem"><a class="navbtn${active}" href="${p.file}"><span class="num">${p.num}</span> ${p.label}</a><input type="checkbox" class="navcheck" data-page="${p.id}" title="Mark &quot;${p.label.replace(/&amp;/g, '&')}&quot; as done" aria-label="Mark ${p.label.replace(/&amp;/g, '&')} as done"></div>`;
    }).join('\n');
    return `    <div class="navgroup" data-group-ids="${groupIds}">\n      <div class="label"><span>${g.name}</span><span class="progress-count" data-group-ids="${groupIds}"></span></div>\n${buttons}\n    </div>`;
  }).join('\n');
}

const glossaryTerms = extractGlossary(footerTpl);

const decodeEntities = s => s.replace(/&amp;/g, '&').replace(/&nbsp;/g, ' ').replace(/&[a-z]+;/g, ' ');

function extractHeadings(fragmentHtml) {
  const heads = [];
  const re = /<h[123][^>]*>([\s\S]*?)<\/h[123]>/g;
  let m;
  while ((m = re.exec(fragmentHtml))) {
    const text = decodeEntities(m[1].replace(/<[^>]+>/g, '')).replace(/\s+/g, ' ').trim();
    if (text) heads.push(text);
  }
  return heads;
}

// Most of this site's richest content — chart descriptions, quiz questions,
// troubleshooting entries — lives inside <script> blocks as JS data-array
// string literals, not static markup, since those pages render client-side.
// Pulling quoted-string contents out of <script> blocks (rather than either
// dropping them or indexing raw JS syntax) keeps that content searchable.
function extractSearchText(fragmentHtml) {
  const scriptStrings = [];
  for (const sm of fragmentHtml.matchAll(/<script>([\s\S]*?)<\/script>/g)) {
    for (const s of sm[1].matchAll(/'((?:[^'\\]|\\.)*)'|"((?:[^"\\]|\\.)*)"/g)) {
      const str = (s[1] ?? s[2] ?? '').replace(/\\'/g, "'").replace(/\\"/g, '"').trim();
      if (str.length > 3 && /[a-z]/i.test(str) && !/^[\w./-]+\.(html|svg|csv)$/i.test(str)) scriptStrings.push(str);
    }
  }
  const markupText = decodeEntities(
    fragmentHtml.replace(/<script[\s\S]*?<\/script>/g, ' ').replace(/<style[\s\S]*?<\/style>/g, ' ').replace(/<[^>]+>/g, ' ')
  ).replace(/\s+/g, ' ').trim();
  return `${markupText} ${scriptStrings.join(' ')}`.replace(/\s+/g, ' ').trim().slice(0, 20000);
}

const seenFiles = new Set();
const built = [];
const searchIndex = [];
for (const p of pages) {
  if (seenFiles.has(p.file)) throw new Error(`Duplicate output file in pages.json: ${p.file}`);
  seenFiles.add(p.file);

  let content = readFileSync(path.join(srcDir, 'pages', p.fragment), 'utf8');
  if (content.includes('<!--GLOSSARY-->')) content = content.replace('<!--GLOSSARY-->', glossaryHTML(glossaryTerms));
  const nav = buildNav(p.id);

  const header = headerTpl
    .replace('<!--TITLE-->', p.title)
    .replace('<!--CRUMB-->', p.crumb)
    .replace('<!--NAV-->', nav);

  const html = header + content + footerTpl;
  writeFileSync(path.join(root, p.file), html, 'utf8');
  built.push({ file: p.file, html });
  searchIndex.push({
    file: p.file,
    title: decodeEntities(p.crumb),
    group: decodeEntities(p.group),
    headings: extractHeadings(content),
    text: extractSearchText(content),
  });
  console.log(`built ${p.file}`);
}

writeFileSync(path.join(root, 'search-index.json'), JSON.stringify(searchIndex), 'utf8');
console.log(`\n${pages.length} pages built. search-index.json written (${searchIndex.length} entries).`);

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
