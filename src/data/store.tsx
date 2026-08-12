import type { Session } from '@supabase/supabase-js'
import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseMutationResult,
} from '@tanstack/react-query'
import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { useToast } from '@/components/Toaster'
import { isSupabaseConfigured, supabase } from '@/lib/supabase'
import type { Portfolio } from '@/lib/types'
import { createLocalRepo } from './localRepo'
import type { Repo } from './repo'
import { createSupabaseRepo } from './supabaseRepo'

type AuthState =
  | { status: 'loading' }
  /** No Supabase project configured — the browser-local backend is in use. */
  | { status: 'demo' }
  | { status: 'signed-out' }
  | { status: 'signed-in'; email: string }

interface AppState {
  auth: AuthState
  repo: Repo | null
  signOut: () => Promise<void>
}

const AppContext = createContext<AppState>({
  auth: { status: 'loading' },
  repo: null,
  signOut: async () => {},
})

export function useApp(): AppState {
  return useContext(AppContext)
}

export function useRepo(): Repo {
  const { repo } = useApp()
  if (!repo) throw new Error('useRepo called before the backend was ready.')
  return repo
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [ready, setReady] = useState(!isSupabaseConfigured)
  const queryClient = useQueryClient()

  useEffect(() => {
    if (!supabase) return
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setReady(true)
    })
    const { data: sub } = supabase.auth.onAuthStateChange((_event, next) => {
      setSession(next)
      queryClient.clear()
    })
    return () => sub.subscription.unsubscribe()
  }, [queryClient])

  const value = useMemo<AppState>(() => {
    if (!isSupabaseConfigured) {
      return {
        auth: { status: 'demo' },
        repo: createLocalRepo(),
        signOut: async () => {},
      }
    }
    if (!ready) return { auth: { status: 'loading' }, repo: null, signOut: async () => {} }
    if (!session) return { auth: { status: 'signed-out' }, repo: null, signOut: async () => {} }
    return {
      auth: { status: 'signed-in', email: session.user.email ?? '' },
      repo: createSupabaseRepo(supabase!, session.user.id),
      signOut: async () => {
        await supabase!.auth.signOut()
      },
    }
  }, [ready, session])

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>
}

/* ── queries ──────────────────────────────────────────────────────────────── */

export const portfolioKey = ['portfolio'] as const

export function usePortfolio() {
  const { repo } = useApp()
  return useQuery<Portfolio>({
    queryKey: portfolioKey,
    queryFn: () => repo!.getPortfolio(),
    enabled: Boolean(repo),
    staleTime: 30_000,
  })
}

/**
 * Every write goes through here: run it, refetch the portfolio, and surface
 * failures as a toast rather than a thrown render error.
 */
export function useAction<TArgs>(
  // Returns unknown rather than void so a caller can hand back `repo.add`'s
  // new id directly without wrapping it.
  fn: (repo: Repo, args: TArgs) => Promise<unknown>,
): UseMutationResult<void, Error, TArgs> {
  const repo = useRepo()
  const queryClient = useQueryClient()
  const toast = useToast()

  return useMutation<void, Error, TArgs>({
    mutationFn: async (args) => {
      await fn(repo, args)
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: portfolioKey }),
    onError: (error) => toast(error.message),
  })
}
