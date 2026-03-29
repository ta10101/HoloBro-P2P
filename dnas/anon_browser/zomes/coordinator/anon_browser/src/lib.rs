use anon_browser_integrity::{
    AssistantMessage, Bookmark, ChatMessage, EntryTypes, HistoryEntry, LinkTypes,
    PeerDnsRecord, SharedLink, SharedPage, TrustedContact, UserSetting, WebRtcSignal,
};
use hdk::prelude::*;

// ── Row types returned to the frontend ──────────────────────────────────

#[derive(Serialize, Deserialize, Debug)]
pub struct BookmarkRow {
    pub action_hash: ActionHash,
    pub url: String,
    pub title: String,
    pub created_at_ms: i64,
}

#[derive(Serialize, Deserialize, Debug)]
pub struct ContactRow {
    pub action_hash: ActionHash,
    pub author: AgentPubKey,
    pub display_name: String,
    pub peer_agent_pubkey_b64: String,
    pub invite_proof_b64: String,
    pub created_at_ms: i64,
}

#[derive(Serialize, Deserialize, Debug)]
pub struct ChatMessageRow {
    pub action_hash: ActionHash,
    pub author: AgentPubKey,
    pub thread_id: String,
    pub body: String,
    pub sent_at_ms: i64,
}

#[derive(Serialize, Deserialize, Debug)]
pub struct WebRtcSignalRow {
    pub action_hash: ActionHash,
    pub author: AgentPubKey,
    pub peer_pubkey_b64: String,
    pub signal_kind: String,
    pub payload_json: String,
    pub created_at_ms: i64,
}

#[derive(Serialize, Deserialize, Debug)]
pub struct HistoryRow {
    pub action_hash: ActionHash,
    pub author: AgentPubKey,
    pub url: String,
    pub title: String,
    pub visited_at_ms: i64,
}

#[derive(Serialize, Deserialize, Debug)]
pub struct UserSettingRow {
    pub action_hash: ActionHash,
    pub key: String,
    pub value_json: String,
    pub updated_at_ms: i64,
}

#[derive(Serialize, Deserialize, Debug)]
pub struct AssistantMessageRow {
    pub action_hash: ActionHash,
    pub author: AgentPubKey,
    pub conversation_id: String,
    pub role: String,
    pub body: String,
    pub created_at_ms: i64,
}

#[derive(Serialize, Deserialize, Debug)]
pub struct SharedPageRow {
    pub action_hash: ActionHash,
    pub author: AgentPubKey,
    pub url: String,
    pub title: String,
    pub content_hash: String,
    pub content_type: String,
    pub body_compressed: Vec<u8>,
    pub fetched_at_ms: i64,
    pub description: String,
}

#[derive(Serialize, Deserialize, Debug)]
pub struct SharedLinkRow {
    pub action_hash: ActionHash,
    pub author: AgentPubKey,
    pub url: String,
    pub title: String,
    pub description: String,
    pub tags: String,
    pub shared_at_ms: i64,
}

#[derive(Serialize, Deserialize, Debug)]
pub struct PeerDnsRecordRow {
    pub action_hash: ActionHash,
    pub author: AgentPubKey,
    pub hostname: String,
    pub record_type: String,
    pub value: String,
    pub observed_at_ms: i64,
    pub ttl_secs: u32,
}

// ── Helper: walk links → records ────────────────────────────────────────

fn collect_links(path_str: &str, link_type: LinkTypes) -> ExternResult<Vec<(ActionHash, Record)>> {
    let path = Path::from(path_str);
    let links = get_links(
        LinkQuery::new(path.path_entry_hash()?, link_type.try_into_filter()?),
        GetStrategy::default(),
    )?;
    let mut out = Vec::new();
    for link in links {
        let ah = link.target.into_action_hash().ok_or(wasm_error!(
            WasmErrorInner::Guest("link missing action hash".into())
        ))?;
        if let Some(record) = get(ah.clone(), GetOptions::default())? {
            out.push((ah, record));
        }
    }
    Ok(out)
}

