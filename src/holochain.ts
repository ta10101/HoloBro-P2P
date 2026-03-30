import {
  AppWebsocket,
  type ActionHash,
  type AgentPubKey,
} from '@holochain/client'
import { openBookmarkRow, sealBookmarkForChain } from './lib/bookmarkEnvelope'
import { decryptMessage, encryptMessage, isCryptoAvailable } from './lib/chatCrypto'

/** Matches `workdir/happ.yaml` role name. */
export const HC_ROLE_NAME = import.meta.env.VITE_HC_ROLE_NAME ?? 'anon_browser'
export const HC_ZOME_NAME = 'anon_browser'

const HC_CHAT_PASSPHRASE = (import.meta.env.VITE_HC_CHAT_PASSPHRASE as string | undefined)?.trim()
const HC_BOOKMARK_PASSPHRASE = (import.meta.env.VITE_HC_BOOKMARK_PASSPHRASE as string | undefined)?.trim()

/** When set, chat bodies are AES-GCM encrypted before `send_chat_message` (per-thread salt). See `.env.example`. */
export function hcChatEncryptionConfigured(): boolean {
  return Boolean(HC_CHAT_PASSPHRASE)
}

/** When set and bookmark sync is on, `create_bookmark` stores an encrypted envelope (see `bookmarkEnvelope.ts`). */
export function hcBookmarkEncryptionConfigured(): boolean {
  return Boolean(HC_BOOKMARK_PASSPHRASE)
}

// ── Row types ───────────────────────────────────────────────────────────

export type BookmarkRow = {
  action_hash: ActionHash
  url: string
  title: string
  created_at_ms: number
}

export type ContactRow = {
  action_hash: ActionHash
  author: AgentPubKey
  display_name: string
  peer_agent_pubkey_b64: string
  invite_proof_b64: string
  created_at_ms: number
}

export type ChatMessageRow = {
  action_hash: ActionHash
  author: AgentPubKey
  thread_id: string
  body: string
  sent_at_ms: number
}

export type WebRtcSignalRow = {
  action_hash: ActionHash
  author: AgentPubKey
  peer_pubkey_b64: string
  signal_kind: string
  payload_json: string
  created_at_ms: number
}

export type HistoryRow = {
  action_hash: ActionHash
  author: AgentPubKey
  url: string
  title: string
  visited_at_ms: number
}

export type UserSettingRow = {
  action_hash: ActionHash
  key: string
  value_json: string
  updated_at_ms: number
}

export type AssistantMessageRow = {
  action_hash: ActionHash
  author: AgentPubKey
  conversation_id: string
  role: string
  body: string
  created_at_ms: number
}

export type SharedPageRow = {
  action_hash: ActionHash
  author: AgentPubKey
  url: string
  title: string
  content_hash: string
  content_type: string
  body_compressed: number[]
  fetched_at_ms: number
  description: string
}

export type SharedLinkRow = {
  action_hash: ActionHash
  author: AgentPubKey
  url: string
  title: string
  description: string
  tags: string
  shared_at_ms: number
}

export type PeerDnsRecordRow = {
  action_hash: ActionHash
  author: AgentPubKey
  hostname: string
  record_type: string
  value: string
  observed_at_ms: number
  ttl_secs: number
}

// ── Helper ──────────────────────────────────────────────────────────────

async function callZome<T>(client: AppWebsocket, fn_name: string, payload: unknown): Promise<T> {
  return (await client.callZome({
    role_name: HC_ROLE_NAME,
    zome_name: HC_ZOME_NAME,
    fn_name,
    payload,
  })) as T
}

function assertArray<T>(val: unknown, label: string): T[] {
  if (!Array.isArray(val)) throw new Error(`${label}: unexpected response`)
  return val as T[]
}

// ═══════════════════════════════════════════════════════════════════════
// BOOKMARKS
// ═══════════════════════════════════════════════════════════════════════

export async function hcListBookmarks(client: AppWebsocket): Promise<BookmarkRow[]> {
  const rows = assertArray<BookmarkRow>(await callZome(client, 'list_bookmarks', null), 'list_bookmarks')
  if (!HC_BOOKMARK_PASSPHRASE || !isCryptoAvailable()) return rows
  const pp = HC_BOOKMARK_PASSPHRASE
  return Promise.all(rows.map((r) => openBookmarkRow(r, pp)))
}

