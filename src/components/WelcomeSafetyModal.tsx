import { useState, useEffect } from 'react';
import { useUIStore } from '../store';
import { HOLOBRO_DOCS_BASE } from '../lib/docLinks';
import { holobroReleaseTier } from '../lib/releaseProfile';
import { normalizeAppWebsocketUrl } from '../holochainConnect';
import { useHolochain } from '../providers/HolochainProvider';

function readLs(key: string): string {
  try {
    return localStorage.getItem(key) ?? '';
  } catch {
    return '';
  }
}

/** First-run + header “Safety tips”: basics + optional Holochain URL/token (P2P). */
function HolochainWelcomeConnect() {
  const { reconnect, hc, hcConnecting, hcLastError } = useHolochain();
  const envWs = (import.meta.env.VITE_HC_APP_WS as string | undefined)?.trim();
  const envTok = (import.meta.env.VITE_HC_APP_TOKEN as string | undefined)?.trim();

  const [hcWs, setHcWs] = useState(
    () => readLs('holobro-hc-ws') || envWs || 'ws://127.0.0.1:8888',
  );
  const [hcToken, setHcToken] = useState(() => readLs('holobro-hc-token') || envTok || '');
  const [saveMsg, setSaveMsg] = useState<string | null>(null);

  useEffect(() => {
    if (hc) setSaveMsg(null);
  }, [hc]);

  const applyTypicalLocalWs = () => {
    setHcWs('ws://127.0.0.1:8888');
    setSaveMsg(null);
  };

  const saveAndConnect = () => {
    setSaveMsg(null);
    const w = hcWs.trim();
    const tok = hcToken.trim();
    if (!w || !tok) {
      setSaveMsg('Enter both the WebSocket URL and the app token (or use Continue to stay in demo mode).');
      return;
    }
    try {
      localStorage.setItem('holobro-hc-ws', normalizeAppWebsocketUrl(w));
      localStorage.setItem('holobro-hc-token', tok);
    } catch (e) {
      setSaveMsg(e instanceof Error ? e.message : 'Could not save settings.');
      return;
    }
    reconnect();
    setSaveMsg('Saved. Connecting…');
  };

  return (
    <div
      style={{
        marginBottom: 18,
        padding: '12px 14px',
        borderRadius: 10,
        border: '1px solid var(--border)',
        background: 'rgba(6,182,212,0.04)',
      }}
    >
      <div
        style={{
          fontFamily: 'var(--font-display)',
          fontSize: 13,
          fontWeight: 700,
          letterSpacing: 0.5,
          marginBottom: 8,
          color: 'var(--cyan)',
        }}
      >
        P2P / Holochain (optional)
      </div>
      <p className="hint" style={{ margin: '0 0 10px', lineHeight: 1.55, fontSize: 12 }}>
        For on-chain bookmarks, peers, and chat, HoloBro needs your <strong>app WebSocket URL</strong> and{' '}
        <strong>app token</strong> from the same place you started the conductor (for example{' '}
        <code className="mono">hc sandbox run</code> or <code className="mono">hc spin</code>). They are not your
        long-term signing keys — just a session handshake with the running app.
      </p>
      <ol
        style={{
          margin: '0 0 12px',
          paddingLeft: 18,
          fontSize: 12,
          lineHeight: 1.55,
          color: 'var(--text)',
        }}
      >
        <li style={{ marginBottom: 4 }}>
          Start your conductor / sandbox and find the line with the <strong>app</strong> WebSocket port (often{' '}
          <code className="mono">8888</code>).
        </li>
        <li style={{ marginBottom: 4 }}>
          Copy the <strong>app token</strong> (string, or comma-separated numbers) from that output.
        </li>
        <li>Paste both below, then <strong>Save &amp; connect</strong>.</li>
      </ol>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 10 }}>
        <button type="button" className="small" onClick={applyTypicalLocalWs}>
          Use typical local URL (ws://127.0.0.1:8888)
        </button>
      </div>

      <label style={{ display: 'block', marginBottom: 8, fontSize: 11 }}>
        <span style={{ display: 'block', marginBottom: 4, color: 'var(--muted)', fontFamily: 'var(--font-mono)' }}>
          App WebSocket URL
        </span>
        <input
          className="mono"
          value={hcWs}
          onChange={(e) => {
            setHcWs(e.target.value);
            setSaveMsg(null);
          }}
          placeholder="ws://127.0.0.1:8888"
          autoComplete="off"
          style={{
            width: '100%',
            boxSizing: 'border-box',
            padding: '8px 10px',
            borderRadius: 6,
            border: '1px solid var(--border)',
            background: 'var(--bg)',
            color: 'var(--text)',
            fontSize: 12,
          }}
        />
      </label>

      <label style={{ display: 'block', marginBottom: 10, fontSize: 11 }}>
        <span style={{ display: 'block', marginBottom: 4, color: 'var(--muted)', fontFamily: 'var(--font-mono)' }}>
          App token
        </span>
        <textarea
          className="mono"
          value={hcToken}
          onChange={(e) => {
            setHcToken(e.target.value);
            setSaveMsg(null);
          }}
          placeholder="Paste token from conductor output"
          rows={2}
          autoComplete="off"
          style={{
            width: '100%',
            boxSizing: 'border-box',
            padding: '8px 10px',
            borderRadius: 6,
            border: '1px solid var(--border)',
            background: 'var(--bg)',
            color: 'var(--text)',
            fontSize: 12,
            resize: 'vertical',
            fontFamily: 'var(--font-mono)',
          }}
        />
      </label>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
        <button type="button" className="small active" onClick={() => void saveAndConnect()}>
          {hcConnecting ? 'Connecting…' : 'Save & connect'}
        </button>
        {hc && (
          <span style={{ fontSize: 11, color: 'var(--green)', fontFamily: 'var(--font-mono)' }}>
            Connected to Holochain
          </span>
        )}
      </div>
      {saveMsg && (
        <p style={{ margin: '8px 0 0', fontSize: 11, color: saveMsg.startsWith('Saved') ? 'var(--green)' : 'var(--amber)' }}>
          {saveMsg}
        </p>
      )}
      {hcLastError && (
        <p style={{ margin: '8px 0 0', fontSize: 11, color: 'var(--amber)', fontFamily: 'var(--font-mono)' }}>
          {hcLastError}
        </p>
      )}
      <p style={{ margin: '10px 0 0', fontSize: 11, color: 'var(--muted)' }}>
        Advanced: status bar <strong>Setup</strong> or <code className="mono">.env.local</code> — see{' '}
        <a href={`${HOLOBRO_DOCS_BASE}/HOLOBRO_YOUR_KEYS.md`} target="_blank" rel="noreferrer">
          your keys &amp; connection
        </a>
        .
      </p>
    </div>
  );
}

