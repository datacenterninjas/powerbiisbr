# Power BI for MBA Analytics — course portal

Static multi-page site published via GitHub Pages. No server, no framework,
no npm dependencies — a small Node script assembles plain HTML files from
shared partials, and the generated output is what actually gets committed
and served.

```
src/
  pages.json              nav order, file names, titles — the manifest
  partials/
    header.html           <!DOCTYPE>…<style>…sidebar shell…<main class="content">
    footer.html            closing tags + shared theme/mobile-menu script
  pages/
    *.html                 one content fragment per page (no <html>/<head>/nav — just the page body)
tools/
  build.mjs                stitches header + fragment + footer → root-level output
datasets/                  real downloadable CSVs, linked directly from pages
```

Everything at the **repo root** (`index.html`, `01-architecture.html`, …) is
**generated** — don't hand-edit those files, edit `src/` and rebuild.

## Adding a new module as the class progresses

1. Add an entry to `src/pages.json`. New modules go in the `"Extended
   Modules"` group as the next number (09, 10, …) — this avoids ever
   renumbering the existing 01–08 sequence. Copy an existing entry's shape:
   `id`, `file` (the output filename, kebab-case, numbered), `fragment`
   (matching filename in `src/pages/`), `group`, `num`, `label`, `crumb`,
   `title`.
2. Create `src/pages/<fragment>.html` with just the page content — a
   `.section-head` block, whatever body content, and a
   `<footer class="pagefoot">` at the end. Look at `src/pages/architecture.html`
   for the pattern. Don't include `<html>`, `<head>`, or the sidebar — the
   build script adds those.
3. Run:
   ```
   node tools/build.mjs
   ```
4. Open the generated file locally to sanity-check it, then commit **both**
   the `src/` changes and the newly generated root-level HTML file together
   — GitHub Pages serves the generated file, not the source.

## Editing an existing page

Edit the matching file in `src/pages/`, then re-run `node tools/build.mjs`.
It regenerates all pages (safe, idempotent) and commit the diff.

## Editing shared chrome (sidebar, theme, fonts, colors)

`src/partials/header.html` (styles + sidebar shell) and
`src/partials/footer.html` (shared script). Re-run the build — every page
picks up the change at once.

## Datasets

Small CSVs (the existing Sales/HR/Retail/Banking/Hospital practice files)
live in `datasets/` and are linked directly, e.g.
`<a href="datasets/Sales_Clean.csv" download>`. For anything too large to
belong in this repo (a full database backup, large exports), link out
instead — see the "Large files" section on the SQL Server & AdventureWorks
page for the pattern.

## Two things that will break GitHub Pages if skipped

- **Case sensitivity.** GitHub Pages is case-sensitive (macOS Finder isn't)
  — `datasets/Sales_Clean.csv` and `datasets/sales_clean.csv` are different
  files there. Match on-disk filenames exactly.
- **Root-relative paths only.** Every generated page lives flat at the repo
  root, so links are always `some-file.html` or `datasets/Some_File.csv` —
  never `../`, never a leading `/`. Keep new pages at the root too.

`build.mjs` checks both of these automatically and fails the build with a
printed list if either slips through — see its output before assuming a
link is safe. `.gitattributes` also keeps every generated file on LF line
endings, so `git status` after a rebuild should only ever show pages whose
content you actually changed.
