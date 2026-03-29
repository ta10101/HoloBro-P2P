import { encodeHashToBase64, type ActionHash } from '@holochain/client'
import type { BookmarkRow } from '../holochain'
import type { DemoBookmark } from '../lib/holoMirror'
import type { Tab } from '../app/types'

type Props = {
  hc: boolean
  bookmarks: BookmarkRow[]
  demoBookmarks: DemoBookmark[]
  setUrl: (u: string) => void
  setTab: (t: Tab) => void
  removeBookmark: (hash: ActionHash | undefined, urlStr: string) => void
}

export function BookmarksPanel({
  hc,
  bookmarks,
  demoBookmarks,
  setUrl,
  setTab,
  removeBookmark,
}: Props) {
  return (
    <section className="panel">
      <h2>Bookmarks</h2>
      {!hc ? (
        <p className="hint">
          Offline view shows the last synced copy from Holochain plus anything you add before the conductor reconnects.
        </p>
      ) : null}
      <ul className="list">
        {hc
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
          : demoBookmarks.map((b) => (
              <li key={b.url}>
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
