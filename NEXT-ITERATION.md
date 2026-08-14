# NEXT-ITERATION.md — Power BI for MBA Analytics

> Phased improvement roadmap for the course portal, written 2026-08-14 from an
> instructor / Power BI practitioner review of the current site (see
> `PROJECT.md` for the project map). Scope was agreed with the maintainer
> before this plan was written: **in scope** — assessments & rubrics, guided
> walkthroughs, career & PL-300 content, study aids, more SVG diagrams, build
> tooling. **Deliberately deferred** — new Extended Modules 09 (Data Modeling)
> and 10 (Data Storytelling); see the Deferred section at the end.
>
> Every item below is written to fit the repo's existing architecture: edit
> `src/pages/*.html` fragments + `src/pages.json`, run `node tools/build.mjs`,
> commit source and generated output together, root-relative links only, exact
> filename casing, and append a `PROJECT.md` changelog entry per change.

**Effort scale used throughout:**
**S** = one short session (< ~2 h) · **M** = roughly half a day · **L** = spread across multiple sessions.

---

## Guiding principles for this iteration

1. **Assessment drives learning.** MBA students prioritize what is graded. The
   single biggest gap today is that only Module 1 has a graded assignment —
   Modules 2–5 and the Final Project are taught but not assessed. Closing that
   gap is Phase 1/2's core.
2. **Practice on unseen data.** The take-away exercise pattern (build on an
   inbuilt CSV the student hasn't seen worked) proved out on the
   visualizations page. New content should keep that split: AdventureWorksDW
   for worked examples, the 5 inbuilt CSVs for independent practice.
3. **Static-site-native interactivity.** Everything proposed works with zero
   backend: JS data arrays rendered into accordions (the `CHARTS` pattern),
   `localStorage` for persistence (the `pbi-theme` pattern), hand-authored
   SVGs for diagrams. No new dependencies, no charting libraries.
4. **Reduce maintainer friction first.** The build's line-ending churn and the
   two known GitHub Pages breakers (casing, `../` paths) currently tax every
   single commit. Fixing tooling first makes every later phase cheaper.

---

## Phase 1 — Now (next 2–3 weeks, paced with the class)

Ordered so the tooling fix lands first and everything after it is cheaper to
ship.

### 1.1 Build tooling hardening — Effort: S

**Why.** Two failure modes are already documented as "will silently break
GitHub Pages" (casing mismatches, `../` paths), and every build currently
touches the line endings of all 33 output files, forcing a manual
`git checkout --` sweep per commit. These are exactly the kinds of problems a
script catches better than a human.

**What.**

- Add a `.gitattributes` declaring line-ending policy for `*.html` (e.g.
  `*.html text eol=lf`) — or have `build.mjs` write the endings git expects —
  so a rebuild of an untouched page produces a byte-identical file and the
  per-commit revert ritual disappears.
- Add a verification pass at the end of `build.mjs` that scans every generated
  page's `href`/`src` attributes and fails loudly (non-zero exit + printed
  list) on: a local link whose target file does not exist **with that exact
  casing** on disk; any `../` path; any link to a root `.html` file not
  declared in `src/pages.json`.

**How (repo-specific).** All inside `tools/build.mjs` — a regex pass over the
generated HTML strings before writing, plus an `fs.readdirSync` casing check
against `datasets/` and `images/`. No new files except `.gitattributes`.

**Acceptance check.** Deliberately break a link's casing in a fragment, run
the build, confirm it fails with a useful message; fix it, confirm a clean
build; run the build twice in a row and confirm `git status` is clean after
the second run. Update `PROJECT.md` to remove the now-obsolete line-ending
cleanup instructions.

### 1.2 Module 2 graded assignment (10 marks) — Effort: M

**Why.** Module 2 (Advanced Visualizations) is where the class is heading
next, and it currently ends without assessment. Shipping its assignment
*while the module is being taught* matters more than back-filling Modules 3–5
(those come in Phase 2, ahead of when the class reaches them).

**What.** A new page mirroring the Module 1 assignment's structure: 4–5
tasks on AdventureWorksDW spanning the module's skills (e.g. a small
interactive report using slicers + cross-filtering, a matrix with conditional
formatting, a top-N filter, one custom/advanced visual), a marks-breakdown
rubric table (10 marks total, per-task split, with an explicit mark for
design judgment — titles, labels, layout — not just mechanics), and a
submission checklist (what to export/screenshot).

