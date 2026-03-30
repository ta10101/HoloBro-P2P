import { Suspense } from 'react'
import { encodeHashToBase64 } from '@holochain/client'
import { HolochainEmptyHint } from '../components/HolochainEmptyHint'
import { hcChatEncryptionConfigured, type ChatMessageRow } from '../holochain'
import type { DemoChatLine } from '../lib/holoMirror'
import { IrcDockPanel } from '../app/lazyPanels'

type Props = {
  hc: boolean
  threadId: string
  setThreadId: (t: string) => void
  chatMessages: ChatMessageRow[]
  demoChat: DemoChatLine[]
  chatInput: string
  setChatInput: (s: string) => void
  refreshThread: () => void
  sendChat: () => void
}

export function ChatPanel({
  hc,
  threadId,
  setThreadId,
  chatMessages,
  demoChat,
  chatInput,
  setChatInput,
  refreshThread,
  sendChat,
}: Props) {
  return (
    <section className="panel">
      <h2>P2P chat (Holochain)</h2>
      <HolochainEmptyHint />
      {!hc ? (
        <p className="hint">
          Demo transcript is kept in sync with the last conductor fetch for this thread; reconnect to load live messages.
        </p>
      ) : hcChatEncryptionConfigured() ? (
        <p className="hint">
          Chat payloads are encrypted for this build (passphrase + thread id). Peers need the same{' '}
          <code className="mono">VITE_HC_CHAT_PASSPHRASE</code> to read messages.
        </p>
      ) : (
        <p className="hint">
          No chat passphrase set — message bodies are stored on chain as plaintext. Set{' '}
          <code className="mono">VITE_HC_CHAT_PASSPHRASE</code> in <code className="mono">.env.local</code> for AES-GCM
          ciphertext.
        </p>
      )}
      <div className="row">
        <label>
          Thread
          <input value={threadId} onChange={(e) => setThreadId(e.target.value)} />
        </label>
        <button type="button" onClick={() => void refreshThread()}>
          Refresh
        </button>
      </div>
      <div className="chat">
        {hc
          ? chatMessages.map((m) => (
              <div key={encodeHashToBase64(m.action_hash)} className="msg">
                <span className="mono">{encodeHashToBase64(m.author).slice(0, 12)}…</span>
                {m.body}
              </div>
            ))
          : demoChat
              .filter((x) => x.thread === threadId)
              .map((m) => (
                <div key={`${m.at}-${m.body.slice(0, 12)}`} className="msg">
                  (offline) {m.body}
                </div>
              ))}
      </div>
      <div className="row">
        <input
          value={chatInput}
          onChange={(e) => setChatInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && void sendChat()}
          placeholder="Message…"
        />
        <button type="button" onClick={() => void sendChat()}>
          Send
        </button>
      </div>
      <p className="hint">
        Encrypt message bodies client-side before production; the DNA stores opaque text for now.
      </p>
      <Suspense fallback={<p className="muted">Loading IRC…</p>}>
        <IrcDockPanel />
      </Suspense>
    </section>
  )
}
