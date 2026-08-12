import {
  SIGNED_URL_TTL_SECONDS,
  isSupabaseConfigured,
  supabase,
  type AppSupabaseClient,
} from '@/lib/supabase'
import { prepareUpload } from '@/lib/upload'
import { readAsDataUrl } from '@/lib/image'
import {
  MONTHS,
  blankYear,
  type MonthlyCurriculum,
  type MonthlySample,
  type MonthlyYear,
  type MonthRecord,
} from './model'

const PHOTO_BUCKET = 'portfolio-photos'
const SAMPLE_BUCKET = 'portfolio-work-samples'
const LOCAL_KEY = 'homeschool-monthly-fl-v1'
const YEAR_LABEL = '2025–2026'

/** Fields of the year record the forms can edit. */
export type YearPatch = Partial<
  Omit<MonthlyYear, 'subjects' | 'subject_ids' | 'months' | 'cover_photo' | 'label'>
>
export type MonthPatch = Partial<Omit<MonthRecord, 'marks'>>
export type CurriculumPatch = Partial<Omit<MonthlyCurriculum, 'id'>>
export type SamplePatch = Partial<Omit<MonthlySample, 'id' | 'url'>>

/**
 * Writes are granular on purpose. The portfolio is filled in across twelve
 * months, often a checkbox at a time — saving the whole year as one blob would
 * mean the last tab to load quietly overwrites everything typed elsewhere.
 */
export interface MonthlyRepo {
  readonly mode: 'supabase' | 'demo'
  load(studentId: string): Promise<MonthlyYear>
  updateYear(studentId: string, patch: YearPatch): Promise<void>
  setSubject(studentId: string, index: number, label: string): Promise<void>
  setDay(
    studentId: string,
    monthKey: string,
    subjectIndex: number,
    day: number,
    on: boolean,
  ): Promise<void>
  setMonth(studentId: string, monthKey: string, patch: MonthPatch): Promise<void>
  setCoverPhoto(studentId: string, file: File): Promise<void>

  addCurriculum(studentId: string): Promise<void>
  setCurriculum(studentId: string, id: string, patch: CurriculumPatch): Promise<void>
  removeCurriculum(studentId: string, id: string): Promise<void>

  /**
   * One row per file, in the order they were chosen. The picker takes a whole
   * folder at once; each file is still prepared, uploaded and filed on its own,
   * so one bad file cannot take the rest of the batch down with it.
   */
  addSamples(studentId: string, files: File[], patch?: SamplePatch): Promise<void>
  setSample(studentId: string, id: string, patch: SamplePatch): Promise<void>
  removeSample(studentId: string, id: string): Promise<void>
}

const uid = () => crypto.randomUUID()

const nextSort = (rows: { sort: number }[]) =>
  rows.reduce((n, r) => Math.max(n, r.sort ?? 0), 0) + 1

/** "worksheet-3.pdf" → "worksheet 3", so a fresh row is never nameless. */
function titleFromFile(file: File): string {
  return file.name.replace(/\.[^.]+$/, '').replace(/[_-]+/g, ' ').trim() || 'Work sample'
}

/** "2026-01" + 14 → "2026-01-14", the shape activity_log stores. */
function isoDay(monthKey: string, day: number): string {
  return `${monthKey}-${String(day).padStart(2, '0')}`
}

// ── demo backend ───────────────────────────────────────────────────────────

