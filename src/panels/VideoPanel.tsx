import { type RefObject, useCallback, useState } from 'react'
import { setIceServers, getIceServers } from '../webrtc'

const LS_TURN_URL = 'holobro-turn-url'
const LS_TURN_USER = 'holobro-turn-user'
const LS_TURN_CRED = 'holobro-turn-cred'

function loadLs(key: string, fb: string) { try { return localStorage.getItem(key) || fb } catch { return fb } }

type Props = {
  videoPeerB64: string
  setVideoPeerB64: (s: string) => void
  localVid: RefObject<HTMLVideoElement | null>
  remoteVid: RefObject<HTMLVideoElement | null>
  videoLog: string[]
  startVideo: () => void
  applyRemoteSignals: () => void
  stopVideo: () => void
  signalPollActive: boolean
}

export function VideoPanel({
  videoPeerB64,
  setVideoPeerB64,
  localVid,
  remoteVid,
  videoLog,
  startVideo,
  applyRemoteSignals,
  stopVideo,
  signalPollActive,
}: Props) {
  const [showTurn, setShowTurn] = useState(false)
  const [turnUrl, setTurnUrl] = useState(() => loadLs(LS_TURN_URL, ''))
  const [turnUser, setTurnUser] = useState(() => loadLs(LS_TURN_USER, ''))
  const [turnCred, setTurnCred] = useState(() => loadLs(LS_TURN_CRED, ''))
  const [turnStatus, setTurnStatus] = useState('')

  const applyTurn = useCallback(() => {
    const url = turnUrl.trim()
    localStorage.setItem(LS_TURN_URL, url)
    localStorage.setItem(LS_TURN_USER, turnUser)
    localStorage.setItem(LS_TURN_CRED, turnCred)
    if (!url) {
      setIceServers([]) // reset to defaults
      setTurnStatus('Cleared — using default STUN servers')
      return
    }
    const servers: RTCIceServer[] = [
      ...getIceServers().filter((s) => {
        const u = Array.isArray(s.urls) ? s.urls[0] : s.urls
        return u?.startsWith('stun:')
      }),
      {
        urls: url,
        username: turnUser.trim() || undefined,
        credential: turnCred.trim() || undefined,
      },
    ]
    setIceServers(servers)
    setTurnStatus(`TURN applied: ${url}`)
  }, [turnUrl, turnUser, turnCred])

  return (
    <section className="panel">
      <h2>Video (WebRTC + Holochain signaling)</h2>
      <p className="hint">
        Uses browser WebRTC. Offers/answers/ICE are posted to the <code>signaling</code> path in the DNA. While this
        tab is open and Holochain is connected, remote signals are polled automatically every few seconds.
      </p>
      {signalPollActive ? (
        <p className="hint muted">Auto-polling remote signals…</p>
      ) : null}
      <div className="row">
        <label>
          Filter peer pubkey (base64)
          <input
            value={videoPeerB64}
            onChange={(e) => setVideoPeerB64(e.target.value)}
            placeholder="optional"
          />
        </label>
        <button type="button" onClick={() => void startVideo()}>
          Start &amp; offer
        </button>
        <button type="button" onClick={() => void applyRemoteSignals()}>
          Apply remote signals now
        </button>
        <button type="button" onClick={stopVideo}>
          Stop
        </button>
      </div>

      {/* TURN server config */}
      <div style={{ marginTop: 8 }}>
        <button type="button" className="linkish" onClick={() => setShowTurn((v) => !v)}>
          {showTurn ? 'Hide TURN config' : 'Configure TURN server'}
        </button>
        {showTurn && (
          <div className="irc-grid" style={{ marginTop: 6, gap: 6 }}>
            <label>
              TURN URL
              <input value={turnUrl} onChange={(e) => setTurnUrl(e.target.value)} placeholder="turn:your.server:3478" />
            </label>
            <label>
              Username (optional)
              <input value={turnUser} onChange={(e) => setTurnUser(e.target.value)} placeholder="turn-user" />
            </label>
            <label>
              Credential (optional)
              <input type="password" value={turnCred} onChange={(e) => setTurnCred(e.target.value)} placeholder="secret" />
            </label>
            <div className="row">
              <button type="button" onClick={applyTurn}>Apply TURN</button>
              <button type="button" onClick={() => { setTurnUrl(''); setTurnUser(''); setTurnCred(''); setIceServers([]); setTurnStatus('Reset to defaults') }}>
                Reset to defaults
              </button>
            </div>
            {turnStatus && <p className="hint muted">{turnStatus}</p>}
            <p className="hint">
              A TURN server relays media when peers can't connect directly (e.g. strict NATs). Public STUN servers
              are included by default. Add your own TURN server for reliable connectivity behind firewalls.
            </p>
          </div>
        )}
      </div>

      <div className="videos">
        <video ref={localVid} muted playsInline autoPlay />
        <video ref={remoteVid} playsInline autoPlay />
      </div>
      <ul className="log">
        {videoLog.map((line, i) => (
          <li key={i}>{line}</li>
        ))}
      </ul>
    </section>
  )
}
