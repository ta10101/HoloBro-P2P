// ============================================================
// HoloBro — Shared UI Primitives
// ============================================================
import React from 'react';
import type { Agent, LogEntry } from '../types';

// ── AgentAvatar ──────────────────────────────────────────────
interface AgentAvatarProps {
  agent: Pick<Agent, 'emoji' | 'avatarBg' | 'name'>;
  size?: number;
  onClick?: () => void;
  showEditOverlay?: boolean;
}

export const AgentAvatar: React.FC<AgentAvatarProps> = ({
  agent, size = 44, onClick, showEditOverlay = false,
}) => {
  const fontSize = size * 0.45;
  return (
    <div
      onClick={onClick}
      title={showEditOverlay ? `Change ${agent.name} avatar` : agent.name}
      style={{
        width: size, height: size, borderRadius: '50%',
        background: agent.avatarBg,
        border: '2px solid var(--border)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize, cursor: onClick ? 'pointer' : 'default',
        flexShrink: 0, position: 'relative', overflow: 'hidden',
        transition: 'border-color var(--transition)',
      }}
      onMouseEnter={(e) => {
        if (onClick) (e.currentTarget as HTMLElement).style.borderColor = 'var(--cyan)';
      }}
      onMouseLeave={(e) => {
        if (onClick) (e.currentTarget as HTMLElement).style.borderColor = 'var(--border)';
      }}
    >
      <span style={{ userSelect: 'none' }}>{agent.emoji}</span>
      {showEditOverlay && onClick && (
        <div style={{
          position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.6)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 11, color: 'white', opacity: 0,
          transition: 'opacity var(--transition)', borderRadius: '50%',
          fontFamily: 'var(--font-mono)',
        }}
          className="av-overlay"
        >&#x270F;&#xFE0F;</div>
      )}
    </div>
  );
};

// ── StatusDot ────────────────────────────────────────────────
interface StatusDotProps {
  status: Agent['status'];
  size?: number;
}
const STATUS_COLORS: Record<Agent['status'], string> = {
  running: 'var(--green)',
  idle:    'var(--amber)',
  error:   'var(--red)',
  offline: 'var(--muted)',
};
export const StatusDot: React.FC<StatusDotProps> = ({ status, size = 7 }) => (
  <div style={{
    width: size, height: size, borderRadius: '50%',
    background: STATUS_COLORS[status], flexShrink: 0,
    animation: status === 'running' ? 'blink 2s infinite' : undefined,
  }} />
);

// ── StatusPill ───────────────────────────────────────────────
const STATUS_PILL_CLASS: Record<Agent['status'], string> = {
  running: 'pill pill-green',
  idle:    'pill pill-amber',
  error:   'pill pill-red',
  offline: 'pill pill-muted',
};
const STATUS_LABEL: Record<Agent['status'], string> = {
  running: '\u25CF RUNNING',
  idle:    '\u25D1 IDLE',
  error:   '\u2715 ERROR',
  offline: '\u25CB OFFLINE',
};
export const StatusPill: React.FC<{ status: Agent['status'] }> = ({ status }) => (
  <span className={STATUS_PILL_CLASS[status]} style={{ fontSize: 8 }}>
    {STATUS_LABEL[status]}
  </span>
);

// ── MonoLabel ────────────────────────────────────────────────
export const MonoLabel: React.FC<{ children: React.ReactNode; style?: React.CSSProperties }> = ({ children, style }) => (
  <div style={{
    fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '2px',
    color: 'var(--muted)', textTransform: 'uppercase', marginBottom: 10, ...style,
  }}>
    {children}
  </div>
);

// ── Card ─────────────────────────────────────────────────────
export const Card: React.FC<{ children: React.ReactNode; style?: React.CSSProperties; onClick?: () => void }> = ({
  children, style, onClick,
}) => (
  <div
    onClick={onClick}
    style={{
      background: 'var(--panel)', border: '1px solid var(--border)',
      borderRadius: 'var(--radius-lg)', padding: '18px 20px',
      transition: 'border-color var(--transition)',
      cursor: onClick ? 'pointer' : undefined, ...style,
    }}
    onMouseEnter={(e) => { if (onClick) (e.currentTarget as HTMLElement).style.borderColor = '#2a3f5a'; }}
    onMouseLeave={(e) => { if (onClick) (e.currentTarget as HTMLElement).style.borderColor = 'var(--border)'; }}
  >
    {children}
  </div>
);

