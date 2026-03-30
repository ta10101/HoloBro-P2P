import type { ReactElement } from 'react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { useUIStore, useAgentStore } from '../store'
import { playAlertSound } from '../lib/alertSounds'
import type { Agent } from '../types'

// ── Types ────────────────────────────────────────────────────
type Point = { x: number; y: number }
type Activity = 'walk' | 'run' | 'idle' | 'dance' | 'sleep'
type Direction = 1 | -1  // 1 = facing right, -1 = facing left

const SIZE = 48
const PAD = 8
const GROUND_Y_OFFSET = 80 // distance from bottom of screen

// ── Hats ────────────────────────────────────────────────────
export const HATS: Record<string, { label: string; render: (x: number, y: number) => ReactElement | null }> = {
  none:      { label: 'None', render: () => null },
  beanie:    { label: 'Beanie', render: (x, y) => <><rect x={x-8} y={y-10} width={16} height={8} rx={3} fill="#e11d48" /><rect x={x-6} y={y-12} width={12} height={4} rx={2} fill="#be123c" /><circle cx={x} cy={y-13} r={2} fill="#fbbf24" /></> },
  tophat:    { label: 'Top Hat', render: (x, y) => <><rect x={x-10} y={y-6} width={20} height={3} rx={1} fill="#1e1b4b" /><rect x={x-6} y={y-18} width={12} height={12} rx={2} fill="#1e1b4b" /><rect x={x-6} y={y-8} width={12} height={2} rx={1} fill="#7c3aed" /></> },
  cap:       { label: 'Cap', render: (x, y) => <><ellipse cx={x} cy={y-5} rx={10} ry={5} fill="#0284c7" /><rect x={x} y={y-6} width={12} height={3} rx={1.5} fill="#0369a1" /></> },
  crown:     { label: 'Crown', render: (x, y) => <><path d={`M${x-8} ${y-5} l3-8 5 5 5-8-3 8-5 5 5-8 3 8z`} fill="#fbbf24" stroke="#f59e0b" strokeWidth={0.5} /><circle cx={x-4} cy={y-13} r={1.2} fill="#ef4444" /><circle cx={x} cy={y-15} r={1.2} fill="#3b82f6" /><circle cx={x+4} cy={y-13} r={1.2} fill="#22c55e" /></> },
  cowboy:    { label: 'Cowboy', render: (x, y) => <><ellipse cx={x} cy={y-5} rx={13} ry={3} fill="#92400e" /><ellipse cx={x} cy={y-9} rx={8} ry={5} fill="#a16207" /><rect x={x-7} y={y-7} width={14} height={1.5} rx={0.5} fill="#78350f" /></> },
  halo:      { label: 'Halo', render: (x, y) => <ellipse cx={x} cy={y-14} rx={9} ry={3} fill="none" stroke="#fbbf24" strokeWidth={1.8} opacity={0.8} /> },
  headphones:{ label: 'Headphones', render: (x, y) => <><path d={`M${x-10} ${y-2} Q${x-10} ${y-14} ${x} ${y-14} Q${x+10} ${y-14} ${x+10} ${y-2}`} fill="none" stroke="#6b7280" strokeWidth={2} /><rect x={x-12} y={y-4} width={5} height={7} rx={2} fill="#374151" /><rect x={x+7} y={y-4} width={5} height={7} rx={2} fill="#374151" /></> },
  santa:     { label: 'Santa', render: (x, y) => <><path d={`M${x-9} ${y-5} Q${x} ${y-22} ${x+9} ${y-5}`} fill="#dc2626" /><circle cx={x+7} cy={y-18} r={3} fill="#f8fafc" /><rect x={x-10} y={y-6} width={20} height={3} rx={1.5} fill="#f8fafc" /></> },
  pirate:    { label: 'Pirate', render: (x, y) => <><rect x={x-9} y={y-8} width={18} height={6} rx={2} fill="#1c1917" /><rect x={x-11} y={y-4} width={22} height={2} rx={1} fill="#1c1917" /><text x={x} y={y-3} textAnchor="middle" fontSize={5} fill="#fbbf24">{'☠'}</text></> },
  antenna:   { label: 'Antenna', render: (x, y) => <><line x1={x} y1={y-8} x2={x} y2={y-20} stroke="#6b7280" strokeWidth={1} /><circle cx={x} cy={y-21} r={2.5} fill="#ef4444"><animate attributeName="opacity" values="1;0.3;1" dur="1.2s" repeatCount="indefinite" /></circle></> },
}