export async function hcCreateBookmark(
  client: AppWebsocket,
  input: { url: string; title: string; created_at_ms: number },
): Promise<void> {
  let payload = input
  if (HC_BOOKMARK_PASSPHRASE && isCryptoAvailable()) {
    payload = {
      ...input,
      ...(await sealBookmarkForChain(input.url, input.title, HC_BOOKMARK_PASSPHRASE)),
    }
  }
  await callZome(client, 'create_bookmark', payload)
}

export async function hcDeleteBookmark(client: AppWebsocket, actionHash: ActionHash): Promise<void> {
  await callZome(client, 'delete_bookmark', actionHash)
}

// ═══════════════════════════════════════════════════════════════════════
// CONTACTS
// ═══════════════════════════════════════════════════════════════════════

export async function hcListContacts(client: AppWebsocket): Promise<ContactRow[]> {
  return assertArray<ContactRow>(await callZome(client, 'list_trusted_contacts', null), 'list_trusted_contacts')
}

export async function hcCreateContact(
  client: AppWebsocket,
  input: {
    display_name: string
    peer_agent_pubkey_b64: string
    invite_proof_b64: string
    created_at_ms: number
  },
): Promise<void> {
  await callZome(client, 'create_trusted_contact', input)
}

// ═══════════════════════════════════════════════════════════════════════
// CHAT
// ═══════════════════════════════════════════════════════════════════════

export async function hcSendChat(
  client: AppWebsocket,
  input: { thread_id: string; body: string; sent_at_ms: number },
): Promise<void> {
  let body = input.body
  if (HC_CHAT_PASSPHRASE && isCryptoAvailable()) {
    body = await encryptMessage(input.body, HC_CHAT_PASSPHRASE, input.thread_id)
  }
  await callZome(client, 'send_chat_message', { ...input, body })
}

export async function hcListThread(
  client: AppWebsocket,
  threadId: string,
): Promise<ChatMessageRow[]> {
  const rows = assertArray<ChatMessageRow>(
    await callZome(client, 'list_thread_messages', { thread_id: threadId }),
    'list_thread_messages',
  )
  if (!HC_CHAT_PASSPHRASE || !isCryptoAvailable()) return rows
  const pp = HC_CHAT_PASSPHRASE
  return Promise.all(
    rows.map(async (r) => {
      const pt = await decryptMessage(r.body, pp, threadId)
      if (pt !== null) return { ...r, body: pt }
      return r
    }),
  )
}

// ═══════════════════════════════════════════════════════════════════════
// WEBRTC SIGNALING
// ═══════════════════════════════════════════════════════════════════════

export async function hcPostSignal(
  client: AppWebsocket,
  input: {
    peer_pubkey_b64: string
    signal_kind: string
    payload_json: string
    created_at_ms: number
  },
): Promise<void> {
  await callZome(client, 'post_webrtc_signal', input)
}

export async function hcListSignals(client: AppWebsocket): Promise<WebRtcSignalRow[]> {
  return assertArray<WebRtcSignalRow>(await callZome(client, 'list_recent_signals', null), 'list_recent_signals')
}

// ═══════════════════════════════════════════════════════════════════════
// HISTORY  (Phase 1)
// ═══════════════════════════════════════════════════════════════════════

export async function hcCreateHistory(
  client: AppWebsocket,
  input: { url: string; title: string; visited_at_ms: number },
): Promise<void> {
  await callZome(client, 'create_history_entry', input)
}

export async function hcListHistory(client: AppWebsocket): Promise<HistoryRow[]> {
  return assertArray<HistoryRow>(await callZome(client, 'list_history', null), 'list_history')
}

export async function hcDeleteHistory(client: AppWebsocket, actionHash: ActionHash): Promise<void> {
  await callZome(client, 'delete_history_entry', actionHash)
}

export async function hcClearHistory(client: AppWebsocket): Promise<void> {
  await callZome(client, 'clear_all_history', null)
}

// ═══════════════════════════════════════════════════════════════════════
// USER SETTINGS  (Phase 1)
// ═══════════════════════════════════════════════════════════════════════

