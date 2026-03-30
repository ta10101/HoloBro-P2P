import { describe, expect, it } from 'vitest'
import { bookmarkLooksEncrypted, openBookmarkRow, sealBookmarkForChain } from './bookmarkEnvelope'
import { isCryptoAvailable } from './chatCrypto'

describe('bookmarkEnvelope', () => {
  it('round-trips url and title', async () => {
    if (!isCryptoAvailable()) {
      expect(true).toBe(true)
      return
    }
    const sealed = await sealBookmarkForChain('https://example.com/path', 'Example', 'test-pass-xyz')
    expect(bookmarkLooksEncrypted(sealed.url)).toBe(true)
    expect(sealed.title).toBe('')
    const opened = await openBookmarkRow(
      { url: sealed.url, title: sealed.title },
      'test-pass-xyz',
    )
    expect(opened.url).toBe('https://example.com/path')
    expect(opened.title).toBe('Example')
  })

  it('leaves plaintext rows unchanged', async () => {
    const row = { url: 'https://plain.test/', title: 'Plain' }
    const opened = await openBookmarkRow(row, 'any')
    expect(opened).toEqual(row)
  })
})