function createLocalMonthlyRepo(): MonthlyRepo {
  const read = (): MonthlyYear => {
    try {
      const raw = localStorage.getItem(LOCAL_KEY)
      if (raw) {
        const parsed = JSON.parse(raw) as MonthlyYear
        return {
          ...blankYear(),
          ...parsed,
          months: { ...blankYear().months, ...parsed.months },
        }
      }
    } catch {
      /* corrupt or unavailable — start clean rather than refusing to open */
    }
    return blankYear()
  }

  const write = (value: MonthlyYear) => {
    try {
      localStorage.setItem(LOCAL_KEY, JSON.stringify(value))
    } catch {
      throw new Error('This browser ran out of local storage.')
    }
  }

  const mutate = async (fn: (draft: MonthlyYear) => void) => {
    const data = read()
    fn(data)
    write(data)
  }

  return {
    mode: 'demo',
    async load() {
      return read()
    },
    async updateYear(_s, patch) {
      await mutate((d) => Object.assign(d, patch))
    },
    async setSubject(_s, index, label) {
      await mutate((d) => {
        d.subjects[index] = label
      })
    },
    async setDay(_s, monthKey, subjectIndex, day, on) {
      await mutate((d) => {
        const days = new Set(d.months[monthKey]?.marks[subjectIndex] ?? [])
        if (on) days.add(day)
        else days.delete(day)
        d.months[monthKey].marks[subjectIndex] = [...days].sort((a, b) => a - b)
      })
    },
    async setMonth(_s, monthKey, patch) {
      await mutate((d) => Object.assign(d.months[monthKey], patch))
    },
    async setCoverPhoto(_s, file) {
      const { blob } = await prepareUpload(file)
      const url = await readAsDataUrl(blob)
      await mutate((d) => {
        d.cover_photo = url
      })
    },

    async addCurriculum(_s) {
      await mutate((d) => {
        d.curriculums.push({
          id: uid(),
          title: '',
          publisher: '',
          subject: '',
          usage: '',
          sort: nextSort(d.curriculums),
        })
      })
    },
    async setCurriculum(_s, id, patch) {
      await mutate((d) => {
        const row = d.curriculums.find((c) => c.id === id)
        if (row) Object.assign(row, patch)
      })
    },
    async removeCurriculum(_s, id) {
      await mutate((d) => {
        d.curriculums = d.curriculums.filter((c) => c.id !== id)
      })
    },

    async addSamples(_s, files, patch) {
      // Same contract as the Supabase backend: a file that cannot be stored is
      // reported by name and the rest of the batch still lands. The two used to
      // differ, and only the one the tests never run would drop the remainder.
      const failures: string[] = []
      for (const file of files) {
        try {
          const { blob, mime } = await prepareUpload(file)
          const url = await readAsDataUrl(blob)
          await mutate((d) => {
            d.samples.push({
              id: uid(),
              title: titleFromFile(file),
              subject: '',
              month: '',
              sample_date: '',
              note: '',
              file_name: file.name,
              mime,
              size_bytes: blob.size,
              sort: nextSort(d.samples),
              url,
              ...patch,
            })
          })
        } catch (e) {
          failures.push(`${file.name}: ${(e as Error).message}`)
        }
      }
      if (failures.length) throw new Error(failures.join('\n'))
    },
    async setSample(_s, id, patch) {
      await mutate((d) => {
        const row = d.samples.find((w) => w.id === id)
        if (row) Object.assign(row, patch)
      })
    },
    async removeSample(_s, id) {
      await mutate((d) => {
        d.samples = d.samples.filter((w) => w.id !== id)
      })
    },
  }
}

// ── Supabase backend ───────────────────────────────────────────────────────

function fail(error: { message: string } | null): void {
  if (error) throw new Error(error.message)
}

const str = (v: unknown): string => (v == null ? '' : String(v))

/** The last sort in a list, so a new row lands at the end and never ties. */
async function nextSortIn(
  db: ReturnType<AppSupabaseClient['schema']>,
  table: 'curriculums' | 'work_samples',
  yearId: string,
): Promise<number> {
  const { data } = await db
    .from(table)
    .select('sort')
    .eq('school_year_id', yearId)
    .order('sort', { ascending: false })
    .limit(1)
    .maybeSingle()
  return ((data?.sort as number | undefined) ?? 0) + 1
}

