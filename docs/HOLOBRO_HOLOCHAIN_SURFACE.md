# HoloBro — Holochain surface (canonical index)

This file is the **operator / maintainer map** of everything in HoloBro that touches Holochain: config, storage, UI entry points, TypeScript client calls, DNA, and desktop sidecars.

Update it when you add env vars, zome calls, or new panels that use `AppWebsocket`.

**Quick re-audit (repo root):**

```bash
rg "VITE_HC_|holobro-hc-|tryConnectHolo|useHolochain|@holochain" src src-tauri
```

---

## 1. Build-time environment (`VITE_*`)

Defined in `.env.example`. Values are **baked at `vite build` / `tauri build`** unless overridden at runtime via `localStorage` (see §2).

| Variable | Role |
|----------|------|
| `VITE_HOLOBRO_TIER` | `development` \| `lightweight` \| `standard` \| `full` — UI/feature gating (`src/lib/releaseProfile.ts`). |
| `VITE_HC_APP_WS` | Default **app** WebSocket URL (`ws://…`). |
| `VITE_HC_APP_TOKEN` | App authentication token (string, UTF-8 bytes, JSON `number[]`, or CSV bytes — see `src/holochainConnect.ts`). |
| `VITE_HC_ADMIN_WS` | Optional admin WebSocket for one-shot signing authorization (`holochainConnect.ts`). |
| `VITE_HC_ROLE_NAME` | Cell role in `workdir/happ.yaml` (default `anon_browser`). |
| `VITE_HC_CHAT_PASSPHRASE` | Optional AES-GCM for chat bodies before zome send (`src/holochain.ts`, `src/lib/chatCrypto.ts`). |
| `VITE_HC_BOOKMARK_PASSPHRASE` | Optional encryption for bookmark url/title on chain (`src/lib/bookmarkEnvelope.ts`). |

**Boot seed:** `src/main.tsx` copies non-empty `VITE_HC_APP_WS` / `VITE_HC_APP_TOKEN` into `localStorage` so devs don’t have to open Setup on first load.

---

## 2. Runtime overrides (`localStorage`)

| Key | Purpose |
|-----|---------|
| `holobro-hc-ws` | App WebSocket URL (wins over env when set). Normalized via `normalizeAppWebsocketUrl` in `src/holochainConnect.ts`. |
| `holobro-hc-token` | App token (same formats as env). |
| `holobro_first_run_dismissed` | Welcome modal; not Holochain-specific but affects onboarding UX. |
| `holobro-bookmark-holochain-sync` | Opt-in bookmark sync (`src/lib/localStorageJson.ts`). |
| `holobro-contact-holochain-sync` | Opt-in contacts sync. |
| `holobro-shared-link-holochain-sync` | Opt-in shared-link sync. |

**Writers:** Welcome modal (`WelcomeSafetyModal.tsx`), status bar **Setup** popup (`shell.tsx` `HolochainSetupPopup`).

**Reader of truth for “do we have config?”:** `hasEffectiveHoloConfig()` in `src/holochainConnect.ts`.

---

## 3. Connection lifecycle (JS)

| File | Responsibility |
|------|----------------|
| `src/holochainConnect.ts` | Parse token, `AppWebsocket.connect`, optional `AdminWebsocket` signing, `tryConnectHolo`, `hasEffectiveHoloConfig`. |
| `src/providers/HolochainProvider.tsx` | React state: `hc`, status, errors, `reconnect()`, panel-driven connect & retries. |
| `src/holochain.ts` | Zome call wrappers (`hcListBookmarks`, `hcSendChat`, …), role `anon_browser`, encryption helpers. |

---

## 4. Zome / DNA (Rust)

| Path | Notes |
|------|--------|
| `workdir/happ.yaml` | hApp manifest: role **`anon_browser`** → `dnas/anon_browser/workdir/anon_browser.dna`. |
| `dnas/anon_browser/zomes/` | Integrity + coordinator zomes for the anon_browser DNA. |

Coordinator zome name used from TS: **`anon_browser`** (`HC_ZOME_NAME` in `src/holochain.ts`).

---

## 5. TypeScript → conductor API surface (`src/holochain.ts`)

Exported `hc*` functions (all take `AppWebsocket` where applicable). Non-exhaustive list — see file for full set:

- Bookmarks: `hcListBookmarks`, `hcCreateBookmark`, `hcDeleteBookmark`
- Contacts: `hcListContacts`, `hcCreateContact`
- Chat: `hcSendChat`, `hcListThread`
- WebRTC signals: `hcPostSignal`, `hcListSignals`
- History (on-chain optional paths): `hcCreateHistory`, `hcListHistory`, `hcDeleteHistory`, `hcClearHistory`
- Settings: `hcSetSetting`, `hcGetSetting`, `hcListSettings`
- Assistant (experimental): `hcCreateAssistantMessage`, `hcListAssistantConversation`
- Shared pages / links: `hcCreateSharedPage`, `hcListSharedPages`, `hcGetSharedPage`, `hcSearchSharedPagesByUrl`, `hcCreateSharedLink`, `hcListSharedLinks`, `hcListLinksByTag`
- DNS helpers: `hcCreateDnsRecord`, `hcLookupDns`

---

## 6. UI surfaces (user-visible)

| Location | What |
|----------|------|
| `WelcomeSafetyModal.tsx` | First-run optional WS + token + **Save & connect**. |
| `shell.tsx` | Status bar **Setup** popup; demo vs connected messaging. |
| `HolochainEmptyHint.tsx` | Empty states when `hc` is null. |
| Panels using `hc` / sync | Bookmarks, Contacts, Chat, Library, Video (signals), Privacy (status rows). |

---

## 7. Desktop (Tauri) — not the embedded browser client

| Rust module | Role |
|-------------|------|
| `src-tauri/src/holochain_sidecar.rs` | Probe bundled `holochain` / `lair-keystore` / `hc` sidecars. |
| `src-tauri/src/bundled_sandbox.rs` | Optional `hc sandbox run` for local dev. |
| `src-tauri/src/lib.rs` | Registers commands; HTTP proxy for non-Holochain APIs. |

Sidecars and sandbox are **orthogonal** to `AppWebsocket` in the webview: they help run conductors; the UI still needs **app WS + token** from that conductor.

---

## 8. Related docs (policy & operators)

- `docs/HOLOBRO_DATA_CLASSES.md` — what data is local vs chain.
- `docs/HOLOBRO_PRIVACY_OPERATORS.md` — env checklist, operators.
- `docs/HOLOBRO_YOUR_KEYS.md` — connection vs signing keys.
- `docs/HOLOBRO_RELEASE_AND_SECURITY_ROADMAP.md` — release / security posture.

---

## 9. Maintenance

When you add a feature:

1. If it needs new env vars → `.env.example` + this table + `HOLOBRO_PRIVACY_OPERATORS.md` if user-facing.
2. If it calls zomes → add `hc*` in `holochain.ts` + list above + DNA if new entries.
3. If it stores flags → `localStorageJson.ts` + §2.