// ═══════════════════════════════════════════════════════════════════════
// BOOKMARKS  (existing)
// ═══════════════════════════════════════════════════════════════════════

#[hdk_extern]
pub fn create_bookmark(input: Bookmark) -> ExternResult<ActionHash> {
    let ah = create_entry(&EntryTypes::Bookmark(input.clone()))?;
    let path = Path::from("bookmarks");
    create_link(path.path_entry_hash()?, ah.clone(), LinkTypes::AllBookmarks, ())?;
    Ok(ah)
}

#[hdk_extern]
pub fn list_bookmarks(_: ()) -> ExternResult<Vec<BookmarkRow>> {
    let pairs = collect_links("bookmarks", LinkTypes::AllBookmarks)?;
    let mut out = Vec::new();
    for (ah, record) in pairs {
        let b: Bookmark = record
            .entry
            .to_app_option()?
            .ok_or(wasm_error!(WasmErrorInner::Guest("invalid bookmark".into())))?;
        out.push(BookmarkRow {
            action_hash: ah,
            url: b.url,
            title: b.title,
            created_at_ms: b.created_at_ms,
        });
    }
    Ok(out)
}

#[hdk_extern]
pub fn delete_bookmark(action_hash: ActionHash) -> ExternResult<()> {
    delete_entry(DeleteInput {
        deletes_action_hash: action_hash,
        chain_top_ordering: ChainTopOrdering::default(),
    })?;
    Ok(())
}

// ═══════════════════════════════════════════════════════════════════════
// CONTACTS  (existing)
// ═══════════════════════════════════════════════════════════════════════

#[hdk_extern]
pub fn create_trusted_contact(input: TrustedContact) -> ExternResult<ActionHash> {
    let ah = create_entry(&EntryTypes::TrustedContact(input.clone()))?;
    let path = Path::from("contacts");
    create_link(path.path_entry_hash()?, ah.clone(), LinkTypes::AllContacts, ())?;
    Ok(ah)
}

#[hdk_extern]
pub fn list_trusted_contacts(_: ()) -> ExternResult<Vec<ContactRow>> {
    let pairs = collect_links("contacts", LinkTypes::AllContacts)?;
    let mut out = Vec::new();
    for (ah, record) in pairs {
        let author = record.action().author().clone();
        let c: TrustedContact = record
            .entry
            .to_app_option()?
            .ok_or(wasm_error!(WasmErrorInner::Guest("invalid contact".into())))?;
        out.push(ContactRow {
            action_hash: ah,
            author,
            display_name: c.display_name,
            peer_agent_pubkey_b64: c.peer_agent_pubkey_b64,
            invite_proof_b64: c.invite_proof_b64,
            created_at_ms: c.created_at_ms,
        });
    }
    Ok(out)
}

// ═══════════════════════════════════════════════════════════════════════
// CHAT  (existing)
// ═══════════════════════════════════════════════════════════════════════

#[hdk_extern]
pub fn send_chat_message(input: ChatMessage) -> ExternResult<ActionHash> {
    let ah = create_entry(&EntryTypes::ChatMessage(input.clone()))?;
    let path = Path::from(format!("thread/{}", input.thread_id));
    create_link(path.path_entry_hash()?, ah.clone(), LinkTypes::ThreadMessages, ())?;
    Ok(ah)
}

#[derive(Serialize, Deserialize, Debug)]
pub struct ListThreadInput {
    pub thread_id: String,
}

#[hdk_extern]
pub fn list_thread_messages(input: ListThreadInput) -> ExternResult<Vec<ChatMessageRow>> {
    let pairs = collect_links(&format!("thread/{}", input.thread_id), LinkTypes::ThreadMessages)?;
    let mut out = Vec::new();
    for (ah, record) in pairs {
        let author = record.action().author().clone();
        let m: ChatMessage = record
            .entry
            .to_app_option()?
            .ok_or(wasm_error!(WasmErrorInner::Guest("invalid chat".into())))?;
        out.push(ChatMessageRow {
            action_hash: ah,
            author,
            thread_id: m.thread_id,
            body: m.body,
            sent_at_ms: m.sent_at_ms,
        });
    }
    Ok(out)
}

