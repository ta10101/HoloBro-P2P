export type Tab =
  | 'browser'
  | 'bookmarks'
  | 'contacts'
  | 'chat'
  | 'video'
  | 'assistant'
  | 'network'
  | 'weather'
  | 'history'
  | 'p2p-library'
  | 'agents'
  | 'wanderer'

export type ContactDisplay = { id: string; name: string; peerKey: string; proof: string }

export type PendingOp =
  | { kind: 'bookmark'; payload: { url: string; title: string; created_at_ms: number } }
  | {
      kind: 'contact'
      payload: {
        display_name: string
        peer_agent_pubkey_b64: string
        invite_proof_b64: string
        created_at_ms: number
      }
    }
  | { kind: 'chat'; payload: { thread_id: string; body: string; sent_at_ms: number } }
  | { kind: 'history'; payload: { url: string; title: string; visited_at_ms: number } }
  | { kind: 'setting'; payload: { key: string; value_json: string; updated_at_ms: number } }
  | { kind: 'shared_link'; payload: { url: string; title: string; description: string; tags: string; shared_at_ms: number } }