**How.** New entry in `src/pages.json` in the Module 2 group; new fragment
`src/pages/assignment-module2.html` copying the Module 1 assignment
fragment's structure (`.section-head`, task cards, rubric, `.pagefoot`).
Field references must use exact AdventureWorksDW column syntax
(`DimProduct[Color]` style) and respect the single-table/no-join constraint
— the 2026-08-14 field-name bug is the cautionary tale here.

### 1.3 Guided Power Query walkthrough: dirty → clean, end to end — Effort: M–L

**Why.** The repo ships five deliberately-dirty CSVs, but no page walks a
student through actually cleaning one. For students who have never opened
Power Query, "here's a dirty file, go clean it" has too big a first step.
One fully-worked cleaning, then four self-serve repeats, is the same
worked-example → unseen-practice pattern that already works on the
visualizations page.

**What.** A new page (Module 4 group, alongside the existing Power Query
pages) that takes **one** dirty CSV through a complete clean: load, inspect
column quality indicators, promote/fix headers, set data types, trim/clean
text, standardize inconsistent category values, handle blanks and error
values, remove duplicates, review Applied Steps, close & apply. Each step as
a `.steps` numbered item with the exact UI path in `.clickpath` chips, plus a
"what just happened and why a business analyst cares" sentence. End with a
before/after column-quality comparison and a take-away: "now clean
one of the other Dirty files yourself" with download links and a reflection
question.

**How.** New `src/pages.json` entry + fragment. **Before writing any step,
check the actual columns and the specific deliberate messes in each Dirty
CSV against the table on `datasets.html`** (per the standing PROJECT.md
rule) and pick the dirty file whose problems best cover the step list —
don't assume; open the CSV. Consider a small before/after SVG (two
mini-tables, messy → clean, using the standard palette) if a figure earns
its space — see 2.6 conventions.

---

## Phase 2 — This term

The assessment spine plus the study aids. Items 2.1–2.3 should each land
*before* the class reaches that module.

### 2.1 Graded assignments for Modules 3, 4, and 5 (10 marks each) — Effort: M each

**Why.** Completes the per-module assessment spine started in 1.2.

**What.** Same page pattern as 1.2, one per module:

- **Module 3 (DAX):** write 4–5 measures of increasing difficulty (a plain
  aggregation, a ratio, a time-intelligence measure, one CALCULATE+FILTER
  measure), each with a business question it answers; marks for both the
  formula and a one-sentence plain-English explanation of what the measure's
  filter context is doing — that explanation is the MBA-level skill.
- **Module 4 (Power Query):** clean one of the Dirty CSVs *not* used in the
  1.3 walkthrough, documented via the Applied Steps list; marks for a
  reproducible query, not a hand-fixed file.
- **Module 5 (Service):** publish a small report to Power BI Service, share
  it correctly, and answer short questions about workspaces/refresh/sharing
  modes; this doubles as the setup step for the portfolio item in 2.5.

**How.** Three `src/pages.json` entries + fragments, same skeleton as 1.2.
DAX assignment must verify every referenced column exists in
AdventureWorksDW's DW schema.

### 2.2 Final Project rubric upgrade — Effort: M

**Why.** The Final Project page exists but (unlike a real course deliverable)
lacks a marks breakdown, so students can't tell what "good" means or how to
allocate effort.

**What.** Add to the existing Final Project page: a scenario framing (student
as analyst presenting to a named business stakeholder), an explicit rubric
table (suggested split: data preparation / model & measures / visualization &
design / business insight & narrative / delivery), two or three milestone
checkpoints aligned to the module calendar, and a submission checklist.
Business insight should carry real weight in the split — this is an MBA
course, and the rubric is where that gets enforced.

**How.** Edit the existing `src/pages/` fragment for the Final Project page —
no manifest change needed.

### 2.3 Per-module self-test quizzes with instant feedback — Effort: M–L

**Why.** One global Self-Test Quiz can't tell a student mid-Module-3 whether
they understood *this week's* material. Instant-feedback quizzes are the
cheapest retrieval-practice win available, and the site's architecture is
already built for it.