// ═══════════════════════════════════════════════════════════════════════
// WEBRTC SIGNALING  (existing)
// ═══════════════════════════════════════════════════════════════════════

#[hdk_extern]
pub fn post_webrtc_signal(input: WebRtcSignal) -> ExternResult<ActionHash> {
    let ah = create_entry(&EntryTypes::WebRtcSignal(input.clone()))?;
    let path = Path::from("signaling");
    create_link(path.path_entry_hash()?, ah.clone(), LinkTypes::Signaling, ())?;
    Ok(ah)
}

#[hdk_extern]
pub fn list_recent_signals(_: ()) -> ExternResult<Vec<WebRtcSignalRow>> {
    let pairs = collect_links("signaling", LinkTypes::Signaling)?;
    let mut out = Vec::new();
    for (ah, record) in pairs {
        let author = record.action().author().clone();
        let s: WebRtcSignal = record
            .entry
            .to_app_option()?
            .ok_or(wasm_error!(WasmErrorInner::Guest("invalid signal".into())))?;
        out.push(WebRtcSignalRow {
            action_hash: ah,
            author,
            peer_pubkey_b64: s.peer_pubkey_b64,
            signal_kind: s.signal_kind,
            payload_json: s.payload_json,
            created_at_ms: s.created_at_ms,
        });
    }
    Ok(out)
}

// ═══════════════════════════════════════════════════════════════════════
// HISTORY  (Phase 1 — P2P browsing history)
// ═══════════════════════════════════════════════════════════════════════

#[hdk_extern]
pub fn create_history_entry(input: HistoryEntry) -> ExternResult<ActionHash> {
    let ah = create_entry(&EntryTypes::HistoryEntry(input.clone()))?;
    let path = Path::from("history");
    create_link(path.path_entry_hash()?, ah.clone(), LinkTypes::AllHistory, ())?;
    Ok(ah)
}

#[hdk_extern]
pub fn list_history(_: ()) -> ExternResult<Vec<HistoryRow>> {
    let pairs = collect_links("history", LinkTypes::AllHistory)?;
    let mut out = Vec::new();
    for (ah, record) in pairs {
        let author = record.action().author().clone();
        let h: HistoryEntry = record
            .entry
            .to_app_option()?
            .ok_or(wasm_error!(WasmErrorInner::Guest("invalid history".into())))?;
        out.push(HistoryRow {
            action_hash: ah,
            author,
            url: h.url,
            title: h.title,
            visited_at_ms: h.visited_at_ms,
        });
    }
    Ok(out)
}

#[hdk_extern]
pub fn delete_history_entry(action_hash: ActionHash) -> ExternResult<()> {
    delete_entry(DeleteInput {
        deletes_action_hash: action_hash,
        chain_top_ordering: ChainTopOrdering::default(),
    })?;
    Ok(())
}

#[hdk_extern]
pub fn clear_all_history(_: ()) -> ExternResult<()> {
    let path = Path::from("history");
    let links = get_links(
        LinkQuery::new(path.path_entry_hash()?, LinkTypes::AllHistory.try_into_filter()?),
        GetStrategy::default(),
    )?;
    for link in links {
        if let Some(ah) = link.target.into_action_hash() {
            delete_entry(DeleteInput {
                deletes_action_hash: ah,
                chain_top_ordering: ChainTopOrdering::default(),
            })?;
        }
    }
    Ok(())
}

// ═══════════════════════════════════════════════════════════════════════
// USER SETTINGS  (Phase 1 — P2P settings sync)
// ═══════════════════════════════════════════════════════════════════════

