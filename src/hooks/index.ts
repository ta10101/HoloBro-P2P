// ============================================================
// HoloBro — Custom Hooks
// ============================================================

import { useCallback } from 'react';
import { useAgentStore } from '../store';
import { callAgent, getAgentApiKey } from '../lib/agentApi';
import type { Agent } from '../types';

const EMPTY_MESSAGES: import('../types').ChatMessage[] = [];

// ── useAgentChat ─────────────────────────────────────────────
// Makes REAL API calls to the agent's endpoint.
// Falls back to a "no API key" message if unconfigured.
export function useAgentChat(agentId: string) {
  const messages = useAgentStore((s) => s.chatMessages[agentId] ?? EMPTY_MESSAGES);

  const send = useCallback(
    async (content: string) => {
      if (!content.trim()) return;
      const { sendMessage, receiveMessage, appendLog, updateAgent, agents } =
        useAgentStore.getState();

      const agent = agents.find((a) => a.id === agentId);
      if (!agent) return;

      sendMessage(agentId, content);
      appendLog(agentId, 'info', `\u2192 chat: ${content.slice(0, 40)}`);

      // Check if agent has endpoint configured
      if (!agent.endpoint.trim()) {
        receiveMessage(
          agentId,
          '\u26A0\uFE0F No endpoint configured. Go to Agent Hub and set the API endpoint for this agent.',
        );
        appendLog(agentId, 'err', 'No endpoint configured');
        return;
      }

      // Check API key (except for local Ollama which doesn't need one)
      const apiKey = getAgentApiKey(agentId);
      const isLocal = agent.endpoint.includes('localhost') || agent.endpoint.includes('127.0.0.1');
      if (!apiKey && !isLocal) {
        receiveMessage(
          agentId,
          '\u{1F511} No API key set. Go to Agent Hub \u2192 click this agent \u2192 enter your API key. Your key is stored locally and never sent anywhere except the API endpoint.',
        );
        appendLog(agentId, 'err', 'Missing API key');
        return;
      }

      // Mark agent as running
      updateAgent(agentId, { status: 'running' });

      try {
        const currentMessages = useAgentStore.getState().chatMessages[agentId] ?? [];
        const start = performance.now();

        const reply = await callAgent(agent, currentMessages, content);

        const latencyMs = Math.round(performance.now() - start);
        receiveMessage(agentId, reply);
        updateAgent(agentId, {
          status: 'running',
          latencyMs,
          totalCalls: agent.totalCalls + 1,
        });
        appendLog(agentId, 'ok', `\u2713 response received (${latencyMs}ms)`);
      } catch (e) {
        const errMsg = e instanceof Error ? e.message : String(e);
        receiveMessage(agentId, `\u274C Error: ${errMsg}`);
        updateAgent(agentId, { status: 'error' });
        appendLog(agentId, 'err', `API error: ${errMsg.slice(0, 80)}`);
      }
    },
    [agentId],
  );

  return { messages, send };
}

// ── useHealthPing ────────────────────────────────────────────
// No-op — automatic pinging disabled. Users can manually ping
// via the agent card button or "Refresh All" in Agent Hub.
export function useHealthPing(_intervalMs = 30_000) {
  // intentionally empty
}

// ── useCookieCounter ─────────────────────────────────────────
export function useCookieCounter() {
  const cookies = useAgentStore((s) => s.cookies);
  const incrementCookies = useAgentStore((s) => s.incrementCookies);
  const bump = useCallback(() => {
    incrementCookies(Math.floor(Math.random() * 10) + 1);
  }, [incrementCookies]);
  return { cookies, bump };
}

// ── useAgentsByGroup ─────────────────────────────────────────
export function useAgentsByGroup() {
  const agents = useAgentStore((s) => s.agents);
  const groups = useAgentStore((s) => s.groups);
  const groupIds = new Set(groups.map((g) => g.id));
  const grouped = groups.map((group) => ({
    group,
    agents: agents.filter((a) => a.groupId === group.id),
  }));
  const unassigned = agents.filter((a) => !groupIds.has(a.groupId));
  return Object.assign(grouped, { unassigned });
}

// ── useUnassignedAgents ─────────────────────────────────────
export function useUnassignedAgents() {
  const agents = useAgentStore((s) => s.agents);
  const groups = useAgentStore((s) => s.groups);
  const groupIds = new Set(groups.map((g) => g.id));
  return agents.filter((a) => !groupIds.has(a.groupId));
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

// ── useAgentStatusColor ──────────────────────────────────────
export function useAgentStatusColor(agent: Agent) {
  const map: Record<Agent['status'], string> = {
    running: '#22c55e',
    idle:    '#facc15',
    error:   '#ef4444',
    offline: '#64748b',
  };
  return map[agent.status];
}
