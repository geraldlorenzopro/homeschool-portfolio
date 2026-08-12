import {
  SIGNED_URL_TTL_SECONDS,
  isSupabaseConfigured,
  supabase,
  type AppSupabaseClient,
} from '@/lib/supabase'
import { prepareUpload } from '@/lib/upload'
import { readAsDataUrl } from '@/lib/image'
import { MONTHS, blankYear, type MonthlyYear, type MonthRecord } from './model'

const PHOTO_BUCKET = 'portfolio-photos'
const LOCAL_KEY = 'homeschool-monthly-fl-v1'
const YEAR_LABEL = '2025–2026'

/** Fields of the year record the forms can edit. */
export type YearPatch = Partial<
  Omit<MonthlyYear, 'subjects' | 'subject_ids' | 'months' | 'cover_photo' | 'label'>
>
export type MonthPatch = Partial<Omit<MonthRecord, 'marks'>>

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
  }
}

// ── Supabase backend ───────────────────────────────────────────────────────

function fail(error: { message: string } | null): void {
  if (error) throw new Error(error.message)
}

const str = (v: unknown): string => (v == null ? '' : String(v))

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

      const [yearRes, subjectsRes, notesRes] = await Promise.all([
        db.from('school_years').select('*').eq('id', yearId).single(),
        db.from('subjects').select('id, label, sort').eq('school_year_id', yearId).order('sort'),
        db.from('monthly_notes').select('*').eq('school_year_id', yearId),
      ])
      fail(yearRes.error)
      fail(subjectsRes.error)
      fail(notesRes.error)

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
  }
}

export function createMonthlyRepo(): MonthlyRepo {
  return isSupabaseConfigured && supabase
    ? createSupabaseMonthlyRepo(supabase)
    : createLocalMonthlyRepo()
}

export { MONTHS }
