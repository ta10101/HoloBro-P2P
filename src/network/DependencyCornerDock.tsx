import { useCallback, useEffect, useState } from 'react'
import { safeInvoke as invoke, isTauri } from '../lib/tauri'
import type { RuntimeDiagnostics } from './NetworkToolsPanel'

export function DependencyCornerDock() {
  const [diag, setDiag] = useState<RuntimeDiagnostics | null>(null)
  const [backendReady, setBackendReady] = useState(true)
  const [busy, setBusy] = useState(false)

  const refresh = useCallback(async () => {
    if (!isTauri()) { setBackendReady(false); return }
    setBusy(true)
    try {
      const r = await invoke<RuntimeDiagnostics>('net_runtime_diagnostics')
      if (!r) { setBackendReady(false); return }
      setDiag(r)
      setBackendReady(true)
    } catch {
      setBackendReady(false)
    } finally {
      setBusy(false)
    }
  }, [])

  useEffect(() => {
    void refresh()
    const t = window.setInterval(() => void refresh(), 60_000)
    return () => window.clearInterval(t)
  }, [refresh])

  return (
    <section className="deps-nav-card" aria-label="Runtime dependency health">
      <div className="deps-nav-head">
        <strong className="deps-title">Dependencies</strong>
        <button type="button" className="deps-refresh-btn" disabled={busy} onClick={() => void refresh()}>
          {busy ? '...' : '↻'}
        </button>
      </div>
      <div className="deps-nav-list">
        <p className="deps-nav-line">
          <span className="deps-label">Traceroute</span>
          <span
            className={
              !backendReady
                ? 'network-miss-badge'
                : diag?.tracerouteAvailable
                  ? 'network-ok-badge'
                  : 'network-miss-badge'
            }
          >
            {!backendReady ? 'Desktop off' : diag?.tracerouteAvailable ? (diag.tracerouteTool ?? 'Ready') : 'Missing'}
          </span>
        </p>
        <p className="deps-nav-line">
          <span className="deps-label">Nmap</span>
          <span
            className={
              !backendReady
                ? 'network-miss-badge'
                : diag?.nmapAvailable
                  ? 'network-ok-badge'
                  : 'network-miss-badge'
            }
          >
            {!backendReady ? 'Desktop off' : diag?.nmapAvailable ? 'Ready' : 'Missing'}
          </span>
        </p>
        <p className="deps-nav-line">
          <span className="deps-label">Shell</span>
          <span
            className={
              !backendReady
                ? 'network-miss-badge'
                : diag?.shellAvailable
                  ? 'network-ok-badge'
                  : 'network-miss-badge'
            }
          >
            {!backendReady ? 'Desktop off' : diag?.shellAvailable ? (diag.shellName ?? 'Ready') : 'Missing'}
          </span>
        </p>
      </div>
    </section>
  )
}