**What.** 6–10 multiple-choice questions per module (concept + "which visual/
DAX function would you use for this business question" style), answerable
inline with immediate right/wrong feedback and a one-sentence explanation per
answer — the explanation is where the teaching happens. A per-module score
summary at the end; no grades recorded anywhere.

**How.** Extend the existing quiz page or add a quiz section per module page.
Questions live as a JS data array (the `CHARTS`/`FORMATTING` pattern) rendered
into cards; feedback is a small click handler in the page's script block.
If quizzes ship per-module, keep the question banks in each page's own
`<script>` block per the site's page-local-data convention.

### 2.4 Troubleshooting / "the 10 errors every student hits" page — Effort: M

**Why.** Predictable failure points (SQL Server connection refused, wrong
AdventureWorks variant installed, ambiguous-relationship warnings, DAX
"cannot determine a single value" errors, blank maps from unrecognized
geography, date columns not sorting, refresh credential prompts) currently
generate individual student support load. A page answers each once.

**What.** New Reference-group page: one `<details class="card">` accordion
entry per error — the exact symptom/message the student sees, the
plain-English cause, and the numbered fix. Include the wrong-variant error
prominently (the site depends on **AdventureWorksDW**, not OLTP/LT — already a
documented gotcha). Seed the list from real questions students have already
asked; grow it as the term surfaces new ones (each addition is a one-object
append to the data array).

**How.** New `src/pages.json` Reference entry + fragment; data-array +
accordion render pattern.

### 2.5 Career & PL-300 page for MBA students — Effort: M

**Why.** Explicitly requested scope. For MBA students the course's exchange
rate into interviews and CVs is a major part of its value, and Microsoft's
**PL-300 (Power BI Data Analyst)** certification is the recognized credential
this course substantially overlaps with.

**What.** One new Reference-group page with three sections:

- **PL-300 mapping:** a table mapping each of the 5 modules to the PL-300
  skill areas it covers, an honest note on what the course does *not* cover
  (so students know what to self-study), and a link to Microsoft's official
  exam page. **Verify the current PL-300 skill-outline and exam details
  against Microsoft Learn at time of writing** — exam outlines change; do not
  write this section from memory.
- **Portfolio guide:** turn the Final Project into a shareable artifact —
  publish to Power BI Service, "Publish to web" vs. sharing-link trade-offs
  (and the data-sensitivity caveat), what to write in the LinkedIn/CV line,
  what a recruiter actually looks at in 30 seconds.
- **Case-interview practice:** 5–6 analytics-case-style questions ("Sales
  dropped 12% last quarter — using this dashboard, where do you look first
  and why?"), each with a model answer inside a `<details>` so students
  attempt before revealing.

**How.** New `src/pages.json` Reference entry + fragment. The mapping table
is the only content on the site with an external freshness dependency — add
a "last verified" date line under the table.

### 2.6 SVG diagram pass — Effort: S per diagram, M–L total

**Why.** Only Scatter has a diagram, and it demonstrably improved that card.
The highest-leverage targets are concepts that are hard to describe in prose
but instant in a picture.

**What.** In priority order: **(a)** DAX filter-context flow (slicer/visual
axis → filter context → measure result — the single hardest concept in the
course); **(b)** Line-chart anatomy (trend vs. seasonality vs. one-off spike,
annotated); **(c)** Map pitfalls (bubble-size distortion, ambiguous place
names); **(d)** before/after table pair for the 1.3 Power Query walkthrough
if not done in Phase 1. Each referenced from its page via the existing
`<figure><img>` convention — and on the visualizations page, via the
already-built `visual` field, which Line and Map cards can adopt with zero
template changes.

**How.** Hand-authored SVGs in `images/`, strictly following the documented
conventions: `viewBox`, white `#FFFFFF` background rect (no dark-mode
switching, matching every existing diagram), monospace labels, and the fixed
palette (`#2A6560` teal, `#C97A1E` orange, `#565B6B` grey, `#B3402D` red for
"look here" only, `#DEDACE` gridlines, `#14171F` text).

### 2.7 Per-module progress checklist — Effort: M

**Why.** In a multi-week self-paced-between-lectures course, "where was I?"
is a real dropout point. The site already persists user state
(`localStorage['pbi-theme']`), so a progress tracker is architecture-free.

**What.** A small checkbox per page in the sidebar nav (or a compact
"My progress" block per module group), persisted in `localStorage` under a
new key, with a per-module "n of m done" count and a reset link. Purely
personal and client-side — no tracking, consistent with the site's
no-analytics stance.

**How.** Sidebar shell lives in `src/partials/header.html`, persistence
script in `src/partials/footer.html` — both shared, so one edit + rebuild
covers all 33+ pages. This is the one Phase 2 item touching shared chrome:
test on several pages and both themes before committing.

---

## Phase 3 — Backlog (between terms / as time allows)

### 3.1 Consolidated Glossary page — Effort: S–M

All `.term` click-to-define definitions already exist scattered across pages;
collect them into one alphabetized Reference-group page (plain definition
list — no popover machinery needed). Ideally have `build.mjs` extract terms
from fragments at build time so the glossary can never drift from the inline
definitions; hand-maintained is an acceptable v1.

### 3.2 Client-side search — Effort: M

Have `build.mjs` emit a `search-index.json` (page title, headings, stripped
body text per page) at the root, plus a small search box in the sidebar that
fetches the index and shows matching pages/headings. Root-relative fetch
path; no library needed at this scale (33 pages). Biggest study-aid win after
the checklist, but heavier than anything in Phase 2 — hence backlog.

### 3.3 Quiz/troubleshooting content growth — Effort: S, recurring

Both 2.3 and 2.4 are data-array pages designed for cheap appends. End-of-term
review: add questions students got wrong in class, and errors that actually
occurred, as new array entries.

---

## Deferred (discussed and consciously not in this iteration)

- **Extended Module 09 — Data Modeling** (star schema, relationships,
  cardinality) and **Extended Module 10 — Data Storytelling & Dashboard
  Design.** Both are real curriculum gaps — Module 09 in particular would
  make Module 3's CALCULATE/FILTER material land better, since the site's
  single-table teaching constraint eventually chafes against real DAX. The
  maintainer chose to defer both; the DAX filter-context diagram (2.6a)
  partially bridges the Module 09 gap in the meantime. Revisit when planning
  the next cohort.

---

## Standing rules for whoever implements this

Restating the repo's non-negotiables so this file is safe to hand to a
future session cold:

1. Never hand-edit root-level `.html` files — edit `src/pages/` or
   `src/partials/`, then `node tools/build.mjs`, and commit source +
   generated output together.
2. New pages: `src/pages.json` entry first (Extended/appropriate group,
   never renumber 01–08), root-relative links only, exact filename casing.
3. Check `datasets.html` before referencing any inbuilt-CSV column name;
   check AdventureWorksDW's actual DW schema before referencing any
   `Table[Column]`; respect the single-table/no-join teaching constraint.
4. Until 1.1 lands: after every build, revert line-ending-only diffs on
   untouched pages. After 1.1 lands: delete this rule from PROJECT.md.
5. **Append a `PROJECT.md` changelog entry for every change** — newest
   first, dated, with the "why".

---

## Appendix — changelog entry to paste when this file is added to the repo

If this file is committed into the repo, append this to `PROJECT.md`'s
changelog (adjusting the date if committed later):

```markdown
### 2026-08-14 — Added NEXT-ITERATION.md phased improvement roadmap
- **Why:** maintainer asked for an instructor-perspective review of the course
  and a next-iteration plan; scope (assessments & rubrics, guided
  walkthroughs, career/PL-300, study aids, SVG diagrams, build tooling) was
  agreed in discussion before writing. New Modules 09/10 were consciously
  deferred — see the plan's Deferred section.
- Added `NEXT-ITERATION.md` at the repo root: Phase 1 (build tooling
  hardening, Module 2 assignment, Power Query dirty→clean walkthrough),
  Phase 2 (Modules 3–5 assignments, Final Project rubric, per-module
  quizzes, troubleshooting page, career/PL-300 page, SVG diagram pass,
  progress checklist), Phase 3 backlog (glossary, client-side search).
- No site content, source fragments, or generated pages were changed; no
  build run needed.
```
