// ============================================================
// HoloBro — Constants & Seed Data
// ============================================================
import type { Agent, AgentGroup, AgentTemplate, NetworkStats, WandererConfig } from './types';

export const AGENT_TEMPLATES: AgentTemplate[] = [
  {
    label: 'Claude',
    emoji: '\u{1F9E0}',
    endpoint: 'api.anthropic.com/v1',
    model: 'claude-sonnet-4-5',
    accentColor: '#ff2d95',
    accentGradient: 'linear-gradient(135deg, #ff2d95, #a855f7)',
    avatarBg: 'rgba(255,45,149,0.12)',
  },
  {
    label: 'OpenAI',
    emoji: '\u{1F9BE}',
    endpoint: 'api.openai.com/v1',
    model: 'gpt-4o',
    accentColor: '#06b6d4',
    accentGradient: 'linear-gradient(135deg, #06b6d4, #22c55e)',
    avatarBg: 'rgba(6,182,212,0.12)',
  },
  {
    label: 'Gemini',
    emoji: '\u{1F48E}',
    endpoint: 'generativelanguage.googleapis.com/v1',
    model: 'gemini-1.5-pro',
    accentColor: '#a855f7',
    accentGradient: 'linear-gradient(135deg, #a855f7, #06b6d4)',
    avatarBg: 'rgba(168,85,247,0.12)',
  },
  {
    label: 'Mistral',
    emoji: '\u26A1',
    endpoint: 'api.mistral.ai/v1',
    model: 'mistral-large',
    accentColor: '#facc15',
    accentGradient: 'linear-gradient(135deg, #facc15, #ff2d95)',
    avatarBg: 'rgba(250,204,21,0.10)',
  },
  {
    label: 'Ollama',
    emoji: '\u{1F5A5}\uFE0F',
    endpoint: 'localhost:11434/v1',
    model: 'llama3.2',
    accentColor: '#22c55e',
    accentGradient: 'linear-gradient(135deg, #22c55e, #06b6d4)',
    avatarBg: 'rgba(34,197,94,0.10)',
  },
  {
    label: 'Custom',
    emoji: '\u{1F52E}',
    endpoint: '',
    model: '',
    accentColor: '#a855f7',
    accentGradient: 'linear-gradient(135deg, #a855f7, #06b6d4)',
    avatarBg: 'rgba(168,85,247,0.12)',
  },
];

export const AVATAR_EMOJIS = [
  '\u{1F9E0}','\u{1F916}','\u{1F9BE}','\u{1F48E}','\u26A1','\u{1F5A5}\uFE0F','\u{1F52E}','\u{1F47E}',
  '\u{1F409}','\u{1F47B}','\u{1F98A}','\u{1F3AF}','\u{1F525}','\u{1F300}','\u{1F4A1}','\u{1F6F8}',
  '\u{1F9EC}','\u2604\uFE0F','\u{1F3AD}','\u{1F3F4}\u200D\u2620\uFE0F','\u{1F985}','\u{1F43A}','\u{1F981}','\u{1F30A}',
];

export const AVATAR_BACKGROUNDS = [
  'rgba(255,45,149,0.15)',
  'rgba(6,182,212,0.15)',
  'rgba(168,85,247,0.15)',
  'rgba(250,204,21,0.12)',
  'rgba(34,197,94,0.12)',
  'rgba(100,116,139,0.12)',
];

function ts(h: number, m: number, s = 0) {
  return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
}

export const DEFAULT_GROUPS: AgentGroup[] = [
  { id: 'production', name: 'Production', color: '#ff2d95', collapsed: false },
  { id: 'local',      name: 'Local & Offline', color: '#facc15', collapsed: false },
];

