# HoloBro — your keys and identity (read this)

This guide is for **anyone using HoloBro with Holochain**, not only developers. It explains **what matters**, **what to protect**, and **what not to confuse**.

**In the app:** on first launch, a **Welcome** dialog summarizes the basics; use **Safety tips** in the header to open it again.

---

## Why this matters

Holochain ties actions to **you** through **cryptographic signing**:

- **Bookmarks, contacts, chat, and shared links** (when you turn sync on) are associated with **your agent** on the network.
- If someone else gets **your signing keys** or **passphrases**, they can impersonate you or read protected content (where you used shared passphrases for chat/bookmarks).

**Losing** the keystore on your device (disk failure, reinstall without backup) can mean **losing that identity** for this app on this machine: peers still see old data you published, but **you** may not be able to prove you are the same person again unless you have a **backup** (when the app supports restore).

Treat **keys and passphrases** with at least the same care as high-value login credentials; DHT-backed data may have **no central “reset password”** for the network layer.

---

## Two different “connection” stories (don’t mix them up)

### A) Developer / power-user mode (today in many builds)

You may put **`VITE_HC_APP_WS`** and **`VITE_HC_APP_TOKEN`** in `.env.local`, or use the **status bar → Setup** to save URL and token.

- That **token** is **not** your long-term Holochain identity. It is how the **UI connects to a running conductor** (like a session / API password).
- It can **change** when you restart the conductor or create a new sandbox.
- **Do not** treat it as “my Holochain password forever.”

### B) Bundled desktop installs

Some **release** builds bundle or auto-start **conductor + keystore** so the user does **not** paste `ws://` URLs or app tokens; the host process supplies a local connection.

- Identity is still protected with a **keystore passphrase** or **OS keychain**, depending on packaging (e.g. Lair).
- **Signing keys** remain on **that device** for that install.

Many **development** setups use only mode A until packaging supplies mode B; both are valid depending on the build.

---

## What “your Holochain identity” actually is

| Concept | Plain English |
|--------|----------------|
| **Agent / signing keys** | Prove “this bookmark/chat was me.” Stored in **Lair** (or equivalent keystore), not in GitHub. |
| **Source chain** | Your personal append-only history of actions in this DNA. |
| **App WebSocket + token** | **Local control channel** from the UI to the conductor (dev-style). **Not** the same as your agent identity. |
| **Chat / bookmark passphrase** (`VITE_HC_CHAT_PASSPHRASE`, `VITE_HC_BOOKMARK_PASSPHRASE`) | **Shared secrets** for **encrypting payloads** before they hit the chain. Everyone who should read must share the same secret. **Different** from Lair unlock and from the app token. |

---

## Examples — good habits vs mistakes

**Good**

- Use a **strong passphrase** if the app asks you to protect your keystore; **never** reuse your bank password in chat screenshots.
- Keep **`.env.local` out of git**; never paste it into Discord or email.
- **Rotate** chat/bookmark passphrases if you think they leaked (old ciphertext may still exist on the network).
- **Verify** contact keys and invite proofs before you trust someone in the Peers panel.

**Risky**

- Posting a screenshot that shows **Setup** with a live **token** or **WebSocket URL**.
- Committing **`.env.local`** to a public repo.
- Assuming “Holochain encrypted everything” — **signing ≠ hiding**. See [HOLOBRO_PRIVACY_OPERATORS.md](./HOLOBRO_PRIVACY_OPERATORS.md).

**Bad**

- Sharing your **Lair** data folder or backup with “a friend to test.”
- Using **one weak word** for every passphrase everywhere.

---

## Backups (when you have them)

If HoloBro (or your conductor tooling) offers **export / backup** of agent keys or keystore:

- Store backups **offline** or in an **encrypted** vault you control.
- Treat backup files like **private keys** — anyone with the file may be able to act as you on that network.

If there is **no** backup feature yet, assume **this device is the only copy** of that identity.

---

## Where to go next

- **What syncs and what stays on device:** [HOLOBRO_DATA_CLASSES.md](./HOLOBRO_DATA_CLASSES.md)  
- **Env vars, toggles, checklist:** [HOLOBRO_PRIVACY_OPERATORS.md](./HOLOBRO_PRIVACY_OPERATORS.md)  
- **Future chat key models (not implemented yet):** [HOLOBRO_CHAT_KEYS_SPIKE.md](./HOLOBRO_CHAT_KEYS_SPIKE.md)

---

*This document is meant to be shared with users and contributors. Keep it aligned when onboarding or keystore UX changes.*
