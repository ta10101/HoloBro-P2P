import { useState } from 'react'
import { encodeHashToBase64, type AppWebsocket } from '@holochain/client'
import {
  hcSearchSharedPagesByUrl,
  type SharedLinkRow,
  type SharedPageRow,
} from '../holochain'
import type { Tab } from '../app/types'

type Props = {
  hc: AppWebsocket | null
  sharedLinks: SharedLinkRow[]
  sharedPages: SharedPageRow[]
  demoSharedLinks: { url: string; title: string; description: string; tags: string; shared_at_ms: number }[]
  onShareLink: (url: string, title: string, description: string, tags: string) => Promise<void>
  setUrl: (url: string) => void
  setTab: (tab: Tab) => void
}

export function P2PLibraryPanel({ hc, sharedLinks, sharedPages, demoSharedLinks, onShareLink, setUrl, setTab }: Props) {
  const [shareUrl, setShareUrl] = useState('')
  const [shareTitle, setShareTitle] = useState('')
  const [shareDesc, setShareDesc] = useState('')
  const [shareTags, setShareTags] = useState('')
  const [searchUrl, setSearchUrl] = useState('')
  const [searchResults, setSearchResults] = useState<SharedPageRow[]>([])
  const [activeView, setActiveView] = useState<'links' | 'pages' | 'search'>('links')

  const links = hc ? sharedLinks : demoSharedLinks.map((l) => ({ ...l, action_hash: [] as unknown as SharedLinkRow['action_hash'], author: [] as unknown as SharedLinkRow['author'] }))

  const handleShare = async () => {
    const u = shareUrl.trim()
    if (!u) return
    await onShareLink(u, shareTitle || new URL(u).hostname, shareDesc, shareTags)
    setShareUrl('')
    setShareTitle('')
    setShareDesc('')
    setShareTags('')
  }

  const handleSearch = async () => {
    if (!hc || !searchUrl.trim()) return
    const results = await hcSearchSharedPagesByUrl(hc, searchUrl.trim())
    setSearchResults(results)
  }

  return (
    <section className="panel">
      <h2>P2P Library</h2>
      <p className="hint">
        Share links and cached pages with peers on the Holochain network. Browse what others have shared.
      </p>

      <div className="row" style={{ gap: '0.5rem', marginBottom: '1rem' }}>
        <button
          type="button"
          className={activeView === 'links' ? 'small active' : 'small'}
          onClick={() => setActiveView('links')}
        >
          Shared Links ({links.length})
        </button>
        <button
          type="button"
          className={activeView === 'pages' ? 'small active' : 'small'}
          onClick={() => setActiveView('pages')}
        >
          Cached Pages ({sharedPages.length})
        </button>
        <button
          type="button"
          className={activeView === 'search' ? 'small active' : 'small'}
          onClick={() => setActiveView('search')}
        >
          Search DHT
        </button>
      </div>

      {activeView === 'links' && (
        <>
          <div style={{ marginBottom: '1rem', padding: '0.75rem', border: '1px solid var(--border, #333)', borderRadius: '4px' }}>
            <strong>Share a link with the network</strong>
            <div className="row" style={{ marginTop: '0.5rem' }}>
              <input placeholder="URL" value={shareUrl} onChange={(e) => setShareUrl(e.target.value)} style={{ flex: 2 }} />
              <input placeholder="Title (optional)" value={shareTitle} onChange={(e) => setShareTitle(e.target.value)} style={{ flex: 1 }} />
            </div>
            <div className="row" style={{ marginTop: '0.25rem' }}>
              <input placeholder="Description" value={shareDesc} onChange={(e) => setShareDesc(e.target.value)} style={{ flex: 2 }} />
              <input placeholder="Tags (comma-sep)" value={shareTags} onChange={(e) => setShareTags(e.target.value)} style={{ flex: 1 }} />
              <button type="button" onClick={() => void handleShare()}>Share</button>
            </div>
          </div>
          <ul className="list">
            {links
              .slice()
              .sort((a, b) => b.shared_at_ms - a.shared_at_ms)
              .map((l, i) => (
                <li key={'action_hash' in l && l.action_hash.length ? encodeHashToBase64(l.action_hash) : `demo-${i}`}>
                  <a
                    href={l.url}
                    onClick={(e) => {
                      e.preventDefault()
                      setUrl(l.url)
                      setTab('browser')
                    }}
                  >
                    {l.title || l.url}
                  </a>
                  {l.description && <span className="muted">{l.description}</span>}
                  {l.tags && <span className="mono muted">{l.tags}</span>}
                  <span className="muted">{new Date(l.shared_at_ms).toLocaleString()}</span>
                  {'author' in l && l.author && (l.author as unknown as number[]).length > 0 && (
                    <span className="mono muted" title="Shared by peer">
                      {encodeHashToBase64(l.author).slice(0, 12)}...
                    </span>
                  )}
                </li>
              ))}
          </ul>
        </>
      )}

      {activeView === 'pages' && (
        <>
          <p className="hint">
            Pinned pages are stored compressed in the DHT. Peers can read them offline.
          </p>
          <ul className="list">
            {sharedPages
              .slice()
              .sort((a, b) => b.fetched_at_ms - a.fetched_at_ms)
              .map((p) => (
                <li key={encodeHashToBase64(p.action_hash)}>
                  <a
                    href={p.url}
                    onClick={(e) => {
                      e.preventDefault()
                      setUrl(p.url)
                      setTab('browser')
                    }}
                  >
                    {p.title || p.url}
                  </a>
                  <span className="muted">{p.content_type} — {Math.round(p.body_compressed.length / 1024)}KB compressed</span>
                  <span className="muted">{new Date(p.fetched_at_ms).toLocaleString()}</span>
                  {p.description && <span className="muted">{p.description}</span>}
                  <span className="mono muted" title="Pinned by peer">
                    {encodeHashToBase64(p.author).slice(0, 12)}...
                  </span>
                </li>
              ))}
            {sharedPages.length === 0 && <li className="muted">No cached pages yet. Pin a page from the browser toolbar.</li>}
          </ul>
        </>
      )}

      {activeView === 'search' && (
        <>
          <div className="row" style={{ marginBottom: '1rem' }}>
            <input
              placeholder="Search URL in DHT cache..."
              value={searchUrl}
              onChange={(e) => setSearchUrl(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && void handleSearch()}
              style={{ flex: 1 }}
            />
            <button type="button" onClick={() => void handleSearch()} disabled={!hc}>
              Search
            </button>
          </div>
          {!hc && <p className="muted">Connect to Holochain to search the DHT.</p>}
          <ul className="list">
            {searchResults.map((p) => (
              <li key={encodeHashToBase64(p.action_hash)}>
                <a
                  href={p.url}
                  onClick={(e) => {
                    e.preventDefault()
                    setUrl(p.url)
                    setTab('browser')
                  }}
                >
                  {p.title || p.url}
                </a>
                <span className="muted">Cached {new Date(p.fetched_at_ms).toLocaleString()} — {Math.round(p.body_compressed.length / 1024)}KB</span>
                <span className="mono muted">{encodeHashToBase64(p.author).slice(0, 12)}...</span>
              </li>
            ))}
            {searchResults.length === 0 && searchUrl && <li className="muted">No cached versions found for this URL.</li>}
          </ul>
        </>
      )}
    </section>
  )
}