export const DEFAULT_AGENTS: Agent[] = [
  {
    id: 'claude',
    name: 'Claude Sonnet',
    emoji: '\u{1F9E0}',
    avatarBg: 'rgba(255,45,149,0.12)',
    endpoint: 'api.anthropic.com/v1',
    model: 'claude-sonnet-4-5',
    status: 'running',
    groupId: 'production',
    latencyMs: 142,
    totalCalls: 847,
    uptimePct: 99.8,
    costToday: 1.24,
    accentColor: '#ff2d95',
    accentGradient: 'linear-gradient(135deg, #ff2d95, #a855f7)',
    logs: [
      { ts: ts(14,33,1),  level: 'ok',   message: '\u2713 health check OK \u2014 142ms' },
      { ts: ts(14,32,48), level: 'info', message: '\u2192 request: summarize document' },
      { ts: ts(14,32,49), level: 'ok',   message: '\u2713 response \u2014 1,204 tokens' },
    ],
  },
  {
    id: 'openclaw',
    name: 'OpenClaw',
    emoji: '\u{1F9BE}',
    avatarBg: 'rgba(6,182,212,0.12)',
    endpoint: 'api.openai.com/v1',
    model: 'gpt-4o',
    status: 'running',
    groupId: 'production',
    latencyMs: 230,
    totalCalls: 312,
    uptimePct: 98.1,
    costToday: 0.72,
    accentColor: '#06b6d4',
    accentGradient: 'linear-gradient(135deg, #06b6d4, #22c55e)',
    logs: [
      { ts: ts(14,33,5),  level: 'ok',   message: '\u2713 health check OK \u2014 230ms' },
      { ts: ts(14,30,11), level: 'info', message: '\u2192 request: code generation' },
      { ts: ts(14,30,14), level: 'ok',   message: '\u2713 response \u2014 892 tokens' },
    ],
  },
  {
    id: 'gemini',
    name: 'Gemini Pro',
    emoji: '\u{1F48E}',
    avatarBg: 'rgba(168,85,247,0.12)',
    endpoint: 'generativelanguage.googleapis.com/v1',
    model: 'gemini-1.5-pro',
    status: 'running',
    groupId: 'production',
    latencyMs: 189,
    totalCalls: 45,
    uptimePct: 97.4,
    costToday: 0.18,
    accentColor: '#a855f7',
    accentGradient: 'linear-gradient(135deg, #a855f7, #06b6d4)',
    logs: [
      { ts: ts(14,31,0),  level: 'ok',   message: '\u2713 health check OK \u2014 189ms' },
      { ts: ts(14,22,0),  level: 'info', message: '\u2192 request: multimodal analysis' },
      { ts: ts(14,22,4),  level: 'ok',   message: '\u2713 response \u2014 640 tokens' },
    ],
  },
  {
    id: 'ollama',
    name: 'Ollama Local',
    emoji: '\u{1F5A5}\uFE0F',
    avatarBg: 'rgba(250,204,21,0.10)',
    endpoint: 'localhost:11434/v1',
    model: 'llama3.2',
    status: 'idle',
    groupId: 'local',
    latencyMs: 12,
    totalCalls: 45,
    uptimePct: 100,
    costToday: 0,
    accentColor: '#facc15',
    accentGradient: 'linear-gradient(135deg, #facc15, #ff2d95)',
    logs: [
      { ts: ts(14,32,55), level: 'ok',   message: '\u2713 health check OK \u2014 12ms' },
      { ts: ts(13,44,2),  level: 'info', message: '\u2192 request: local inference' },
      { ts: ts(13,44,9),  level: 'ok',   message: '\u2713 response \u2014 2,104 tokens (local)' },
    ],
  },
];

export const DEFAULT_NETWORK_STATS: NetworkStats = {
  peerCount: 247,
  avgLatencyMs: 38,
  totalSharedTB: 12.4,
  uptimePct: 99.2,
  uploadMBps: 2.4,
  downloadMBps: 8.7,
  maxHops: 3,
};

export const DEFAULT_WANDERER: WandererConfig = {
  enabled: true,
  skin: '\u{1F3AD}',
  speed: 3,
  opacity: 0.8,
  roamAllPanels: true,
  clickInteractions: true,
  cookieAnimations: true,
};
