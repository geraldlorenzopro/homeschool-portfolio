# Security review

Reviewed before the first deployment. This app holds a **minor's** name, date of birth,
county, and uploaded IEPs, therapy plans and medical letters — the most sensitive category
of data an SMB-scale app is likely to touch. The controls below are sized for that.

## Threat model

The realistic threats, in order:

1. One family reading another family's portfolio or IEP.
2. An uploaded file being served in a way that runs as code.
3. A shared or leaked file link outliving the intent to share it.
4. Metadata leaking out of a photograph (a scan of a worksheet taken at home).

## Controls in place

### Data isolation

Every table has row-level security enabled and no policy that matches an anonymous
caller, so the default is deny. `students` is guarded directly on `user_id`; the six child
tables go through `public.owns_student(uuid)`, which joins back to `students.user_id`.
`revoke all on all tables in schema public from anon` makes signed-out access a
privilege error rather than an empty result.

`owns_student` is `security definer` so it can read `students` past that table's own RLS.
It takes a single uuid, contains no dynamic SQL, pins `search_path = public`, and is
executable only by `authenticated`.

Deleting an account cascades: `students.user_id references auth.users on delete cascade`,
and every child table cascades from `students`.

### File storage

Both buckets are **private**. Nothing is ever served from a public URL; reads go through
`createSignedUrls` with a one-hour expiry. Storage policies key on the first path segment
of the object key — objects live at `{user_id}/{student_id}/{uuid}-{filename}`, so
`(storage.foldername(name))[1] = auth.uid()::text` is the ownership check. Filenames are
sanitised to `[\w.-]` and a uuid prefix removes any collision or traversal concern.

### Upload validation

`src/lib/upload.ts` is the single gate, shared by both backends:

- `File.type` comes from the file extension and is attacker-controlled, so it never
  decides what is stored — the content type written to storage is derived here.
- Images are re-encoded through a canvas. That shrinks them and **discards everything
  that is not pixels, EXIF included** — a photo of a child's worksheet does not carry the
  home's GPS coordinates into a document handed to an evaluator.
- PDFs are checked for the `%PDF-` magic bytes, so an HTML file cannot be filed as one.
- Anything that is not an image or a PDF is refused, as is anything over 15 MB or empty.
- The bucket's own `allowed_mime_types` and `file_size_limit` enforce the same rules
  server-side, where the client cannot reach them.

Covered by `e2e/uploads.spec.ts` — a fake PDF and an oversized file are both rejected
with nothing written.

### Injection and XSS

No `dangerouslySetInnerHTML`, no `innerHTML`, no `eval` anywhere in `src/`. React escapes
all interpolated text. The one place a value lands in a CSS context — the `url()` behind
a `.plate` — is quoted and percent-encoded in `cssUrl()`. The "Open" link on a support
document carries `rel="noreferrer"` alongside `target="_blank"`.

### Transport and headers

`vercel.json` and `netlify.toml` both set, for every response: a Content-Security-Policy
restricting scripts to `'self'` and connections to `'self'` plus the Supabase origin,
`X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`,
`frame-ancestors 'none'`, `Referrer-Policy: strict-origin-when-cross-origin`,
`Permissions-Policy` denying camera/microphone/geolocation, and HSTS.

`style-src` keeps `'unsafe-inline'` because the `<doc-page>` component injects a
`<style>` element into its shadow root.

### Secrets

The only key in the bundle is the Supabase **anon** key, which is designed to be public —
RLS is what protects the data, not the key. `.env.local` is covered by the `*.local` line
in `.gitignore`. There is no service-role key anywhere in the client; nothing in this app
needs one.

## Accepted risks

- **Signed URLs are bearer tokens for an hour.** Anyone who obtains one within that
  window can read the file. Shortening the TTL is a one-line change in
  `src/lib/supabase.ts` if an hour feels long. A portfolio left open for more than an
  hour will show broken images until it is reloaded.
- **Sign-up is open.** `signInWithOtp` creates a user for any email that receives the
  link. That is right for a public product; restrict it in Supabase Auth settings if
  this is meant for a closed group.
- **PDFs are stored as uploaded.** They pass a magic-byte check but are not parsed or
  sanitised. They are served from the Supabase origin, cross-origin from the app, with
  `nosniff`, so a malicious PDF cannot reach the app's origin — the exposure is to the
  uploading family's own browser.
- **Demo mode keeps files in `localStorage`** as data URLs, unencrypted and readable by
  anything running on that origin. It exists so the app runs without a backend; it is
  not a place for a real IEP. The nav labels it `Demo data · this browser only`.

## Before real families use it

1. Turn on **point-in-time recovery** in Supabase — this is a year of work that cannot
   be reconstructed.
2. Confirm Supabase Auth **redirect URLs** list only the deployed origin, so a magic
   link cannot be redirected elsewhere.
3. Have the s. 1002.41 wording in the document reviewed. It came from the design and is
   not legal advice.
4. Decide on a data-retention answer: the footer promises the portfolio is "retained two
   years per s. 1002.41(1)(b)" — the app currently keeps data until the account is
   deleted.
