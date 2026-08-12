/** August 2025 → June 2026: the school year, in the order the portfolio prints. */
export const MONTHS: { key: string; label: string; year: number; month: number }[] = [
  { key: '2025-08', label: 'August 2025', year: 2025, month: 8 },
  { key: '2025-09', label: 'September 2025', year: 2025, month: 9 },
  { key: '2025-10', label: 'October 2025', year: 2025, month: 10 },
  { key: '2025-11', label: 'November 2025', year: 2025, month: 11 },
  { key: '2025-12', label: 'December 2025', year: 2025, month: 12 },
  { key: '2026-01', label: 'January 2026', year: 2026, month: 1 },
  { key: '2026-02', label: 'February 2026', year: 2026, month: 2 },
  { key: '2026-03', label: 'March 2026', year: 2026, month: 3 },
  { key: '2026-04', label: 'April 2026', year: 2026, month: 4 },
  { key: '2026-05', label: 'May 2026', year: 2026, month: 5 },
  { key: '2026-06', label: 'June 2026', year: 2026, month: 6 },
]

/** Day 0 of the next month is the last day of this one. */
export function daysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate()
}

export const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const

/**
 * Which weekday a date falls on, 0 = Sunday.
 *
 * Built from the three numbers rather than parsed from a string, so it is the
 * calendar's answer and not the browser timezone's.
 */
export function weekdayOf(year: number, month: number, day: number): number {
  return new Date(year, month - 1, day).getDay()
}

export const isWeekend = (weekday: number) => weekday === 0 || weekday === 6

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
  /** Row ids behind the subjects, empty in the demo backend. */
  subject_ids: string[]
  months: Record<string, MonthRecord>
}

export function blankMonth(): MonthRecord {
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
    subject_ids: [],
    months: Object.fromEntries(MONTHS.map((m) => [m.key, blankMonth()])),
  }
}
