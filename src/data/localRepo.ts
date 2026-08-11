import { readAsDataUrl } from '@/lib/image'
import { prepareUpload } from '@/lib/upload'
import type { Portfolio, Student } from '@/lib/types'
import {
  type NewActivity,
  type NewBook,
  type NewCurriculum,
  type NewSupportDocument,
  type NewWorkSample,
  type Repo,
} from './repo'
import { sampledPortfolio, uid } from './seed'

const KEY = 'homeschool-portfolio-fl-v1'

/**
 * Demo backend. Keeps the whole portfolio in localStorage, with uploads held
 * as data URLs — the same thing the HTML prototype did. Used only when no
 * Supabase project is configured; the Supabase repo is the real one.
 */
export function createLocalRepo(): Repo {
  function read(): Portfolio {
    try {
      const raw = localStorage.getItem(KEY)
      if (raw) return JSON.parse(raw) as Portfolio
    } catch {
      /* corrupt or unavailable — fall through to the sample year */
    }
    const fresh = sampledPortfolio()
    write(fresh)
    return fresh
  }

  function write(data: Portfolio): void {
    try {
      localStorage.setItem(KEY, JSON.stringify(data))
    } catch {
      throw new Error(
        'This browser ran out of local storage. Connect a Supabase project to keep uploads.',
      )
    }
  }

  async function mutate(fn: (d: Portfolio) => void): Promise<void> {
    const data = read()
    fn(data)
    write(data)
  }

  /** Same validation and downscaling as the real backend, stored inline. */
  async function toStored(file: File): Promise<{ url: string; mime: string; size: number }> {
    const { blob, mime } = await prepareUpload(file)
    return { url: await readAsDataUrl(blob), mime, size: blob.size }
  }

  return {
    mode: 'demo',

    async getPortfolio() {
      return read()
    },

    async updateStudent(patch: Partial<Omit<Student, 'id'>>) {
      await mutate((d) => {
        d.student = { ...d.student, ...patch }
      })
    },

    async addActivity(input: NewActivity) {
      await mutate((d) => {
        d.activities.push({ id: uid(), ...input })
      })
    },
    async deleteActivity(id: string) {
      await mutate((d) => {
        d.activities = d.activities.filter((a) => a.id !== id)
      })
    },

    async addCurriculum(input: NewCurriculum) {
      await mutate((d) => {
        d.curriculums.push({ id: uid(), sort: d.curriculums.length + 1, ...input })
      })
    },
    async deleteCurriculum(id: string) {
      await mutate((d) => {
        d.curriculums = d.curriculums.filter((c) => c.id !== id)
      })
    },

    async addBook(input: NewBook) {
      await mutate((d) => {
        d.books.push({ id: uid(), ...input })
      })
    },
    async deleteBook(id: string) {
      await mutate((d) => {
        d.books = d.books.filter((b) => b.id !== id)
      })
    },

    async addWorkSample(input: NewWorkSample, file: File | null) {
      const stored = file ? await toStored(file) : null
      await mutate((d) => {
        d.workSamples.push({
          id: uid(),
          ...input,
          storage_path: file ? file.name : null,
          mime: stored?.mime ?? null,
          url: stored?.url ?? null,
        })
      })
    },
    async deleteWorkSample(id: string) {
      await mutate((d) => {
        d.workSamples = d.workSamples.filter((w) => w.id !== id)
      })
    },

    async addSupportDocument(input: NewSupportDocument, file: File | null) {
      const stored = file ? await toStored(file) : null
      await mutate((d) => {
        d.supportDocuments.push({
          id: uid(),
          ...input,
          title: input.title.trim() || (file?.name ?? 'Document'),
          storage_path: file ? file.name : null,
          file_name: file?.name ?? null,
          mime: stored?.mime ?? null,
          size_bytes: stored?.size ?? null,
          url: stored?.url ?? null,
        })
      })
    },
    async deleteSupportDocument(id: string) {
      await mutate((d) => {
        d.supportDocuments = d.supportDocuments.filter((f) => f.id !== id)
      })
    },

    async resetToSample() {
      write(sampledPortfolio())
    },
  }
}
