/**
 * Tiny HoloBro sprite for the header — shows the dude with his current hat.
 */
import { HATS } from './HoloBroWanderer'

export function HoloBroMiniSprite({ hat, size = 28 }: { hat: string; size?: number }) {
  const hatDef = HATS[hat] || HATS.none
  const headX = 24
  const headY = 16

  return (
    <svg viewBox="0 0 48 40" width={size} height={size * (40 / 48)} xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="ms-head" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#ff2d95" />
          <stop offset="55%" stopColor="#7c3aed" />
          <stop offset="100%" stopColor="#06b6d4" />
        </linearGradient>
      </defs>

      {/* Head */}
      <ellipse cx={headX} cy={headY} rx={10} ry={9} fill="url(#ms-head)" />

      {/* Sunglasses */}
      <rect x={14.5} y={13} width={8} height={5} rx={1.2} fill="#0f172a" stroke="#22d3ee" strokeWidth={0.6} />
      <rect x={25.5} y={13} width={8} height={5} rx={1.2} fill="#0f172a" stroke="#22d3ee" strokeWidth={0.6} />
      <rect x={22.5} y={15} width={3} height={1} rx={0.5} fill="#0b1020" />
      {/* Glare */}
      <line x1={15.5} y1={14} x2={21} y2={14} stroke="#e0f2fe" strokeWidth={0.4} opacity={0.5} />
      <line x1={26.5} y1={14} x2={32} y2={14} stroke="#e0f2fe" strokeWidth={0.4} opacity={0.5} />

      {/* Smirk */}
      <path d={`M${headX - 3} ${headY + 4} Q${headX} ${headY + 6.5} ${headX + 3} ${headY + 4}`}
        fill="none" stroke="#f8fafc" strokeWidth={0.8} strokeLinecap="round" />

      {/* Body */}
      <rect x={16} y={24} width={16} height={8} rx={4} fill="#0f172a" />

      {/* Legs (tiny) */}
      <rect x={18} y={31} width={4} height={6} rx={2} fill="#0ea5e9" />
      <rect x={26} y={31} width={4} height={6} rx={2} fill="#0284c7" />

      {/* Hat */}
      {hatDef.render(headX, headY - 5)}
    </svg>
  )
}