function createSupabaseMonthlyRepo(sb: AppSupabaseClient): MonthlyRepo {
  // Everything in this schema is reached through the year, so it is worth
  // resolving once and holding on to.
  const db = sb.schema('portfolio')
  const yearIds = new Map<string, string>()

  async function ensureYear(studentId: string): Promise<string> {
    const cached = yearIds.get(studentId)
    if (cached) return cached

    const found = await db
      .from('school_years')
      .select('id')
      .eq('student_id', studentId)
      .eq('label', YEAR_LABEL)
      .limit(1)
    fail(found.error)

    let id = found.data?.[0]?.id as string | undefined
    if (!id) {
      const created = await db
        .from('school_years')
        .insert({ student_id: studentId, label: YEAR_LABEL })
        .select('id')
        .single()
      fail(created.error)
      id = created.data!.id as string
    }
    yearIds.set(studentId, id)
    return id
  }

  async function subjectIds(yearId: string): Promise<string[]> {
    const { data, error } = await db
      .from('subjects')
      .select('id, sort')
      .eq('school_year_id', yearId)
      .order('sort', { ascending: true })
    fail(error)
    return (data ?? []).map((r) => r.id as string)
  }

  return {
    mode: 'supabase',

    async load(studentId) {
      const yearId = await ensureYear(studentId)

      const [yearRes, subjectsRes, notesRes, curriculumsRes, samplesRes] = await Promise.all([
        db.from('school_years').select('*').eq('id', yearId).single(),
        db.from('subjects').select('id, label, sort').eq('school_year_id', yearId).order('sort'),
        db.from('monthly_notes').select('*').eq('school_year_id', yearId),
        db.from('curriculums').select('*').eq('school_year_id', yearId).order('sort'),
        db.from('work_samples').select('*').eq('school_year_id', yearId).order('sort'),
      ])
      fail(yearRes.error)
      fail(subjectsRes.error)
      fail(notesRes.error)
      fail(curriculumsRes.error)
      fail(samplesRes.error)

      const subjects = subjectsRes.data ?? []
      const ids = subjects.map((s) => s.id as string)

      const logRes = ids.length
        ? await db.from('activity_log').select('subject_id, day').in('subject_id', ids)
        : { data: [], error: null }
      fail(logRes.error)

      const year = blankYear()
      const row = yearRes.data!

      year.label = str(row.label) || YEAR_LABEL
      year.parent_name = str(row.parent_name)
      year.from_date = str(row.from_date)
      year.to_date = str(row.to_date)
      year.letter_of_intent_date = str(row.letter_of_intent_date)
      year.address = str(row.address)
      year.city = str(row.city)
      year.zip = str(row.zip)
      year.county = str(row.county) || 'Broward'
      year.belongs_to_me = str(row.belongs_to_me)
      year.notes = str(row.notes)
      year.checklist = (row.checklist as Record<string, boolean>) ?? {}
      year.subjects = subjects.map((s) => str(s.label))
      year.subject_ids = ids

      if (row.cover_photo_path) {
        const signed = await sb.storage
          .from(PHOTO_BUCKET)
          .createSignedUrl(row.cover_photo_path as string, SIGNED_URL_TTL_SECONDS)
        year.cover_photo = signed.data?.signedUrl ?? null
      }

      for (const note of notesRes.data ?? []) {
        const key = str(note.month).slice(0, 7)
        if (!year.months[key]) continue
        year.months[key].hours_notes = str(note.hours_notes)
        year.months[key].reading_materials = str(note.reading_materials)
        year.months[key].field_trips = str(note.field_trips)
        year.months[key].accomplishments = str(note.accomplishments)
      }

      const indexOf = new Map(ids.map((id, i) => [id, i]))
      for (const mark of logRes.data ?? []) {
        const day = str(mark.day)
        const key = day.slice(0, 7)
        const index = indexOf.get(mark.subject_id as string)
        if (index === undefined || !year.months[key]) continue
        ;(year.months[key].marks[index] ??= []).push(Number(day.slice(8, 10)))
      }
      for (const month of Object.values(year.months)) {
        for (const list of Object.values(month.marks)) list.sort((a, b) => a - b)
      }

      year.curriculums = (curriculumsRes.data ?? []).map((c) => ({
        id: c.id as string,
        title: str(c.title),
        publisher: str(c.publisher),
        subject: str(c.subject),
        usage: str(c.usage),
        sort: Number(c.sort ?? 0),
      }))

      // One request for the whole batch; a signed URL per file would be a
      // round trip per sample, and a year of them is a slow page.
      const paths = (samplesRes.data ?? [])
        .map((w) => w.storage_path as string | null)
        .filter((path): path is string => Boolean(path))
      const signed = new Map<string, string>()
      if (paths.length) {
        const res = await sb.storage
          .from(SAMPLE_BUCKET)
          .createSignedUrls(paths, SIGNED_URL_TTL_SECONDS)
        for (const item of res.data ?? []) {
          if (item.path && item.signedUrl) signed.set(item.path, item.signedUrl)
        }
      }

      year.samples = (samplesRes.data ?? []).map((w) => ({
        id: w.id as string,
        title: str(w.title),
        subject: str(w.subject),
        month: str(w.month),
        sample_date: str(w.sample_date),
        note: str(w.note),
        file_name: str(w.file_name),
        mime: (w.mime as string | null) ?? null,
        size_bytes: (w.size_bytes as number | null) ?? null,
        sort: Number(w.sort ?? 0),
        url: w.storage_path ? (signed.get(w.storage_path as string) ?? null) : null,
      }))

      return year
    },

    async updateYear(studentId, patch) {
      const yearId = await ensureYear(studentId)
      const body: Record<string, unknown> = { ...patch }
      // Empty date inputs must reach Postgres as null, not ''.
      for (const k of ['from_date', 'to_date', 'letter_of_intent_date']) {
        if (body[k] === '') body[k] = null
      }
      fail((await db.from('school_years').update(body).eq('id', yearId)).error)
    },

    async setSubject(studentId, index, label) {
      const yearId = await ensureYear(studentId)
      const ids = await subjectIds(yearId)
      const id = ids[index]
      if (!id) return
      fail((await db.from('subjects').update({ label }).eq('id', id)).error)
    },

    async setDay(studentId, monthKey, subjectIndex, day, on) {
      const yearId = await ensureYear(studentId)
      const ids = await subjectIds(yearId)
      const subjectId = ids[subjectIndex]
      if (!subjectId) return

      if (on) {
        // The unique key makes a double click harmless rather than an error.
        fail(
          (
            await db
              .from('activity_log')
              .upsert(
                { subject_id: subjectId, day: isoDay(monthKey, day) },
                { onConflict: 'subject_id,day' },
              )
          ).error,
        )
      } else {
        fail(
          (
            await db
              .from('activity_log')
              .delete()
              .eq('subject_id', subjectId)
              .eq('day', isoDay(monthKey, day))
          ).error,
        )
      }
    },

    async setMonth(studentId, monthKey, patch) {
      const yearId = await ensureYear(studentId)
      fail(
        (
          await db.from('monthly_notes').upsert(
            { school_year_id: yearId, month: `${monthKey}-01`, ...patch },
            { onConflict: 'school_year_id,month' },
          )
        ).error,
      )
    },

    async setCoverPhoto(studentId, file) {
      const yearId = await ensureYear(studentId)
      const { data: userData } = await sb.auth.getUser()
      const userId = userData.user?.id
      if (!userId) throw new Error('Not signed in.')

      const { blob, mime } = await prepareUpload(file)
      const path = `${userId}/${yearId}-${crypto.randomUUID()}.jpg`
      fail(
        (await sb.storage.from(PHOTO_BUCKET).upload(path, blob, { contentType: mime })).error,
      )

      const previous = await db.from('school_years').select('cover_photo_path').eq('id', yearId).single()
      fail((await db.from('school_years').update({ cover_photo_path: path }).eq('id', yearId)).error)

      const old = previous.data?.cover_photo_path as string | null
      if (old) await sb.storage.from(PHOTO_BUCKET).remove([old])
    },

    async addCurriculum(studentId) {
      const yearId = await ensureYear(studentId)
      fail(
        (
          await db.from('curriculums').insert({
            school_year_id: yearId,
            sort: await nextSortIn(db, 'curriculums', yearId),
          })
        ).error,
      )
    },
    async setCurriculum(_studentId, id, patch) {
      fail((await db.from('curriculums').update(patch).eq('id', id)).error)
    },
    async removeCurriculum(_studentId, id) {
      fail((await db.from('curriculums').delete().eq('id', id)).error)
    },

    async addSamples(studentId, files, patch) {
      const yearId = await ensureYear(studentId)
      const { data: userData } = await sb.auth.getUser()
      const userId = userData.user?.id
      if (!userId) throw new Error('Not signed in.')

      let sort = await nextSortIn(db, 'work_samples', yearId)
      const failures: string[] = []

      for (const file of files) {
        try {
          const { blob, mime } = await prepareUpload(file)
          const path = `${userId}/${yearId}/${crypto.randomUUID()}`
          fail(
            (await sb.storage.from(SAMPLE_BUCKET).upload(path, blob, { contentType: mime })).error,
          )

          const inserted = await db.from('work_samples').insert({
            school_year_id: yearId,
            title: titleFromFile(file),
            file_name: file.name,
            storage_path: path,
            mime,
            size_bytes: blob.size,
            sort: sort++,
            ...patch,
          })
          // The row is what makes the object reachable; without it the upload
          // is an orphan nobody can see or delete.
          if (inserted.error) {
            await sb.storage.from(SAMPLE_BUCKET).remove([path])
            throw new Error(inserted.error.message)
          }
        } catch (e) {
          failures.push(`${file.name}: ${(e as Error).message}`)
        }
      }

      // Whatever did upload is saved and visible; the rest is reported by name.
      if (failures.length) throw new Error(failures.join('\n'))
    },
    async setSample(_studentId, id, patch) {
      fail((await db.from('work_samples').update(patch).eq('id', id)).error)
    },
    async removeSample(_studentId, id) {
      const found = await db.from('work_samples').select('storage_path').eq('id', id).maybeSingle()
      fail((await db.from('work_samples').delete().eq('id', id)).error)
      const path = found.data?.storage_path as string | null
      if (path) await sb.storage.from(SAMPLE_BUCKET).remove([path])
    },
  }
}

export function createMonthlyRepo(): MonthlyRepo {
  return isSupabaseConfigured && supabase
    ? createSupabaseMonthlyRepo(supabase)
    : createLocalMonthlyRepo()
}

export { MONTHS }
