import type { RefObject } from 'react'

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
  return (
    <section className="panel">
      <h2>Video (WebRTC + Holochain signaling)</h2>
      <p className="hint">
        Uses browser WebRTC. Offers/answers/ICE are posted to the <code>signaling</code> path in the DNA. While this
        tab is open and Holochain is connected, remote signals are polled automatically every few seconds. For
        production, add TURN and encrypt signaling for non-trusted relays.
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
