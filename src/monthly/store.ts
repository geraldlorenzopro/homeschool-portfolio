import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useToast } from '@/components/Toaster'
import { blankYear, type MonthlyYear } from './model'
import {
  createMonthlyRepo,
  type CurriculumPatch,
  type MonthPatch,
  type SamplePatch,
  type YearPatch,
} from './repo'

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
  const queued = useRef(new Map<string, () => Promise<void>>())

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

      const run = () => {
        timers.current.delete(id)
        queued.current.delete(id)
        return persist()
          .then(() => setSavedAt(new Date()))
          .catch((e: Error) => toast(e.message))
          .finally(() => setPending((n) => Math.max(0, n - 1)))
      }

      // One count per field, not per keystroke. Replacing a timer that has not
      // fired yet replaces a write that never happened, and counting it again
      // left the indicator reading "Saving…" for the rest of the session.
      if (!timers.current.has(id)) setPending((n) => n + 1)
      window.clearTimeout(timers.current.get(id))
      queued.current.set(id, run)
      timers.current.set(id, window.setTimeout(run, 500))
    },
    [queryClient, studentId, toast],
  )

  /**
   * Send whatever is still waiting, now.
   *
   * Half a second of debounce is invisible until the moment it is not: closing
   * the tab, or switching to another page of the portfolio, threw away the last
   * thing typed. Both the unmount and `pagehide` land here.
   */
  const flushAll = useCallback(() => {
    for (const timer of timers.current.values()) window.clearTimeout(timer)
    timers.current.clear()
    const waiting = [...queued.current.values()]
    queued.current.clear()
    for (const run of waiting) void run()
  }, [])

  const flushRef = useRef(flushAll)
  flushRef.current = flushAll
  useEffect(() => {
    const onHide = () => flushRef.current()
    window.addEventListener('pagehide', onHide)
    return () => {
      window.removeEventListener('pagehide', onHide)
      flushRef.current()
    }
  }, [])

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

  /**
   * For the writes that create or delete a row. The id comes from the server,
   * so there is nothing honest to paint first — this one waits, then refetches.
   * It refetches after a failure too: a batch of files can half succeed, and
   * what did upload is already saved.
   */
  const run = useCallback(
    (work: () => Promise<void>) => {
      setPending((n) => n + 1)
      return work()
        .then(() => setSavedAt(new Date()))
        .catch((e: Error) => toast(e.message))
        .finally(() => {
          setPending((n) => Math.max(0, n - 1))
          queryClient.invalidateQueries({ queryKey: monthlyKey(studentId) })
        })
    },
    [queryClient, studentId, toast],
  )

  const addCurriculum = useCallback(
    () => run(() => repo.addCurriculum(studentId)),
    [repo, run, studentId],
  )

  const setCurriculum = useCallback(
    (id: string, patch: CurriculumPatch) =>
      writeDebounced(
        `curriculum:${id}:${Object.keys(patch).join(',')}`,
        (d) => {
          const row = d.curriculums.find((c) => c.id === id)
          if (row) Object.assign(row, patch)
        },
        () => repo.setCurriculum(studentId, id, patch),
      ),
    [repo, studentId, writeDebounced],
  )

  const removeCurriculum = useCallback(
    (id: string) => run(() => repo.removeCurriculum(studentId, id)),
    [repo, run, studentId],
  )

  const addSamples = useCallback(
    (files: File[], patch?: SamplePatch) =>
      files.length ? run(() => repo.addSamples(studentId, files, patch)) : undefined,
    [repo, run, studentId],
  )

  const setSample = useCallback(
    (id: string, patch: SamplePatch) =>
      writeDebounced(
        `sample:${id}:${Object.keys(patch).join(',')}`,
        (d) => {
          const row = d.samples.find((w) => w.id === id)
          if (row) Object.assign(row, patch)
        },
        () => repo.setSample(studentId, id, patch),
      ),
    [repo, studentId, writeDebounced],
  )

  const removeSample = useCallback(
    (id: string) => run(() => repo.removeSample(studentId, id)),
    [repo, run, studentId],
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
    addCurriculum,
    setCurriculum,
    removeCurriculum,
    addSamples,
    setSample,
    removeSample,
    savedAt,
    dirty: pending > 0,
  }
}
