# HoloBro — privacy & Holochain: operator guide

This document is **explicit guidance** for anyone shipping or running HoloBro with a conductor: what to configure, in what order, and what security properties you actually get.

---

## 1. Read this first (honest scope)

- HoloBro is **not** “everything encrypted by default.” Some data is **device-only**, some is **opt-in to chain**, some is **optional ciphertext** via env vars.
- **Holochain signing** proves authorship; it does **not** hide entry content. **Confidentiality** comes from **encryption before `callZome`** (implemented in the web client) or from **not putting data on chain at all**.
- **P2P** means no HoloBro-owned **content** server. Peers, validators, and bootstrap infrastructure may still see **metadata** and **ciphertext** depending on DNA and network layout.

Full data-class policy: [HOLOBRO_DATA_CLASSES.md](./HOLOBRO_DATA_CLASSES.md).

---

## 2. Configure in this order

### Step A — Build and install the hApp

1. From the HoloBro repo root, build zomes and pack (see [README.md](../README.md) § Holochain live mode).
2. Install the resulting `.happ` on your conductor for the agent you use with the UI.
3. Obtain **app WebSocket URL** and **app auth token** (e.g. from `hc` / conductor logs or your own admin script).

### Step B — Vite / desktop env (`.env.local`)

Copy [.env.example](../.env.example) → `.env.local`. Set at minimum:

| Variable | Required | Purpose |
|----------|----------|---------|
| `VITE_HC_APP_WS` | Yes (for live mode) | App WebSocket URL |
| `VITE_HC_APP_TOKEN` | Yes (for live mode) | App authentication token |
| `VITE_HC_ADMIN_WS` | Optional | Admin WS for signing UX (see `holochainConnect.ts`) |
| `VITE_HC_ROLE_NAME` | Optional | DNA role; default `anon_browser` must match `workdir/happ.yaml` |
| `VITE_HC_CHAT_PASSPHRASE` | Optional | AES-GCM for **chat bodies** (per-thread salt) |
| `VITE_HC_BOOKMARK_PASSPHRASE` | Optional | AES-GCM for **bookmarks** synced to chain (envelope) |

Restart **`npm run dev`** / **`npm run tauri dev`** after any change — Vite bakes these in at build time.

### Step C — In-app toggles (not env)

| Control | Location | Effect |
|---------|----------|--------|
| **Sync bookmarks to Holochain** | Bookmarks panel | **Off (default):** no `create_bookmark` / chain list. **On:** creates, lists, merges locals once per connection. |
| **Sync contacts to Holochain** | Peers (contacts) panel | **Off (default):** contacts stay in `localStorage` only. **On:** `create_trusted_contact` + chain list + merge. |
| **Publish shared links to Holochain** | P2P Library panel | **Off (default):** shares stay local. **On:** `create_shared_link` + chain list + merge. Cached pages / DHT search still use the conductor when connected. |
| **Privacy** (sidebar) | Privacy panel | Read-only status of connection, sync flags, encryption env, and doc links. |

Preferences use `localStorage` keys: `holobro-bookmark-holochain-sync`, `holobro-contact-holochain-sync`, `holobro-shared-link-holochain-sync` (`'1'` = on).

**Browsing history** does not use Holochain in current builds (device `localStorage` only).

**User settings (v1):** App preferences (greeting, Holochain URL overrides in `localStorage`, etc.) are **device-only**. There is **no** “sync settings to Holochain” in this build — see [HOLOBRO_DATA_CLASSES.md](./HOLOBRO_DATA_CLASSES.md) implementation status.

**Shared links & cached pages (v1):** Turning on **Publish shared links** writes links to the DNA when connected. There is **no** separate UI yet for “trusted circle only” vs “public discoverability” — treat visibility as normal hApp / network rules until a future audience control ships.

### Dev-only: Vite HMR vs Holochain WebSocket

