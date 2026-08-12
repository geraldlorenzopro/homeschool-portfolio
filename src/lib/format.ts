import type { Area, Entry, Goal } from './types'

/** "Sep 8, 2025" — em dash when there is no date, as in the design. */
export function fmtDate(iso: string | null | undefined): string {
  if (!iso) return '—'
  const dt = new Date(iso + 'T00:00:00')
  if (Number.isNaN(dt.getTime())) return iso
  return dt.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

export function today(): string {
  return new Date().toISOString().slice(0, 10)
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

export function sumHours(entries: Entry[]): number {
  return entries.reduce((n, e) => n + hoursOf(e), 0)
}

export function fileSizeLabel(bytes: number | null | undefined): string {
  if (!bytes) return ''
  return Math.round(bytes / 1024) + ' KB'
}

/** Manual order first; anything unsorted falls to the end. */
export function bySort<T extends { sort?: number }>(a: T, b: T): number {
  return (a.sort ?? 0) - (b.sort ?? 0)
}
