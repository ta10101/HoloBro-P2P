import type { BookmarkRow, ChatMessageRow, ContactRow, HistoryRow, SharedLinkRow } from '../holochain'

export type DemoBookmark = { url: string; title: string }
export type DemoContact = { name: string; peerKey: string; proof: string }
export type DemoChatLine = { thread: string; body: string; at: number }
export type DemoHistoryEntry = { url: string; title: string; visited_at_ms: number }
export type DemoSharedLink = { url: string; title: string; description: string; tags: string; shared_at_ms: number }

export function mirrorBookmarks(rows: BookmarkRow[]): DemoBookmark[] {
  return rows.map((b) => ({ url: b.url, title: b.title }))
}

export function mirrorContacts(rows: ContactRow[]): DemoContact[] {
  return rows.map((c) => ({
    name: c.display_name,
    peerKey: c.peer_agent_pubkey_b64,
    proof: c.invite_proof_b64,
  }))
}

export function mergeThreadIntoDemoChat(
  prev: DemoChatLine[],
  threadId: string,
  messages: ChatMessageRow[],
): DemoChatLine[] {
  const others = prev.filter((x) => x.thread !== threadId)
  const fromHc = messages.map((m) => ({
    thread: threadId,
    body: m.body,
    at: m.sent_at_ms,
  }))
  return [...others, ...fromHc]
}

export function mirrorHistory(rows: HistoryRow[]): DemoHistoryEntry[] {
  return rows.map((h) => ({ url: h.url, title: h.title, visited_at_ms: h.visited_at_ms }))
}

export function mirrorSharedLinks(rows: SharedLinkRow[]): DemoSharedLink[] {
  return rows.map((l) => ({
    url: l.url,
    title: l.title,
    description: l.description,
    tags: l.tags,
    shared_at_ms: l.shared_at_ms,
  }))
}
