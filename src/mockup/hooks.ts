// ============================================================
// HoloBro — Custom Hooks for Agent System
// ============================================================
import { useCallback, useEffect, useRef } from 'react';
import { useAgentStore } from './store';

// ── useAgentChat ─────────────────────────────────────────────
const MOCK_REPLIES: Record<string, string[]> = {
  claude:   ['Sure \u2014 let me think through that.', 'In the context of decentralized systems...', 'Great question. Here\'s my take:'],
  openclaw: ['Processing via GPT-4o...', 'Here\'s a quick breakdown:', 'That\'s an interesting P2P use case.'],
  gemini:   ['Multimodal analysis ready.', 'Gemini Pro here \u2014 let me reason through this.', 'Running inference...'],
  ollama:   ['Running locally \u2014 no data shared', 'llama3.2: interesting question!', 'Local inference complete.'],
};

export function useAgentChat(agentId: string) {
  const { sendMessage, receiveMessage, appendLog } = useAgentStore();
  const messages = useAgentStore((s) => s.chatMessages[agentId] ?? []);

  const send = useCallback(
    async (content: string) => {
      if (!content.trim()) return;
      sendMessage(agentId, content);
      appendLog(agentId, 'info', `\u2192 chat: ${content.slice(0, 40)}`);

      await new Promise((r) => setTimeout(r, 500 + Math.random() * 700));
      const pool = MOCK_REPLIES[agentId] ?? ['Got it.'];
      const reply = pool[Math.floor(Math.random() * pool.length)];
      receiveMessage(agentId, reply);
      appendLog(agentId, 'ok', '\u2713 response received');
    },
    [agentId, sendMessage, receiveMessage, appendLog],
  );

  return { messages, send };
}

// ── useHealthPing ────────────────────────────────────────────
export function useHealthPing(intervalMs = 30_000) {
  const { agents, updateAgent, appendLog } = useAgentStore();
  const agentsRef = useRef(agents);
  agentsRef.current = agents;

  useEffect(() => {
    const tick = () => {
      agentsRef.current.forEach((agent) => {
        if (agent.status === 'offline') return;
        const jitter = Math.round((Math.random() - 0.5) * 20);
        const newLatency = Math.max(5, agent.latencyMs + jitter);
        updateAgent(agent.id, { latencyMs: newLatency });
        appendLog(agent.id, 'ok', `\u2713 health check OK \u2014 ${newLatency}ms`);
      });
    };
    const id = setInterval(tick, intervalMs);
    return () => clearInterval(id);
  }, [intervalMs, updateAgent, appendLog]);
}

// ── useCookieCounter ─────────────────────────────────────────
export function useCookieCounter() {
  const { cookies, incrementCookies } = useAgentStore();
  const bump = useCallback(() => {
    incrementCookies(Math.floor(Math.random() * 10) + 1);
  }, [incrementCookies]);
  return { cookies, bump };
}

// ── useAgentsByGroup ─────────────────────────────────────────
export function useAgentsByGroup() {
  const agents = useAgentStore((s) => s.agents);
  const groups = useAgentStore((s) => s.groups);
  return groups.map((group) => ({
    group,
    agents: agents.filter((a) => a.groupId === group.id),
  }));
}

// ── useAgentTotals ───────────────────────────────────────────
export function useAgentTotals() {
  const agents = useAgentStore((s) => s.agents);
  return {
    running: agents.filter((a) => a.status === 'running').length,
    idle: agents.filter((a) => a.status === 'idle').length,
    error: agents.filter((a) => a.status === 'error').length,
    totalCalls: agents.reduce((acc, a) => acc + a.totalCalls, 0),
    totalCost: agents.reduce((acc, a) => acc + a.costToday, 0),
    count: agents.length,
  };
}