// ── Quotes / Weather / News ─────────────────────────────────
const QUOTES = [
  '"The only way to do great work is to love what you do." — Steve Jobs',
  '"Stay hungry, stay foolish." — Steve Jobs',
  '"Decentralize everything." — Naval Ravikant',
  '"The best way to predict the future is to invent it." — Alan Kay',
  '"Privacy is an absolute prerequisite." — Marlon Brando',
  '"Information wants to be free." — Stewart Brand',
  '"We are what we repeatedly do." — Aristotle',
  '"In the middle of difficulty lies opportunity." — Einstein',
  '"The mesh is the message." — HoloBro',
  '"Peer to peer is the way to be." — HoloBro',
  '"Be yourself; everyone else is already taken." — Oscar Wilde',
  '"Not all who wander are lost." — J.R.R. Tolkien',
  '"The future is already here, just not evenly distributed." — William Gibson',
  '"Think different." — Apple',
]

const FAKE_WEATHER = [
  'Cloudy with a chance of packets',
  'Sunny, 72°F — perfect day out there',
  'Partly cloudy, 65°F — stay cozy',
  'Light rain — bundle up, fren',
  'Clear skies, 80°F — touch grass maybe?',
  'Foggy — can barely see the horizon',
  'Windy — hold onto your hat!',
  'Snowing — hot cocoa time',
  'Overcast, 58°F — moody vibes',
  'Thunderstorm — stay inside!',
]

const FAKE_NEWS = [
  'Breaking: Scientists prove naps improve productivity by 300%',
  'Report: Coffee consumption reaches all-time high worldwide',
  'New study shows peer-to-peer networks 200% more chill',
  'Area man spends entire weekend reorganizing bookmarks',
  'Local cat found sleeping on warm laptop, refuses to move',
  'Local AI refuses to answer, says "figure it out yourself"',
  'Survey: 73% of people talk to their houseplants daily',
  'Expert can\'t remember their own password, news at 11',
  'Man builds 47 sandwiches to find the perfect one',
  'Breaking: Sunglasses officially declared coolest accessory',
  'Study confirms: dogs are indeed good boys',
  'Scientists baffled by man who actually reads terms of service',
]

const SLEEP_LINES = ['Zzz...', 'zZzZz...', 'ZZzzZZzz...', '💤 Zzz...']
const WEIRD_LINES = [
  '*yawns loudly*',
  '*adjusts sunglasses*',
  'hmm, where was I going?',
  '*trips over nothing*',
  'I had the weirdest dream...',
  'who left the lights on??',
  '*accidentally walks into wall*',
  'man, I could go for a taco right now',
  'five more minutes...',
  '*does the robot*',
  'this is fine. 🔥',
  '*looks around suspiciously*',
  'I forgot what I was doing',
  'is it Friday yet?',
]

function pickRandom<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}

