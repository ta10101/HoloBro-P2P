import { useState } from 'react'

export function ContactForm({
  onAdd,
}: {
  onAdd: (name: string, peerAgentPubkeyB64: string, proof: string) => void
}) {
  const [name, setName] = useState('')
  const [peerKey, setPeerKey] = useState('')
  const [proof, setProof] = useState('')
  return (
    <form
      className="row"
      onSubmit={(e) => {
        e.preventDefault()
        if (!name.trim() || !peerKey.trim()) return
        onAdd(name.trim(), peerKey.trim(), proof.trim())
        setName('')
        setPeerKey('')
        setProof('')
      }}
    >
      <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Display name" />
      <input
        value={peerKey}
        onChange={(e) => setPeerKey(e.target.value)}
        placeholder="Peer AgentPubKey (base64)"
        className="wide"
      />
      <input value={proof} onChange={(e) => setProof(e.target.value)} placeholder="Invite proof (base64)" />
      <button type="submit">Add contact</button>
    </form>
  )
}