With **`npm run dev`**, DevTools may show **`ws://127.0.0.1:1420/?token=…`** and protocol **`vite-hmr`**. That is **Vite hot reload**, not the conductor. The **Holochain** client uses **`VITE_HC_APP_WS`** (and optional `localStorage` overrides), typically **another host/port**. Use the **app** WebSocket entry when debugging “Conductor connected: No.”

---

## 3. What each protection does

### Chat (`VITE_HC_CHAT_PASSPHRASE`)

- **When set:** `body` sent to `send_chat_message` is **ciphertext** (base64). `list_thread_messages` responses are decrypted in the client; if decryption fails, the UI shows the **raw** string (supports old plaintext messages).
- **Peers** need the **same passphrase** to read messages in that thread (same secret, not per-user keys).
- **Not** forward secrecy or Signal-class messaging — see data-classes doc for “best possible” follow-ups.

### Bookmarks (`VITE_HC_BOOKMARK_PASSPHRASE`)

- **When set** and **sync is on:** url+title are JSON-sealed and stored in the DNA `url` field with prefix `holobro-bkm1:`; `title` on chain is empty. The UI decrypts after `list_bookmarks`.
- **When sync is on** but passphrase **unset:** bookmarks are **plaintext** on chain — the UI shows an explicit warning.
- **Legacy:** bookmarks created without the prefix are shown as-is.

### Bookmarks sync off

- No bookmark zome calls; data stays in **localStorage** (`holobro-demo-bookmarks`). Not encrypted at rest unless you add OS-level or browser protections.

---

## 4. Checklist before you call it “private enough”

- [ ] **History:** Confirm you are on a build where history is **not** written to Holochain (policy: local only).
- [ ] **Bookmarks:** If sync is enabled, set **`VITE_HC_BOOKMARK_PASSPHRASE`** or accept plaintext on chain.
- [ ] **Chat:** Set **`VITE_HC_CHAT_PASSPHRASE`** if participants agree on a shared secret, or accept plaintext bodies.
- [ ] **Secrets:** Do not commit `.env.local`. Rotate passphrases if leaked; old ciphertext may remain on the DHT.
- [ ] **Peers:** Anyone who receives the same passphrase and can read chain data can decrypt **those** payloads.
- [ ] **Threat model:** Document what you assume about the device, conductor, and who runs nodes on your DNA.

---

## 5. Code map (for auditors)

| Concern | Primary files |
|---------|----------------|
| Chat encrypt/decrypt | `src/holochain.ts` (`hcSendChat`, `hcListThread`), `src/lib/chatCrypto.ts` |
| Bookmark envelope | `src/lib/bookmarkEnvelope.ts`, `src/holochain.ts` (`hcCreateBookmark`, `hcListBookmarks`) |
| History local-only | `src/providers/HolochainProvider.tsx` (`recordNavigation`, no `hcCreateHistory`) |
| Sync opt-in (bookmarks / contacts / shared links) | `src/providers/HolochainProvider.tsx`, respective panels, `src/lib/localStorageJson.ts` keys |
| Privacy dashboard | `src/panels/PrivacyPanel.tsx`, `App.tsx` (`privacy` route) |
| Conductor connect + last error | `src/lib/holochainConnect.ts` (`tryConnectHolo`), `src/providers/HolochainProvider.tsx` |
| Policy table | [HOLOBRO_DATA_CLASSES.md](./HOLOBRO_DATA_CLASSES.md) |

---

## 6. Suggested next improvements (engineering backlog)

1. **Settings UI** for passphrases (with clear warnings) instead of only `.env` — tricky for security UX. (Privacy panel summarizes risks; v1 remains env-only.)
2. **Per-contact or per-thread keys** instead of one global chat passphrase — see design spike [HOLOBRO_CHAT_KEYS_SPIKE.md](./HOLOBRO_CHAT_KEYS_SPIKE.md).
3. **Double Ratchet / MLS** class crypto for chat if forward secrecy is required.
4. **Encrypt bookmark localStorage** at rest (WebCrypto + user password) if device theft is in scope.

---

*Maintainers: keep this file aligned with behavior when changing `holochain.ts` or provider bookmark/chat paths.*
