import {
  SIGNED_URL_TTL_SECONDS,
  SUPPORT_DOCS_BUCKET,
  WORK_SAMPLES_BUCKET,
  type AppSupabaseClient,
} from '@/lib/supabase'
import { prepareUpload } from '@/lib/upload'
import type { Portfolio, Student } from '@/lib/types'
import {
  BUCKET,
  TABLE,
  storageKey,
  type CollectionKey,
  type NewRow,
  type Repo,
  type RowPatch,
} from './repo'
import { sampledPortfolio } from './seed'

function fail(error: { message: string } | null): void {
  if (error) throw new Error(error.message)
}

/** Postgres hands back nulls; every text field in the UI is a plain string. */
const str = (v: unknown): string => (v == null ? '' : String(v))

/** Date and numeric columns reject '' — the UI's empty value must become null. */
const NULLABLE_BLANKS = [
  'date',
  'dob',
  'evaluation_date',
  'finished_on',
  'document_date',
  'diagnosis_date',
  'hours',
  'outcome_level',
  'goal_id',
  'area_id',
]

function forDatabase(input: Record<string, unknown>): Record<string, unknown> {
  const body: Record<string, unknown> = { ...input }
  delete body.url
  for (const key of NULLABLE_BLANKS) if (body[key] === '') body[key] = null
  return body
}

