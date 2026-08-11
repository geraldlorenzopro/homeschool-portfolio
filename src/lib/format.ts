import type { Activity, Subject, SubjectTag } from './types'

/** "Sep 8, 2025" — em dash when there is no date, as in the prototype. */
export function fmtDate(iso: string | null | undefined): string {
  if (!iso) return '—'
  const dt = new Date(iso + 'T00:00:00')
  if (Number.isNaN(dt.getTime())) return iso
  return dt.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

export function today(): string {
  return new Date().toISOString().slice(0, 10)
}

export function subjectLabel(key: string, subjects: Subject[]): string {
  if (key === 'other') return 'Multiple subjects'
  return subjects.find((s) => s.key === key)?.label ?? key
}

/** Curriculum / work-sample tags, which are stored as plain strings. */
export const SUBJECT_TAG_LABEL: Record<SubjectTag, string> = {
  ela: 'Language Arts',
  math: 'Mathematics',
  other: 'Multiple subjects',
}

export function hoursOf(a: Activity): number {
  return parseFloat(a.hours) || 0
}

export function sumHours(activities: Activity[]): number {
  return activities.reduce((n, a) => n + hoursOf(a), 0)
}

/** Newest first — the order every editor list uses. */
export function byDateDesc<T extends { date?: string; finished_on?: string }>(
  a: T,
  b: T,
): number {
  const av = a.date ?? a.finished_on ?? ''
  const bv = b.date ?? b.finished_on ?? ''
  return av < bv ? 1 : av > bv ? -1 : 0
}

/** Oldest first — the order the printed document uses. */
export function byDateAsc<T extends { date?: string; finished_on?: string }>(
  a: T,
  b: T,
): number {
  return -byDateDesc(a, b)
}

export function fileSizeLabel(bytes: number | null | undefined): string {
  if (!bytes) return ''
  return Math.round(bytes / 1024) + ' KB'
}
