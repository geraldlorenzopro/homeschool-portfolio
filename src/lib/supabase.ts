import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

/**
 * True once a Supabase project is wired up in .env.local. Until then the app
 * runs against the browser-local demo backend, so it is usable out of the box.
 */
export const isSupabaseConfigured = Boolean(url && anonKey)

/**
 * Every table lives in the `homeschool` schema rather than `public`, so the
 * app can share a Supabase project with something else without either one
 * being able to name a table the other already owns. The schema must be
 * listed under Project Settings → API → Exposed schemas.
 */
export const DB_SCHEMA = 'homeschool'

// Left to inference: annotating it as SupabaseClient would pin the schema
// generic back to "public" and lose the one thing this client is configured for.
export const supabase = isSupabaseConfigured
  ? createClient(url!, anonKey!, {
      db: { schema: DB_SCHEMA },
      auth: { persistSession: true, autoRefreshToken: true },
    })
  : null

/** The client the repository is written against, schema generic included. */
export type AppSupabaseClient = NonNullable<typeof supabase>

export const WORK_SAMPLES_BUCKET = 'homeschool-work-samples'
export const SUPPORT_DOCS_BUCKET = 'homeschool-support-documents'

/** Signed URLs are short-lived; support documents must never be served publicly. */
export const SIGNED_URL_TTL_SECONDS = 60 * 60
