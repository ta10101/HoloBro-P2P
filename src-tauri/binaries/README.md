# Bundled Holochain sidecars (Standard / Full desktop)

Tauri embeds **external binaries** when `bundle.externalBin` is set. This repo uses a **merge config** (`tauri.bundle-holochain.conf.json`) only for **Standard** and **Full** desktop builds, and only when the files below are present.

## File names (per Tauri)

For each logical name in `externalBin`, place one executable **per target triple** next to this README, using Tauri’s `-$TARGET_TRIPLE` suffix (and `.exe` on Windows).

Examples (your triple from `rustc --print host-tuple`):

| Logical name | Linux example | Windows example |
|--------------|---------------|-----------------|
| `holochain` | `holochain-x86_64-unknown-linux-gnu` | `holochain-x86_64-pc-windows-msvc.exe` |
| `lair-keystore` | `lair-keystore-x86_64-unknown-linux-gnu` | `lair-keystore-x86_64-pc-windows-msvc.exe` |
| `hc` | `hc-x86_64-unknown-linux-gnu` | `hc-x86_64-pc-windows-msvc.exe` |

Paths in config are relative to `src-tauri/` (see [Embedding external binaries](https://v2.tauri.app/develop/sidecar/)).

## Build behavior

- **Lightweight** — never bundles these binaries (merge config is not applied).
- **Standard / Full** — `scripts/tauri-build-tier.mjs` merges holochain config **only if** this directory has `holochain-*`, `lair-keystore-*`, and `hc-*` files. **`npm run fetch:sidecars`** fills them from `holochain-sidecars.manifest.json` (edit the manifest when you change pinned versions).

Obtaining matching `holochain` and `lair-keystore` builds is your responsibility (Holochain release artifacts, CI, or local toolchain). Do not commit large binaries unless your release process requires it; many teams fetch them in CI before `tauri build`.

## Runtime API (Rust)

Sidecars are referenced as **`binaries/holochain`** and **`binaries/lair-keystore`** (same strings as in `externalBin`). The app exposes `holochain_bundled_runtime_probe` to run `--version` / `-V` and surface results in the UI for Standard/Full builds.

## Packed hApp (Standard / Full)

When `workdir/holobro.happ` exists, `tauri-build-tier.mjs` also merges `tauri.bundle-happ.conf.json` so the installer includes **`happ/holobro.happ`**. Using that file to install or run cells is not automated in the shell yet.
