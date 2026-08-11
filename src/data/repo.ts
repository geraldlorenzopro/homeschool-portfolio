import type {
  Activity,
  Book,
  Curriculum,
  Portfolio,
  Student,
  SubjectTag,
  SupportKind,
} from '@/lib/types'

export type NewActivity = Omit<Activity, 'id'>
export type NewCurriculum = Omit<Curriculum, 'id' | 'sort'>
export type NewBook = Omit<Book, 'id'>
export interface NewWorkSample {
  title: string
  subject: SubjectTag
  date: string
}
export interface NewSupportDocument {
  title: string
  kind: SupportKind
  document_date: string
  note: string
}

/**
 * Everything the UI needs from storage. Two implementations back it: Supabase
 * (auth + Postgres + private buckets) and a browser-local one used when no
 * Supabase project is configured, so the app runs and demos without a backend.
 */
export interface Repo {
  readonly mode: 'supabase' | 'demo'

  getPortfolio(): Promise<Portfolio>
  updateStudent(patch: Partial<Omit<Student, 'id'>>): Promise<void>

  addActivity(input: NewActivity): Promise<void>
  deleteActivity(id: string): Promise<void>

  addCurriculum(input: NewCurriculum): Promise<void>
  deleteCurriculum(id: string): Promise<void>

  addBook(input: NewBook): Promise<void>
  deleteBook(id: string): Promise<void>

  addWorkSample(input: NewWorkSample, file: File | null): Promise<void>
  deleteWorkSample(id: string): Promise<void>

  addSupportDocument(input: NewSupportDocument, file: File | null): Promise<void>
  deleteSupportDocument(id: string): Promise<void>

  /** Wipes the year and reinstates the sample data from the design. */
  resetToSample(): Promise<void>
}

/** Uploaded object key: {user_id}/{student_id}/{uuid}-{filename}. */
export function storageKey(userId: string, studentId: string, fileName: string): string {
  const safe = fileName.replace(/[^\w.-]+/g, '_').slice(-80)
  return `${userId}/${studentId}/${crypto.randomUUID()}-${safe}`
}
