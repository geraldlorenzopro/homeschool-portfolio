# Handoff: Homeschool Evaluation Portfolio (Florida)

## Overview

Web app for a homeschooling parent to record a student's school year and generate a
print-ready **annual evaluation portfolio** that satisfies Florida's home education
statute (s. 1002.41, F.S.): a log of educational activities, the curriculum used, a
reading list, samples of work, uploaded support documents (IEP), and an evaluator
certification block.

The parent enters data all year in a dashboard; the app renders the portfolio as a
paginated document that prints to PDF.

**Target sandbox:** Lovable (React + Vite + TypeScript + Tailwind + shadcn/ui, with
Supabase for auth, database and file storage). If the project is built elsewhere, keep
the data model and behavior and use that stack's conventions.

## About the design files

The files in this bundle are **design references created in HTML** — a working
prototype showing the intended look and behavior, not production code to copy. The
task is to **recreate these designs in the target codebase** using its framework,
component library and patterns, and to add the real backend (auth, database, file
storage, PDF) that the prototype fakes with browser localStorage.

- `Homeschool Portfolio.dc.html` — the full prototype (3 views). Open it in a browser
  to see the intended result. Its markup is inline-styled by design; do not copy it
  verbatim.
- `doc-page.js` — the paged-document component used for the printable portfolio view.
- `styles.css` — the "Classical" design system stylesheet: **the source of truth for
  every color, font and spacing value.** Port these tokens into the target app
  (Tailwind theme / CSS variables).

## Fidelity

**High fidelity.** Colors, typography, spacing and layout in the prototype are final
and should be reproduced faithfully. Copy (English UI text) is final too — reuse it.

---

## Data model (Postgres / Supabase)

All tables are scoped to an authenticated user and protected by row-level security.
One user may have several students (the prototype shows one; the schema allows more).

```sql
-- students
id uuid pk, user_id uuid fk auth.users, name text, dob date, grade text,
school_year text, parent_name text, county text, evaluator text,
evaluation_date date, statement text, created_at timestamptz

-- subjects  (fixed seed rows per student, user-extensible)
id uuid pk, student_id uuid fk, key text, label text, sort int
-- seeded: ('ela','Language Arts',1), ('math','Mathematics',2)

-- activities   (the log of educational activities)
id uuid pk, student_id uuid fk, subject_id uuid fk, date date,
title text, notes text, hours numeric(5,2), created_at timestamptz

-- curriculums
id uuid pk, student_id uuid fk, title text, publisher text,
subject text,           -- 'ela' | 'math' | 'other'  ('other' renders "Multiple subjects")
usage text, sort int

-- books   (reading list)
id uuid pk, student_id uuid fk, title text, author text,
finished_on date, how_read text     -- e.g. "Read aloud together" / "Read independently"

-- work_samples
id uuid pk, student_id uuid fk, title text, subject text, date date,
storage_path text, mime text        -- image in Supabase Storage

-- support_documents   (IEP and related)
id uuid pk, student_id uuid fk, title text,
kind text,   -- 'IEP' | '504 Plan' | 'Therapy / service plan' | 'Prior evaluation' | 'Medical letter' | 'Other'
document_date date, note text,
storage_path text, file_name text, mime text, size_bytes bigint
```

**Storage:** two private buckets, `work-samples` and `support-documents`, paths
`{user_id}/{student_id}/{uuid}-{filename}`. Serve through signed URLs (1 h). Accept
`image/*` and `application/pdf`; cap at 15 MB. Downscale images client-side to
900 px on the long edge, JPEG q 0.72, before upload (the prototype does this).
Support documents may contain sensitive medical/educational data — private bucket,
signed URLs only, never public.

**RLS:** every table `using (auth.uid() = user_id)` — for child tables, via a join on
`students.user_id`. Storage policies match the `{user_id}/` path prefix.

---

## Screens

### 1. Dashboard — "Section panel" (primary editor)

Two-column layout: a **268 px sidebar** (right border `--color-divider`, 28 px / 20 px
padding) and a **main column** capped at 900 px, padding 36 px / 40 px / 80 px.

**Sidebar**
- Kicker: "Flow A", 10 px, uppercase, letter-spacing .12em, `--color-accent`.
- Explanatory paragraph, 13 px, line-height 1.5, opacity .75.
- Section list — one button per section, full width, 8 px/10 px padding, radius 4 px,
  14 px type. Active: background `color-mix(in srgb, var(--color-accent) 10%, transparent)`,
  text `--color-accent-800`. Right side shows the item count (or ✓ for Student
  information), 11 px, tabular numerals, accent when > 0 else `--color-neutral-500`.
  Sections, in order: **Student information · Curriculum used · Support documents (IEP)
  · Language Arts · Mathematics · Reading list · Work samples**.
