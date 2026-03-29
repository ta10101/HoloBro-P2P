import { ContactForm } from '../components/ContactForm'
import type { ContactDisplay } from '../app/types'

type Props = {
  contactList: ContactDisplay[]
  onAddContact: (name: string, peerKey: string, proof: string) => void
}

export function ContactsPanel({ contactList, onAddContact }: Props) {
  return (
    <section className="panel">
      <h2>Trusted contacts</h2>
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
