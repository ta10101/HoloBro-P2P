import { describe, expect, it } from 'vitest'
import { normalizeUrl } from './normalizeUrl'

describe('normalizeUrl', () => {
  it('adds https when scheme missing', () => {
    expect(normalizeUrl('example.com')).toBe('https://example.com')
  })

  it('trims whitespace', () => {
    expect(normalizeUrl('  https://x.test  ')).toBe('https://x.test')
  })

  it('preserves http', () => {
    expect(normalizeUrl('http://local')).toBe('http://local')
  })
})