#[hdk_extern]
pub fn set_user_setting(input: UserSetting) -> ExternResult<ActionHash> {
    // Upsert: delete existing link for this key, then create new entry + link
    let path = Path::from("settings");
    let path_hash = path.path_entry_hash()?;
    let links = get_links(
        LinkQuery::new(path_hash.clone(), LinkTypes::AllSettings.try_into_filter()?),
        GetStrategy::default(),
    )?;
    for link in links {
        if let Some(ah) = link.target.into_action_hash() {
            if let Some(record) = get(ah.clone(), GetOptions::default())? {
                if let Ok(Some(existing)) = record.entry.to_app_option::<UserSetting>() {
                    if existing.key == input.key {
                        let _ = delete_entry(DeleteInput {
                            deletes_action_hash: ah,
                            chain_top_ordering: ChainTopOrdering::default(),
                        });
                    }
                }
            }
        }
    }
    let ah = create_entry(&EntryTypes::UserSetting(input.clone()))?;
    create_link(path_hash, ah.clone(), LinkTypes::AllSettings, ())?;
    Ok(ah)
}

#[derive(Serialize, Deserialize, Debug)]
pub struct GetSettingInput {
    pub key: String,
}

#[hdk_extern]
pub fn get_user_setting(input: GetSettingInput) -> ExternResult<Option<UserSettingRow>> {
    let pairs = collect_links("settings", LinkTypes::AllSettings)?;
    for (ah, record) in pairs {
        let s: UserSetting = match record.entry.to_app_option() {
            Ok(Some(s)) => s,
            _ => continue,
        };
        if s.key == input.key {
            return Ok(Some(UserSettingRow {
                action_hash: ah,
                key: s.key,
                value_json: s.value_json,
                updated_at_ms: s.updated_at_ms,
            }));
        }
    }
    Ok(None)
}

#[hdk_extern]
pub fn list_user_settings(_: ()) -> ExternResult<Vec<UserSettingRow>> {
    let pairs = collect_links("settings", LinkTypes::AllSettings)?;
    let mut out = Vec::new();
    for (ah, record) in pairs {
        let s: UserSetting = match record.entry.to_app_option() {
            Ok(Some(s)) => s,
            _ => continue,
        };
        out.push(UserSettingRow {
            action_hash: ah,
            key: s.key,
            value_json: s.value_json,
            updated_at_ms: s.updated_at_ms,
        });
    }
    Ok(out)
}

// ═══════════════════════════════════════════════════════════════════════
// ASSISTANT MESSAGES  (Phase 1 — P2P conversation sync)
// ═══════════════════════════════════════════════════════════════════════

#[hdk_extern]
pub fn create_assistant_message(input: AssistantMessage) -> ExternResult<ActionHash> {
    let ah = create_entry(&EntryTypes::AssistantMessage(input.clone()))?;
    let path = Path::from(format!("conversation/{}", input.conversation_id));
    create_link(path.path_entry_hash()?, ah.clone(), LinkTypes::ConversationMessages, ())?;
    Ok(ah)
}

#[derive(Serialize, Deserialize, Debug)]
pub struct ListConversationInput {
    pub conversation_id: String,
}

#[hdk_extern]
pub fn list_assistant_conversation(input: ListConversationInput) -> ExternResult<Vec<AssistantMessageRow>> {
    let pairs = collect_links(
        &format!("conversation/{}", input.conversation_id),
        LinkTypes::ConversationMessages,
    )?;
    let mut out = Vec::new();
    for (ah, record) in pairs {
        let author = record.action().author().clone();
        let m: AssistantMessage = record
            .entry
            .to_app_option()?
            .ok_or(wasm_error!(WasmErrorInner::Guest("invalid assistant msg".into())))?;
        out.push(AssistantMessageRow {
            action_hash: ah,
            author,
            conversation_id: m.conversation_id,
            role: m.role,
            body: m.body,
            created_at_ms: m.created_at_ms,
        });
    }
    Ok(out)
}

