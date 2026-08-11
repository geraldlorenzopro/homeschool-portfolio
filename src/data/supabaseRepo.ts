import {
  SIGNED_URL_TTL_SECONDS,
  SUPPORT_DOCS_BUCKET,
  WORK_SAMPLES_BUCKET,
  type AppSupabaseClient,
} from '@/lib/supabase'
import { prepareUpload } from '@/lib/upload'
import type {
  Activity,
  Book,
  Curriculum,
  Portfolio,
  Student,
  Subject,
  SupportDocument,
  WorkSample,
} from '@/lib/types'
import {
  storageKey,
  type NewActivity,
  type NewBook,
  type NewCurriculum,
  type NewSupportDocument,
  type NewWorkSample,
  type Repo,
} from './repo'
import { sampledPortfolio } from './seed'

function fail(error: { message: string } | null): void {
  if (error) throw new Error(error.message)
}

/** Postgres hands back nulls; every text field in the UI is a plain string. */
const str = (v: unknown): string => (v == null ? '' : String(v))

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

        const created = await sb
          .from('students')
          .insert({ user_id: userId })
          .select('id')
          .single()
        fail(created.error)
        return created.data!.id as string
      })().catch((e) => {
        studentIdPromise = null
        throw e
      })
    }
    return studentIdPromise
  }

  async function subjectMap(studentId: string): Promise<Subject[]> {
    const { data, error } = await sb
      .from('subjects')
      .select('id, key, label, sort')
      .eq('student_id', studentId)
      .order('sort', { ascending: true })
    fail(error)
    return (data ?? []) as Subject[]
  }

  /** Batch-sign a bucket's paths. Falls back to null for anything unsigned. */
  async function signAll(
    bucket: string,
    paths: (string | null)[],
  ): Promise<Map<string, string>> {
    const wanted = paths.filter((p): p is string => Boolean(p))
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

  async function upload(
    bucket: string,
    studentId: string,
    file: File,
  ): Promise<{ path: string; mime: string; size: number }> {
    // Validated, re-encoded and stripped of metadata before it leaves the
    // browser; the bucket's own mime allow-list is the second line of defence.
    const { blob: body, mime } = await prepareUpload(file)
    const path = storageKey(userId, studentId, file.name)
    const { error } = await sb.storage
      .from(bucket)
      .upload(path, body, { contentType: mime, upsert: false })
    fail(error)
    return { path, mime, size: body.size }
  }

  async function removeObject(bucket: string, path: string | null): Promise<void> {
    if (!path) return
    await sb.storage.from(bucket).remove([path])
  }

  return {
    mode: 'supabase',

    async getPortfolio(): Promise<Portfolio> {
      const studentId = await ensureStudentId()

      const [studentRes, subjects, activitiesRes, curriculumsRes, booksRes, samplesRes, docsRes] =
        await Promise.all([
          sb.from('students').select('*').eq('id', studentId).single(),
          subjectMap(studentId),
          sb
            .from('activities')
            .select('id, subject_id, date, title, notes, hours')
            .eq('student_id', studentId),
          sb
            .from('curriculums')
            .select('id, title, publisher, subject, usage, sort')
            .eq('student_id', studentId)
            .order('sort', { ascending: true }),
          sb
            .from('books')
            .select('id, title, author, finished_on, how_read')
            .eq('student_id', studentId),
          sb
            .from('work_samples')
            .select('id, title, subject, date, storage_path, mime')
            .eq('student_id', studentId),
          sb
            .from('support_documents')
            .select(
              'id, title, kind, document_date, note, storage_path, file_name, mime, size_bytes',
            )
            .eq('student_id', studentId),
        ])

      fail(studentRes.error)
      fail(activitiesRes.error)
      fail(curriculumsRes.error)
      fail(booksRes.error)
      fail(samplesRes.error)
      fail(docsRes.error)

      const keyOf = new Map(subjects.map((s) => [s.id, s.key]))
      const row = studentRes.data!

      const sampleRows = (samplesRes.data ?? []) as WorkSample[]
      const docRows = (docsRes.data ?? []) as SupportDocument[]
      const [sampleUrls, docUrls] = await Promise.all([
        signAll(WORK_SAMPLES_BUCKET, sampleRows.map((w) => w.storage_path)),
        signAll(SUPPORT_DOCS_BUCKET, docRows.map((f) => f.storage_path)),
      ])

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
      }

      return {
        student,
        subjects,
        activities: (activitiesRes.data ?? []).map(
          (a): Activity => ({
            id: a.id,
            subject_key: keyOf.get(a.subject_id) ?? '',
            date: str(a.date),
            title: str(a.title),
            notes: str(a.notes),
            hours: a.hours == null ? '' : String(a.hours),
          }),
        ),
        curriculums: (curriculumsRes.data ?? []).map(
          (c): Curriculum => ({
            id: c.id,
            title: str(c.title),
            publisher: str(c.publisher),
            subject: (c.subject ?? 'ela') as Curriculum['subject'],
            usage: str(c.usage),
            sort: c.sort ?? 0,
          }),
        ),
        books: (booksRes.data ?? []).map(
          (b): Book => ({
            id: b.id,
            title: str(b.title),
            author: str(b.author),
            finished_on: str(b.finished_on),
            how_read: str(b.how_read),
          }),
        ),
        workSamples: sampleRows.map((w) => ({
          ...w,
          title: str(w.title),
          date: str(w.date),
          url: w.storage_path ? (sampleUrls.get(w.storage_path) ?? null) : null,
        })),
        supportDocuments: docRows.map((f) => ({
          ...f,
          title: str(f.title),
          note: str(f.note),
          document_date: str(f.document_date),
          url: f.storage_path ? (docUrls.get(f.storage_path) ?? null) : null,
        })),
      }
    },

    async updateStudent(patch) {
      const studentId = await ensureStudentId()
      // Empty date inputs must reach Postgres as null, not ''.
      const body: Record<string, unknown> = { ...patch }
      for (const k of ['dob', 'evaluation_date']) {
        if (body[k] === '') body[k] = null
      }
      const { error } = await sb.from('students').update(body).eq('id', studentId)
      fail(error)
    },

    async addActivity(input: NewActivity) {
      const studentId = await ensureStudentId()
      const subjects = await subjectMap(studentId)
      const subject = subjects.find((s) => s.key === input.subject_key)
      if (!subject) throw new Error(`Unknown subject "${input.subject_key}".`)
      const { error } = await sb.from('activities').insert({
        student_id: studentId,
        subject_id: subject.id,
        date: input.date || null,
        title: input.title,
        notes: input.notes,
        hours: input.hours === '' ? null : Number(input.hours),
      })
      fail(error)
    },
    async deleteActivity(id) {
      fail((await sb.from('activities').delete().eq('id', id)).error)
    },

    async addCurriculum(input: NewCurriculum) {
      const studentId = await ensureStudentId()
      const { count } = await sb
        .from('curriculums')
        .select('id', { count: 'exact', head: true })
        .eq('student_id', studentId)
      const { error } = await sb
        .from('curriculums')
        .insert({ student_id: studentId, ...input, sort: (count ?? 0) + 1 })
      fail(error)
    },
    async deleteCurriculum(id) {
      fail((await sb.from('curriculums').delete().eq('id', id)).error)
    },

    async addBook(input: NewBook) {
      const studentId = await ensureStudentId()
      const { error } = await sb
        .from('books')
        .insert({ student_id: studentId, ...input, finished_on: input.finished_on || null })
      fail(error)
    },
    async deleteBook(id) {
      fail((await sb.from('books').delete().eq('id', id)).error)
    },

    async addWorkSample(input: NewWorkSample, file: File | null) {
      const studentId = await ensureStudentId()
      const uploaded = file ? await upload(WORK_SAMPLES_BUCKET, studentId, file) : null
      const { error } = await sb.from('work_samples').insert({
        student_id: studentId,
        title: input.title,
        subject: input.subject,
        date: input.date || null,
        storage_path: uploaded?.path ?? null,
        mime: uploaded?.mime ?? null,
      })
      if (error && uploaded) await removeObject(WORK_SAMPLES_BUCKET, uploaded.path)
      fail(error)
    },
    async deleteWorkSample(id) {
      const { data } = await sb.from('work_samples').select('storage_path').eq('id', id).single()
      fail((await sb.from('work_samples').delete().eq('id', id)).error)
      await removeObject(WORK_SAMPLES_BUCKET, data?.storage_path ?? null)
    },

    async addSupportDocument(input: NewSupportDocument, file: File | null) {
      const studentId = await ensureStudentId()
      const uploaded = file ? await upload(SUPPORT_DOCS_BUCKET, studentId, file) : null
      const { error } = await sb.from('support_documents').insert({
        student_id: studentId,
        title: input.title.trim() || (file?.name ?? 'Document'),
        kind: input.kind,
        document_date: input.document_date || null,
        note: input.note,
        storage_path: uploaded?.path ?? null,
        file_name: file?.name ?? null,
        mime: uploaded?.mime ?? null,
        size_bytes: uploaded?.size ?? null,
      })
      if (error && uploaded) await removeObject(SUPPORT_DOCS_BUCKET, uploaded.path)
      fail(error)
    },
    async deleteSupportDocument(id) {
      const { data } = await sb
        .from('support_documents')
        .select('storage_path')
        .eq('id', id)
        .single()
      fail((await sb.from('support_documents').delete().eq('id', id)).error)
      await removeObject(SUPPORT_DOCS_BUCKET, data?.storage_path ?? null)
    },

    async resetToSample() {
      const studentId = await ensureStudentId()

      // Clear stored objects first, then the rows that point at them.
      const [samples, docs] = await Promise.all([
        sb.from('work_samples').select('storage_path').eq('student_id', studentId),
        sb.from('support_documents').select('storage_path').eq('student_id', studentId),
      ])
      const samplePaths = (samples.data ?? [])
        .map((r) => r.storage_path)
        .filter((p): p is string => Boolean(p))
      const docPaths = (docs.data ?? [])
        .map((r) => r.storage_path)
        .filter((p): p is string => Boolean(p))
      if (samplePaths.length) await sb.storage.from(WORK_SAMPLES_BUCKET).remove(samplePaths)
      if (docPaths.length) await sb.storage.from(SUPPORT_DOCS_BUCKET).remove(docPaths)

      for (const table of [
        'activities',
        'curriculums',
        'books',
        'work_samples',
        'support_documents',
      ]) {
        fail((await sb.from(table).delete().eq('student_id', studentId)).error)
      }

      const sample = sampledPortfolio(studentId)
      const subjects = await subjectMap(studentId)
      const idOf = new Map(subjects.map((s) => [s.key, s.id]))

      const { student } = sample
      fail(
        (
          await sb
            .from('students')
            .update({
              name: student.name,
              dob: student.dob,
              grade: student.grade,
              school_year: student.school_year,
              parent_name: student.parent_name,
              county: student.county,
              evaluator: student.evaluator,
              evaluation_date: student.evaluation_date,
              statement: student.statement,
            })
            .eq('id', studentId)
        ).error,
      )

      fail(
        (
          await sb.from('activities').insert(
            sample.activities
              .filter((a) => idOf.has(a.subject_key))
              .map((a) => ({
                student_id: studentId,
                subject_id: idOf.get(a.subject_key)!,
                date: a.date,
                title: a.title,
                notes: a.notes,
                hours: Number(a.hours),
              })),
          )
        ).error,
      )
      fail(
        (
          await sb.from('curriculums').insert(
            sample.curriculums.map((c) => ({
              student_id: studentId,
              title: c.title,
              publisher: c.publisher,
              subject: c.subject,
              usage: c.usage,
              sort: c.sort,
            })),
          )
        ).error,
      )
      fail(
        (
          await sb.from('books').insert(
            sample.books.map((b) => ({
              student_id: studentId,
              title: b.title,
              author: b.author,
              finished_on: b.finished_on,
              how_read: b.how_read,
            })),
          )
        ).error,
      )
      fail(
        (
          await sb.from('work_samples').insert(
            sample.workSamples.map((w) => ({
              student_id: studentId,
              title: w.title,
              subject: w.subject,
              date: w.date,
            })),
          )
        ).error,
      )
      fail(
        (
          await sb.from('support_documents').insert(
            sample.supportDocuments.map((f) => ({
              student_id: studentId,
              title: f.title,
              kind: f.kind,
              document_date: f.document_date,
              note: f.note,
              file_name: f.file_name,
              mime: f.mime,
            })),
          )
        ).error,
      )
    },
  }
}