- Hairline `.hr`, then a **year completeness** meter: label row 12 px opacity .7,
  4 px track `--color-neutral-200` with an accent fill = (sections with content ÷ total
  sections). Below it a ghost button "Reset to sample data".

**Main column** — h1 34 px, weight 400, section title; a 14 px opacity .7 subtitle
capped at 60ch; then the section's editor:

- **Student information** — 2-column grid, 18 px gap, max 680 px: Student name, Date of
  birth (date), Grade level, School year, Parent / instructor, County of registration,
  Evaluator, Evaluation date (date), and a full-width textarea "Instructor's statement
  of the year". Saves on change (debounce 500 ms).
- **Curriculum used** — bordered add-card (1 px divider, radius 4 px, 20 px padding),
  grid of 2 columns min 200 px, gaps 12/16: full-width *Curriculum or program*,
  then *Publisher or author* and *Subject* (select: Language Arts / Mathematics /
  Multiple subjects), full-width *How it was used*, then the primary button
  "Add curriculum" on its own row. Below: a `.table` with columns Curriculum,
  Publisher, Subject, How it was used, Remove.
- **Support documents (IEP)** — same bordered card: full-width *Document title*,
  then *Type* (select, values listed in the schema) and *Document date*, full-width
  *Why it is included*, a file input (`application/pdf,image/*`) with the picked
  file name + KB shown beneath, and "Attach document" on its own row. Below: a card
  grid (auto-fill, min 240 px, 20 px gap) — each item is a `.plate` preview (image
  thumbnail 150 px, or a hatched placeholder for PDFs), a `.tag.tag-accent` with the
  file type, the title, meta line `kind · date · filename`, the note, and Open /
  Remove actions.
- **Language Arts / Mathematics** — add-card with Date (150 px), *What was covered*,
  Hours (number, step .5), full-width *Materials, method, outcome* textarea, and the
  button "Add to {subject}". Below: a `.table` — Date, Activity (title + notes as a
  12 px .6-opacity second line), Hours, Remove. Newest first.
- **Reading list** — add-card: Title, Author, Finished (date), "Add book", plus a
  full-width *How it was read*. Table: Title (italic), Author, How it was read,
  Finished, Remove.
- **Work samples** — add-card: *What the work is*, Subject select, Date, "Add sample",
  full-width image file input. Below: figure grid (auto-fill, min 210 px) with `.plate`
  thumbnails 150 px tall, caption title + `subject · date`, Remove.

### 2. Dashboard — "Quick log" (alternate entry flow, same data)

Centered column, max 820 px. A segmented row of three outlined buttons —
**Lesson or activity · Book finished · Work sample** — then one form that adapts:
Date, a title field whose label/placeholder changes per kind, a right-hand field that
is *Author* for books and a *Subject* select otherwise, a full-width Notes textarea,
plus Hours for lessons and a file input for samples. A caption under the save button
states where the entry lands ("Files into: Reading list"). Below, a chronological feed
grouped by hairline rows: 92 px date column, a `.tag.tag-accent` kind label, the title,
a 13 px meta line, and Remove. Header shows "N entries · N books · N hours".

Both flows write to the same tables; the app should let a user switch freely.

### 3. Finished portfolio (printable document)

A toolbar row (14 px/28 px, bottom divider) with an explanatory line and a primary
"Save as PDF" button, then the document itself on a paginated sheet
(Letter default, A4 option; 0.8 in margins).

Document typography is in **points**, on white, with `--color-neutral-*` greys:
- Running header: student name — "Home Education Portfolio" (left), school year
  (right), 9 pt, `#605d5d`, bottom hairline `#d7d3d3`.
- Running footer: "Home education portfolio · retained two years per s. 1002.41(1)(b),
  F.S." and the parent name, 8.5 pt `#7d7979`, top hairline.
- **Cover**: gold 9 pt uppercase kicker "State of Florida · Home Education Program";
  h1 Cormorant Garamond 40 pt weight 400 "Annual Evaluation Portfolio"; student name
  15 pt italic; 10 pt grey line `grade · year · county County`; a 90 pt gold rule.
- **Student & program record** — 2-column table, left cell 34 % uppercase 9.5 pt grey
  labels, rows separated by `#e5e2e2`: Student, Date of birth, Grade level, School year,
  Parent / instructor, County of registration, Evaluator, Recorded instructional hours
  (computed sum + "hours logged across Language Arts and Mathematics").
