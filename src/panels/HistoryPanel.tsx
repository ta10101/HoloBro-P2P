import type { ActionHash } from '@holochain/client'
import type { Tab } from '../app/types'

export type DemoHistoryEntry = { url: string; title: string; visited_at_ms: number }

type Props = {
  hc: boolean
  demoHistory: DemoHistoryEntry[]
  setUrl: (u: string) => void
  setTab: (t: Tab) => void
  removeHistory: (hash: ActionHash | undefined, url: string, visitedAt: number) => void
  clearHistory: () => void
}

export function HistoryPanel({
  hc,
  demoHistory,
  setUrl,
  setTab,
  removeHistory,
  clearHistory,
}: Props) {
  const rows = demoHistory.map((h, i) => ({
    key: `local-${i}-${h.visited_at_ms}`,
    hash: undefined as ActionHash | undefined,
    url: h.url,
    title: h.title,
    visited_at_ms: h.visited_at_ms,
  }))

  const sorted = rows.slice().sort((a, b) => b.visited_at_ms - a.visited_at_ms)

  return (
    <section className="panel">
      <h2>History</h2>
      <p className="hint">
        {hc
          ? 'History stays on this device only (not written to Holochain).'
          : 'History is stored locally. Connect Holochain for bookmarks, chat, and library — not browsing history.'}
      </p>
      <div className="row" style={{ marginBottom: '1rem' }}>
        <button
          type="button"
          className="small"
          onClick={clearHistory}
          disabled={sorted.length === 0}
        >
          Clear all history
        </button>
        <span className="muted">{sorted.length} entr{sorted.length === 1 ? 'y' : 'ies'}</span>
      </div>
      <ul className="list">
        {sorted.map((h) => (
          <li key={h.key}>
            <a
              href={h.url}
              onClick={(e) => {
                e.preventDefault()
                setUrl(h.url)
                setTab('browser')
              }}
            >
              {h.title || h.url}
            </a>
            <span className="muted">{h.url}</span>
            <span className="muted">{new Date(h.visited_at_ms).toLocaleString()}</span>
            <button type="button" onClick={() => removeHistory(h.hash, h.url, h.visited_at_ms)}>
              Remove
            </button>
          </li>
        ))}
        {sorted.length === 0 && <li className="muted">No history yet. Browse some pages!</li>}
      </ul>
    </section>
  )
}
