// ============================================================
// HoloBro — Global State (Zustand)
// ============================================================
import { create } from 'zustand';
import type {
  Agent, AgentGroup, ChatMessage, PanelId,
  WandererConfig, NetworkStats,
} from '../types';
import {
  DEFAULT_AGENTS, DEFAULT_GROUPS,
  DEFAULT_NETWORK_STATS, DEFAULT_WANDERER,
} from '../constants';

// ── Agent persistence ────────────────────────────────────────
const LS_AGENTS = 'holobro_agents';
const LS_GROUPS = 'holobro_groups';

function loadPersistedAgents(): Agent[] {
  try {
    const raw = localStorage.getItem(LS_AGENTS);
    if (!raw) return DEFAULT_AGENTS;
    const parsed = JSON.parse(raw) as Agent[];
    if (!Array.isArray(parsed) || parsed.length === 0) return DEFAULT_AGENTS;
    // Ensure new fields have defaults
    return parsed.map((a) => ({
      ...a,
      alertSound: a.alertSound ?? 'alarm',
      alertOn: a.alertOn ?? 'errors',
      logs: a.logs ?? [],
    }));
  } catch {
    return DEFAULT_AGENTS;
  }
}

function loadPersistedGroups(): AgentGroup[] {
  try {
    const raw = localStorage.getItem(LS_GROUPS);
    if (!raw) return DEFAULT_GROUPS;
    const parsed = JSON.parse(raw) as AgentGroup[];
    if (!Array.isArray(parsed) || parsed.length === 0) return DEFAULT_GROUPS;
    return parsed;
  } catch {
    return DEFAULT_GROUPS;
  }
}

function persistAgents(agents: Agent[]) {
  try {
    // Strip logs and transient data before saving — keep config only
    const toSave = agents.map(({ logs, ...rest }) => ({ ...rest, logs: [] }));
    localStorage.setItem(LS_AGENTS, JSON.stringify(toSave));
  } catch { /* quota exceeded — silently skip */ }
}

function persistGroups(groups: AgentGroup[]) {
  try {
    localStorage.setItem(LS_GROUPS, JSON.stringify(groups));
  } catch { /* quota exceeded */ }
}

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
  agents: loadPersistedAgents(),
  groups: loadPersistedGroups(),
  chatMessages: {},
  cookies: 4829,

  addAgent: (agent) =>
    set((s) => {
      const next = [...s.agents, agent];
      persistAgents(next);
      return { agents: next };
    }),

  updateAgent: (id, patch) =>
    set((s) => {
      const next = s.agents.map((a) => (a.id === id ? { ...a, ...patch } : a));
      persistAgents(next);
      return { agents: next };
    }),

  removeAgent: (id) =>
    set((s) => {
      const next = s.agents.filter((a) => a.id !== id);
      persistAgents(next);
      return { agents: next };
    }),

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
    set((s) => {
      const next = [...s.groups, group];
      persistGroups(next);
      return { groups: next };
    }),

  updateGroup: (id, patch) =>
    set((s) => {
      const next = s.groups.map((g) => (g.id === id ? { ...g, ...patch } : g));
      persistGroups(next);
      return { groups: next };
    }),

  renameGroup: (id, name) =>
    set((s) => {
      const next = s.groups.map((g) => (g.id === id ? { ...g, name } : g));
      persistGroups(next);
      return { groups: next };
    }),

  toggleGroupCollapsed: (id) =>
    set((s) => {
      const next = s.groups.map((g) =>
        g.id === id ? { ...g, collapsed: !g.collapsed } : g,
      );
      persistGroups(next);
      return { groups: next };
    }),

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

// ── Tab type ─────────────────────────────────────────────────
interface BrowserTab {
  id: string;
  icon: string;
  label: string;
  panelId: PanelId;
  url: string | null; // null = panel default, string = actual URL
}

// ── UI store ─────────────────────────────────────────────────
interface UIStore {
  activePanel: PanelId;
  inspectorOpen: boolean;
  inspectorFocusAgent: string | null;
  miniChatAgent: string | null;
  wanderer: WandererConfig;
  networkStats: NetworkStats;
  browserUrl: string | null;
  firstRunDismissed: boolean;

  // Tabs
  tabs: BrowserTab[];
  activeTabId: string;
  addTab: () => void;
  closeTab: (tabId: string) => void;
  switchTab: (tabId: string) => void;

  // Navigation history
  urlHistory: string[];
  urlHistoryIdx: number;
  canGoBack: boolean;
  canGoForward: boolean;
  goBack: () => void;
  goForward: () => void;

  setPanel: (panel: PanelId) => void;
  toggleInspector: () => void;
  setInspectorFocus: (agentId: string | null) => void;
  openMiniChat: (agentId: string) => void;
  closeMiniChat: () => void;
  updateWanderer: (patch: Partial<WandererConfig>) => void;
  navigate: (url: string) => void;
  goHome: () => void;
  dismissFirstRun: () => void;
}

const PANEL_ICONS: Partial<Record<PanelId, string>> = {
  browser: '\u{1F310}', bookmarks: '\u{1F516}', history: '\u{1F550}',
  library: '\u{1F4DA}', contacts: '\u{1F465}', chat: '\u{1F4AC}',
  video: '\u25B6\uFE0F', weather: '\u{1F324}', assistant: '\u{1F916}',
  network: '\u{1F4E1}', agents: '\u26A1', wanderer: '\u{1F3AD}',
};

