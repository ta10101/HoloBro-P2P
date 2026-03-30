/**
 * HoloBro Alert Sound Engine
 *
 * 3 built-in synthesized sounds + custom mp3/wav upload support.
 * Used by the Wanderer companion to alert on agent events.
 */

import type { AlertSound } from '../types'

// ── Alarm: "ding ding" bell, repeats every 10s until snoozed ──
function playAlarm(ctx: AudioContext, out: GainNode) {
  const now = ctx.currentTime

  const bell = (t: number) => {
    const o = ctx.createOscillator()
    const g = ctx.createGain()
    o.type = 'sine'
    o.frequency.setValueAtTime(1200, t)
    o.frequency.exponentialRampToValueAtTime(800, t + 0.15)
    g.gain.setValueAtTime(0.18, t)
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.6)
    o.connect(g)
    g.connect(out)
    o.start(t)
    o.stop(t + 0.65)

    // Harmonics for metallic feel
    const o2 = ctx.createOscillator()
    const g2 = ctx.createGain()
    o2.type = 'sine'
    o2.frequency.setValueAtTime(2400, t)
    o2.frequency.exponentialRampToValueAtTime(1600, t + 0.1)
    g2.gain.setValueAtTime(0.06, t)
    g2.gain.exponentialRampToValueAtTime(0.001, t + 0.4)
    o2.connect(g2)
    g2.connect(out)
    o2.start(t)
    o2.stop(t + 0.45)
  }

  // Ding-ding pattern
  bell(now)
  bell(now + 0.25)
  bell(now + 0.7)
  bell(now + 0.95)
}

// ── Siren: air raid siren, rising and falling ──────────────
function playSiren(ctx: AudioContext, out: GainNode) {
  const now = ctx.currentTime
  const duration = 2.5

  const o = ctx.createOscillator()
  const g = ctx.createGain()
  o.type = 'sawtooth'

  // Rising/falling sweep
  o.frequency.setValueAtTime(300, now)
  o.frequency.linearRampToValueAtTime(900, now + duration * 0.4)
  o.frequency.linearRampToValueAtTime(300, now + duration * 0.8)
  o.frequency.linearRampToValueAtTime(700, now + duration)

  g.gain.setValueAtTime(0.001, now)
  g.gain.linearRampToValueAtTime(0.12, now + 0.1)
  g.gain.setValueAtTime(0.12, now + duration - 0.3)
  g.gain.exponentialRampToValueAtTime(0.001, now + duration)

  o.connect(g)
  g.connect(out)
  o.start(now)
  o.stop(now + duration + 0.05)

  // Add slight wobble
  const lfo = ctx.createOscillator()
  const lfoGain = ctx.createGain()
  lfo.frequency.value = 6
  lfoGain.gain.value = 30
  lfo.connect(lfoGain)
  lfoGain.connect(o.frequency)
  lfo.start(now)
  lfo.stop(now + duration + 0.05)
}

// ── Bark: dog barking ──────────────────────────────────────
function playBark(ctx: AudioContext, out: GainNode) {
  const now = ctx.currentTime

  const singleBark = (t: number) => {
    // Noisy burst for the bark attack
    const o = ctx.createOscillator()
    const g = ctx.createGain()
    o.type = 'square'
    o.frequency.setValueAtTime(420, t)
    o.frequency.exponentialRampToValueAtTime(180, t + 0.12)
    g.gain.setValueAtTime(0.14, t)
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.18)
    o.connect(g)
    g.connect(out)
    o.start(t)
    o.stop(t + 0.2)

    // Second harmonic for roughness
    const o2 = ctx.createOscillator()
    const g2 = ctx.createGain()
    o2.type = 'sawtooth'
    o2.frequency.setValueAtTime(320, t)
    o2.frequency.exponentialRampToValueAtTime(150, t + 0.1)
    g2.gain.setValueAtTime(0.08, t)
    g2.gain.exponentialRampToValueAtTime(0.001, t + 0.14)
    o2.connect(g2)
    g2.connect(out)
    o2.start(t)
    o2.stop(t + 0.16)
  }

  // 3 barks
  singleBark(now)
  singleBark(now + 0.28)
  singleBark(now + 0.56)
}

// ── Custom sound from URL (data: / blob: / http) ──────────
let customAudioEl: HTMLAudioElement | null = null

function playCustom(url: string) {
  try {
    if (customAudioEl) {
      customAudioEl.pause()
      customAudioEl.currentTime = 0
    }
    customAudioEl = new Audio(url)
    customAudioEl.volume = 0.5
    void customAudioEl.play().catch(() => {})
  } catch {
    // Silently fail
  }
}

// ── Public API ─────────────────────────────────────────────

let _audioCtx: AudioContext | null = null

function getCtx(): AudioContext | null {
  const Ctor = (window as typeof window & { webkitAudioContext?: typeof AudioContext }).AudioContext
    ?? (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
  if (!Ctor) return null
  if (!_audioCtx || _audioCtx.state === 'closed') {
    _audioCtx = new Ctor()
  }
  return _audioCtx
}

/**
 * Play a built-in alert sound. Returns true if played successfully.
 */
export function playAlertSound(sound: AlertSound, customUrl?: string): boolean {
  if (sound === 'none') return false

  if (sound === 'custom' && customUrl) {
    playCustom(customUrl)
    return true
  }

  const ctx = getCtx()
  if (!ctx || ctx.state !== 'running') {
    // Try to resume
    if (ctx) void ctx.resume().catch(() => {})
    return false
  }

  const out = ctx.createGain()
  out.gain.value = 0.7
  out.connect(ctx.destination)

  switch (sound) {
    case 'alarm': playAlarm(ctx, out); break
    case 'siren': playSiren(ctx, out); break
    case 'bark':  playBark(ctx, out); break
    default: return false
  }

  // Clean up gain node after sound finishes
  window.setTimeout(() => {
    try { out.disconnect() } catch { /* noop */ }
  }, 4000)

  return true
}

/**
 * Read a user-selected audio file as a data: URL for storage.
 */
export function readAudioFile(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith('audio/')) {
      reject(new Error('Not an audio file'))
      return
    }
    if (file.size > 2 * 1024 * 1024) {
      reject(new Error('File too large (max 2 MB)'))
      return
    }
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = () => reject(new Error('Failed to read file'))
    reader.readAsDataURL(file)
  })
}

export const ALERT_SOUND_OPTIONS: { value: AlertSound; label: string }[] = [
  { value: 'none', label: 'None' },
  { value: 'alarm', label: '🔔 Alarm (ding ding)' },
  { value: 'siren', label: '🚨 Siren (air raid)' },
  { value: 'bark', label: '🐕 Dog Bark' },
  { value: 'custom', label: '🎵 Custom file…' },
]

export const ALERT_ON_OPTIONS: { value: 'all' | 'errors' | 'off'; label: string }[] = [
  { value: 'off', label: 'Off' },
  { value: 'errors', label: 'Errors & urgent only' },
  { value: 'all', label: 'All messages' },
]
