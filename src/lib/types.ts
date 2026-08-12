export const SUPPORT_KINDS = [
  'IEP',
  '504 Plan',
  'Therapy / service plan',
  'Prior evaluation',
  'Medical letter',
  'Other',
] as const
export type SupportKind = (typeof SUPPORT_KINDS)[number]

export const EVALUATION_KINDS = [
  'Psychoeducational',
  'Speech & Language',
  'Occupational Therapy',
  'Physical Therapy',
  'Behavioral',
  'Hearing / Vision',
  'Other',
] as const
export type EvaluationKind = (typeof EVALUATION_KINDS)[number]

/** Where a goal came from — the official IEP, or written by the parent. */
export const GOAL_SOURCES = ['iep', 'parent'] as const
export type GoalSource = (typeof GOAL_SOURCES)[number]

export const GOAL_STATUSES = ['not_started', 'in_progress', 'met', 'not_met'] as const
export type GoalStatus = (typeof GOAL_STATUSES)[number]

export const GOAL_STATUS_LABEL: Record<GoalStatus, string> = {
  not_started: 'Not started',
  in_progress: 'In progress',
  met: 'Met',
  not_met: 'Not met',
}

/** How much help the child needed — the quick scale next to the written outcome. */
export const OUTCOME_LEVELS = ['full_support', 'partial_support', 'independent'] as const
export type OutcomeLevel = (typeof OUTCOME_LEVELS)[number]

export const OUTCOME_LEVEL_LABEL: Record<OutcomeLevel, string> = {
  full_support: 'With full support',
  partial_support: 'With partial support',
  independent: 'Independently',
}

export interface Student {
  id: string
  name: string
  dob: string
  grade: string
  school_year: string
  parent_name: string
  county: string
  evaluator: string
  evaluation_date: string
  statement: string

  // Child profile
  diagnosis: string
  diagnosis_date: string
  diagnosed_by: string
  no_formal_diagnosis: boolean
  strengths: string
  needs: string
  learns_best: string

  // What the printed document shows
  include_profile: boolean
  show_dates: boolean
  show_hours: boolean
  show_activity_log: boolean
}

export type StudentField = Exclude<keyof Student, 'id'>

export interface Area {
  id: string
  key: string
  label: string
  sort: number
  is_custom: boolean
}

export interface Goal {
  id: string
  area_id: string
  text: string
  status: GoalStatus
  source: GoalSource
  sort: number
}

/** One working session: what was covered, how, and how the child responded. */
export interface Entry {
  id: string
  area_id: string
  goal_id: string | null
  title: string
  method: string
  outcome: string
  outcome_level: OutcomeLevel | null
  date: string
  hours: string
  sort: number
}

export interface Curriculum {
  id: string
  title: string
  publisher: string
  area_id: string | null
  usage: string
  sort: number
}

export interface Book {
  id: string
  title: string
  author: string
  finished_on: string
  how_read: string
  sort: number
}

export interface WorkSample {
  id: string
  title: string
  area_id: string | null
  goal_id: string | null
  date: string
  storage_path: string | null
  mime: string | null
  sort: number
  /** Signed URL (Supabase) or data URL (demo mode). Null when no file. */
  url: string | null
}

export interface SupportDocument {
  id: string
  title: string
  kind: SupportKind
  document_date: string
  note: string
  storage_path: string | null
  file_name: string | null
  mime: string | null
  size_bytes: number | null
  url: string | null
}

export interface Evaluation {
  id: string
  title: string
  kind: EvaluationKind
  evaluation_date: string
  performed_by: string
  summary: string
  storage_path: string | null
  file_name: string | null
  mime: string | null
  size_bytes: number | null
  sort: number
  url: string | null
}

/** Anything a section can hang a file on. */
export type AttachmentOwner = 'goal' | 'entry' | 'curriculum' | 'book' | 'area' | 'profile'

export interface Attachment {
  id: string
  owner_type: AttachmentOwner
  owner_id: string | null
  title: string
  storage_path: string | null
  file_name: string | null
  mime: string | null
  size_bytes: number | null
  sort: number
  url: string | null
}

export interface Portfolio {
  student: Student
  areas: Area[]
  goals: Goal[]
  entries: Entry[]
  curriculums: Curriculum[]
  books: Book[]
  workSamples: WorkSample[]
  supportDocuments: SupportDocument[]
  evaluations: Evaluation[]
  attachments: Attachment[]
}

/** Every list the user can reorder by dragging. */
export type Reorderable =
  | 'areas'
  | 'goals'
  | 'entries'
  | 'curriculums'
  | 'books'
  | 'workSamples'
  | 'evaluations'
