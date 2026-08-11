import { NavLink, Navigate, Route, Routes } from 'react-router-dom'
import { useApp, usePortfolio } from '@/data/store'
import type { Portfolio } from '@/lib/types'
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

  return (
    <div style={{ minHeight: '100vh', background: 'var(--color-bg)' }}>
      <div className="nav app-nav no-print">
        <div className="nav-brand app-brand">
          Homeschool Portfolio
          <span className="app-brand-tag">Florida · Annual Record</span>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <NavLink to="/" end className="tab">
            A · Section panel
          </NavLink>
          <NavLink to="/quick-log" className="tab">
            B · Quick log
          </NavLink>
          <NavLink to="/portfolio" className="tab">
            Finished portfolio
          </NavLink>
        </div>
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
        <PortfolioRoutes portfolio={data} />
      )}
    </div>
  )
}

function PortfolioRoutes({ portfolio }: { portfolio: Portfolio }) {
  return (
    <Routes>
      <Route path="/" element={<SectionPanel portfolio={portfolio} />} />
      <Route path="/quick-log" element={<QuickLog portfolio={portfolio} />} />
      <Route path="/portfolio" element={<PortfolioDocument portfolio={portfolio} />} />
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
