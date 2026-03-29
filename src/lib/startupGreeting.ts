export type AppIdentityResult = { username: string; device: string; displayName: string }

export function pickWelcomeLine(name: string): string {
  const holobroLines = [
    `Missed you, ${name}. HoloBro is happy you are back.`,
    `Welcome back bro, ${name}. HoloBro was waiting.`,
    `Long time no see, ${name}. holobro has your lane ready.`,
    `${name}, HoloBro missed your style. Good to see you.`,
  ]
  const regularLines = [
    `Welcome back bro, ${name}.`,
    `Long time no see, ${name}. Good to have you here.`,
    `${name}, good to see you again. Let's surf the grid.`,
    `Hey ${name}, your board is waxed and ready.`,
    `${name}, you are back. Feels right.`,
    `Yo ${name}, the city lights stayed on for you.`,
  ]
  const includeHolobro = Math.random() < 0.4
  const source = includeHolobro ? holobroLines : regularLines
  return source[Math.floor(Math.random() * source.length)]
}

export function playTranceBed() {
  const Ctx =
    (window as typeof window & { webkitAudioContext?: typeof AudioContext }).AudioContext
    || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
  if (!Ctx) return
  const ctx = new Ctx()
  const now = ctx.currentTime
  const master = ctx.createGain()
  master.gain.value = 0.02
  master.connect(ctx.destination)

  const notes = [220, 246.94, 261.63, 329.63, 392, 329.63, 261.63, 246.94]
  for (let i = 0; i < 20; i += 1) {
    const osc = ctx.createOscillator()
    const g = ctx.createGain()
    osc.type = i % 2 === 0 ? 'triangle' : 'sawtooth'
    osc.frequency.value = notes[i % notes.length]
    g.gain.value = 0.0001
    const t = now + i * 0.25
    g.gain.linearRampToValueAtTime(0.05, t + 0.03)
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.23)
    osc.connect(g)
    g.connect(master)
    osc.start(t)
    osc.stop(t + 0.24)
  }
  window.setTimeout(() => {
    void ctx.close().catch(() => {})
  }, 5200)
}
