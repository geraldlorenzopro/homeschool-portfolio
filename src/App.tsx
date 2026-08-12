import { NavLink, Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { useApp, usePortfolio } from '@/data/store'
import type { Portfolio } from '@/lib/types'
import { Chooser } from '@/routes/Chooser'
import { MonthlyPortfolio } from '@/monthly/MonthlyPortfolio'
import { PortfolioDocument } from '@/routes/PortfolioDocument'
import { QuickLog } from '@/routes/QuickLog'
import { SectionPanel } from '@/routes/SectionPanel'
import { SignIn } from '@/routes/SignIn'

export default function App() {
  const { auth } = useApp()

  if (auth.status === 'loading') return <Centered>Loading…</Centered>
  if (auth.status === 'signed-out') return <SignIn />
  return <Workspace />
}

function Workspace() {
  const { auth, signOut } = useApp()
  const { data, isLoading, error } = usePortfolio()
  const { pathname } = useLocation()

  // Two portfolios share this shell. The tabs belong to the evaluation one, so
  // they appear only once you are inside it.
  const inEvaluation = pathname.startsWith('/evaluation')
  const atFork = pathname === '/'

  return (
    <div style={{ minHeight: '100vh', background: 'var(--color-bg)' }}>
      <div className="nav app-nav no-print">
        <NavLink to="/" className="nav-brand app-brand" style={{ textDecoration: 'none' }}>
          Homeschool Portfolio
          <span className="app-brand-tag">Florida · Annual Record</span>
        </NavLink>

        {inEvaluation && (
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <NavLink to="/evaluation" end className="tab">
              A · Section panel
            </NavLink>
            <NavLink to="/evaluation/quick-log" className="tab">
              B · Quick log
            </NavLink>
            <NavLink to="/evaluation/document" className="tab">
              Finished portfolio
            </NavLink>
          </div>
        )}

        {!atFork && (
          <NavLink to="/" className="btn btn-ghost" style={{ fontSize: 12 }}>
            Switch portfolio
          </NavLink>
        )}

        {auth.status === 'signed-in' && (
          <button
            type="button"
            className="btn btn-ghost"
            style={{ fontSize: 12 }}
            onClick={signOut}
            title={auth.email}
          >
            Sign out
          </button>
        )}
        {auth.status === 'demo' && (
          <span className="tag tag-neutral" title="No Supabase project configured yet">
            Demo data · this browser only
          </span>
        )}
      </div>

      {error ? (
        <Centered>{(error as Error).message}</Centered>
      ) : isLoading || !data ? (
        <Centered>Opening the year…</Centered>
      ) : (
        <AppRoutes portfolio={data} />
      )}
    </div>
  )
}

function AppRoutes({ portfolio }: { portfolio: Portfolio }) {
  return (
    <Routes>
      <Route path="/" element={<Chooser studentName={portfolio.student.name} />} />

      <Route path="/monthly/*" element={<MonthlyPortfolio student={portfolio.student} />} />

      <Route path="/evaluation" element={<SectionPanel portfolio={portfolio} />} />
      <Route path="/evaluation/quick-log" element={<QuickLog portfolio={portfolio} />} />
      <Route path="/evaluation/document" element={<PortfolioDocument portfolio={portfolio} />} />

      {/* The evaluation portfolio used to live at the root; keep those links working. */}
      <Route path="/quick-log" element={<Navigate to="/evaluation/quick-log" replace />} />
      <Route path="/portfolio" element={<Navigate to="/evaluation/document" replace />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

function Centered({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        display: 'grid',
        placeItems: 'center',
        minHeight: '50vh',
        padding: 40,
        fontSize: 14,
        opacity: 0.7,
        textAlign: 'center',
      }}
    >
      {children}
    </div>
  )
}
