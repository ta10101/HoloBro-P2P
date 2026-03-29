// ============================================================
// HoloBro — Agent/Mockup Types
// ============================================================

export type AgentStatus = 'running' | 'idle' | 'error' | 'offline';

export interface Agent {
  id: string;
  name: string;
  emoji: string;
  avatarBg: string;
  endpoint: string;
  model: string;
  status: AgentStatus;
  groupId: string;
  latencyMs: number;
  totalCalls: number;
  uptimePct: number;
  costToday: number;
  logs: LogEntry[];
  accentGradient: string;
  accentColor: string;
}

export interface LogEntry {
  ts: string;
  level: 'ok' | 'info' | 'err';
  message: string;
}

export interface AgentGroup {
  id: string;
  name: string;
  color: string;
  collapsed: boolean;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  ts: string;
  agentId: string;
}

export interface NetworkStats {
  peerCount: number;
  avgLatencyMs: number;
  totalSharedTB: number;
  uptimePct: number;
  uploadMBps: number;
  downloadMBps: number;
  maxHops: number;
}

export interface WandererConfig {
  enabled: boolean;
  skin: string;
  speed: number;
  opacity: number;
  roamAllPanels: boolean;
  clickInteractions: boolean;
  cookieAnimations: boolean;
}

export type AgentTemplate = {
  label: string;
  emoji: string;
  endpoint: string;
  model: string;
  accentColor: string;
  accentGradient: string;
  avatarBg: string;
};
