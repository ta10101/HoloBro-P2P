import { ContactForm } from '../components/ContactForm'
import { HolochainEmptyHint } from '../components/HolochainEmptyHint'
import type { ContactDisplay } from '../app/types'

type Props = {
  hc: boolean
  contactHolochainSync: boolean
  setContactHolochainSync: (enabled: boolean) => void
  contactList: ContactDisplay[]
  onAddContact: (name: string, peerKey: string, proof: string) => void
}

export function ContactsPanel({
  hc,
  contactHolochainSync,
  setContactHolochainSync,
  contactList,
  onAddContact,
}: Props) {
  return (
    <section className="panel">
      <h2>Trusted contacts</h2>
      <HolochainEmptyHint />
      <label className="row" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
        <input
          type="checkbox"
          checked={contactHolochainSync}
          onChange={(e) => setContactHolochainSync(e.target.checked)}
        />
        <span>Sync contacts to Holochain</span>
      </label>
      <p className="hint">
        {contactHolochainSync
          ? hc
            ? 'New contacts are written to your source chain. Verify keys before trusting.'
            : 'Enabled — connect Holochain to sync; until then contacts stay on this device.'
          : 'Contacts stay on this device only until you enable sync above.'}
      </p>
      <p className="hint">
        On-chain contacts are authored by each agent; <code>invite_proof_b64</code> is where you store a signed
        invitation or pairwise secret. Verify cryptographically before trusting.
      </p>
      <ContactForm onAdd={(n, pk, p) => void onAddContact(n, pk, p)} />
      <ul className="list">
        {contactList.map((c) => (
          <li key={c.id}>
            <strong>{c.name}</strong>
            <span className="mono" title="Peer agent key">
              {c.peerKey || c.id}
            </span>
            {c.proof ? <span className="muted">{c.proof.slice(0, 48)}…</span> : null}
          </li>
        ))}
      </ul>
    </section>
  )
}
