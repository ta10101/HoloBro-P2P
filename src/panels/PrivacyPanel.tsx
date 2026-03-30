/**
 * Read-only privacy & Holochain sync status + pointers to operator docs.
 */
import type { ReactNode } from 'react';
import { useHolochain } from '../providers/HolochainProvider';
import {
  hcBookmarkEncryptionConfigured,
  hcChatEncryptionConfigured,
} from '../holochain';
import { HOLOBRO_DOCS_BASE } from '../lib/docLinks';
import { holobroReleaseTier, releaseTierLabel } from '../lib/releaseProfile';

function Row({ label, value }: { label: string; value: ReactNode }) {
  return (
    <tr>
      <td style={{ padding: '6px 12px 6px 0', verticalAlign: 'top', color: 'var(--muted)' }}>{label}</td>
      <td style={{ padding: '6px 0' }}>{value}</td>
    </tr>
  );
}

export function PrivacyPanel() {
  const h = useHolochain();

  return (
    <section className="panel">
      <h2>Privacy &amp; Holochain</h2>
      <p className="hint">
        This panel summarizes what this build is doing. It does not change settings — use each feature&apos;s panel for
        sync toggles, and <code className="mono">.env.local</code> for passphrases (then restart the app).
      </p>

      <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '1rem', fontSize: 13 }}>
        <tbody>
          <Row label="Release tier" value={`${releaseTierLabel()} (${holobroReleaseTier()})`} />
          <Row label="Conductor connected" value={h.hc ? 'Yes' : 'No'} />
          <Row
            label="Holochain env configured"
            value={
              h.hasHoloConfig
                ? 'Yes (.env.local and/or status bar Setup — WS + token)'
                : 'No — demo / local storage paths only'
            }
          />
          {h.hc || !h.hcLastError ? null : (
            <Row label="Last connect error" value={<span className="mono" style={{ fontSize: 12 }}>{h.hcLastError}</span>} />
          )}
          <Row label="Bookmark sync to DNA" value={h.bookmarkHolochainSync ? 'On' : 'Off (default)'} />
          <Row label="Bookmark ciphertext on chain" value={hcBookmarkEncryptionConfigured() ? 'Yes' : 'No (plaintext if sync on)'} />
          <Row label="Contact sync to DNA" value={h.contactHolochainSync ? 'On' : 'Off (default)'} />
          <Row label="Shared link publish to DNA" value={h.sharedLinkHolochainSync ? 'On' : 'Off (default)'} />
          <Row label="Chat body encryption" value={hcChatEncryptionConfigured() ? 'Yes (VITE_HC_CHAT_PASSPHRASE)' : 'No — plaintext on chain'} />
          <Row label="Browsing history" value="Device only (not written to Holochain)" />
        </tbody>
      </table>

      <h3 style={{ fontSize: 14, marginBottom: 8 }}>Secrets and passphrases</h3>
      <p className="hint" style={{ marginBottom: '1rem' }}>
        Chat and bookmark passphrases live in <code className="mono">.env.local</code> (see <code className="mono">.env.example</code>
        ), then restart the dev server or desktop build. They are <strong>shared secrets</strong>: anyone with the same passphrase
        and access to chain data can decrypt those payloads. Do not commit <code className="mono">.env.local</code>. In-app
        passphrase storage is not shipped in v1 — see operator doc §6 for backlog. For future key-agreement options, see{' '}
        <a href={`${HOLOBRO_DOCS_BASE}/HOLOBRO_CHAT_KEYS_SPIKE.md`} target="_blank" rel="noreferrer">
          Chat keys spike (design note)
        </a>
        .
      </p>

      <h3 style={{ fontSize: 14, marginBottom: 8 }}>Documentation</h3>
      <ul className="list" style={{ fontSize: 13 }}>
        <li>
          <a href={`${HOLOBRO_DOCS_BASE}/HOLOBRO_PRIVACY_OPERATORS.md`} target="_blank" rel="noreferrer">
            Operator guide — env vars, order of setup, checklist
          </a>
        </li>
        <li>
          <a href={`${HOLOBRO_DOCS_BASE}/HOLOBRO_DATA_CLASSES.md`} target="_blank" rel="noreferrer">
            Data classes policy table
          </a>
        </li>
        <li>
          <a href={`${HOLOBRO_DOCS_BASE}/HOLOBRO_YOUR_KEYS.md`} target="_blank" rel="noreferrer">
            Your keys &amp; identity — why it matters, examples, backups
          </a>
        </li>
      </ul>
    </section>
  );
}
