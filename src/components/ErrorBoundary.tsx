import { Component, type ErrorInfo, type ReactNode } from 'react'

interface State {
  error: Error | null
}

/**
 * A render crash must not leave a parent staring at a white page mid-year —
 * show what happened and offer a reload. Saved work is in the database, so
 * reloading loses nothing.
 */
export class ErrorBoundary extends Component<{ children: ReactNode }, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error('Homeschool Portfolio crashed:', error, info.componentStack)
  }

  render() {
    const { error } = this.state
    if (!error) return this.props.children

    return (
      <div style={{ display: 'grid', placeItems: 'center', minHeight: '100vh', padding: 24 }}>
        <div style={{ width: 'min(520px, 100%)' }}>
          <div className="kicker">Something went wrong</div>
          <h1 style={{ fontSize: 30, fontWeight: 400, margin: '10px 0 8px' }}>
            The page could not be displayed
          </h1>
          <p style={{ fontSize: 14, opacity: 0.75, lineHeight: 1.6 }}>
            Everything you had already saved is safe. Reloading usually clears this.
          </p>
          <pre
            style={{
              fontSize: 12,
              opacity: 0.6,
              whiteSpace: 'pre-wrap',
              fontFamily: 'ui-monospace, Menlo, monospace',
              margin: '0 0 18px',
            }}
          >
            {error.message}
          </pre>
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => window.location.reload()}
          >
            Reload
          </button>
        </div>
      </div>
    )
  }
}
