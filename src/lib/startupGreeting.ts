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