export function WelcomeSafetyModal() {
  const firstRunDismissed = useUIStore((s) => s.firstRunDismissed);
  const welcomeGuideOpen = useUIStore((s) => s.welcomeGuideOpen);
  const dismissFirstRun = useUIStore((s) => s.dismissFirstRun);
  const closeWelcomeGuide = useUIStore((s) => s.closeWelcomeGuide);
  const setPanel = useUIStore((s) => s.setPanel);

  const open = !firstRunDismissed || welcomeGuideOpen;
  if (!open) return null;

  const keysGuideUrl = `${HOLOBRO_DOCS_BASE}/HOLOBRO_YOUR_KEYS.md`;
  const tier = holobroReleaseTier();

  const finish = () => {
    if (!firstRunDismissed) dismissFirstRun();
    closeWelcomeGuide();
  };

  return (
    <div
      className="modal-backdrop"
      role="dialog"
      aria-modal="true"
      aria-labelledby="welcome-safety-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) finish();
      }}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.72)',
        zIndex: 400,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
      }}
    >
      <div
        className="modal"
        onClick={(e) => e.stopPropagation()}
        style={{
          maxWidth: 520,
          width: '100%',
          maxHeight: '90vh',
          overflowY: 'auto',
          background: 'var(--panel)',
          border: '1px solid var(--border)',
          borderRadius: 12,
          padding: '20px 22px',
          boxShadow: '0 24px 80px rgba(0,0,0,0.55)',
        }}
      >
        <h2
          id="welcome-safety-title"
          style={{
            margin: '0 0 12px',
            fontFamily: 'var(--font-display)',
            fontSize: 20,
            fontWeight: 800,
            letterSpacing: 1,
          }}
        >
          Welcome to HoloBro
        </h2>
        <p className="hint" style={{ margin: '0 0 16px', lineHeight: 1.55 }}>
          A few safety basics before you browse. You can open this again anytime from{' '}
          <strong>Safety tips</strong> in the header.
        </p>
        {tier === 'lightweight' ? (
          <p className="hint" style={{ margin: '0 0 16px', lineHeight: 1.55 }}>
            This build uses the <strong>Lightweight</strong> profile (local-first). Use status bar <strong>Setup</strong>{' '}
            when you run a conductor and want P2P — or keep browsing in demo mode.
          </p>
        ) : null}
        <ul
          style={{
            margin: '0 0 18px',
            paddingLeft: 20,
            fontSize: 13,
            lineHeight: 1.6,
            color: 'var(--text)',
          }}
        >
          <li style={{ marginBottom: 8 }}>
            <strong>Identity:</strong> Holochain ties published actions to keys on this device. Treat keystore and
            passphrases like high-value credentials.
          </li>
          <li style={{ marginBottom: 8 }}>
            <strong>Dev connection:</strong> WebSocket URL and app token connect the UI to a running app — they are
            not the same as long-term signing keys.
          </li>
          <li style={{ marginBottom: 8 }}>
            <strong>Secrets:</strong> Do not commit <code className="mono">.env.local</code> or share screenshots of
            tokens.
          </li>
          <li>
            <strong>Sync:</strong> Bookmarks, peers, and library items use Holochain only when you turn sync on — see
            the <strong>Privacy</strong> panel for status.
          </li>
        </ul>

        {tier !== 'lightweight' ? <HolochainWelcomeConnect /> : null}

        <p style={{ margin: '0 0 18px', fontSize: 12, color: 'var(--muted)' }}>
          <a href={keysGuideUrl} target="_blank" rel="noreferrer">
            Full guide: your keys and identity
          </a>
        </p>
        <p className="hint" style={{ margin: '0 0 14px', fontSize: 12, lineHeight: 1.5 }}>
          <strong>Quick path:</strong> use <strong>Continue</strong> to browse in demo mode anytime. Set Holochain above
          only when you want live P2P.
        </p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          <button type="button" className="small active" onClick={finish}>
            Continue
          </button>
          <button
            type="button"
            className="small"
            onClick={() => {
              setPanel('privacy');
              finish();
            }}
          >
            Open Privacy
          </button>
          <button
            type="button"
            className="small"
            onClick={() => {
              setPanel('agents');
              finish();
            }}
          >
            Agent Hub
          </button>
        </div>
      </div>
    </div>
  );
}
