import { useEffect, useState } from 'react';
import {
  fetchHolochainBundledRuntimeProbe,
  invokeBundledSandboxStart,
  invokeBundledSandboxStop,
  type HolochainBundledRuntimeProbeResult,
} from '../lib/holochainSidecarProbe';
import { tierBundlesHolochainArtifacts } from '../lib/releaseProfile';
import { isTauri } from '../lib/tauri';
import { useHolochain } from '../providers/HolochainProvider';

/** Shown on panels that use the conductor when `hc` is null — setup pointers + last error (no secrets). */
export function HolochainEmptyHint() {
  const { hc, hasHoloConfig, hcLastError, hcConnecting, reconnect, navigateToPanel } = useHolochain();
  const [bundledProbe, setBundledProbe] = useState<HolochainBundledRuntimeProbeResult | null>(null);
  const [sandboxBusy, setSandboxBusy] = useState(false);
  const [sandboxMsg, setSandboxMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!isTauri() || !tierBundlesHolochainArtifacts()) return;
    let cancelled = false;
    void (async () => {
      const r = await fetchHolochainBundledRuntimeProbe();
      if (!cancelled && r) setBundledProbe(r);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

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
      {bundledProbe ? (
        <span style={{ display: 'block', marginTop: 8, fontSize: 12, lineHeight: 1.45 }}>
          {bundledProbe.sidecarsResolved ? (
            <>
              <strong>Bundled runtime detected</strong> (holochain + lair-keystore
              {bundledProbe.sandboxReady ? ' + hc' : ''}).
              {bundledProbe.holochainVersionLine ? (
                <span style={{ display: 'block', marginTop: 4, fontFamily: 'var(--font-mono)', fontSize: 11 }}>
                  {bundledProbe.holochainVersionLine}
                </span>
              ) : null}
              {bundledProbe.lairKeystoreVersionLine ? (
                <span style={{ display: 'block', marginTop: 2, fontFamily: 'var(--font-mono)', fontSize: 11 }}>
                  {bundledProbe.lairKeystoreVersionLine}
                </span>
              ) : null}
              {bundledProbe.hcVersionLine ? (
                <span style={{ display: 'block', marginTop: 2, fontFamily: 'var(--font-mono)', fontSize: 11 }}>
                  {bundledProbe.hcVersionLine}
                </span>
              ) : null}
              {bundledProbe.sandboxReady ? (
                <span style={{ display: 'block', marginTop: 8 }}>
                  <button
                    type="button"
                    className="small"
                    disabled={sandboxBusy}
                    onClick={() => {
                      setSandboxBusy(true);
                      setSandboxMsg(null);
                      void (async () => {
                        const r = await invokeBundledSandboxStart();
                        setSandboxBusy(false);
                        if (r) setSandboxMsg(r.message);
                        void reconnect();
                      })();
                    }}
                  >
                    Start bundled sandbox
                  </button>{' '}
                  <button
                    type="button"
                    className="small"
                    disabled={sandboxBusy}
                    onClick={() => {
                      setSandboxBusy(true);
                      void (async () => {
                        await invokeBundledSandboxStop();
                        setSandboxBusy(false);
                        setSandboxMsg('Stopped bundled sandbox.');
                      })();
                    }}
                  >
                    Stop bundled sandbox
                  </button>{sandboxMsg ? (
                    <span style={{ display: 'block', marginTop: 6 }}>{sandboxMsg}</span>
                  ) : null}
                  <span style={{ display: 'block', marginTop: 6 }}>
                    Watch terminal/stderr for the app WebSocket URL, then use <strong>Setup</strong> for URL and
                    token. Prebuilt toolchain may not match your DNA — see{' '}
                    <code className="mono">holochain-sidecars.manifest.json</code>.
                  </span>
                </span>
              ) : (
                <span style={{ display: 'block', marginTop: 6 }}>
                  Install all three sidecars (<code className="mono">npm run fetch:sidecars</code>) and rebuild
                  Standard/Full, or run your own conductor.
                </span>
              )}
            </>
          ) : (
            <>
              <strong>Bundled runtime</strong>: sidecars missing or not runnable (
              {bundledProbe.message ?? 'no details'}).
            </>
          )}
        </span>
      ) : null}
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