// ═══════════════════════════════════════════════════════════════════════
// SHARED PAGES  (Phase 2 — P2P content sharing)
// ═══════════════════════════════════════════════════════════════════════

#[hdk_extern]
pub fn create_shared_page(input: SharedPage) -> ExternResult<ActionHash> {
    let ah = create_entry(&EntryTypes::SharedPage(input.clone()))?;
    // Global list of all shared pages
    let path = Path::from("shared_pages");
    create_link(path.path_entry_hash()?, ah.clone(), LinkTypes::SharedPages, ())?;
    // URL-keyed index for DHT-first lookup
    let url_path = Path::from(format!("shared_url/{}", input.url));
    create_link(url_path.path_entry_hash()?, ah.clone(), LinkTypes::SharedPagesByUrl, ())?;
    Ok(ah)
}

#[hdk_extern]
pub fn list_shared_pages(_: ()) -> ExternResult<Vec<SharedPageRow>> {
    let pairs = collect_links("shared_pages", LinkTypes::SharedPages)?;
    let mut out = Vec::new();
    for (ah, record) in pairs {
        let author = record.action().author().clone();
        let p: SharedPage = record
            .entry
            .to_app_option()?
            .ok_or(wasm_error!(WasmErrorInner::Guest("invalid shared page".into())))?;
        out.push(SharedPageRow {
            action_hash: ah,
            author,
            url: p.url,
            title: p.title,
            content_hash: p.content_hash,
            content_type: p.content_type,
            body_compressed: p.body_compressed,
            fetched_at_ms: p.fetched_at_ms,
            description: p.description,
        });
    }
    Ok(out)
}

#[hdk_extern]
pub fn get_shared_page(action_hash: ActionHash) -> ExternResult<Option<SharedPageRow>> {
    let record = match get(action_hash.clone(), GetOptions::default())? {
        Some(r) => r,
        None => return Ok(None),
    };
    let author = record.action().author().clone();
    let p: SharedPage = record
        .entry
        .to_app_option()?
        .ok_or(wasm_error!(WasmErrorInner::Guest("invalid shared page".into())))?;
    Ok(Some(SharedPageRow {
        action_hash,
        author,
        url: p.url,
        title: p.title,
        content_hash: p.content_hash,
        content_type: p.content_type,
        body_compressed: p.body_compressed,
        fetched_at_ms: p.fetched_at_ms,
        description: p.description,
    }))
}

#[derive(Serialize, Deserialize, Debug)]
pub struct SearchByUrlInput {
    pub url: String,
}

#[hdk_extern]
pub fn search_shared_pages_by_url(input: SearchByUrlInput) -> ExternResult<Vec<SharedPageRow>> {
    let url_path = Path::from(format!("shared_url/{}", input.url));
    let links = get_links(
        LinkQuery::new(
            url_path.path_entry_hash()?,
            LinkTypes::SharedPagesByUrl.try_into_filter()?,
        ),
        GetStrategy::default(),
    )?;
    let mut out = Vec::new();
    for link in links {
        let ah = link.target.into_action_hash().ok_or(wasm_error!(
            WasmErrorInner::Guest("link missing action hash".into())
        ))?;
        if let Some(record) = get(ah.clone(), GetOptions::default())? {
            let author = record.action().author().clone();
            let p: SharedPage = match record.entry.to_app_option() {
                Ok(Some(p)) => p,
                _ => continue,
            };
            out.push(SharedPageRow {
                action_hash: ah,
                author,
                url: p.url,
                title: p.title,
                content_hash: p.content_hash,
                content_type: p.content_type,
                body_compressed: p.body_compressed,
                fetched_at_ms: p.fetched_at_ms,
                description: p.description,
            });
        }
    }
    Ok(out)
}

// ═══════════════════════════════════════════════════════════════════════
// SHARED LINKS  (Phase 2 — P2P URL recommendations)
// ═══════════════════════════════════════════════════════════════════════

