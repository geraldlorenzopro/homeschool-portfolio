import { readAsDataUrl } from '@/lib/image'
import { prepareUpload } from '@/lib/upload'
import type { Portfolio, Student } from '@/lib/types'
import type { CollectionKey, NewRow, Repo, RowPatch, Rows } from './repo'
import { BUCKET } from './repo'
import { sampledPortfolio, uid } from './seed'

const KEY = 'homeschool-portfolio-fl-v2'

type AnyRow = { id: string; sort?: number; url?: string | null }

/**
 * Demo backend. Keeps the whole portfolio in localStorage, with uploads held
 * as data URLs. Used only when no Supabase project is configured.
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

  function list<K extends CollectionKey>(data: Portfolio, collection: K): AnyRow[] {
    return data[collection] as unknown as AnyRow[]
  }

  /** Same validation and downscaling as the real backend, stored inline. */
  async function store(file: File) {
    const { blob, mime } = await prepareUpload(file)
    return {
      url: await readAsDataUrl(blob),
      mime,
      size_bytes: blob.size,
      file_name: file.name,
      storage_path: file.name,
    }
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

    async add<K extends CollectionKey>(collection: K, input: NewRow<K>, file?: File | null) {
      const stored = file && BUCKET[collection] ? await store(file) : null
      const id = uid()
      await mutate((d) => {
        const rows = list(d, collection)
        const sort = rows.reduce((n, r) => Math.max(n, r.sort ?? 0), 0) + 1
        rows.push({ id, sort, ...(input as object), ...(stored ?? {}) } as AnyRow)
      })
      return id
    },

    async update<K extends CollectionKey>(
      collection: K,
      id: string,
      patch: RowPatch<K>,
      file?: File | null,
    ) {
      const stored = file && BUCKET[collection] ? await store(file) : null
      await mutate((d) => {
        const rows = list(d, collection)
        const index = rows.findIndex((r) => r.id === id)
        if (index < 0) return
        rows[index] = { ...rows[index], ...(patch as object), ...(stored ?? {}) } as AnyRow
      })
    },

    async remove<K extends CollectionKey>(collection: K, id: string) {
      await mutate((d) => {
        const rows = list(d, collection)
        const index = rows.findIndex((r) => r.id === id)
        if (index >= 0) rows.splice(index, 1)
        // A deleted goal must not leave entries pointing at nothing.
        if (collection === 'goals') {
          for (const entry of d.entries) if (entry.goal_id === id) entry.goal_id = null
          for (const sample of d.workSamples) if (sample.goal_id === id) sample.goal_id = null
        }
        if (collection === 'areas') {
          d.goals = d.goals.filter((g) => g.area_id !== id)
          d.entries = d.entries.filter((e) => e.area_id !== id)
        }
        // A removed session releases its samples rather than taking them.
        if (collection === 'entries') {
          for (const sample of d.workSamples) {
            if (sample.entry_id === id) sample.entry_id = null
          }
        }
        // And anything filed against a removed row goes with it.
        d.attachments = d.attachments.filter((a) => a.owner_id !== id)
      })
    },

    async reorder<K extends CollectionKey>(collection: K, orderedIds: string[]) {
      await mutate((d) => {
        const rows = list(d, collection)
        const rank = new Map(orderedIds.map((rowId, index) => [rowId, index + 1]))
        for (const row of rows) {
          const next = rank.get(row.id)
          if (next !== undefined) row.sort = next
        }
        rows.sort((a, b) => (a.sort ?? 0) - (b.sort ?? 0))
      })
    },

    async resetToSample() {
      write(sampledPortfolio())
    },
  }
}

export type { Rows }