// ── Btn ──────────────────────────────────────────────────────
type BtnVariant = 'ghost' | 'cyan' | 'pink' | 'grad' | 'danger';
interface BtnProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: BtnVariant;
  size?: 'sm' | 'md';
}
const BTN_STYLES: Record<BtnVariant, React.CSSProperties> = {
  ghost:  { background: 'transparent', color: 'var(--muted)', borderColor: 'var(--border)' },
  cyan:   { background: 'rgba(6,182,212,0.1)', color: 'var(--cyan)', borderColor: 'rgba(6,182,212,0.3)' },
  pink:   { background: 'rgba(255,45,149,0.1)', color: 'var(--pink)', borderColor: 'rgba(255,45,149,0.3)' },
  grad:   { background: 'linear-gradient(135deg, var(--pink), var(--violet))', color: 'white', border: 'none' },
  danger: { background: 'rgba(239,68,68,0.1)', color: 'var(--red)', borderColor: 'rgba(239,68,68,0.3)' },
};
export const Btn: React.FC<BtnProps> = ({ variant = 'ghost', size = 'md', style, children, ...rest }) => (
  <button
    {...rest}
    style={{
      fontFamily: 'var(--font-ui)', fontWeight: 700, letterSpacing: 1,
      fontSize: size === 'sm' ? 11 : 13,
      padding: size === 'sm' ? '5px 12px' : '7px 16px',
      borderRadius: 'var(--radius-sm)', cursor: 'pointer',
      transition: 'all var(--transition)', border: '1px solid',
      ...BTN_STYLES[variant], ...style,
    }}
  >
    {children}
  </button>
);

// ── TextInput ────────────────────────────────────────────────
export const TextInput: React.FC<React.InputHTMLAttributes<HTMLInputElement>> = ({ style, ...rest }) => (
  <input
    {...rest}
    style={{
      background: 'var(--bg)', border: '1px solid var(--border)',
      borderRadius: 'var(--radius-sm)', padding: '8px 12px',
      fontFamily: 'var(--font-ui)', fontSize: 13, color: 'var(--text)',
      outline: 'none', width: '100%', transition: 'border-color var(--transition)',
      ...style,
    }}
    onFocus={(e) => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--cyan)'; rest.onFocus?.(e); }}
    onBlur={(e)  => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--border)'; rest.onBlur?.(e); }}
  />
);

// ── InlineEditInput ──────────────────────────────────────────
interface InlineEditInputProps {
  value: string;
  onChange: (val: string) => void;
  fontFamily?: string;
  fontSize?: number;
  fontWeight?: number;
  letterSpacing?: number | string;
  textTransform?: React.CSSProperties['textTransform'];
  color?: string;
}
export const InlineEditInput: React.FC<InlineEditInputProps> = ({
  value, onChange,
  fontFamily = 'var(--font-display)',
  fontSize = 13, fontWeight = 700,
  letterSpacing = 1, textTransform = 'none', color = 'var(--text)',
}) => (
  <input
    value={value}
    onChange={(e) => onChange(e.target.value)}
    style={{
      fontFamily, fontSize, fontWeight, letterSpacing, textTransform, color,
      background: 'transparent', border: '1px solid transparent',
      borderRadius: 4, padding: '2px 5px', outline: 'none',
      width: '100%', cursor: 'pointer', transition: 'all var(--transition)',
    }}
    onMouseEnter={(e) => {
      (e.currentTarget as HTMLElement).style.borderColor = 'var(--border)';
      (e.currentTarget as HTMLElement).style.background = 'var(--dim)';
    }}
    onMouseLeave={(e) => {
      if (document.activeElement !== e.currentTarget) {
        (e.currentTarget as HTMLElement).style.borderColor = 'transparent';
        (e.currentTarget as HTMLElement).style.background = 'transparent';
      }
    }}
    onFocus={(e) => {
      (e.currentTarget as HTMLElement).style.borderColor = 'var(--cyan)';
      (e.currentTarget as HTMLElement).style.background = 'var(--bg)';
      (e.currentTarget as HTMLElement).style.cursor = 'text';
    }}
    onBlur={(e) => {
      (e.currentTarget as HTMLElement).style.borderColor = 'transparent';
      (e.currentTarget as HTMLElement).style.background = 'transparent';
      (e.currentTarget as HTMLElement).style.cursor = 'pointer';
    }}
  />
);

// ── LogMini ──────────────────────────────────────────────────
export const LogMini: React.FC<{ logs: LogEntry[]; maxRows?: number }> = ({ logs, maxRows = 3 }) => {
  const colors: Record<LogEntry['level'], string> = {
    ok: 'var(--green)', info: 'var(--cyan)', err: 'var(--red)',
  };
  return (
    <div style={{
      background: 'var(--bg)', border: '1px solid var(--border)',
      borderRadius: 6, padding: '8px 10px', maxHeight: 64,
      overflowY: 'auto', fontFamily: 'var(--font-mono)',
      fontSize: 9, lineHeight: 1.8, marginBottom: 12,
    }}>
      {logs.slice(0, maxRows).map((log, i) => (
        <div key={i} style={{ color: colors[log.level] }}>
          [{log.ts}] {log.message}
        </div>
      ))}
    </div>
  );
};

// ── ProgressBar ──────────────────────────────────────────────
export const ProgressBar: React.FC<{
  value: number;
  color?: string;
  height?: number;
  style?: React.CSSProperties;
}> = ({ value, color = 'linear-gradient(90deg, var(--cyan), var(--violet))', height = 4, style }) => (
  <div style={{
    height, background: 'var(--dim)', borderRadius: height / 2,
    overflow: 'hidden', ...style,
  }}>
    <div style={{
      width: `${Math.min(100, value)}%`, height: '100%',
      borderRadius: height / 2, background: color, transition: 'width 0.3s ease',
    }} />
  </div>
);
