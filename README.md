# Homeschool Portfolio — Florida annual record

**Live: <https://geraldlorenzopro.github.io/homeschool-portfolio/>**

A web app for a homeschooling parent to record a student's school year and generate a
print-ready **annual evaluation portfolio** for Florida's home education statute
(s. 1002.41, F.S.).

Built from the design handoff in [`design_handoff_homeschool_portfolio/`](design_handoff_homeschool_portfolio/),
which stays in the repo as the reference: `README.md` there is the spec, `styles.css` is
the design system's source of truth, and `Homeschool Portfolio.dc.html` is the interactive
prototype.

## Running it

```bash
npm install
```

```bash
npm run dev
```

It opens on <http://localhost:5173> and **works immediately** — with no Supabase project
configured it runs against a browser-local demo backend seeded with the sample year from
the design. A `Demo data · this browser only` chip in the nav says so.

## Connecting Supabase

1. Create a project at [supabase.com](https://supabase.com).
2. Run [`supabase/migrations/0001_init.sql`](supabase/migrations/0001_init.sql) in the SQL
   editor. It creates the seven tables, the row-level security policies, the two private
   storage buckets and their path-prefix policies.
3. Copy `.env.example` to `.env.local` and fill in the project URL and anon key
   (Project Settings → API).
4. Restart `npm run dev`. The app switches to Supabase automatically: sign-in becomes an
   email magic link, and the demo backend is no longer used.

There is nothing to change in code — `src/lib/supabase.ts` picks the backend from whether
the env vars are present.

## The three screens

| Route | Screen |
| --- | --- |
| `/` | **Section panel** — 268 px sidebar with the seven sections, entry counts and a year-completeness meter; the main column holds that section's editor |
| `/quick-log` | **Quick log** — one adaptive form (lesson / book finished / work sample) that files each entry into the right section, plus a chronological feed |
| `/portfolio` | **Finished portfolio** — the paginated document, Letter or A4, with a `Save as PDF` action |

Both dashboards write the same tables, so a parent can switch between them freely.

## How it is put together

```
src/
  lib/          supabase client, domain types, date/subject formatting, image downscaling
  data/         repository interface + Supabase and local implementations, seed year,
                TanStack Query store
  components/   DocPage wrapper, Plate/PlaceholderBox/Field primitives, toaster
  sections/     the seven section editors of screen 1
  routes/       SectionPanel, QuickLog, PortfolioDocument, SignIn
  styles/       classical.css — the handoff design system, vendored unchanged
supabase/migrations/0001_init.sql
public/doc-page.js
```

Two deliberate choices worth knowing about:

- **The design system is used as-is.** `src/styles/classical.css` is the handoff file,
  vendored rather than reimplemented, so `.btn`, `.input`, `.table`, `.card`, `.tag` and
  `.plate` are pixel-identical to the prototype. Its tokens are also mirrored into a
  Tailwind `@theme` block in `src/index.css` for layout utilities. shadcn/ui was skipped —
  its filled defaults fight the house rule that buttons and cards are outlined, never
  filled with accent. The only edit to `classical.css` was moving its webfont `@import`
  into `index.html`, which a bundled stylesheet cannot carry.
- **`public/doc-page.js` is the handoff's own web component**, loaded from `index.html`
  and used directly as `<doc-page>`. It owns the sheet box, the running header/footer
  slots and the `@page` rule, so the printed result is the design's pagination rather
  than a reimplementation of it. `src/types/doc-page.d.ts` declares it to JSX.

## Privacy

Support documents hold IEPs, medical letters and prior evaluations. Both storage buckets
are private; files are only ever served through signed URLs that expire in an hour, and
storage policies key on the `{user_id}/` path prefix. Images are downscaled to 900 px on
the long edge (JPEG q 0.72) in the browser before upload; uploads are capped at 15 MB.

## Deployment

Pushing to `main` builds and publishes to GitHub Pages
(`.github/workflows/deploy.yml`). The Supabase URL and publishable key come from
repository **variables**, not secrets — they are browser-safe by design and end up in
the bundle either way. The workflow copies `index.html` to `404.html` because Pages has
no rewrite rules, so a refresh on `/portfolio` would otherwise 404.

### Moving off GitHub Pages later

The frontend is a static bundle and the database stays where it is, so a move is
mostly a copy:

1. `VITE_BASE_PATH=/ npm run build` — the app reads the base back through `BASE_URL`,
   so serving from a domain root needs no code change.
2. Upload `dist/` to the new host (nginx on a VPS, Vercel, Netlify, S3 — all fine).
3. Add the new origin to Supabase → Authentication → URL Configuration → Redirect URLs.

`vercel.json` and `netlify.toml` are already written for those two hosts, including the
security headers GitHub Pages cannot serve. On a VPS the same headers translate almost
line for line into an nginx `add_header` block.

## Scripts

```bash
npm run build
```

```bash
npm run lint
```

```bash
npm test
```

The Playwright suite runs on port 5174 in Vite's `e2e` mode, against the browser-local
demo backend — it never touches the real Supabase project.

## Legal note

The Florida statute references (s. 1002.41) come from the design and describe the
portfolio's stated purpose. They are not legal advice — have the wording reviewed before
this goes to real families.
