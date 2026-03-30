/**
 * Wraps bookmark url+title in one AES-GCM blob for create_bookmark (DNA still has url + title strings).
 * Plaintext bookmarks have no prefix; encrypted ones use holobro-bkm1: + base64 ciphertext of JSON.
 */
import { decryptMessage, encryptMessage } from './chatCrypto'

export const BOOKMARK_CHAIN_PREFIX = 'holobro-bkm1:'
const DERIVE_CONTEXT = 'bookmark-chain-v1'

export function bookmarkLooksEncrypted(url: string): boolean {
  return url.startsWith(BOOKMARK_CHAIN_PREFIX)
}

export async function sealBookmarkForChain(
  url: string,
  title: string,
  passphrase: string,
): Promise<{ url: string; title: string }> {
  const inner = JSON.stringify({ url, title })
  const ct = await encryptMessage(inner, passphrase, DERIVE_CONTEXT)
  return { url: BOOKMARK_CHAIN_PREFIX + ct, title: '' }
}

export async function openBookmarkRow<T extends { url: string; title: string }>(
  row: T,
  passphrase: string,
): Promise<T> {
  if (!bookmarkLooksEncrypted(row.url)) return row
  const pt = await decryptMessage(row.url.slice(BOOKMARK_CHAIN_PREFIX.length), passphrase, DERIVE_CONTEXT)
  if (!pt) return { ...row, title: row.title || '\u2014 encrypted \u2014' }
  try {
    const o = JSON.parse(pt) as { url?: string; title?: string }
    return { ...row, url: o.url ?? row.url, title: o.title ?? '' }
  } catch {
    return { ...row, title: '\u26a0 invalid encrypted bookmark' }
  }
}
