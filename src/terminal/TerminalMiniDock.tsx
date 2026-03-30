import { useCallback, useState } from 'react'
import { safeInvoke as invoke, isTauri } from '../lib/tauri'

type ShellExecResult = {
  command: string
  stdout: string
  stderr: string
  exitCode: number | null
}

export function TerminalMiniDock() {
  const [termCommand, setTermCommand] = useState('ipconfig')
  const [termCwd, setTermCwd] = useState('')
  const [termBusy, setTermBusy] = useState(false)
  const [termOut, setTermOut] = useState<ShellExecResult | null>(null)
  const [termErr, setTermErr] = useState<string | null>(null)
  const [termHistory, setTermHistory] = useState<string[]>([])
  const [open, setOpen] = useState(false)

  const runTerminal = useCallback(async () => {
    const cmd = termCommand.trim()
    if (!cmd) return
    setTermBusy(true)
    setTermErr(null)
    setTermOut(null)
    try {
      if (!isTauri()) throw new Error('Terminal requires the Tauri desktop app.')
      const r = await invoke<ShellExecResult>('shell_exec', {
        req: {
          command: cmd,
          cwd: termCwd.trim() || undefined,
          timeoutSecs: 90,
        },
      })
      if (!r) throw new Error('Terminal requires the Tauri desktop app')
      setTermOut(r)
      setTermHistory((prev) => {
        const cleaned = prev.filter((x) => x !== cmd)
        return [cmd, ...cleaned].slice(0, 12)
      })
    } catch (e) {
      setTermErr(String(e))
    } finally {
      setTermBusy(false)
    }
  }, [termCommand, termCwd])

  // Collapsed: just a small tab
  if (!open) {
    return (
      <button
        className="terminal-tab-btn"
        onClick={() => setOpen(true)}
        title="Open Terminal"
        type="button"
      >
        {'>_'}
      </button>
    )
  }

  return (
    <aside className="terminal-dock" aria-label="Terminal">
      {/* Header */}
      <div className="terminal-dock-head">
        <strong style={{ fontFamily: 'var(--font-mono)', fontSize: 11, letterSpacing: 1.5 }}>
          {'>_'} TERMINAL
        </strong>
        <button type="button" className="terminal-close-btn" onClick={() => setOpen(false)} title="Hide terminal">
          {'\u2715'}
        </button>
      </div>

      {/* Command input row */}
      <div className="terminal-input-row">
        {termHistory.length > 0 && (
          <select
            value=""
            onChange={(e) => e.target.value && setTermCommand(e.target.value)}
            style={{ width: 70, flexShrink: 0 }}
          >
            <option value="">{'History\u2026'}</option>
            {termHistory.map((cmd) => (
              <option key={cmd} value={cmd}>{cmd}</option>
            ))}
          </select>
        )}
        <input
          value={termCommand}
          onChange={(e) => setTermCommand(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && void runTerminal()}
          placeholder="Command"
        />
        <button type="button" disabled={termBusy} onClick={() => void runTerminal()}>
          {termBusy ? 'Run\u2026' : 'Run'}
        </button>
      </div>

      {/* CWD */}
      <input
        className="terminal-cwd"
        value={termCwd}
        onChange={(e) => setTermCwd(e.target.value)}
        placeholder="Working directory (optional)"
      />

      {/* Output */}
      <div className="terminal-output">
        {termErr ? <p className="error" style={{ margin: 0, fontSize: 11 }}>{termErr}</p> : null}
        {termOut ? (
          <>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--muted)', marginBottom: 4 }}>
              $ {termOut.command}
              {termOut.exitCode !== null && termOut.exitCode !== 0
                ? <span style={{ color: 'var(--pink)', marginLeft: 8 }}>exit {termOut.exitCode}</span>
                : null}
            </div>
            <pre className="terminal-pre">{termOut.stdout || '(no output)'}</pre>
            {termOut.stderr ? <pre className="terminal-pre terminal-pre-err">{termOut.stderr}</pre> : null}
          </>
        ) : (
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--muted)', padding: '8px 0' }}>
            Ready. Type a command and press Enter or Run.
          </div>
        )}
      </div>
    </aside>
  )
}
