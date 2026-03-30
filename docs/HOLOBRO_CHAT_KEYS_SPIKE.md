# HoloBro — chat keys (design spike, not implemented)

**Status:** design note only. v1 uses a single optional `VITE_HC_CHAT_PASSPHRASE` with per-thread salt in the client (`src/lib/chatCrypto.ts`).

## Problem

A global passphrase is simple but does not give per-peer or forward secrecy. The data-classes policy targets **thread keys** and optional trusted-only threads.

## Directions to explore (before coding)

1. **Per-thread symmetric key** — User creates or joins a thread; key is negotiated out-of-band or derived from a pairwise secret stored in the contacts/trust layer (requires contact sync + UX).
2. **Per-contact pairwise** — Double encrypt: message key wrapped for each recipient’s public capability (needs key distribution story on Holochain).
3. **Forward secrecy** — Double Ratchet / MLS-style protocols; high engineering cost; likely a separate milestone.

## Constraints

- Must not log keys or passphrases.
- Migration: existing ciphertext-on-chain messages stay readable with old passphrase path until explicitly deprecated.
- Any UI for secrets needs danger copy and optional “show once” export.

## References

- [HOLOBRO_DATA_CLASSES.md](./HOLOBRO_DATA_CLASSES.md) — chat row and v1 implementation status.
- [HOLOBRO_PRIVACY_OPERATORS.md](./HOLOBRO_PRIVACY_OPERATORS.md) — §3 chat, §6 backlog.
- [HOLOBRO_RELEASE_AND_SECURITY_ROADMAP.md](./HOLOBRO_RELEASE_AND_SECURITY_ROADMAP.md) — dev vs retail tiers and forward-secrecy milestone framing.