export async function hcSetSetting(
  client: AppWebsocket,
  input: { key: string; value_json: string; updated_at_ms: number },
): Promise<void> {
  await callZome(client, 'set_user_setting', input)
}

export async function hcGetSetting(
  client: AppWebsocket,
  key: string,
): Promise<UserSettingRow | null> {
  return (await callZome<UserSettingRow | null>(client, 'get_user_setting', { key })) ?? null
}

export async function hcListSettings(client: AppWebsocket): Promise<UserSettingRow[]> {
  return assertArray<UserSettingRow>(await callZome(client, 'list_user_settings', null), 'list_user_settings')
}

// ═══════════════════════════════════════════════════════════════════════
// ASSISTANT MESSAGES  (Phase 1)
// ═══════════════════════════════════════════════════════════════════════

export async function hcCreateAssistantMessage(
  client: AppWebsocket,
  input: {
    conversation_id: string
    role: string
    body: string
    created_at_ms: number
  },
): Promise<void> {
  await callZome(client, 'create_assistant_message', input)
}

export async function hcListAssistantConversation(
  client: AppWebsocket,
  conversationId: string,
): Promise<AssistantMessageRow[]> {
  return assertArray<AssistantMessageRow>(
    await callZome(client, 'list_assistant_conversation', { conversation_id: conversationId }),
    'list_assistant_conversation',
  )
}

// ═══════════════════════════════════════════════════════════════════════
// SHARED PAGES  (Phase 2)
// ═══════════════════════════════════════════════════════════════════════

export async function hcCreateSharedPage(
  client: AppWebsocket,
  input: {
    url: string
    title: string
    content_hash: string
    content_type: string
    body_compressed: number[]
    fetched_at_ms: number
    description: string
  },
): Promise<void> {
  await callZome(client, 'create_shared_page', input)
}

export async function hcListSharedPages(client: AppWebsocket): Promise<SharedPageRow[]> {
  return assertArray<SharedPageRow>(await callZome(client, 'list_shared_pages', null), 'list_shared_pages')
}

export async function hcGetSharedPage(
  client: AppWebsocket,
  actionHash: ActionHash,
): Promise<SharedPageRow | null> {
  return (await callZome<SharedPageRow | null>(client, 'get_shared_page', actionHash)) ?? null
}

export async function hcSearchSharedPagesByUrl(
  client: AppWebsocket,
  url: string,
): Promise<SharedPageRow[]> {
  return assertArray<SharedPageRow>(
    await callZome(client, 'search_shared_pages_by_url', { url }),
    'search_shared_pages_by_url',
  )
}

// ═══════════════════════════════════════════════════════════════════════
// SHARED LINKS  (Phase 2)
// ═══════════════════════════════════════════════════════════════════════

export async function hcCreateSharedLink(
  client: AppWebsocket,
  input: {
    url: string
    title: string
    description: string
    tags: string
    shared_at_ms: number
  },
): Promise<void> {
  await callZome(client, 'create_shared_link', input)
}

export async function hcListSharedLinks(client: AppWebsocket): Promise<SharedLinkRow[]> {
  return assertArray<SharedLinkRow>(await callZome(client, 'list_shared_links', null), 'list_shared_links')
}

export async function hcListLinksByTag(
  client: AppWebsocket,
  tag: string,
): Promise<SharedLinkRow[]> {
  return assertArray<SharedLinkRow>(
    await callZome(client, 'list_links_by_tag', { tag }),
    'list_links_by_tag',
  )
}

// ═══════════════════════════════════════════════════════════════════════
// PEER DNS  (Phase 3B)
// ═══════════════════════════════════════════════════════════════════════

export async function hcCreateDnsRecord(
  client: AppWebsocket,
  input: {
    hostname: string
    record_type: string
    value: string
    observed_at_ms: number
    ttl_secs: number
  },
): Promise<void> {
  await callZome(client, 'create_dns_record', input)
}

export async function hcLookupDns(
  client: AppWebsocket,
  hostname: string,
): Promise<PeerDnsRecordRow[]> {
  return assertArray<PeerDnsRecordRow>(
    await callZome(client, 'lookup_dns', { hostname }),
    'lookup_dns',
  )
}
