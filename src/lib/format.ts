import type { Area, Entry, Goal } from './types'

/** "Sep 8, 2025" — em dash when there is no date, as in the design. */
export function fmtDate(iso: string | null | undefined): string {
  if (!iso) return '—'
  const dt = new Date(iso + 'T00:00:00')
  if (Number.isNaN(dt.getTime())) return iso
  return dt.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

/**
 * Local, not UTC. Florida is five hours behind it, so an entry logged at nine
 * on a Tuesday evening was being dated Wednesday — in a log whose whole legal
 * point is that it was kept at the time of the instruction.
 */
export function today(): string {
  const now = new Date()
  return new Date(now.getTime() - now.getTimezoneOffset() * 60_000).toISOString().slice(0, 10)
}

export function areaLabel(areaId: string | null, areas: Area[]): string {
  if (!areaId) return 'Unassigned'
  return areas.find((a) => a.id === areaId)?.label ?? 'Unassigned'
}

export function goalText(goalId: string | null, goals: Goal[]): string {
  if (!goalId) return ''
  return goals.find((g) => g.id === goalId)?.text ?? ''
}

/** Trims a goal to something that fits in a table cell. */
export function shortGoal(text: string, max = 70): string {
  const clean = text.trim()
  return clean.length <= max ? clean : clean.slice(0, max - 1).trimEnd() + '…'
}

export function hoursOf(entry: Entry): number {
  return parseFloat(entry.hours) || 0
}

/**
 * Rounded, because this number goes straight into the printed record. A year
 * of short sessions — 0.43 h, 0.2 h, 0.35 h — sums in binary floating point to
 * 12.280000000000001, and that is what the evaluator would have read.
 */
export function sumHours(entries: Entry[]): number {
  const total = entries.reduce((n, e) => n + hoursOf(e), 0)
  return Math.round(total * 100) / 100
}

export function fileSizeLabel(bytes: number | null | undefined): string {
  if (!bytes) return ''
  return Math.round(bytes / 1024) + ' KB'
}

/** Manual order first; anything unsorted falls to the end. */
export function bySort<T extends { sort?: number }>(a: T, b: T): number {
  return (a.sort ?? 0) - (b.sort ?? 0)
}