- **Instructor's statement** — 10.5 pt, line-height 1.65, justified.
- **Curriculum used** — table (Curriculum + usage as a 9 pt grey sub-line, Publisher,
  Subject); header row uppercase 9 pt grey over a gold 1 px rule.
- **Log of educational activities** (new page) — grouped by subject by default, with a
  per-group header (13 pt Cormorant semibold) and a right-aligned "N entries · N
  recorded hours"; rows are Date (78 pt, tabular) / title + em-dash grey notes / hours
  right-aligned. Options: hide hours; single chronological list instead of groups.
- **Reading list** (new page) — Title (italic), Author, How it was read, Finished.
- **Samples of work** (new page) — 2-column grid of plates, 20 pt gap, caption 9.5 pt.
- **Support documents** (new page) — per document: title + meta on a gold-rule header,
  the note as a 10 pt paragraph, then the file (image rendered `contain` at 190 pt; PDFs
  as a placeholder plate reading "PDF attached — filed with this portfolio").
- **Evaluator's certification** — a gold top rule, the statutory sentence
  ("The undersigned Florida-certified teacher has reviewed this portfolio and discussed
  the year's work with the student and parent, in accordance with s. 1002.41(1)(f),
  Florida Statutes."), then two signature rules — evaluator name and date — with 8.5 pt
  uppercase captions "Evaluator signature" / "Date".

Every section is omitted when it has no rows. All page breaks use
`break-before: page` / `break-inside: avoid`.

---

## Interactions & behavior

- Sections save immediately; text inputs debounce 500 ms. Optimistic UI, toast on error.
- "Add" buttons are no-ops when the title field is empty. Adding clears the form but
  keeps the date and subject/type sticky for fast repeat entry.
- Remove asks for confirmation only for uploaded files (they delete from Storage too).
- Lists sort newest-first in the editor, oldest-first in the document.
- Completeness meter = sections with ≥ 1 row (or a filled student record) ÷ total.
- Print: the portfolio route must render on a real paginated sheet with running
  header/footer, no browser URL/date chrome. Either `window.print()` with `@page`
  rules on a print-only route, or server-side PDF (Puppeteer/`react-pdf`) if the sandbox
  allows it. Print CSS must hide the app chrome and the toolbar.
- Responsive: below 900 px the sidebar collapses to a top select/drawer; the add-card
  grids fall to one column. The portfolio view stays fixed-width and scrolls.
- Empty states: each section shows a one-line prompt instead of an empty table.

## State

Server state via TanStack Query (or Supabase realtime) keyed by `student_id`; local
form state per add-card. No global store needed. Auth: Supabase email magic link;
unauthenticated users land on a marketing/sign-in page.

## Design tokens (from `styles.css` — do not invent values)

```
bg #f3f2f2   surface #eae9e9   text #201f1d   accent #b68235
divider color-mix(in srgb, #201f1d 16%, transparent)
neutral 100→900  #f8f4f4 #eae7e7 #d7d3d3 #bab6b6 #9b9797 #7d7979 #605d5d #444141 #2d2b2b
accent  100→900  #fff3e4 #ffe3bf #facb8d #e1ad66 #c28d41 #a06f24 #7d5411 #5a3b0a #3a270d
font-heading "Cormorant Garamond" (weights 400/600)   font-body "Lora"
space 4.6 / 9.2 / 13.8 / 18.4 / 27.6 / 36.8 px
radius sm 2  md 4  lg 7
shadow-sm 0 1px 2px rgba(45,43,43,.14) · md 0 3px 10px rgba(45,43,43,.16) · lg 0 12px 32px rgba(45,43,43,.22)
```

House rules: buttons and cards are **outlined, never filled** with accent; color is
applied as rules and borders; body copy is justified in the document; photographs are
matted in the `.plate` wrapper; numbers set tabular; focus ring is
`2px solid var(--color-accent)` with 2 px offset. Icons: Lucide.

## Assets

None shipped. Work samples and support documents are user uploads; the prototype draws
hatched placeholder boxes where a file is missing — keep that treatment.

## Files in this bundle

- `README.md` — this spec
- `LOVABLE_PROMPT.md` — a paste-ready first prompt for the Lovable sandbox
- `Homeschool Portfolio.dc.html` — the interactive design reference
- `doc-page.js` — paged-document component used by the printable view
- `styles.css` — design system tokens and component classes

## Legal note

Florida statute references (s. 1002.41) reflect the portfolio's stated purpose in the
design and are not legal advice; the wording in the document should be reviewed before
launch.
