import { useHolochain } from '../providers/HolochainProvider';

/** Shown on panels that use the conductor when `hc` is null — setup pointers + last error (no secrets). */
export function HolochainEmptyHint() {
  const { hc, hasHoloConfig, hcLastError, hcConnecting, reconnect, navigateToPanel } = useHolochain();
  if (hc) return null;

  return (
    <div
      className="hint"
      role="status"
      style={{
        marginBottom: '0.75rem',
        padding: '10px 12px',
        border: '1px solid var(--border)',
        borderRadius: 8,
        background: 'var(--bg)',
      }}
    >
      <strong>Conductor not connected.</strong>
      {hasHoloConfig ? (
        <>
          {hcLastError ? (
            <span style={{ display: 'block', marginTop: 6, fontFamily: 'var(--font-mono)', fontSize: 11 }}>
              Last error: {hcLastError}
            </span>
          ) : null}
          {hcConnecting ? <span style={{ display: 'block', marginTop: 4 }}>Connecting…</span> : null}
          <span style={{ display: 'block', marginTop: 8, lineHeight: 1.5 }}>
            Start your conductor and confirm the app WebSocket URL matches <code className="mono">VITE_HC_APP_WS</code>{' '}
            (not the Vite dev port — see docs/HOLOBRO_PRIVACY_OPERATORS.md). Use the status bar <strong>Setup</strong>{' '}
            to edit URL/token.{' '}
            <button type="button" className="small" onClick={() => void reconnect()}>
              Retry connect
            </button>{' '}
            <button type="button" className="small" onClick={() => navigateToPanel('privacy')}>
              Privacy &amp; status
            </button>
          </span>
        </>
      ) : (
        <span style={{ display: 'block', marginTop: 6, lineHeight: 1.5 }}>
          Set <code className="mono">VITE_HC_APP_WS</code> and <code className="mono">VITE_HC_APP_TOKEN</code> in{' '}
          <code className="mono">.env.local</code> (see <code className="mono">.env.example</code>) or open the status bar{' '}
          <strong>Setup</strong> to save URL and token.{' '}
          <button type="button" className="small" onClick={() => navigateToPanel('privacy')}>
            Open Privacy
          </button>
        </span>
      )}
    </div>
  );
}
