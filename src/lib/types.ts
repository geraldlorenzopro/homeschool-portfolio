export type SubjectKey = string

/** Curriculum and work-sample subject tags. 'other' renders "Multiple subjects". */
export type SubjectTag = 'ela' | 'math' | 'other'

export const SUPPORT_KINDS = [
  'IEP',
  '504 Plan',
  'Therapy / service plan',
  'Prior evaluation',
  'Medical letter',
  'Other',
] as const
export type SupportKind = (typeof SUPPORT_KINDS)[number]

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
}

/** The editable fields of the student record, as the form knows them. */
export type StudentField = Exclude<keyof Student, 'id'>

export interface Subject {
  id: string
  key: SubjectKey
  label: string
  sort: number
}

export interface Activity {
  id: string
  subject_key: SubjectKey
  date: string
  title: string
  notes: string
  hours: string
}

export interface Curriculum {
  id: string
  title: string
  publisher: string
  subject: SubjectTag
  usage: string
  sort: number
}

export interface Book {
  id: string
  title: string
  author: string
  finished_on: string
  how_read: string
}

export interface WorkSample {
  id: string
  title: string
  subject: SubjectTag
  date: string
  storage_path: string | null
  mime: string | null
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

/** Everything the portfolio needs, in one payload. */
export interface Portfolio {
  student: Student
  subjects: Subject[]
  activities: Activity[]
  curriculums: Curriculum[]
  books: Book[]
  workSamples: WorkSample[]
  supportDocuments: SupportDocument[]
}
