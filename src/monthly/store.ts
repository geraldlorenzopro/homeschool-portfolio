import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useCallback, useMemo, useRef, useState } from 'react'
import { useToast } from '@/components/Toaster'
import { blankYear, type MonthlyYear } from './model'
import { createMonthlyRepo, type MonthPatch, type YearPatch } from './repo'

export * from './model'

const monthlyKey = (studentId: string) => ['monthly', studentId] as const

/**
 * The year, backed by whichever store is configured.
 *
 * Two things this has to get right. Ticking a box must feel instant, so every
 * write updates the cache first and reconciles after — a parent filling in a
 * month should never watch a checkbox lag. And typing must not fire a request
 * per keystroke, so text is held for 500 ms before it goes.
 */
export function useMonthlyYear(studentId: string) {
  const repo = useMemo(() => createMonthlyRepo(), [])
  const queryClient = useQueryClient()
  const toast = useToast()
  const [pending, setPending] = useState(0)
  const [savedAt, setSavedAt] = useState<Date | null>(null)
  const timers = useRef(new Map<string, number>())

  const { data, isLoading, error } = useQuery({
    queryKey: monthlyKey(studentId),
    queryFn: () => repo.load(studentId),
    enabled: Boolean(studentId),
    staleTime: 30_000,
  })

  const year = data ?? blankYear()

  /** Paint the change, then persist it. */
  const write = useCallback(
    (optimistic: (draft: MonthlyYear) => void, persist: () => Promise<void>) => {
      queryClient.setQueryData<MonthlyYear>(monthlyKey(studentId), (current) => {
        const next = structuredClone(current ?? blankYear())
        optimistic(next)
        return next
      })
      setPending((n) => n + 1)
      persist()
        .then(() => setSavedAt(new Date()))
        .catch((e: Error) => {
          toast(e.message)
          queryClient.invalidateQueries({ queryKey: monthlyKey(studentId) })
        })
        .finally(() => setPending((n) => Math.max(0, n - 1)))
    },
    [queryClient, studentId, toast],
  )

  /** Same, but the request waits for the typing to stop. */
  const writeDebounced = useCallback(
    (id: string, optimistic: (draft: MonthlyYear) => void, persist: () => Promise<void>) => {
      queryClient.setQueryData<MonthlyYear>(monthlyKey(studentId), (current) => {
        const next = structuredClone(current ?? blankYear())
        optimistic(next)
        return next
      })
      window.clearTimeout(timers.current.get(id))
      setPending((n) => n + 1)
      timers.current.set(
        id,
        window.setTimeout(() => {
          persist()
            .then(() => setSavedAt(new Date()))
            .catch((e: Error) => toast(e.message))
            .finally(() => setPending((n) => Math.max(0, n - 1)))
        }, 500),
      )
    },
    [queryClient, studentId, toast],
  )

  const updateYear = useCallback(
    (patch: YearPatch, immediate = false) => {
      const apply = (d: MonthlyYear) => Object.assign(d, patch)
      const persist = () => repo.updateYear(studentId, patch)
      if (immediate) write(apply, persist)
      else writeDebounced(`year:${Object.keys(patch).join(',')}`, apply, persist)
    },
    [repo, studentId, write, writeDebounced],
  )

  const setSubject = useCallback(
    (index: number, label: string) =>
      writeDebounced(
        `subject:${index}`,
        (d) => {
          d.subjects[index] = label
        },
        () => repo.setSubject(studentId, index, label),
      ),
    [repo, studentId, writeDebounced],
  )

  const toggleDay = useCallback(
    (monthKey: string, subjectIndex: number, day: number) => {
      const on = !(year.months[monthKey]?.marks[subjectIndex] ?? []).includes(day)
      write(
        (d) => {
          const days = new Set(d.months[monthKey].marks[subjectIndex] ?? [])
          if (on) days.add(day)
          else days.delete(day)
          d.months[monthKey].marks[subjectIndex] = [...days].sort((a, b) => a - b)
        },
        () => repo.setDay(studentId, monthKey, subjectIndex, day, on),
      )
    },
    [repo, studentId, write, year.months],
  )

  const setMonth = useCallback(
    (monthKey: string, patch: MonthPatch) =>
      writeDebounced(
        `month:${monthKey}:${Object.keys(patch).join(',')}`,
        (d) => Object.assign(d.months[monthKey], patch),
        () => repo.setMonth(studentId, monthKey, patch),
      ),
    [repo, studentId, writeDebounced],
  )

  const setCoverPhoto = useMutation({
    mutationFn: (file: File) => repo.setCoverPhoto(studentId, file),
    onSuccess: () => {
      setSavedAt(new Date())
      queryClient.invalidateQueries({ queryKey: monthlyKey(studentId) })
    },
    onError: (e: Error) => toast(e.message),
  })

  return {
    year,
    isLoading,
    error: error as Error | null,
    updateYear,
    setSubject,
    toggleDay,
    setMonth,
    setCoverPhoto: setCoverPhoto.mutate,
    savedAt,
    dirty: pending > 0,
  }
}