// ── Character SVG ───────────────────────────────────────────
function DudeSprite({ activity, hat, direction }: {
  activity: Activity
  hat: string
  direction: Direction
}) {
  const hatDef = HATS[hat] || HATS.none
  const headX = 24
  const headY = 14

  // Legs differ by activity
  let leftLeg: ReactElement
  let rightLeg: ReactElement
  let bodyExtra: ReactElement | null = null

  if (activity === 'sleep') {
    // Lying down — handled by parent transform
    leftLeg = <rect x={30} y={28} width={10} height={5} rx={2} fill="#0ea5e9" />
    rightLeg = <rect x={38} y={28} width={10} height={5} rx={2} fill="#0284c7" />
    bodyExtra = <text x={34} y={10} fontSize={6} fill="#fbbf24" fontFamily="var(--font-mono)">💤</text>
  } else if (activity === 'dance') {
    leftLeg = <>
      <rect x={17} y={32} width={5} height={10} rx={2} fill="#0ea5e9">
        <animateTransform attributeName="transform" type="rotate" values="-15 19 32;15 19 32;-15 19 32" dur="0.4s" repeatCount="indefinite" />
      </rect>
      <rect x={17} y={41} width={6} height={3} rx={1.5} fill="#0b1020" />
    </>
    rightLeg = <>
      <rect x={26} y={32} width={5} height={10} rx={2} fill="#0284c7">
        <animateTransform attributeName="transform" type="rotate" values="15 28 32;-15 28 32;15 28 32" dur="0.4s" repeatCount="indefinite" />
      </rect>
      <rect x={26} y={41} width={6} height={3} rx={1.5} fill="#0b1020" />
    </>
    // Arms waving
    bodyExtra = <>
      <rect x={10} y={22} width={4} height={8} rx={2} fill="#1e293b">
        <animateTransform attributeName="transform" type="rotate" values="-30 12 22;30 12 22;-30 12 22" dur="0.5s" repeatCount="indefinite" />
      </rect>
      <rect x={34} y={22} width={4} height={8} rx={2} fill="#1e293b">
        <animateTransform attributeName="transform" type="rotate" values="30 36 22;-30 36 22;30 36 22" dur="0.5s" repeatCount="indefinite" />
      </rect>
    </>
  } else if (activity === 'run') {
    leftLeg = <>
      <rect x={16} y={32} width={5} height={11} rx={2} fill="#0ea5e9">
        <animateTransform attributeName="transform" type="rotate" values="-20 18 32;20 18 32;-20 18 32" dur="0.3s" repeatCount="indefinite" />
      </rect>
      <rect x={16} y={42} width={6} height={3} rx={1.5} fill="#0b1020" />
    </>
    rightLeg = <>
      <rect x={27} y={32} width={5} height={11} rx={2} fill="#0284c7">
        <animateTransform attributeName="transform" type="rotate" values="20 29 32;-20 29 32;20 29 32" dur="0.3s" repeatCount="indefinite" />
      </rect>
      <rect x={27} y={42} width={6} height={3} rx={1.5} fill="#0b1020" />
    </>
  } else if (activity === 'walk') {
    leftLeg = <>
      <rect x={17} y={32} width={5} height={11} rx={2} fill="#0ea5e9">
        <animateTransform attributeName="transform" type="rotate" values="-10 19 32;10 19 32;-10 19 32" dur="0.6s" repeatCount="indefinite" />
      </rect>
      <rect x={17} y={42} width={6} height={3} rx={1.5} fill="#0b1020" />
    </>
    rightLeg = <>
      <rect x={26} y={32} width={5} height={11} rx={2} fill="#0284c7">
        <animateTransform attributeName="transform" type="rotate" values="10 28 32;-10 28 32;10 28 32" dur="0.6s" repeatCount="indefinite" />
      </rect>
      <rect x={26} y={42} width={6} height={3} rx={1.5} fill="#0b1020" />
    </>
  } else {
    // idle
    leftLeg = <>
      <rect x={18} y={32} width={5} height={11} rx={2} fill="#0ea5e9" />
      <rect x={17} y={42} width={6} height={3} rx={1.5} fill="#0b1020" />
    </>
    rightLeg = <>
      <rect x={26} y={32} width={5} height={11} rx={2} fill="#0284c7" />
      <rect x={25} y={42} width={6} height={3} rx={1.5} fill="#0b1020" />
    </>
  }

  return (
    <svg viewBox="0 0 48 48" width={SIZE} height={SIZE} xmlns="http://www.w3.org/2000/svg"
      style={{ transform: `scaleX(${direction})` }}>
      <defs>
        <linearGradient id="wb-head" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#ff2d95" />
          <stop offset="55%" stopColor="#7c3aed" />
          <stop offset="100%" stopColor="#06b6d4" />
        </linearGradient>
        <linearGradient id="wb-glass" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#0f172a" />
          <stop offset="100%" stopColor="#1e293b" />
        </linearGradient>
      </defs>

      {/* Head */}
      <ellipse cx={headX} cy={headY} rx={10} ry={9} fill="url(#wb-head)" />

      {/* Sunglasses — the signature look */}
      <rect x={14.5} y={11} width={8} height={5} rx={1.2} fill="url(#wb-glass)" stroke="#22d3ee" strokeWidth={0.6} />
      <rect x={25.5} y={11} width={8} height={5} rx={1.2} fill="url(#wb-glass)" stroke="#22d3ee" strokeWidth={0.6} />
      <rect x={22.5} y={13} width={3} height={1} rx={0.5} fill="#0b1020" />
      {/* Lens glare */}
      <line x1={15.5} y1={12} x2={21} y2={12} stroke="#e0f2fe" strokeWidth={0.4} opacity={0.5} />
      <line x1={26.5} y1={12} x2={32} y2={12} stroke="#e0f2fe" strokeWidth={0.4} opacity={0.5} />

      {/* Tiny smirk */}
      <path d={`M${headX - 3} ${headY + 4} Q${headX} ${headY + 6.5} ${headX + 3} ${headY + 4}`}
        fill="none" stroke="#f8fafc" strokeWidth={0.8} strokeLinecap="round" />

      {/* Body (jacket) */}
      <rect x={15} y={22} width={18} height={11} rx={4} fill="#0f172a" />
      {/* Jacket zip line */}
      <line x1={24} y1={23} x2={24} y2={32} stroke="#334155" strokeWidth={0.6} />

      {/* Arms (default idle) */}
      {!bodyExtra && <>
        <rect x={10} y={23} width={5} height={8} rx={2.5} fill="#1e293b" />
        <rect x={33} y={23} width={5} height={8} rx={2.5} fill="#1e293b" />
      </>}
      {bodyExtra}

      {/* Legs */}
      {leftLeg}
      {rightLeg}

      {/* Hat */}
      {hatDef.render(headX, headY - 5)}
    </svg>
  )
}