export function createSupabaseRepo(sb: AppSupabaseClient, userId: string): Repo {
  let studentIdPromise: Promise<string> | null = null

  /** One student per account for now; the schema allows several. */
  async function ensureStudentId(): Promise<string> {
    if (!studentIdPromise) {
      studentIdPromise = (async () => {
        const { data, error } = await sb
          .from('students')
          .select('id')
          .eq('user_id', userId)
          .order('created_at', { ascending: true })
          .limit(1)
        fail(error)
        if (data?.length) return data[0].id as string

        const created = await sb.from('students').insert({ user_id: userId }).select('id').single()
        fail(created.error)
        return created.data!.id as string
      })().catch((e) => {
        studentIdPromise = null
        throw e
      })
    }
    return studentIdPromise
  }

  /** Batch-sign a bucket's paths so uploads can be shown without going public. */
  async function signAll(bucket: string, paths: (string | null)[]) {
    const wanted = [...new Set(paths.filter((p): p is string => Boolean(p)))]
    const signed = new Map<string, string>()
    if (!wanted.length) return signed
    const { data, error } = await sb.storage
      .from(bucket)
      .createSignedUrls(wanted, SIGNED_URL_TTL_SECONDS)
    if (error) return signed
    for (const row of data ?? []) {
      if (row.path && row.signedUrl) signed.set(row.path, row.signedUrl)
    }
    return signed
  }

  async function upload(bucket: string, studentId: string, file: File) {
    // Validated, re-encoded and stripped of metadata before it leaves the
    // browser; the bucket's own mime allow-list is the second line of defence.
    const { blob, mime } = await prepareUpload(file)
    const path = storageKey(userId, studentId, file.name)
    const { error } = await sb.storage
      .from(bucket)
      .upload(path, blob, { contentType: mime, upsert: false })
    fail(error)
    return { storage_path: path, mime, size_bytes: blob.size, file_name: file.name }
  }

  async function fetchAll<T>(studentId: string, table: string, columns = '*'): Promise<T[]> {
    const { data, error } = await sb.from(table).select(columns).eq('student_id', studentId)
    fail(error)
    return (data ?? []) as T[]
  }

  // The rows are still loosely typed at this point, so read `sort` defensively.
  const bySort = (a: unknown, b: unknown) =>
    ((a as { sort?: number }).sort ?? 0) - ((b as { sort?: number }).sort ?? 0)

  return {
    mode: 'supabase',

    async getPortfolio(): Promise<Portfolio> {
      const studentId = await ensureStudentId()

      const studentRes = await sb.from('students').select('*').eq('id', studentId).single()
      fail(studentRes.error)
      const row = studentRes.data!

      const [areas, goals, entries, curriculums, books, workSamples, supportDocuments, evaluations, attachments] =
        await Promise.all([
          fetchAll<Record<string, unknown>>(studentId, TABLE.areas),
          fetchAll<Record<string, unknown>>(studentId, TABLE.goals),
          fetchAll<Record<string, unknown>>(studentId, TABLE.entries),
          fetchAll<Record<string, unknown>>(studentId, TABLE.curriculums),
          fetchAll<Record<string, unknown>>(studentId, TABLE.books),
          fetchAll<Record<string, unknown>>(studentId, TABLE.workSamples),
          fetchAll<Record<string, unknown>>(studentId, TABLE.supportDocuments),
          fetchAll<Record<string, unknown>>(studentId, TABLE.evaluations),
          fetchAll<Record<string, unknown>>(studentId, TABLE.attachments),
        ])

      const [sampleUrls, docUrls] = await Promise.all([
        signAll(
          WORK_SAMPLES_BUCKET,
          workSamples.map((w) => w.storage_path as string | null),
        ),
        signAll(SUPPORT_DOCS_BUCKET, [
          ...supportDocuments.map((f) => f.storage_path as string | null),
          ...evaluations.map((f) => f.storage_path as string | null),
          ...attachments.map((f) => f.storage_path as string | null),
        ]),
      ])

      /** Nulls out of Postgres become the empty strings the forms expect. */
      const text = (r: Record<string, unknown>, ...keys: string[]) => {
        const out: Record<string, unknown> = { ...r }
        for (const k of keys) out[k] = str(r[k])
        return out
      }
      const sign = (r: Record<string, unknown>, urls: Map<string, string>) => ({
        ...r,
        url: r.storage_path ? (urls.get(r.storage_path as string) ?? null) : null,
      })

      const student: Student = {
        id: row.id,
        name: str(row.name),
        dob: str(row.dob),
        grade: str(row.grade),
        school_year: str(row.school_year),
        parent_name: str(row.parent_name),
        county: str(row.county),
        evaluator: str(row.evaluator),
        evaluation_date: str(row.evaluation_date),
        statement: str(row.statement),
        diagnosis: str(row.diagnosis),
        diagnosis_date: str(row.diagnosis_date),
        diagnosed_by: str(row.diagnosed_by),
        no_formal_diagnosis: Boolean(row.no_formal_diagnosis),
        strengths: str(row.strengths),
        needs: str(row.needs),
        learns_best: str(row.learns_best),
        include_profile: Boolean(row.include_profile),
        show_dates: row.show_dates !== false,
        show_hours: Boolean(row.show_hours),
        show_activity_log: Boolean(row.show_activity_log),
      }

      return {
        student,
        areas: areas.map((a) => text(a, 'key', 'label')).sort(bySort),
        goals: goals.map((g) => text(g, 'text', 'status', 'source')).sort(bySort),
        entries: entries
          .map((e) => ({ ...text(e, 'title', 'method', 'outcome', 'date'), hours: str(e.hours) }))
          .sort(bySort),
        curriculums: curriculums.map((c) => text(c, 'title', 'publisher', 'usage')).sort(bySort),
        books: books.map((b) => text(b, 'title', 'author', 'how_read', 'finished_on')).sort(bySort),
        workSamples: workSamples
          .map((w) => sign(text(w, 'title', 'date'), sampleUrls))
          .sort(bySort),
        supportDocuments: supportDocuments.map((f) =>
          sign(text(f, 'title', 'kind', 'note', 'document_date'), docUrls),
        ),
        evaluations: evaluations
          .map((f) =>
            sign(text(f, 'title', 'kind', 'performed_by', 'summary', 'evaluation_date'), docUrls),
          )
          .sort(bySort),
        attachments: attachments.map((f) => sign(text(f, 'title', 'owner_type'), docUrls)),
      } as unknown as Portfolio
    },

    async updateStudent(patch) {
      const studentId = await ensureStudentId()
      const { error } = await sb
        .from('students')
        .update(forDatabase(patch as Record<string, unknown>))
        .eq('id', studentId)
      fail(error)
    },

    async add<K extends CollectionKey>(collection: K, input: NewRow<K>, file?: File | null) {
      const studentId = await ensureStudentId()
      const bucket = BUCKET[collection]
      const uploaded = file && bucket ? await upload(bucket, studentId, file) : null

      // The last sort, not the number of rows. Counting breaks as soon as
      // anything is deleted: delete one of 35 and the next row is inserted at
      // 35 too, tying with a row that is already there, and the two swap places
      // between refetches.
      const { data: last } = await sb
        .from(TABLE[collection])
        .select('sort')
        .eq('student_id', studentId)
        .order('sort', { ascending: false })
        .limit(1)
        .maybeSingle()

      const { data, error } = await sb
        .from(TABLE[collection])
        .insert({
          student_id: studentId,
          sort: ((last?.sort as number | undefined) ?? 0) + 1,
          ...forDatabase(input as Record<string, unknown>),
          ...(uploaded ?? {}),
        })
        .select('id')
        .single()
      if (error && uploaded && bucket) {
        await sb.storage.from(bucket).remove([uploaded.storage_path])
      }
      fail(error)
      return data!.id as string
    },

    async update<K extends CollectionKey>(
      collection: K,
      id: string,
      patch: RowPatch<K>,
      file?: File | null,
    ) {
      const studentId = await ensureStudentId()
      const bucket = BUCKET[collection]
      const uploaded = file && bucket ? await upload(bucket, studentId, file) : null

      // Replacing a file leaves the old object orphaned; clear it out after.
      let previousPath: string | null = null
      if (uploaded) {
        const { data } = await sb.from(TABLE[collection]).select('storage_path').eq('id', id).single()
        previousPath = (data?.storage_path as string | null) ?? null
      }

      const { error } = await sb
        .from(TABLE[collection])
        .update({ ...forDatabase(patch as Record<string, unknown>), ...(uploaded ?? {}) })
        .eq('id', id)
      fail(error)

      if (uploaded && previousPath && bucket) {
        await sb.storage.from(bucket).remove([previousPath])
      }
    },

    async remove<K extends CollectionKey>(collection: K, id: string) {
      // Files filed against this row have no meaning without it.
      if (collection !== 'attachments') {
        const orphans = await sb
          .from(TABLE.attachments)
          .select('storage_path')
          .eq('owner_id', id)
        const paths = (orphans.data ?? [])
          .map((r) => r.storage_path as string | null)
          .filter((p): p is string => Boolean(p))
        if (paths.length) await sb.storage.from(BUCKET.attachments!).remove(paths)
        await sb.from(TABLE.attachments).delete().eq('owner_id', id)
      }

      const bucket = BUCKET[collection]
      let path: string | null = null
      if (bucket) {
        const { data } = await sb.from(TABLE[collection]).select('storage_path').eq('id', id).single()
        path = (data?.storage_path as string | null) ?? null
      }
      fail((await sb.from(TABLE[collection]).delete().eq('id', id)).error)
      if (bucket && path) await sb.storage.from(bucket).remove([path])
    },

    async reorder<K extends CollectionKey>(collection: K, orderedIds: string[]) {
      // Small lists, and the write must land before the next refetch, so this
      // stays a straightforward sequence of updates rather than a batch upsert.
      await Promise.all(
        orderedIds.map((id, index) =>
          sb
            .from(TABLE[collection])
            .update({ sort: index + 1 })
            .eq('id', id),
        ),
      )
    },

    async resetToSample() {
      const studentId = await ensureStudentId()

      for (const collection of ['workSamples', 'supportDocuments', 'evaluations', 'attachments'] as const) {
        const bucket = BUCKET[collection]!
        const rows = await fetchAll<{ storage_path: string | null }>(
          studentId,
          TABLE[collection],
          'storage_path',
        )
        const paths = rows.map((r) => r.storage_path).filter((p): p is string => Boolean(p))
        if (paths.length) await sb.storage.from(bucket).remove(paths)
      }

      // Children before parents: entries and samples point at goals and areas.
      for (const table of [
        TABLE.attachments,
        TABLE.entries,
        TABLE.workSamples,
        TABLE.goals,
        TABLE.curriculums,
        TABLE.books,
        TABLE.supportDocuments,
        TABLE.evaluations,
        TABLE.areas,
      ]) {
        fail((await sb.from(table).delete().eq('student_id', studentId)).error)
      }

      const sample = sampledPortfolio(studentId)
      const { id: _id, ...studentFields } = sample.student
      fail(
        (
          await sb
            .from('students')
            .update(forDatabase(studentFields as unknown as Record<string, unknown>))
            .eq('id', studentId)
        ).error,
      )

      // Ids are carried over verbatim so the sample's cross-references survive.
      const withStudent = (rows: object[]) =>
        rows.map((r) => ({ student_id: studentId, ...forDatabase(r as Record<string, unknown>) }))

      for (const collection of [
        'areas',
        'goals',
        'entries',
        'curriculums',
        'books',
        'workSamples',
        'supportDocuments',
        'evaluations',
      ] as const) {
        const rows = sample[collection] as unknown as object[]
        if (!rows.length) continue
        fail((await sb.from(TABLE[collection]).insert(withStudent(rows))).error)
      }
    },
  }
}
