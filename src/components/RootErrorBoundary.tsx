import { Component, type ErrorInfo, type ReactNode } from 'react'

type State = { error: string | null }

export class RootErrorBoundary extends Component<{ children: ReactNode }, State> {
  constructor(props: { children: ReactNode }) {
    super(props)
    this.state = { error: null }
  }

  static getDerivedStateFromError(err: unknown) {
    return { error: err instanceof Error ? err.message : String(err) }
  }

  componentDidCatch(error: unknown, info: ErrorInfo) {
    console.error('UI crash:', error, info.componentStack)
  }

  render() {
    if (this.state.error) {
      return (
        <div className="app">
          <section className="panel">
            <h2>Runtime error</h2>
            <p className="error">{this.state.error}</p>
            <p className="hint">Open dev logs and share this message so it can be fixed quickly.</p>
            <div className="modal-actions">
              <button
                type="button"
                onClick={() => {
                  window.location.reload()
                }}
              >
                Reload UI
              </button>
            </div>
          </section>
        </div>
      )
    }
    return this.props.children
  }
}
