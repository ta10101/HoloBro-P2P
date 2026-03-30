import { encodeHashToBase64, type ActionHash } from '@holochain/client'
import { HolochainEmptyHint } from '../components/HolochainEmptyHint'
import { hcBookmarkEncryptionConfigured, type BookmarkRow } from '../holochain'
import type { DemoBookmark } from '../lib/holoMirror'
import type { Tab } from '../app/types'

type Props = {
  hc: boolean
  bookmarks: BookmarkRow[]
  demoBookmarks: DemoBookmark[]
  /** When true and `hc`, list comes from Holochain; otherwise bookmarks stay device-local only. */
  bookmarkHolochainSync: boolean
  setBookmarkHolochainSync: (enabled: boolean) => void
  setUrl: (u: string) => void
  setTab: (t: Tab) => void
  removeBookmark: (hash: ActionHash | undefined, urlStr: string) => void
}

export function BookmarksPanel({
  hc,
  bookmarks,
  demoBookmarks,
  bookmarkHolochainSync,
  setBookmarkHolochainSync,
  setUrl,
  setTab,
  removeBookmark,
}: Props) {
  const useChainList = hc && bookmarkHolochainSync
  return (
    <section className="panel">
      <h2>Bookmarks</h2>
      <HolochainEmptyHint />
      <label className="row" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
        <input
          type="checkbox"
          checked={bookmarkHolochainSync}
          onChange={(e) => setBookmarkHolochainSync(e.target.checked)}
        />
        <span>Sync bookmarks to Holochain</span>
      </label>
      <p className="hint">
        {bookmarkHolochainSync
          ? hc
            ? hcBookmarkEncryptionConfigured()
              ? 'Bookmarks on chain are AES-GCM encrypted (see VITE_HC_BOOKMARK_PASSPHRASE in docs/HOLOBRO_PRIVACY_OPERATORS.md).'
              : 'Warning: sync is on but VITE_HC_BOOKMARK_PASSPHRASE is not set — bookmark url/title are plaintext on chain.'
            : 'Turned on — connect Holochain to upload and sync; until then new bookmarks stay on this device.'
          : 'Bookmarks stay on this device only until you enable sync above.'}
      </p>
      <ul className="list">
        {useChainList
          ? bookmarks.map((b) => (
              <li key={encodeHashToBase64(b.action_hash)}>
                <a
                  href={b.url}
                  onClick={(e) => {
                    e.preventDefault()
                    setUrl(b.url)
                    setTab('browser')
                  }}
                >
                  {b.title}
                </a>
                <span className="muted">{b.url}</span>
                <button type="button" onClick={() => void removeBookmark(b.action_hash, b.url)}>
                  Remove
                </button>
              </li>
            ))
          : demoBookmarks.map((b, i) => (
              <li key={`demo-bm-${i}-${b.url}`}>
                <a
                  href={b.url}
                  onClick={(e) => {
                    e.preventDefault()
                    setUrl(b.url)
                    setTab('browser')
                  }}
                >
                  {b.title}
                </a>
                <button type="button" onClick={() => void removeBookmark(undefined, b.url)}>
                  Remove
                </button>
              </li>
            ))}
      </ul>
    </section>
  )
}
