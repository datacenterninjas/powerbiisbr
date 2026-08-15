# DAX-SCOPE.md — DAX Curriculum Scope (Module 3 expansion)

> Detailed scope for a basic→advanced DAX track for **Power BI for MBA
> Analytics**, written 2026-08-15. Agreed with the maintainer before writing:
> this is a **scope document to review first** (no site pages built yet); the
> advanced ceiling is **CALCULATE mastery** (not expert topics — see Out of
> Scope); and beyond formulas, reference links, and problems/solutions it
> includes a **pattern library, an errors & debugging guide, a cheat sheet &
> glossary, and quizzes & interview questions**.
>
> Companion to `NEXT-ITERATION.md` — this document *deepens* what that plan's
> items 2.1 (Module 3 assignment), 2.3 (quizzes), 2.4 (troubleshooting), and
> 2.6a (filter-context diagram) sketched for DAX. Where they overlap, this
> document is the authoritative content spec.

---

## 1. Teaching philosophy for this track

DAX is where MBA students most often fall off a Power BI course, and almost
always for the same reason: it gets taught as a formula language when the
hard part is the **mental model** (what filter context is, why the same
measure shows different numbers in different cells). This scope therefore:

- Leads every formula with the **business question it answers** ("What was
  revenue growth vs. last year?"), consistent with the site's
  business-question-first tone.
- Introduces exactly **one new concept per level** and re-uses the same small
  set of measures throughout, so students watch `[Total Sales]` become
  `[Sales YTD]` become `[YoY %]` rather than meeting 40 unrelated functions.
- Requires a **plain-English explanation** alongside every formula a student
  writes ("this measure ignores the Color filter because…") — that
  articulation is the MBA-level skill, and it's what the Module 3 assignment
  should grade.
- Uses **AdventureWorksDW for all worked examples** and the **inbuilt CSVs
  for take-away practice**, matching the site's established split.

### The date-table note (important, resolve before building)

True time intelligence (`TOTALYTD`, `SAMEPERIODLASTYEAR`) requires a proper
date table — in AdventureWorksDW, `DimDate` related to
`FactInternetSales[OrderDateKey]`. That is a **two-table exception** to the
site's single-table/no-join teaching constraint. The existing Module 3 "Time
Intelligence" page presumably already handles this somehow — **check how it
does before building, and stay consistent**. Recommended handling: a short
"Two tables, one line" callout that shows the single relationship being
created, framed as the one exception the course allows, with a pointer that
full data modeling is deliberately out of scope (deferred Module 09).

---

## 2. The five levels (basic → CALCULATE mastery)

Each level below lists: concept, functions introduced, worked formulas
(AdventureWorksDW), and what the student can *do* at the end. All
`Table[Column]` references use real AdventureWorksDW names but **must be
verified against the installed DW schema before publishing** (standing repo
rule; the 2026-08-14 field-name bug is the precedent).

### Level 1 — Measures & basic aggregations *(maps to existing "DAX Basics & Measures" page)*

**Mental model:** a measure is a saved calculation that re-computes for
whatever slice of data is looking at it. Implicit vs. explicit measures
(and why this course always writes explicit ones); measure vs. calculated
column (the single most-asked beginner question — answer it here, day one:
*columns are computed row-by-row at refresh and stored; measures are
computed at query time for the current filter*).

**Functions:** `SUM`, `AVERAGE`, `MIN`, `MAX`, `COUNT`, `COUNTROWS`,
`DISTINCTCOUNT`, `DIVIDE`.

**Core formulas (reused throughout the whole track):**

```dax
Total Sales = SUM ( FactInternetSales[SalesAmount] )

Total Quantity = SUM ( FactInternetSales[OrderQuantity] )

Order Count = DISTINCTCOUNT ( FactInternetSales[SalesOrderNumber] )

Average Order Value = DIVIDE ( [Total Sales], [Order Count] )
```

Teach `DIVIDE` (not `/`) from the first ratio — the built-in
divide-by-zero safety is a habit worth installing before bad habits form.
Also here: naming conventions (business-readable names, no `Measure 1`),
formatting measures (currency, thousands separators, % — a formatted
measure is what makes a report boardroom-ready), and a dedicated measures
table as home for all measures.

**Outcome:** student can build a KPI card and a bar chart driven by explicit,
well-named, formatted measures.

### Level 2 — Iterators & row context *(extends "DAX Basics & Measures" or first half of "Context & Dynamic Measures")*

**Mental model:** some questions can't be answered by summing a column that
exists — the number has to be computed **row by row, then aggregated**.
That's an iterator, and "row by row" is the first meeting with *row
context* (named casually here, formalized in Level 4).

**Functions:** `SUMX`, `AVERAGEX` (and the X-family concept generally).

```dax
Total Margin =
SUMX (
    FactInternetSales,
    FactInternetSales[SalesAmount] - FactInternetSales[TotalProductCost]
)

Margin % = DIVIDE ( [Total Margin], [Total Sales] )
```

Contrast explicitly with the wrong answer
(`SUM(SalesAmount) - SUM(TotalProductCost)` happens to work; the
average-margin-per-order case where naive `AVERAGE` silently lies does not)
— "why the simple version gives the wrong number" is the strongest
motivation for iterators. Close the measure-vs-column loop: most things
students build calculated columns for should be measures.

**Outcome:** student can compute profitability metrics and explain when an
iterator is required.

### Level 3 — Time intelligence *(maps to existing "Time Intelligence & Aggregations" page)*

**Mental model:** businesses judge every number against a time comparison
(vs. last year, year-to-date, rolling average). DAX has functions that
*rewrite the date filter* for you — a first taste of what CALCULATE does
in general.

**Functions:** `TOTALYTD`, `SAMEPERIODLASTYEAR`, `DATEADD`,
`DATESINPERIOD`; date-table requirement (see §1 note).

```dax
Sales YTD =
TOTALYTD ( [Total Sales], DimDate[FullDateAlternateKey] )

Sales LY =
CALCULATE ( [Total Sales], SAMEPERIODLASTYEAR ( DimDate[FullDateAlternateKey] ) )

YoY Growth % =
DIVIDE ( [Total Sales] - [Sales LY], [Sales LY] )

Sales Rolling 3M =
CALCULATE (
    [Total Sales],
    DATESINPERIOD ( DimDate[FullDateAlternateKey], MAX ( DimDate[FullDateAlternateKey] ), -3, MONTH )
)
```

`Sales LY` is the deliberate soft introduction of `CALCULATE` — used before
it's explained, as "the function that changes what a measure looks at,"
with the promise that Level 5 opens the hood.

**Outcome:** student can build the line chart every executive asks for:
actuals vs. last year with YoY % and a YTD card.

### Level 4 — Evaluation context *(maps to "Context & Dynamic Measures" page — the conceptual heart of the track)*

**Mental model, the one that unlocks everything:** every cell of every
visual computes the same measure under a **different filter context**
(from the visual's axis, slicers, and cross-filtering). Row context
(from Level 2's iterators) is a different thing. The matrix-cell
walkthrough — "pick this cell; list every filter acting on it; that's why
this number is what it is" — should be done twice, once in prose and once
as the **filter-context SVG diagram** already planned as NEXT-ITERATION
item 2.6a (slicer + axis → filter context → measure result). This level
introduces no new functions on purpose; it's pure mental model, plus
`HASONEVALUE`/`SELECTEDVALUE` as small dynamic-title/dynamic-label payoffs.

**Outcome:** student can look at any number in any visual and explain where
it came from — the difference between operating Power BI and understanding
it.

### Level 5 — CALCULATE mastery *(maps to "CALCULATE, FILTER & Modeling" page)*

**Mental model:** `CALCULATE` = "compute this measure, but under a filter
context *I* specify." Everything in Levels 3–4 was preparation for this
sentence.

**Functions:** `CALCULATE` (boolean filters, then table filters), `FILTER`,
`ALL`, `ALLEXCEPT`, `ALLSELECTED` (brief, in the % of selection context).

```dax
Accessories Sales =
CALCULATE ( [Total Sales], DimProduct[EnglishProductCategoryName] = "Accessories" )
-- verify: category name may live on DimProductCategory/DimProductSubcategory
-- in the installed DW schema; if so, either denormalize the example onto a
-- DimProduct column that exists (e.g. ProductLine) or note the extra hop.

Premium Product Sales =
CALCULATE ( [Total Sales], FILTER ( DimProduct, DimProduct[ListPrice] > 1000 ) )

All Product Sales = CALCULATE ( [Total Sales], ALL ( DimProduct ) )

% of All Products = DIVIDE ( [Total Sales], [All Product Sales] )
```

Sequence within the level: (1) boolean filter — "CALCULATE as a permanent
slicer"; (2) `FILTER` — when the condition needs an expression; (3) `ALL` —
removing filters, which flips CALCULATE from *narrowing* to *widening*, and
yields the %-of-total / market-share pattern that lands hardest with MBA
students; (4) `ALLEXCEPT`/`ALLSELECTED` as one worked variation each, not
drilled. Close the track by re-deriving Level 3's `Sales LY` now that
students can read what `CALCULATE` was doing all along.

**Outcome:** student can write share-of-total, filtered-KPI, and
comparison measures, and read intermediate DAX written by others.

---

## 3. Pattern library (reusable business patterns)

A dedicated page/section: one card per pattern — *business question →
formula → when to use → when NOT to use*. All buildable with Levels 1–5
machinery only. Same data-array + accordion render pattern as `CHARTS`.

| # | Pattern | Business question | Core machinery |
|---|---------|-------------------|----------------|
| 1 | YoY growth % | "Are we growing?" | `SAMEPERIODLASTYEAR` + `DIVIDE` |
| 2 | YTD / QTD | "Where are we against the year?" | `TOTALYTD` / `TOTALQTD` |
| 3 | Rolling N-month average | "What's the trend, minus the noise?" | `DATESINPERIOD` + `AVERAGEX` |
| 4 | % of total / market share | "How big a slice is this?" | `CALCULATE` + `ALL` |
| 5 | % of selection | "Share within what the user has filtered to" | `ALLSELECTED` |
| 6 | Filtered KPI | "Sales of premium products only, always" | `CALCULATE` + boolean/`FILTER` |
| 7 | Margin & margin % | "Are we making money on this?" | `SUMX` + `DIVIDE` |
| 8 | Average order value family | "Revenue per order / customer / unit" | `DISTINCTCOUNT` + `DIVIDE` |
| 9 | Count meeting a condition | "How many orders over $1,000?" | `COUNTROWS` + `FILTER` |
| 10 | Dynamic title/label | "Chart title that names the selected region" | `SELECTEDVALUE` |

Each pattern card ends with a one-line "in AdventureWorksDW this is:" worked
version and a take-away variant on an inbuilt CSV. (Top-N and ranking need
`RANKX` — out of scope; the visual-level Top-N filter, already taught in
Module 2, is the in-scope answer and the card explaining *that choice* is
itself worth including.)

## 4. Problem statements & solutions (three tiers)

Fifteen problems, five per tier, published with the solution and its
plain-English explanation inside a `<details>` ("attempt before you peek"),
plus one reflection question each. Tiered to match the levels:

- **Tier A (after Level 1–2):** e.g. "The CFO wants one number: average
  revenue per order. Build it and explain why `AVERAGE(SalesAmount)` is the
  wrong answer." Worked on FactInternetSales; take-away twins on
  `Sales_Clean.csv` / `Retail_Clean.csv`.
- **Tier B (after Level 3):** e.g. "Build the monthly sales line with a
  last-year comparison and a YoY % tooltip; in two sentences, tell the
  marketing director whether the December spike is growth or seasonality."
- **Tier C (after Level 5):** e.g. "Management wants each product color's
  share of total sales, *unaffected* by the color slicer. Build it, then
  break it on purpose by swapping `ALL` for `ALLSELECTED` and explain the
  difference you see."

Take-away problems use the inbuilt CSVs with direct download links — **check
every referenced column against the `datasets.html` table before writing**
(standing rule). Note: CSV-based problems can cover Tiers A and most of C,
but time-intelligence problems need a date column with enough history —
verify the inbuilt CSVs' date ranges; if they're too thin, Tier B stays
AdventureWorksDW-only and says so.

## 5. Errors & debugging guide (DAX section)

Feeds NEXT-ITERATION item 2.4's troubleshooting page — these are the
DAX-specific entries, each as *symptom (the actual on-screen message) →
cause in plain English → numbered fix*:

1. "A single value for column 'X' cannot be determined" — using a bare
   column where a measure/aggregation is needed; the measure-vs-column
   confusion resurfacing.
2. The total row is "wrong" — totals recompute the measure in the total's
   own filter context; they don't sum the visible cells. (Not an error
   message — the #1 trust-destroyer; deserves the longest entry.)
3. YoY / YTD returns blank — no proper date table, date table not marked,
   or the fact-to-date relationship missing/inactive.
4. Divide-by-zero errors — `/` vs `DIVIDE`.
5. Measure shows the same number everywhere — an `ALL` (or a filter on the
   wrong table) removing the context the visual is supposed to supply.
6. "Circular dependency detected" — usually calculated columns referencing
   each other; another argument for measures.
7. Text vs. number comparison errors — type mismatches from Power Query
   typing skipped upstream.
8. Slicer doesn't affect a measure — cross-filter direction/relationship
   gap, or an intentional `ALL` the student forgot they wrote.
9. Wildly slow visual — a calculated column doing a measure's job, or an
   iterator over the whole fact table where a simple aggregation works.
10. "Function expects a table/column expression" — the FILTER-vs-boolean
    argument confusion inside CALCULATE.

Debugging *method* sidebar: read a measure inside-out; test suspects in a
throwaway card visual; comment out filters one at a time; check what the
matrix cell's full filter context is before blaming the formula.

## 6. Cheat sheet & glossary

**Cheat sheet** (extends the existing Reference-group Cheat Sheet page or a
dedicated DAX section within it): one table, one row per function actually
taught (the ~20 above, no more) — function, one-line "use when", micro
example, level introduced. Printable; students will use it in the exam/
assignment.

**Glossary additions** (via the existing `.term` click-to-define mechanism,
and feeding the planned consolidated Glossary page): measure, calculated
column, implicit measure, aggregation, iterator, row context, filter
context, context transition (one careful sentence only — the full topic is
out of scope), date table, time intelligence, granularity.

## 7. Quizzes & interview questions

**Self-check quizzes** (implements NEXT-ITERATION 2.3 for this module):
6–8 MCQs per level, instant feedback with a one-sentence explanation per
option — wrong-option explanations are where the teaching happens. The
best question format for DAX: show a small matrix screenshot/mock and a
measure, ask "what number appears in this cell?" — it tests context, not
memorization.

**Interview questions** (feeds NEXT-ITERATION 2.5's career page): six
case-style questions with model answers in `<details>`, e.g. "Explain the
difference between a measure and a calculated column to a non-technical
manager"; "Your dashboard's total doesn't equal the sum of the rows —
walk me through how you'd investigate"; "Revenue is up 8% but the CEO asks
if that's real growth or price increases — which measures do you build?";
"When would you use CALCULATE with ALL, in business terms?"

## 8. Reference links (verified live 2026-08-15)

Curated and *annotated* — for MBA students, three good links beat thirty.
Put "start here" ordering on the page, and a "last verified" date line.

**Official documentation (free):**
- [DAX function reference — Microsoft Learn](https://learn.microsoft.com/en-us/dax/dax-function-reference) — the authoritative reference for every function.
- [DAX overview — Microsoft Learn](https://learn.microsoft.com/en-us/dax/dax-overview) — Microsoft's own conceptual introduction.
- [Use DAX in semantic models — Microsoft Learn training path](https://learn.microsoft.com/en-us/training/paths/dax-power-bi/) — free, hands-on, 4 modules; the best structured follow-on after this course's Module 3. (Note it's now titled "semantic models" — Microsoft's current name for what students know as datasets; add a one-line gloss so the terminology doesn't confuse.)

**Community / expert (free tiers):**
- [DAX Guide](https://dax.guide/) — SQLBI's function-by-function reference with syntax and examples; the practitioner's daily lookup tool.
- [Start learning DAX for free — SQLBI](https://www.sqlbi.com/articles/start-learning-dax-free/) — SQLBI's curated free starting sequence. *(Verify exact URL slug at build time — confirmed live via sqlbi.com articles listing.)*
- [DAX Patterns — SQLBI](https://www.sqlbi.com/p/dax-patterns/) — the canonical pattern collection; cite as "where our pattern library idea comes from; go here when you outgrow ours."

**Books (optional, for the hooked student):**
- *The Definitive Guide to DAX* (Russo & Ferrari, SQLBI) — flag honestly as
  the expert-level bible, **not** required for this course.

## 9. Site integration map

How this scope lands in the repo, respecting all standing rules
(`pages.json` first, fragments in `src/pages/`, generated output committed,
root-relative links, exact casing, changelog entry per change):

| Scope section | Where it lives |
|---|---|
| Levels 1–2 | Expand existing "DAX Basics & Measures" fragment |
| Level 3 | Expand existing "Time Intelligence & Aggregations" fragment |
| Level 4 | Expand existing "Context & Dynamic Measures" fragment + new filter-context SVG (NEXT-ITERATION 2.6a) |
| Level 5 | Expand existing "CALCULATE, FILTER & Modeling" fragment |
| Pattern library | **New page**, Module 3 group (`src/pages.json` addition) — data-array + accordion |
| Problems & solutions | Distributed: Tier A/B/C blocks at the end of their level's page; or one consolidated "DAX Practice" page — decide at build time |
| Errors & debugging | DAX entries within NEXT-ITERATION 2.4's troubleshooting page |
| Cheat sheet & glossary | Existing Cheat Sheet page + `.term` definitions + planned Glossary page |
| Quizzes | Per NEXT-ITERATION 2.3's chosen mechanism |
| Interview questions | Within NEXT-ITERATION 2.5's career page |
| Reference links | "Learn more" section on the DAX Basics page (annotated, dated) |

Suggested build order: Level 4 rewrite + SVG first (highest concept value),
then Level 5, then pattern library, then problems, then the reference/extras.

## 10. Out of scope (named so nobody wonders)

Deliberately excluded at the agreed "CALCULATE mastery" ceiling: `VAR`/
`RETURN` variables, `RANKX` and ranking, `TREATAS`, calculation groups,
context transition in depth (`CALCULATE` inside iterators), `USERELATIONSHIP`
and role-playing dates, performance tuning (DAX Studio, Performance
Analyzer), and full data modeling (deferred Extended Module 09). Each gets
at most a one-line "this exists, here's where to read about it" pointer —
the reference links section carries students who want more.

---

## Appendix — changelog entry to paste when this file is added to the repo

```markdown
### 2026-08-15 — Added DAX-SCOPE.md: detailed DAX curriculum scope (Module 3 expansion)
- **Why:** maintainer asked for a basic→detailed DAX scope covering formulas,
  reference links, and problem statements/solutions; agreed additions in
  discussion: pattern library, errors & debugging guide, cheat sheet &
  glossary, quizzes & interview questions. Ceiling agreed at CALCULATE
  mastery; expert topics (VAR, RANKX, calc groups, performance) explicitly
  out of scope.
- Added `DAX-SCOPE.md`: five teaching levels mapped onto the four existing
  Module 3 pages plus one proposed new pattern-library page; 15 tiered
  problems; 10-entry DAX error guide; verified external reference links
  (Microsoft Learn, DAX Guide, SQLBI); site-integration map cross-referenced
  to NEXT-ITERATION.md items 2.1/2.3/2.4/2.5/2.6a.
- Flags to resolve at build time: how the existing Time Intelligence page
  handles the DimDate relationship (the single allowed exception to the
  no-join rule), AdventureWorksDW column verification for every formula, and
  whether inbuilt CSVs have enough date history for Tier B problems.
- Scope document only — no site content, fragments, or generated pages
  changed; no build run needed.
```