// ── Speech bubble ───────────────────────────────────────────
function SpeechBubble({ text, pos, name }: { text: string; pos: Point; name: string }) {
  const isRight = pos.x > window.innerWidth / 2
  return (
    <div className="wanderer-speech" style={{
      left: isRight ? undefined : pos.x,
      right: isRight ? (window.innerWidth - pos.x - SIZE) : undefined,
      bottom: window.innerHeight - pos.y + 4,
    }}>
      <span className="wanderer-speech-name">{name}</span>
      <span>{text}</span>
    </div>
  )
}

// ── Zzz animation for sleep ─────────────────────────────────
function SleepZzz({ pos }: { pos: Point }) {
  return (
    <div className="wanderer-zzz" style={{
      left: pos.x + SIZE / 2,
      top: pos.y - 20,
    }}>
      <span className="wanderer-zzz-1">Z</span>
      <span className="wanderer-zzz-2">z</span>
      <span className="wanderer-zzz-3">Z</span>
    </div>
  )
}

// ── Snooze state (module level so it persists across re-renders) ──
let _snoozedUntil = 0
let _alarmRepeatTimer: number | null = null

function isSnoozing(): boolean {
  return Date.now() < _snoozedUntil
}

function snoozeAlerts(durationMs = 5 * 60 * 1000) {
  _snoozedUntil = Date.now() + durationMs
  if (_alarmRepeatTimer) {
    window.clearInterval(_alarmRepeatTimer)
    _alarmRepeatTimer = null
  }
}