#[hdk_extern]
pub fn create_shared_link(input: SharedLink) -> ExternResult<ActionHash> {
    let ah = create_entry(&EntryTypes::SharedLink(input.clone()))?;
    let path = Path::from("shared_links");
    create_link(path.path_entry_hash()?, ah.clone(), LinkTypes::SharedLinks, ())?;
    // Tag-based index
    for tag in input.tags.split(',') {
        let tag = tag.trim().to_lowercase();
        if !tag.is_empty() {
            let tag_path = Path::from(format!("tag/{}", tag));
            create_link(tag_path.path_entry_hash()?, ah.clone(), LinkTypes::TaggedLinks, ())?;
        }
    }
    Ok(ah)
}

#[hdk_extern]
pub fn list_shared_links(_: ()) -> ExternResult<Vec<SharedLinkRow>> {
    let pairs = collect_links("shared_links", LinkTypes::SharedLinks)?;
    let mut out = Vec::new();
    for (ah, record) in pairs {
        let author = record.action().author().clone();
        let l: SharedLink = record
            .entry
            .to_app_option()?
            .ok_or(wasm_error!(WasmErrorInner::Guest("invalid shared link".into())))?;
        out.push(SharedLinkRow {
            action_hash: ah,
            author,
            url: l.url,
            title: l.title,
            description: l.description,
            tags: l.tags,
            shared_at_ms: l.shared_at_ms,
        });
    }
    Ok(out)
}

#[derive(Serialize, Deserialize, Debug)]
pub struct ListByTagInput {
    pub tag: String,
}

#[hdk_extern]
pub fn list_links_by_tag(input: ListByTagInput) -> ExternResult<Vec<SharedLinkRow>> {
    let tag = input.tag.trim().to_lowercase();
    let pairs = collect_links(&format!("tag/{}", tag), LinkTypes::TaggedLinks)?;
    let mut out = Vec::new();
    for (ah, record) in pairs {
        let author = record.action().author().clone();
        let l: SharedLink = match record.entry.to_app_option() {
            Ok(Some(l)) => l,
            _ => continue,
        };
        out.push(SharedLinkRow {
            action_hash: ah,
            author,
            url: l.url,
            title: l.title,
            description: l.description,
            tags: l.tags,
            shared_at_ms: l.shared_at_ms,
        });
    }
    Ok(out)
}

// ═══════════════════════════════════════════════════════════════════════
// PEER DNS  (Phase 3B — P2P DNS cache)
// ═══════════════════════════════════════════════════════════════════════

#[hdk_extern]
pub fn create_dns_record(input: PeerDnsRecord) -> ExternResult<ActionHash> {
    let ah = create_entry(&EntryTypes::PeerDnsRecord(input.clone()))?;
    let path = Path::from(format!("dns/{}", input.hostname.to_lowercase()));
    create_link(path.path_entry_hash()?, ah.clone(), LinkTypes::DnsRecords, ())?;
    Ok(ah)
}

#[derive(Serialize, Deserialize, Debug)]
pub struct LookupDnsInput {
    pub hostname: String,
}

#[hdk_extern]
pub fn lookup_dns(input: LookupDnsInput) -> ExternResult<Vec<PeerDnsRecordRow>> {
    let pairs = collect_links(
        &format!("dns/{}", input.hostname.to_lowercase()),
        LinkTypes::DnsRecords,
    )?;
    let mut out = Vec::new();
    for (ah, record) in pairs {
        let author = record.action().author().clone();
        let d: PeerDnsRecord = match record.entry.to_app_option() {
            Ok(Some(d)) => d,
            _ => continue,
        };
        out.push(PeerDnsRecordRow {
            action_hash: ah,
            author,
            hostname: d.hostname,
            record_type: d.record_type,
            value: d.value,
            observed_at_ms: d.observed_at_ms,
            ttl_secs: d.ttl_secs,
        });
    }
    Ok(out)
}
