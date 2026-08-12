import { useCallback, useEffect, useRef, useState } from 'react'

/** August 2025 → July 2026, the order the printed portfolio runs in. */
export const MONTHS: { key: string; label: string; year: number; month: number }[] = [
  ['2025-08', 'August 2025', 2025, 8],
  ['2025-09', 'September 2025', 2025, 9],
  ['2025-10', 'October 2025', 2025, 10],
  ['2025-11', 'November 2025', 2025, 11],
  ['2025-12', 'December 2025', 2025, 12],
  ['2026-01', 'January 2026', 2026, 1],
  ['2026-02', 'February 2026', 2026, 2],
  ['2026-03', 'March 2026', 2026, 3],
  ['2026-04', 'April 2026', 2026, 4],
  ['2026-05', 'May 2026', 2026, 5],
  ['2026-06', 'June 2026', 2026, 6],
  ['2026-07', 'July 2026', 2026, 7],
].map(([key, label, year, month]) => ({
  key: key as string,
  label: label as string,
  year: year as number,
  month: month as number,
}))

export function daysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate()
}

export const CHECKLIST_REQUIRED = [
  { key: 'log', label: 'A **log of educational activities**, kept around the time of the learning' },
  { key: 'titles', label: '**Titles of materials** read or used during the year' },
  { key: 'samples', label: '**Samples of work** created or used by the student' },
  {
    key: 'progress',
    label:
      '**Evidence of educational progress** commensurate with the student’s ability, over the course of the year',
  },
] as const

export const CHECKLIST_RECOMMENDED = [
  { key: 'intent', label: 'The Letter of Intent (Notice of Intent)' },
  { key: 'evaluation', label: 'The annual evaluation' },
] as const

/** The five rows of the grid; the last two are the parent's to name. */
export const DEFAULT_SUBJECTS = ['Language Arts', 'Mathematics', 'Music', '', '']

export interface MonthRecord {
  hours_notes: string
  reading_materials: string
  field_trips: string
  accomplishments: string
  /** Subject index → the days of that month it was covered. */
  marks: Record<number, number[]>
}

export interface MonthlyYear {
  label: string
  parent_name: string
  from_date: string
  to_date: string
  letter_of_intent_date: string
  address: string
  city: string
  zip: string
  county: string
  belongs_to_me: string
  notes: string
  cover_photo: string | null
  checklist: Record<string, boolean>
  subjects: string[]
  months: Record<string, MonthRecord>
}

const KEY = 'homeschool-monthly-fl-v1'

function blankMonth(): MonthRecord {
  return { hours_notes: '', reading_materials: '', field_trips: '', accomplishments: '', marks: {} }
}

export function blankYear(): MonthlyYear {
  return {
    label: '2025–2026',
    parent_name: '',
    from_date: '',
    to_date: '',
    letter_of_intent_date: '',
    address: '',
    city: '',
    zip: '',
    county: 'Broward',
    belongs_to_me: '',
    notes: '',
    cover_photo: null,
    checklist: {},
    subjects: [...DEFAULT_SUBJECTS],
    months: Object.fromEntries(MONTHS.map((m) => [m.key, blankMonth()])),
  }
}

function read(): MonthlyYear {
  try {
    const raw = localStorage.getItem(KEY)
    if (raw) {
      const parsed = JSON.parse(raw) as MonthlyYear
      // A year saved before a field existed must not come back missing it.
      return { ...blankYear(), ...parsed, months: { ...blankYear().months, ...parsed.months } }
    }
  } catch {
    /* corrupt or unavailable — start clean rather than refusing to open */
  }
  return blankYear()
}

/**
 * The whole year in one record, saved 400 ms after the last keystroke.
 *
 * This is a legal record kept over twelve months, so the save indicator is
 * part of the interface rather than a detail: the parent needs to see that a
 * checkbox landed.
 */
export function useMonthlyYear() {
  const [year, setYear] = useState<MonthlyYear>(read)
  const [savedAt, setSavedAt] = useState<Date | null>(null)
  const [dirty, setDirty] = useState(false)
  const timer = useRef<number | undefined>(undefined)

  const flush = useCallback((value: MonthlyYear) => {
    try {
      localStorage.setItem(KEY, JSON.stringify(value))
      setSavedAt(new Date())
      setDirty(false)
    } catch {
      /* quota — the indicator stays on "saving", which is the honest signal */
    }
  }, [])

  const update = useCallback(
    (fn: (draft: MonthlyYear) => void) => {
      setYear((current) => {
        const next = structuredClone(current)
        fn(next)
        setDirty(true)
        window.clearTimeout(timer.current)
        timer.current = window.setTimeout(() => flush(next), 400)
        return next
      })
    },
    [flush],
  )

  const setMonth = useCallback(
    (monthKey: string, fn: (draft: MonthRecord) => void) =>
      update((draft) => {
        draft.months[monthKey] ??= blankMonth()
        fn(draft.months[monthKey])
      }),
    [update],
  )

  /** Toggling a day is the single most-used action in the whole portfolio. */
  const toggleDay = useCallback(
    (monthKey: string, subjectIndex: number, day: number) =>
      setMonth(monthKey, (m) => {
        const days = new Set(m.marks[subjectIndex] ?? [])
        if (days.has(day)) days.delete(day)
        else days.add(day)
        m.marks[subjectIndex] = [...days].sort((a, b) => a - b)
      }),
    [setMonth],
  )

  useEffect(() => () => window.clearTimeout(timer.current), [])

  return { year, update, setMonth, toggleDay, savedAt, dirty }
}
