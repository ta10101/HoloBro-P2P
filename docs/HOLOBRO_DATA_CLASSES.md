# HoloBro — data classes contract (policy before zomes / UI)

This document is the **agreed default** for what may touch Holochain, who can read it, and how it is protected. **Implementation must match this table** (or the table must be updated first).

**Operator checklist (env vars, UI toggles, limits):** [HOLOBRO_PRIVACY_OPERATORS.md](./HOLOBRO_PRIVACY_OPERATORS.md). **User guide (keys, identity, examples):** [HOLOBRO_YOUR_KEYS.md](./HOLOBRO_YOUR_KEYS.md).

**Principles (summary):** P2P-first, no product-owned content middleman; **opt-in sync** and **opt-in share**; **no plaintext on the network by default**; **trusted contacts** may receive wider sharing **only for categories the user enables**, still ciphertext by default for private payloads.

---

## Data classes → default / sync / shared / encryption

| Data class | Default | Private sync (Holochain) | Shared / discoverable | Encryption on network | Key model (target) | Plaintext exception | Trusted contacts |
|------------|---------|---------------------------|------------------------|----------------------|-------------------|---------------------|------------------|
| **Browsing / tabs / session** | Local only | Off (v1) | Off | N/A | — | **None** — never on chain v1 | N/A |
| **History (URLs, titles, time)** | Local only | Off (v1: **local only forever** unless policy changes) | Off | If ever synced: yes | Per-device or user-derived key | **None** for payload | Optional future: “sync history to trusted devices only” |
| **Downloads metadata** | Local only | Off | Off | N/A | — | **None** | N/A |
| **Bookmarks** | Local | **Opt-in** | Off unless user picks “share” | **Yes** when synced | User / vault key; optional per–trusted-contact wrap | **None** (titles/URLs are sensitive) | Optional: “encrypted sync to trusted circle” |
| **User settings** | Local | **Off (v1)** — see implementation status | Off | N/A in v1 | Device / future vault | **None** for values | Future: optional shared prefs with trusted |
| **Chat** | Local / demo | **Opt-in** | Per-thread audience | **Yes** | **Thread key** (derive/agree per thread) | **None** for message body | Trusted-only threads allowed |
| **Contacts / trust graph** | Local | **Opt-in** | Not “public feed” by default | Yes for sensitive fields; structure TBD | Signatures / proofs + minimal metadata | Display names may be plaintext **only if** policy accepts it | **Core:** trust is mutual, explicit |
| **Shared links** | Local | **Opt-in** | **v1:** DNA visibility when publish is on; **UI** for “trusted only” vs “public” **not** shipped yet | **Yes** when synced (future: channel keys) | Thread or group key vs public channel (target) | Public feed **only** when user selects public (target) | “Trusted circle” vs “everyone” (target) |
| **Shared pages (snapshots)** | Local | **Opt-in** | **v1:** same as shared links — publish + search/cached flow; **no** separate audience picker | **Yes** (large ciphertext blobs) (target) | Same as shared links / space | Public **only** by explicit choice (target) | Same (target) |
| **Peer DNS cache** | Off | **Opt-in** | Crowd-sourced by design | Prefer encrypted or minimized | TBD | Hostname/value may be visible if design is crowd DNS — **document** | N/A |
| **WebRTC signaling** | Off until call | As needed | Pair / room | **Encrypt payload** where possible | Session / pair keys | ICE / routing may require cleartext endpoints — **document per field** | Often 1:1 trusted |
| **Assistant / LLM transcripts** | Local | **Opt-in** | Off | **Yes** if synced | User or thread key | **None**; never API keys on chain | Optional trusted-only sync |

**Legend**

- **Default:** what happens on first install with no extra toggles.
- **Private sync:** user chose to replicate across **their** agents / devices / chosen peers via Holochain, not necessarily visible to “everyone.”
- **Shared / discoverable:** intentionally visible or discoverable beyond a closed group.
- **Plaintext exception:** only with a written reason; default is **none**.

---

## v1 concrete defaults (implementation north star)