const PANEL_LABELS: Partial<Record<PanelId, string>> = {
  browser: 'New Tab', bookmarks: 'Bookmarks', history: 'History',
  library: 'P2P Library', contacts: 'Peers', chat: 'Chat',
  video: 'Video', weather: 'Weather', assistant: 'AI Assistant',
  network: 'Network', agents: 'Agent Hub', wanderer: 'Wanderer',
};

const INITIAL_TABS: BrowserTab[] = [
  { id: 'tab-home', icon: '\u{1F310}', label: 'New Tab', panelId: 'browser', url: null },
];

export const useUIStore = create<UIStore>((set) => ({
  activePanel: 'browser',
  inspectorOpen: true,
  inspectorFocusAgent: null,
  miniChatAgent: null,
  wanderer: DEFAULT_WANDERER,
  networkStats: DEFAULT_NETWORK_STATS,
  browserUrl: null,
  firstRunDismissed: localStorage.getItem('holobro_first_run_dismissed') === '1',

  tabs: INITIAL_TABS,
  activeTabId: 'tab-home',
  urlHistory: [],
  urlHistoryIdx: -1,
  canGoBack: false,
  canGoForward: false,

  addTab: () => {
    const id = `tab-${Date.now()}`;
    const tab: BrowserTab = { id, icon: '\u{1F310}', label: 'New Tab', panelId: 'browser', url: null };
    set((s) => ({
      tabs: [...s.tabs, tab],
      activeTabId: id,
      activePanel: 'browser',
      browserUrl: null,
    }));
  },

  closeTab: (tabId) => set((s) => {
    const next = s.tabs.filter((t) => t.id !== tabId);
    if (next.length === 0) {
      const fallback: BrowserTab = { id: `tab-${Date.now()}`, icon: '\u{1F310}', label: 'New Tab', panelId: 'browser', url: null };
      return { tabs: [fallback], activeTabId: fallback.id, activePanel: 'browser', browserUrl: null };
    }
    if (s.activeTabId === tabId) {
      const last = next[next.length - 1];
      return { tabs: next, activeTabId: last.id, activePanel: last.panelId, browserUrl: last.url };
    }
    return { tabs: next };
  }),

  switchTab: (tabId) => set((s) => {
    const tab = s.tabs.find((t) => t.id === tabId);
    if (!tab) return {};
    return { activeTabId: tabId, activePanel: tab.panelId, browserUrl: tab.url };
  }),

  setPanel: (panel) => set((s) => {
    // Update current tab to reflect the new panel
    const updatedTabs = s.tabs.map((t) =>
      t.id === s.activeTabId
        ? { ...t, panelId: panel, url: panel === 'browser' ? s.browserUrl : null,
            icon: PANEL_ICONS[panel] || t.icon, label: PANEL_LABELS[panel] || t.label }
        : t,
    );
    return { activePanel: panel, tabs: updatedTabs };
  }),

  toggleInspector: () =>
    set((s) => ({ inspectorOpen: !s.inspectorOpen })),

  setInspectorFocus: (agentId) =>
    set({ inspectorFocusAgent: agentId, inspectorOpen: true }),

  openMiniChat: (agentId) => set({ miniChatAgent: agentId }),
  closeMiniChat: () => set({ miniChatAgent: null }),

  updateWanderer: (patch) =>
    set((s) => ({ wanderer: { ...s.wanderer, ...patch } })),

  navigate: (url) => {
    let full = url.trim();
    if (!full) return;
    if (!/^https?:\/\//i.test(full)) {
      if (/^[a-zA-Z0-9].*\.[a-zA-Z]{2,}/.test(full)) {
        full = 'https://' + full;
      } else {
        full = 'https://www.google.com/search?igu=1&q=' + encodeURIComponent(full);
      }
    }
    set((s) => {
      const newHistory = [...s.urlHistory.slice(0, s.urlHistoryIdx + 1), full];
      const newIdx = newHistory.length - 1;
      // Update current tab
      const updatedTabs = s.tabs.map((t) =>
        t.id === s.activeTabId
          ? { ...t, url: full, panelId: 'browser' as PanelId, label: (() => { try { return new URL(full).hostname; } catch { return full.slice(0, 20); } })(), icon: '\u{1F310}' }
          : t,
      );
      return {
        browserUrl: full, activePanel: 'browser',
        urlHistory: newHistory, urlHistoryIdx: newIdx,
        canGoBack: newIdx > 0, canGoForward: false,
        tabs: updatedTabs,
      };
    });
  },

  goHome: () => set((s) => {
    const updatedTabs = s.tabs.map((t) =>
      t.id === s.activeTabId
        ? { ...t, url: null, label: 'New Tab', icon: '\u{1F310}', panelId: 'browser' as PanelId }
        : t,
    );
    return { browserUrl: null, tabs: updatedTabs };
  }),

  goBack: () => set((s) => {
    if (s.urlHistoryIdx <= 0) return {};
    const newIdx = s.urlHistoryIdx - 1;
    const url = s.urlHistory[newIdx];
    return {
      browserUrl: url, urlHistoryIdx: newIdx,
      canGoBack: newIdx > 0, canGoForward: true,
    };
  }),

  goForward: () => set((s) => {
    if (s.urlHistoryIdx >= s.urlHistory.length - 1) return {};
    const newIdx = s.urlHistoryIdx + 1;
    const url = s.urlHistory[newIdx];
    return {
      browserUrl: url, urlHistoryIdx: newIdx,
      canGoBack: true, canGoForward: newIdx < s.urlHistory.length - 1,
    };
  }),

  dismissFirstRun: () => {
    localStorage.setItem('holobro_first_run_dismissed', '1');
    set({ firstRunDismissed: true });
  },
}));
