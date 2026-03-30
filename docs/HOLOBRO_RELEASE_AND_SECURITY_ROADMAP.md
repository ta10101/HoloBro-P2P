# HoloBro-P2P — release tiers, dev track, and security roadmap

This document records **intent** for distribution and cryptography. It is **not** a promise of ship dates. Implementation details change with the Holochain toolchain and installer choices.

---

## 1. Security target (later milestones)

**Current v1 (shipped patterns):** optional shared passphrases for chat and bookmark payloads (`VITE_HC_CHAT_PASSPHRASE`, `VITE_HC_BOOKMARK_PASSPHRASE`), AES-GCM in the client before zome calls. Signing proves authorship; confidentiality depends on those envelopes and on **not** putting data on chain.

**Target direction (not yet implemented):**

- **Stronger key models** — per-thread or per-contact keys instead of one global chat secret; see [HOLOBRO_CHAT_KEYS_SPIKE.md](./HOLOBRO_CHAT_KEYS_SPIKE.md).
- **Forward secrecy** — protocols in the Double Ratchet / MLS class require substantial design and migration from today’s static shared secrets; treat as a **dedicated milestone** after key agreement exists.

Policy table and implementation status: [HOLOBRO_DATA_CLASSES.md](./HOLOBRO_DATA_CLASSES.md).

---

## 2. Dev track (keep for now, narrow later)

**Purpose:** fast iteration, attach to any conductor, visible errors, `.env.local` and status bar **Setup**.

**Expectations:**

- Manual **WebSocket URL + app token** (or localStorage overrides).
- Full **source** tree; `npm run dev` / `npm run tauri dev` as today.
- **Wider** configuration surface than end-user builds (env vars, optional admin WS).

**Later “narrow”:** reduce accidental foot-guns (fewer required envs for dev, clearer profiles) without removing the ability to point at a custom conductor. Concrete changes should be listed in PRs when made.

---

## 3. Release tiers (product intent)

One **repository** can produce **multiple artifacts** (different bundle contents or feature flags). Alternatively, **forks/clones** of this repo can specialize one tier; keep policy docs aligned if DNA or data classes change.

| Tier | Intent | Holochain runtime | Typical user |
|------|--------|-------------------|--------------|
| **Lightweight** | Smallest install; **local-first** emphasis. | **None** in bundle, or optional download-on-first-use (TBD). | Users who want the shell and device-only data without running a node. |
| **Standard** | Default **P2P** experience. | **Bundled** conductor + Lair + `.happ`; app starts runtime; **no** pasted `ws://` / token. | Most people who want bookmarks/contacts/library sync. |
| **Full** | Power users, debugging, or extra capabilities. | Same or **extended** runtime; may include **diagnostics**, optional **TURN** or advanced networking, dev-adjacent toggles (TBD). | Contributors, operators, or users who need everything in one installer. |

**Dev** builds are **not** a retail tier; they remain the daily driver for development (section 2).

### Build-time flag (implemented)

Set **`VITE_HOLOBRO_TIER`** before `vite build` / `tauri build` to one of: `development` (default if unset), `lightweight`, `standard`, `full`. The UI shows the tier in the **header** and **Privacy** panel; **Lightweight** adds a line in the welcome dialog.

**npm (cross-platform):**

| Command | Tier baked in |
|---------|----------------|
| `npm run build:desktop` | `development` (default) |
| `npm run build:desktop:lightweight` | `lightweight` |
| `npm run build:desktop:standard` | `standard` |
| `npm run build:desktop:full` | `full` |

**CI:** GitHub Actions runs `npm run build` with each tier to catch compile errors (`.github/workflows/ci.yml` job `build-tiers`).

**Tauri bundle contents (implemented in tree):**

- **Lightweight** — `scripts/tauri-build-tier.mjs` runs `tauri build` **without** merging sidecar or hApp resources, so conductor/Lair and packed `holobro.happ` are not added from this path.
- **Standard / Full** — the same script may merge:
  - `src-tauri/tauri.bundle-holochain.conf.json` — `bundle.externalBin` for `binaries/holochain`, `binaries/lair-keystore`, and `binaries/hc` when matching `holochain-*`, `lair-keystore-*`, and `hc-*` files exist under `src-tauri/binaries/` ([Tauri sidecar naming](https://v2.tauri.app/develop/sidecar/)). **`npm run fetch:sidecars`** downloads a pinned set from `holochain-sidecars.manifest.json` (third-party prebuilts — **verify** match with `@holochain/client` + DNA before shipping).
  - `src-tauri/tauri.bundle-happ.conf.json` — copies `workdir/holobro.happ` into the bundle as `happ/holobro.happ` when that file exists (run `npm run pack:happ` in WSL after DNA build).
- **Runtime** — `tauri-plugin-shell`; `holochain_bundled_runtime_probe` checks holochain, lair, and `hc`. **Bundled sandbox:** `bundled_sandbox_start` / `stop` spawn **`hc sandbox run`** (best-effort) with `holobro.happ` copied to app-local data; the user still sets app WS + token from conductor output in **Setup**.
- **GitHub Release workflow** — fetches sidecars per runner OS, merges the bundle holochain config, sets `VITE_HOLOBRO_TIER=standard`. Optional **macOS** secrets: `MACOS_CERTIFICATE_BASE64`, `MACOS_CERTIFICATE_PASSWORD`, plus `APPLE_*` envs for signing/notarization when you configure them.

**Still TBD:** download-on-first-use for Lightweight; **auto-inject** app WebSocket URL/token from sandbox stdout; **per-thread chat keys** and **forward secrecy** remain design milestones ([HOLOBRO_CHAT_KEYS_SPIKE.md](./HOLOBRO_CHAT_KEYS_SPIKE.md)).

---

## 4. Related docs

- [HOLOBRO_YOUR_KEYS.md](./HOLOBRO_YOUR_KEYS.md) — user-facing identity and secrets.
- [HOLOBRO_PRIVACY_OPERATORS.md](./HOLOBRO_PRIVACY_OPERATORS.md) — env and toggles.
- [HOLOBRO_CHAT_KEYS_SPIKE.md](./HOLOBRO_CHAT_KEYS_SPIKE.md) — chat key evolution and forward secrecy note.

---

*Revise this file when a tier ships or when the security milestone scope changes.*