// ── Main Component ──────────────────────────────────────────
export function HoloBroWanderer() {
  const wanderer = useUIStore((s) => s.wanderer)
  const agents = useAgentStore((s) => s.agents)
  const chatMessages = useAgentStore((s) => s.chatMessages)

  const [pos, setPos] = useState<Point>({ x: 200, y: window.innerHeight - GROUND_Y_OFFSET })
  const [activity, setActivity] = useState<Activity>('idle')
  const [direction, setDirection] = useState<Direction>(1)
  const [speech, setSpeech] = useState<string | null>(null)
  const [lastNotifCount, setLastNotifCount] = useState(0)
  const [alerting, setAlerting] = useState(false)
  const [snoozed, setSnoozed] = useState(false)

  const posRef = useRef(pos)
  const activityRef = useRef(activity)
  const dirRef = useRef(direction)
  const speechTimerRef = useRef<number | null>(null)
  const activityTimerRef = useRef<number | null>(null)
  const prevAgentStatuses = useRef<Record<string, Agent['status']>>({})

  posRef.current = pos
  activityRef.current = activity
  dirRef.current = direction

  // ── Say something (with auto-dismiss) ──────────────────
  const say = useCallback((text: string, duration = 5000) => {
    if (speechTimerRef.current) window.clearTimeout(speechTimerRef.current)
    setSpeech(text)
    speechTimerRef.current = window.setTimeout(() => setSpeech(null), duration)
  }, [])

  // ── Pick a new random activity ─────────────────────────
  const pickActivity = useCallback(() => {
    if (wanderer.mode === 'static') {
      setActivity('idle')
      return
    }

    const roll = Math.random()
    let next: Activity

    if (roll < 0.30) next = 'walk'
    else if (roll < 0.45) next = 'run'
    else if (roll < 0.65) next = 'idle'
    else if (roll < 0.80) next = 'dance'
    else next = 'sleep'

    setActivity(next)

    // Pick a new roaming target when starting to move
    if (next === 'walk' || next === 'run') {
      targetRef.current = {
        x: PAD + Math.random() * (window.innerWidth - SIZE - PAD * 2),
        y: PAD + 48 + Math.random() * (window.innerHeight - SIZE - PAD * 2 - 80),
      }
    }

    // Sometimes say something during activity changes
    const sayRoll = Math.random()
    if (next === 'sleep') {
      say(pickRandom(SLEEP_LINES), 6000)
    } else if (next === 'dance') {
      say(pickRandom(['*vibing*', '*grooving*', '*doing the robot*', '*breakdance.exe*']), 4000)
    } else if (sayRoll < 0.15 && wanderer.showQuotes) {
      say(pickRandom(QUOTES), 8000)
    } else if (sayRoll < 0.25 && wanderer.showWeather) {
      say(`☁️ ${pickRandom(FAKE_WEATHER)}`, 6000)
    } else if (sayRoll < 0.35 && wanderer.showNews) {
      say(`📰 ${pickRandom(FAKE_NEWS)}`, 7000)
    } else if (sayRoll < 0.42) {
      say(pickRandom(WEIRD_LINES), 5000)
    }

    // Schedule next activity change
    const nextDelay = next === 'sleep'
      ? 8000 + Math.random() * 12000
      : 3000 + Math.random() * 6000

    activityTimerRef.current = window.setTimeout(pickActivity, nextDelay)
  }, [wanderer.mode, wanderer.showQuotes, wanderer.showWeather, wanderer.showNews, say])

  // ── Target point for roaming (wanders to random positions) ──
  const targetRef = useRef<Point>({ x: 200, y: window.innerHeight - GROUND_Y_OFFSET })

  const pickNewTarget = useCallback(() => {
    targetRef.current = {
      x: PAD + Math.random() * (window.innerWidth - SIZE - PAD * 2),
      y: PAD + 48 + Math.random() * (window.innerHeight - SIZE - PAD * 2 - 80),
    }
  }, [])

  // ── Movement loop ─────────────────────────────────────
  useEffect(() => {
    if (!wanderer.enabled || wanderer.mode === 'off') return
    if (wanderer.mode === 'static') return // static = no movement

    const speedMultiplier = [0, 0.3, 0.5, 0.8, 1.2, 1.8][wanderer.speed] || 0.8

    const interval = window.setInterval(() => {
      if (dragging.current) return // don't move while being dragged
      const act = activityRef.current
      const cur = posRef.current
      const target = targetRef.current

      if (act === 'walk' || act === 'run') {
        const speed = act === 'run' ? 1.8 * speedMultiplier : 0.6 * speedMultiplier
        const dx = target.x - cur.x
        const dy = target.y - cur.y
        const dist = Math.sqrt(dx * dx + dy * dy)

        if (dist < 3) {
          // Reached target, pick a new one
          pickNewTarget()
          return
        }

        // Move toward target
        const nx = cur.x + (dx / dist) * speed
        const ny = cur.y + (dy / dist) * speed

        // Update direction based on horizontal movement
        if (dx > 0) setDirection(1)
        else if (dx < 0) setDirection(-1 as Direction)

        const next = { x: nx, y: ny }
        posRef.current = next
        setPos(next)
      }
      // idle / dance / sleep — stay in place
    }, 16)

    return () => window.clearInterval(interval)
  }, [wanderer.enabled, wanderer.mode, wanderer.speed, pickNewTarget])

  // ── Activity cycle ────────────────────────────────────
  useEffect(() => {
    if (!wanderer.enabled || wanderer.mode === 'off') return

    // Initial activity pick
    const delay = window.setTimeout(() => pickActivity(), 1000)
    return () => {
      window.clearTimeout(delay)
      if (activityTimerRef.current) window.clearTimeout(activityTimerRef.current)
    }
  }, [wanderer.enabled, wanderer.mode, pickActivity])

  // ── Agent status change alerts (error/offline triggers) ──
  useEffect(() => {
    if (!wanderer.enabled || !wanderer.notifyAgentMessages) return

    const prev = prevAgentStatuses.current
    let triggered = false
    let triggerAgent: Agent | null = null

    for (const agent of agents) {
      const oldStatus = prev[agent.id]
      const newStatus = agent.status

      if (oldStatus && oldStatus !== newStatus && agent.alertOn !== 'off') {
        // Check if this status change should trigger an alert
        const isError = newStatus === 'error' || newStatus === 'offline'
        const shouldAlert = agent.alertOn === 'all' || (agent.alertOn === 'errors' && isError)

        if (shouldAlert && isError && !isSnoozing()) {
          triggered = true
          triggerAgent = agent
        }
      }
      prev[agent.id] = newStatus
    }

    if (triggered && triggerAgent) {
      const sound = triggerAgent.alertSound || 'alarm'
      setAlerting(true)
      setSnoozed(false)
      say(`⚠️ ${triggerAgent.name} is ${triggerAgent.status}!`, 8000)

      // Play the sound immediately
      playAlertSound(sound, triggerAgent.customSoundUrl)

      // For alarm sound: repeat every 10 seconds until snoozed
      if (sound === 'alarm') {
        if (_alarmRepeatTimer) window.clearInterval(_alarmRepeatTimer)
        _alarmRepeatTimer = window.setInterval(() => {
          if (isSnoozing()) {
            if (_alarmRepeatTimer) {
              window.clearInterval(_alarmRepeatTimer)
              _alarmRepeatTimer = null
            }
            return
          }
          playAlertSound('alarm')
        }, 10_000)
      }
    }
  }, [agents, wanderer.enabled, wanderer.notifyAgentMessages, say])

  // ── Agent message notifications (non-urgent) ─────────
  useEffect(() => {
    if (!wanderer.enabled || !wanderer.notifyAgentMessages) return

    const totalMessages = Object.values(chatMessages).reduce((sum, msgs) => sum + msgs.length, 0)

    if (totalMessages > lastNotifCount && lastNotifCount > 0) {
      const diff = totalMessages - lastNotifCount

      // Find which agent(s) got new messages and check if they want "all" alerts
      for (const agent of agents) {
        const msgs = chatMessages[agent.id]
        if (!msgs?.length) continue
        if (agent.alertOn === 'all' && agent.alertSound !== 'none' && !isSnoozing()) {
          playAlertSound(agent.alertSound, agent.customSoundUrl)
          break // Only play once
        }
      }

      say(`💬 ${diff} new agent message${diff > 1 ? 's' : ''}!`, 4000)
    }
    setLastNotifCount(totalMessages)
  }, [chatMessages, agents, wanderer.enabled, wanderer.notifyAgentMessages, lastNotifCount, say])

  // ── Snooze handler ───────────────────────────────────
  const handleSnooze = useCallback(() => {
    snoozeAlerts()
    setAlerting(false)
    setSnoozed(true)
    say(`${wanderer.name} snoozed alerts for 5 minutes`, 3000)
    window.setTimeout(() => setSnoozed(false), 5 * 60 * 1000)
  }, [say, wanderer.name])

  // Cleanup alarm timer on unmount
  useEffect(() => {
    return () => {
      if (_alarmRepeatTimer) {
        window.clearInterval(_alarmRepeatTimer)
        _alarmRepeatTimer = null
      }
    }
  }, [])

  // ── Handle window resize ──────────────────────────────
  useEffect(() => {
    const handleResize = () => {
      const groundY = window.innerHeight - GROUND_Y_OFFSET
      setPos((p) => ({ x: Math.min(p.x, window.innerWidth - SIZE - PAD), y: groundY }))
    }
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  // ── Greeting on first appear ──────────────────────────
  useEffect(() => {
    if (!wanderer.enabled || wanderer.mode === 'off') return
    const greetTimer = window.setTimeout(() => {
      say(`Hey! I'm ${wanderer.name}. Just hanging out.`, 5000)
    }, 2500)
    return () => window.clearTimeout(greetTimer)
    // Only on mount / enable
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wanderer.enabled, wanderer.mode])

  // ── Drag & drop ────────────────────────────────────────
  const dragging = useRef(false)
  const dragOffset = useRef({ x: 0, y: 0 })

  const onPointerDown = useCallback((e: React.PointerEvent) => {
    if (e.button !== 0) return  // only left click drags
    dragging.current = true
    dragOffset.current = { x: e.clientX - posRef.current.x, y: e.clientY - posRef.current.y }
    ;(e.target as HTMLElement).setPointerCapture(e.pointerId)
    e.preventDefault()
  }, [])

  const onPointerMove = useCallback((e: React.PointerEvent) => {
    if (!dragging.current) return
    const nx = Math.max(PAD, Math.min(window.innerWidth - SIZE - PAD, e.clientX - dragOffset.current.x))
    const ny = Math.max(PAD, Math.min(window.innerHeight - SIZE - PAD, e.clientY - dragOffset.current.y))
    const next = { x: nx, y: ny }
    posRef.current = next
    setPos(next)
  }, [])

  const onPointerUp = useCallback(() => {
    dragging.current = false
  }, [])

  // ── Right-click to toggle off + stop all sounds ────────
  const onContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    // Stop repeating alarm
    if (_alarmRepeatTimer) {
      window.clearInterval(_alarmRepeatTimer)
      _alarmRepeatTimer = null
    }
    // Clear speech & alert state
    if (speechTimerRef.current) window.clearTimeout(speechTimerRef.current)
    setSpeech(null)
    setAlerting(false)
    // Disable wanderer
    useUIStore.getState().updateWanderer({ mode: 'off', enabled: false })
  }, [])

  // ── Don't render if disabled ──────────────────────────
  if (!wanderer.enabled || wanderer.mode === 'off') return null

  const isSleeping = activity === 'sleep'

  return (
    <>
      {/* Speech bubble */}
      {speech && <SpeechBubble text={speech} pos={pos} name={wanderer.name} />}

      {/* Zzz animation */}
      {isSleeping && <SleepZzz pos={pos} />}

      {/* Alert snooze button */}
      {alerting && !snoozed && (
        <button
          className="wanderer-snooze-btn"
          style={{ left: pos.x + SIZE + 4, top: pos.y }}
          onClick={handleSnooze}
          type="button"
        >
          Snooze
        </button>
      )}

      {/* Alert indicator */}
      {alerting && !snoozed && (
        <div className="wanderer-alert-ring" style={{
          left: pos.x - 4,
          top: pos.y - 4,
          width: SIZE + 8,
          height: SIZE + 8,
        }} />
      )}

      {/* The dude — draggable, right-click to dismiss */}
      <div
        className={`wanderer-dude wanderer-${activity}`}
        style={{
          transform: `translate(${Math.round(pos.x)}px, ${Math.round(pos.y)}px)${isSleeping ? ' rotate(90deg)' : ''}`,
          opacity: wanderer.opacity,
          cursor: dragging.current ? 'grabbing' : 'grab',
          pointerEvents: 'auto',
        }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onContextMenu={onContextMenu}
        title={`${wanderer.name} — drag to move, right-click to hide`}
      >
        <DudeSprite activity={activity} hat={wanderer.hat} direction={direction} />
      </div>

      {/* Name tag */}
      <div className="wanderer-nametag" style={{
        left: pos.x + SIZE / 2,
        top: pos.y + SIZE + 2,
      }}>
        {wanderer.name}
      </div>
    </>
  )
}
