// ============================================================
// HoloBro — Core Types
// ============================================================

export type AgentStatus = 'running' | 'idle' | 'error' | 'offline';

export type AlertSound = 'none' | 'alarm' | 'siren' | 'bark' | 'custom';

export interface Agent {
  id: string;
  name: string;
  emoji: string;
  avatarBg: string;
  endpoint: string;
  model: string;
  apiKey?: string; // never stored in state — only in Tauri keyring
  status: AgentStatus;
  groupId: string;
  latencyMs: number;
  totalCalls: number;
  uptimePct: number;
  costToday: number;
  logs: LogEntry[];
  accentGradient: string;
  accentColor: string;
  /** Which sound HoloBro plays when this agent sends an alert */
  alertSound: AlertSound;
  /** Custom sound file URL (data: or blob: from user upload) */
  customSoundUrl?: string;
  /** Whether HoloBro should notify on every message or only errors/urgent */
  alertOn: 'all' | 'errors' | 'off';
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

export interface P2PPeer {
  id: string;
  handle: string;
  latencyMs: number;
  status: 'online' | 'away' | 'offline';
  sharedTB: number;
  repScore: number;
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
  mode: 'off' | 'static' | 'roam';
  skin: string;
  hat: string;
  name: string;
  speed: number; // 1-5
  opacity: number; // 0-1
  notifyAgentMessages: boolean;
  showWeather: boolean;
  showQuotes: boolean;
  showNews: boolean;
}

export type PanelId =
  | 'browser'
  | 'bookmarks'
  | 'history'
  | 'library'
  | 'contacts'
  | 'chat'
  | 'video'
  | 'privacy'
  | 'weather'
  | 'assistant'
  | 'network'
  | 'agents'
  | 'wanderer';

export type AgentTemplate = {
  label: string;
  emoji: string;
  endpoint: string;
  model: string;
  models: string[];  // available models for this provider
  accentColor: string;
  accentGradient: string;
  avatarBg: string;
};
