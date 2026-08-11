# Lovable — first prompt

Paste this into Lovable as the opening prompt, and upload `Homeschool Portfolio.dc.html`,
`styles.css` and `README.md` alongside it. Then build the remaining screens iteratively
using the README as the spec.

---

Build **Homeschool Portfolio** — a web app where a homeschooling parent records a
student's school year and generates a print-ready annual evaluation portfolio for
Florida's home education requirements.

Stack: React + TypeScript + Tailwind + shadcn/ui, with Supabase for auth, Postgres and
file storage. Enable Supabase and set up email auth from the start.

**Design system — follow it exactly.** Use the attached `styles.css` tokens as the
Tailwind theme. Ground `#f3f2f2`, ink `#201f1d`, single gold accent `#b68235`.
Headings in Cormorant Garamond (400/600), body in Lora. Buttons and cards are
**outlined, never filled with accent**; color appears as 1 px borders and hairline
rules; radius 4 px; shadows barely visible; numbers tabular. Icons: Lucide. The
attached `Homeschool Portfolio.dc.html` is the visual reference — open it and match it.

**Data model** (Supabase, RLS scoped to the signed-in user, one user → many students):
`students`, `subjects` (seeded: Language Arts, Mathematics), `activities`,
`curriculums`, `books`, `work_samples`, `support_documents`. Two **private** storage
buckets, `work-samples` and `support-documents`, accessed via signed URLs — support
documents hold IEPs and must never be public. Exact columns are in `README.md`.

**Screens**

1. **Dashboard (section panel)** — 268 px sidebar listing: Student information,
   Curriculum used, Support documents (IEP), Language Arts, Mathematics, Reading list,
   Work samples — each with an entry count, plus a "year completeness" progress bar.
   The main column shows the selected section's editor: a bordered add-card at the top
   and a table or card grid of existing entries below, each row removable.
2. **Quick log** — an alternate single-form flow: pick Lesson / Book / Work sample,
   fill one short form, and it files into the right section. Shows a chronological feed
   of everything entered.
3. **Portfolio (printable)** — the generated document: cover page, student & program
   record table, instructor's statement, curriculum table, activity log grouped by
   subject with hours, reading list, work-sample plates, uploaded support documents,
   and an evaluator certification block with signature lines. Paginated to Letter (A4
   option), running header and footer, `break-before: page` between major sections, and
   a "Save as PDF" action that prints only the document.

Start with auth, the Supabase schema and storage buckets, and screen 1 with the
Student information and Curriculum sections working end to end. I'll ask for the rest
after I see it.
