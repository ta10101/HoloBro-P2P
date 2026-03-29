import { describe, expect, it } from 'vitest'
import { mergeThreadIntoDemoChat } from './holoMirror'
import type { ChatMessageRow } from '../holochain'

function msg(body: string, at: number): ChatMessageRow {
  return {
    action_hash: new Uint8Array([1]),
    author: new Uint8Array([2]),
    thread_id: 'general',
    body,
    sent_at_ms: at,
  }
}

describe('mergeThreadIntoDemoChat', () => {
  it('replaces only the selected thread', () => {
    const prev = [
      { thread: 'general', body: 'old', at: 1 },
      { thread: 'other', body: 'keep', at: 2 },
    ]
    const next = mergeThreadIntoDemoChat(prev, 'general', [msg('hi', 99)])
    expect(next.find((x) => x.thread === 'other')?.body).toBe('keep')
    expect(next.filter((x) => x.thread === 'general').map((x) => x.body)).toEqual(['hi'])
  })
})
