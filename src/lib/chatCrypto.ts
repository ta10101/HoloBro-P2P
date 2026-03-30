/**
 * Simple AES-GCM chat encryption wrapper.
 * Uses a shared passphrase that both peers know (exchanged out-of-band or via Holochain).
 * In production, replace with proper key exchange (e.g. X25519 + HKDF).
 */

const ALGO = 'AES-GCM'
const IV_LEN = 12

async function deriveKey(passphrase: string): Promise<CryptoKey> {
  const enc = new TextEncoder()
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    enc.encode(passphrase),
    'PBKDF2',
    false,
    ['deriveKey'],
  )
  const salt = enc.encode('holobro-chat-salt-v1')
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt, iterations: 100_000, hash: 'SHA-256' },
    keyMaterial,
    { name: ALGO, length: 256 },
    false,
    ['encrypt', 'decrypt'],
  )
}

/** Encrypt plaintext → base64 string (IV prepended). */
export async function encryptMessage(plaintext: string, passphrase: string): Promise<string> {
  const key = await deriveKey(passphrase)
  const iv = crypto.getRandomValues(new Uint8Array(IV_LEN))
  const enc = new TextEncoder()
  const ct = await crypto.subtle.encrypt({ name: ALGO, iv }, key, enc.encode(plaintext))
  const combined = new Uint8Array(IV_LEN + ct.byteLength)
  combined.set(iv, 0)
  combined.set(new Uint8Array(ct), IV_LEN)
  return btoa(String.fromCharCode(...combined))
}

/** Decrypt base64 string → plaintext. Returns null on failure. */
export async function decryptMessage(b64: string, passphrase: string): Promise<string | null> {
  try {
    const key = await deriveKey(passphrase)
    const raw = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0))
    const iv = raw.slice(0, IV_LEN)
    const ct = raw.slice(IV_LEN)
    const pt = await crypto.subtle.decrypt({ name: ALGO, iv }, key, ct)
    return new TextDecoder().decode(pt)
  } catch {
    return null
  }
}

/** Check if encryption is available in this environment. */
export function isCryptoAvailable(): boolean {
  return typeof crypto !== 'undefined' && typeof crypto.subtle !== 'undefined'
}
