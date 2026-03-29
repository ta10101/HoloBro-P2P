use hdi::prelude::*;

/// A bookmark stored in the agent's source chain.
#[hdk_entry_helper]
#[derive(Clone, PartialEq)]
pub struct Bookmark {
    pub url: String,
    pub title: String,
    pub created_at_ms: i64,
}

/// Trusted contact: stores the peer's agent pubkey plus optional signed invitation material.
#[hdk_entry_helper]
#[derive(Clone, PartialEq)]
pub struct TrustedContact {
    pub display_name: String,
    /// Holochain `AgentPubKey` for the other party (base64).
    pub peer_agent_pubkey_b64: String,
    /// Opaque blob proving mutual trust (e.g. signed invitation). Empty in dev.
    pub invite_proof_b64: String,
    pub created_at_ms: i64,
}

/// Chat payload: encrypt client-side for production; stored as opaque text here.
#[hdk_entry_helper]
#[derive(Clone, PartialEq)]
pub struct ChatMessage {
    pub thread_id: String,
    pub body: String,
    pub sent_at_ms: i64,
}

/// WebRTC signaling envelope (offer / answer / ICE). Peers poll or subscribe via app signals.
#[hdk_entry_helper]
#[derive(Clone, PartialEq)]
pub struct WebRtcSignal {
    pub peer_pubkey_b64: String,
    pub signal_kind: String,
    pub payload_json: String,
    pub created_at_ms: i64,
}

// ── Phase 1: P2P user data ──────────────────────────────────────────────

/// A visited URL recorded on the agent's source chain and linked into the DHT.
#[hdk_entry_helper]
#[derive(Clone, PartialEq)]
pub struct HistoryEntry {
    pub url: String,
    pub title: String,
    pub visited_at_ms: i64,
}

/// Generic key-value user setting synced across devices via the DHT.
#[hdk_entry_helper]
#[derive(Clone, PartialEq)]
pub struct UserSetting {
    pub key: String,
    pub value_json: String,
    pub updated_at_ms: i64,
}

/// A single turn in an LLM assistant conversation.
#[hdk_entry_helper]
#[derive(Clone, PartialEq)]
pub struct AssistantMessage {
    pub conversation_id: String,
    pub role: String,
    pub body: String,
    pub created_at_ms: i64,
}

// ── Phase 2: P2P content sharing ────────────────────────────────────────

/// A cached/pinned web page snapshot shared with peers via the DHT.
/// `body_compressed` holds zstd-compressed HTML (capped at ~500 KB).
#[hdk_entry_helper]
#[derive(Clone, PartialEq)]
pub struct SharedPage {
    pub url: String,
    pub title: String,
    pub content_hash: String,
    pub content_type: String,
    pub body_compressed: Vec<u8>,
    pub fetched_at_ms: i64,
    pub description: String,
}

/// Lightweight URL recommendation shared to the network.
#[hdk_entry_helper]
#[derive(Clone, PartialEq)]
pub struct SharedLink {
    pub url: String,
    pub title: String,
    pub description: String,
    pub tags: String,
    pub shared_at_ms: i64,
}

// ── Phase 3B: P2P DNS cache ─────────────────────────────────────────────

/// A DNS record observed by a peer and published to the DHT for crowd-sourced resolution.
#[hdk_entry_helper]
#[derive(Clone, PartialEq)]
pub struct PeerDnsRecord {
    pub hostname: String,
    pub record_type: String,
    pub value: String,
    pub observed_at_ms: i64,
    pub ttl_secs: u32,
}

#[derive(Serialize, Deserialize)]
#[serde(tag = "type")]
#[hdk_entry_types]
#[unit_enum(UnitEntryTypes)]
pub enum EntryTypes {
    Bookmark(Bookmark),
    TrustedContact(TrustedContact),
    ChatMessage(ChatMessage),
    WebRtcSignal(WebRtcSignal),
    HistoryEntry(HistoryEntry),
    UserSetting(UserSetting),
    AssistantMessage(AssistantMessage),
    SharedPage(SharedPage),
    SharedLink(SharedLink),
    PeerDnsRecord(PeerDnsRecord),
}

#[derive(Serialize, Deserialize)]
#[hdk_link_types]
pub enum LinkTypes {
    AllBookmarks,
    AllContacts,
    ThreadMessages,
    Signaling,
    AllHistory,
    AllSettings,
    ConversationMessages,
    SharedPages,
    SharedPagesByUrl,
    SharedLinks,
    TaggedLinks,
    DnsRecords,
}

#[hdk_extern]
pub fn genesis_self_check(_data: GenesisSelfCheckData) -> ExternResult<ValidateCallbackResult> {
    Ok(ValidateCallbackResult::Valid)
}

#[hdk_extern]
pub fn validate(_op: Op) -> ExternResult<ValidateCallbackResult> {
    // TODO: Add per-type validation (author-only settings, SharedPage size caps, content hash checks)
    Ok(ValidateCallbackResult::Valid)
}