| Class | v1 default |
|-------|------------|
| History | **Local only** (no zome calls; no gossip). |
| Bookmarks | **Local**; Holochain only if user enables **sync**; payload **ciphertext** on chain. |
| Chat | **Encrypted thread key** for network path; plaintext path disallowed for “live” chat once encryption ships. |
| Settings | **Local only** in v1 (no Holochain settings sync). |
| Shared content | **Opt-in** publish to DNA; default encrypted where implemented; **audience** (trusted vs public) **not** split in UI yet. |
| Trusted contacts | Widen **allowed recipients** for keys/sync; **do not** auto-enable all categories. |

---

## Review checklist before changing zomes or UI

- [ ] New feature mapped to a **row** above (or table amended).
- [ ] **Default** is local or off unless explicitly “opt-in sync.”
- [ ] **Plaintext exception** documented or marked **none**.
- [ ] **Trusted** behavior specified if the feature involves people, not “everyone gets it.”

---

## Inspiration: Volla “Relay” / Volla Messages (ecosystem)

Volla ships **Holochain-based messaging** on privacy-oriented phones; the public **Relay** story emphasizes **decentralized identifiers**, **peer-to-peer** patterns, and **encryption** as product positioning (see [Volla × Holochain partnership announcement](https://press.holo.host/239707-volla-partnership-announcement)).

The open codebase **Volla Messages** (“private chat for Android and Desktop”) is a useful reference stack:

- **Repo:** [github.com/holochain-apps/volla-messages](https://github.com/holochain-apps/volla-messages)  
- **Stack:** Holochain + **Tauri** + SvelteKit (same broad shape as HoloBro’s Tauri + web UI).  
- **Shipping:** [p2pShipyard](https://darksoil.studio/p2p-shipyard/) for mobile + desktop — relevant when HoloBro targets **mobile** or installer parity.

Also skimmable: [Mobile Holochain applications shipped](https://blog.holochain.org/mobile-holochain-applications-shipped) (Holochain blog).

**Takeaway for HoloBro:** align messaging and “private by default” **policy** with how mature Holochain messengers frame the product; **do not** copy internals blindly — verify encryption and metadata story against **this** table and your own threat model.

---

## Implementation status (living)

- **History (v1):** `HolochainProvider` no longer calls `create_history_entry`, `list_history`, or clear/delete history on the conductor. History is **device `localStorage` only** (`LS_HISTORY`). Legacy `pending_ops` entries of kind `history` are dropped on load and skipped during replay.
- **Bookmarks (v1):** **Opt-in** via **“Sync bookmarks to Holochain”** in the Bookmarks panel. Preference is stored as `localStorage` key `holobro-bookmark-holochain-sync` (`'1'` = on). When off, bookmarks are **not** written to the DNA and the UI lists **local** entries only. When turned on while connected, **local URLs not already on the chain** are created once per conductor session, then the list mirrors the chain. If **`VITE_HC_BOOKMARK_PASSPHRASE`** is set, url+title are sealed with AES-GCM (`holobro-bkm1:` prefix in the DNA `url` field); otherwise the UI warns that bookmarks are **plaintext** on chain.
- **Chat (v1):** If **`VITE_HC_CHAT_PASSPHRASE`** is set in `.env.local`, `hcSendChat` / `hcListThread` use **AES-GCM** (`src/lib/chatCrypto.ts`) with **per-thread** PBKDF2 salt so ciphertext differs by `thread_id`. If unset, bodies stay **plaintext** on chain. **`list_thread`** falls back to showing the raw body when decrypt fails (legacy cleartext messages). This is **shared-secret** crypto, not forward secrecy — see [HOLOBRO_CHAT_KEYS_SPIKE.md](./HOLOBRO_CHAT_KEYS_SPIKE.md) for future key-model directions.
- **Contacts & shared links (v1):** **Opt-in** checkboxes in **Peers** and **P2P Library** (default off). Same merge-on-connect pattern as bookmarks. **Privacy** panel summarizes all toggles + env-driven encryption flags. **Audience:** there is no separate “trusted circle” vs “everyone” control; published entries follow normal DNA / network visibility for this hApp.
- **User settings (v1):** UI prefs (e.g. startup greeting, `localStorage` Holochain WS overrides) stay **on device**. Nothing in this build syncs a “settings blob” to Holochain; the policy table row describes a **future** optional sync, not current behavior.

---

*Version: 1.6 — policy + partial implementation notes (v1 settings / shared-audience clarity).*
