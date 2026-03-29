// ============================================================
// HoloBro — Agent & UI State (Zustand)
// ============================================================
import { create } from 'zustand';
import type { Agent, AgentGroup, ChatMessage, NetworkStats, WandererConfig } from './types';
import { DEFAULT_AGENTS, DEFAULT_GROUPS, DEFAULT_NETWORK_STATS, DEFAULT_WANDERER } from './constants';

// ── Agent store ───────────────────────────────────────────────
interface AgentStore {
  agents: Agent[];
  groups: AgentGroup[];
  chatMessages: Record<string, ChatMessage[]>;
  cookies: number;

  addAgent: (agent: Agent) => void;
  updateAgent: (id: string, patch: Partial<Agent>) => void;
  removeAgent: (id: string) => void;
  renameAgent: (id: string, name: string) => void;
  setAgentAvatar: (id: string, emoji: string, bg: string) => void;
  appendLog: (agentId: string, level: 'ok' | 'info' | 'err', message: string) => void;

  addGroup: (group: AgentGroup) => void;
  updateGroup: (id: string, patch: Partial<AgentGroup>) => void;
  renameGroup: (id: string, name: string) => void;
  toggleGroupCollapsed: (id: string) => void;

  sendMessage: (agentId: string, content: string) => void;
  receiveMessage: (agentId: string, content: string) => void;

  incrementCookies: (by?: number) => void;
}

export const useAgentStore = create<AgentStore>((set) => ({
  agents: DEFAULT_AGENTS,
  groups: DEFAULT_GROUPS,
  chatMessages: {},
  cookies: 4829,

  addAgent: (agent) =>
    set((s) => ({ agents: [...s.agents, agent] })),

  updateAgent: (id, patch) =>
    set((s) => ({
      agents: s.agents.map((a) => (a.id === id ? { ...a, ...patch } : a)),
    })),

  removeAgent: (id) =>
    set((s) => ({ agents: s.agents.filter((a) => a.id !== id) })),

  renameAgent: (id, name) =>
    set((s) => ({
      agents: s.agents.map((a) => (a.id === id ? { ...a, name } : a)),
    })),

  setAgentAvatar: (id, emoji, avatarBg) =>
    set((s) => ({
      agents: s.agents.map((a) =>
        a.id === id ? { ...a, emoji, avatarBg } : a,
      ),
    })),

  appendLog: (agentId, level, message) => {
    const ts = new Date().toLocaleTimeString('en-GB', { hour12: false });
    set((s) => ({
      agents: s.agents.map((a) =>
        a.id === agentId
          ? { ...a, logs: [{ ts, level, message }, ...a.logs].slice(0, 50) }
          : a,
      ),
    }));
  },

  addGroup: (group) =>
    set((s) => ({ groups: [...s.groups, group] })),

  updateGroup: (id, patch) =>
    set((s) => ({
      groups: s.groups.map((g) => (g.id === id ? { ...g, ...patch } : g)),
    })),

  renameGroup: (id, name) =>
    set((s) => ({
      groups: s.groups.map((g) => (g.id === id ? { ...g, name } : g)),
    })),

  toggleGroupCollapsed: (id) =>
    set((s) => ({
      groups: s.groups.map((g) =>
        g.id === id ? { ...g, collapsed: !g.collapsed } : g,
      ),
    })),

  sendMessage: (agentId, content) => {
    const msg: ChatMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      content,
      ts: new Date().toLocaleTimeString('en-GB', { hour12: false, hour: '2-digit', minute: '2-digit' }),
      agentId,
    };
    set((s) => ({
      chatMessages: {
        ...s.chatMessages,
        [agentId]: [...(s.chatMessages[agentId] ?? []), msg],
      },
    }));
  },

  receiveMessage: (agentId, content) => {
    const msg: ChatMessage = {
      id: crypto.randomUUID(),
      role: 'assistant',
      content,
      ts: new Date().toLocaleTimeString('en-GB', { hour12: false, hour: '2-digit', minute: '2-digit' }),
      agentId,
    };
    set((s) => ({
      chatMessages: {
        ...s.chatMessages,
        [agentId]: [...(s.chatMessages[agentId] ?? []), msg],
      },
    }));
  },

  incrementCookies: (by = 1) =>
    set((s) => ({ cookies: s.cookies + by })),
}));

// ── UI store ─────────────────────────────────────────────────
interface MockupUIStore {
  inspectorOpen: boolean;
  inspectorFocusAgent: string | null;
  miniChatAgent: string | null;
  wanderer: WandererConfig;
  networkStats: NetworkStats;

  toggleInspector: () => void;
  setInspectorFocus: (agentId: string | null) => void;
  openMiniChat: (agentId: string) => void;
  closeMiniChat: () => void;
  updateWanderer: (patch: Partial<WandererConfig>) => void;
}

export const useMockupUIStore = create<MockupUIStore>((set) => ({
  inspectorOpen: false,
  inspectorFocusAgent: null,
  miniChatAgent: null,
  wanderer: DEFAULT_WANDERER,
  networkStats: DEFAULT_NETWORK_STATS,

  toggleInspector: () =>
    set((s) => ({ inspectorOpen: !s.inspectorOpen })),

  setInspectorFocus: (agentId) =>
    set({ inspectorFocusAgent: agentId, inspectorOpen: true }),

  openMiniChat: (agentId) => set({ miniChatAgent: agentId }),
  closeMiniChat: () => set({ miniChatAgent: null }),

  updateWanderer: (patch) =>
    set((s) => ({ wanderer: { ...s.wanderer, ...patch } })),
}));
