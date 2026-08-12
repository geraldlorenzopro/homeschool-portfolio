import { SUPPORT_DOCS_BUCKET, WORK_SAMPLES_BUCKET } from '@/lib/supabase'
import type {
  Area,
  Attachment,
  Book,
  Curriculum,
  Entry,
  Evaluation,
  Goal,
  Portfolio,
  Student,
  SupportDocument,
  WorkSample,
} from '@/lib/types'

/**
 * Every list in the portfolio behaves the same way — add a row, edit it in
 * place, drag it into order, delete it, and hang a file on it. Rather than
 * nine near-identical method sets, the repository takes the collection as an
 * argument and both backends drive off one table map.
 */
export interface Rows {
  areas: Area
  goals: Goal
  entries: Entry
  curriculums: Curriculum
  books: Book
  workSamples: WorkSample
  supportDocuments: SupportDocument
  evaluations: Evaluation
  attachments: Attachment
}

export type CollectionKey = keyof Rows

/**
 * Columns the store fills in from the uploaded file, so a caller passing a
 * File never has to describe it.
 */
type UploadField = 'storage_path' | 'mime' | 'file_name' | 'size_bytes'

/** What the caller supplies on insert: the row minus what the store assigns. */
export type NewRow<K extends CollectionKey> = Omit<
  Rows[K],
  'id' | 'sort' | 'url' | UploadField
> &
  Partial<Pick<Rows[K], Extract<UploadField | 'sort', keyof Rows[K]>>>

export type RowPatch<K extends CollectionKey> = Partial<Omit<Rows[K], 'id' | 'url'>>

/** Postgres table behind each collection. */
export const TABLE: Record<CollectionKey, string> = {
  areas: 'areas',
  goals: 'goals',
  entries: 'entries',
  curriculums: 'curriculums',
  books: 'books',
  workSamples: 'work_samples',
  supportDocuments: 'support_documents',
  evaluations: 'evaluations',
  attachments: 'attachments',
}

/**
 * Which bucket a collection's uploads land in. Work samples are the child's
 * own work; everything else may carry an IEP or a clinical report, so it goes
 * to the stricter bucket.
 */
export const BUCKET: Partial<Record<CollectionKey, string>> = {
  workSamples: WORK_SAMPLES_BUCKET,
  supportDocuments: SUPPORT_DOCS_BUCKET,
  evaluations: SUPPORT_DOCS_BUCKET,
  attachments: SUPPORT_DOCS_BUCKET,
}

/** Collections whose rows the user can drag into a different order. */
export const REORDERABLE: CollectionKey[] = [
  'areas',
  'goals',
  'entries',
  'curriculums',
  'books',
  'workSamples',
  'evaluations',
]

export interface Repo {
  readonly mode: 'supabase' | 'demo'

  getPortfolio(): Promise<Portfolio>
  updateStudent(patch: Partial<Omit<Student, 'id'>>): Promise<void>

  /** Returns the id of the new row, so a file can be hung off it. */
  add<K extends CollectionKey>(
    collection: K,
    input: NewRow<K>,
    file?: File | null,
  ): Promise<string>

  update<K extends CollectionKey>(
    collection: K,
    id: string,
    patch: RowPatch<K>,
    file?: File | null,
  ): Promise<void>

  remove<K extends CollectionKey>(collection: K, id: string): Promise<void>

  /** Persists the given order; ids are listed front to back. */
  reorder<K extends CollectionKey>(collection: K, orderedIds: string[]): Promise<void>

  /** Wipes the year and reinstates the sample data. */
  resetToSample(): Promise<void>
}

/** Uploaded object key: {user_id}/{student_id}/{uuid}-{filename}. */
export function storageKey(userId: string, studentId: string, fileName: string): string {
  const safe = fileName.replace(/[^\w.-]+/g, '_').slice(-80)
  return `${userId}/${studentId}/${crypto.randomUUID()}-${safe}`
}
