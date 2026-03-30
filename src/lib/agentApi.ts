// ============================================================
// HoloBro — Real Agent API Calls
// ============================================================
// Supports: OpenAI-compatible (OpenAI, Mistral, Ollama, etc.),
// Anthropic (Claude), and Google (Gemini)
// ============================================================

import type { Agent, ChatMessage } from '../types';
import { safeInvoke, isTauri } from './tauri';

// ── API key storage (localStorage for browser, Tauri keyring for desktop) ──
const LS_AGENT_KEYS = 'holobro_agent_keys';

export function saveAgentApiKey(agentId: string, key: string): void {
  const keys = JSON.parse(localStorage.getItem(LS_AGENT_KEYS) || '{}');
  keys[agentId] = key;
  localStorage.setItem(LS_AGENT_KEYS, JSON.stringify(keys));
}

export function getAgentApiKey(agentId: string): string {
  const keys = JSON.parse(localStorage.getItem(LS_AGENT_KEYS) || '{}');
  return keys[agentId] || '';
}

export function removeAgentApiKey(agentId: string): void {
  const keys = JSON.parse(localStorage.getItem(LS_AGENT_KEYS) || '{}');
  delete keys[agentId];
  localStorage.setItem(LS_AGENT_KEYS, JSON.stringify(keys));
}

// ── Detect API provider from endpoint ──────────────────────────
type Provider = 'anthropic' | 'gemini' | 'openai-compat';

function detectProvider(endpoint: string): Provider {
  const ep = endpoint.toLowerCase();
  if (ep.includes('anthropic')) return 'anthropic';
  if (ep.includes('googleapis') || ep.includes('gemini')) return 'gemini';
  return 'openai-compat'; // OpenAI, Ollama, Mistral, any OpenAI-compatible
}

function buildBaseUrl(endpoint: string): string {
  let ep = endpoint.trim();
  // Remove trailing slash
  ep = ep.replace(/\/+$/, '');
  // Add https:// if no protocol (except localhost)
  if (!/^https?:\/\//i.test(ep)) {
    if (ep.startsWith('localhost') || ep.startsWith('127.0.0.1') || ep.startsWith('0.0.0.0')) {
      ep = 'http://' + ep;
    } else {
      ep = 'https://' + ep;
    }
  }
  return ep;
}

// ── Convert chat history to API format ─────────────────────────
interface ApiMessage {
  role: 'user' | 'assistant';
  content: string;
}

function toApiMessages(history: ChatMessage[], newUserMsg: string): ApiMessage[] {
  const msgs: ApiMessage[] = history.map((m) => ({
    role: m.role,
    content: m.content,
  }));
  msgs.push({ role: 'user', content: newUserMsg });
  // Keep last 20 messages to avoid token limits
  return msgs.slice(-20);
}

// ── Proxy fetch through Tauri to bypass CORS ─────────────────
// Browser fetch to external APIs (OpenAI, Google) is blocked by CORS.
// When running in Tauri, we route through the Rust backend.
type ProxyResult = { status: number; body: string }

async function proxyFetch(
  url: string,
  method: string,
  headers: Record<string, string>,
  body?: string,
): Promise<{ ok: boolean; status: number; text: string }> {
  const hasBody = method !== 'GET' && method !== 'HEAD' && body;

  if (isTauri()) {
    try {
      const r = await safeInvoke<ProxyResult>('http_proxy_fetch', {
        req: { url, method, headers, body: hasBody ? body : undefined },
      })
      if (r) {
        return { ok: r.status >= 200 && r.status < 300, status: r.status, text: r.body }
      }
    } catch {
      // Fall through to direct fetch
    }
  }

  // Direct browser fetch (works for localhost/Ollama, blocked by CORS for cloud APIs)
  const res = await fetch(url, { method, headers, ...(hasBody ? { body } : {}) })
  const text = await res.text()
  return { ok: res.ok, status: res.status, text }
}

// ── OpenAI-compatible API (OpenAI, Ollama, Mistral, etc.) ──────
async function callOpenAICompat(
  baseUrl: string,
  model: string,
  apiKey: string,
  messages: ApiMessage[],
): Promise<string> {
  const url = `${baseUrl}/chat/completions`;
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (apiKey) {
    headers['Authorization'] = `Bearer ${apiKey}`;
  }

  const bodyStr = JSON.stringify({
    model,
    messages,
    max_tokens: 1024,
    temperature: 0.7,
  })

  try {
    const res = await proxyFetch(url, 'POST', headers, bodyStr)

    if (!res.ok) {
      throw new Error(`${res.status}: ${res.text.slice(0, 200)}`);
    }

    const data = JSON.parse(res.text);
    return data.choices?.[0]?.message?.content || '(empty response)';
  } catch (e) {
    if (e instanceof TypeError && (e.message === 'Failed to fetch' || e.message.includes('NetworkError'))) {
      const isCloud = !baseUrl.includes('localhost') && !baseUrl.includes('127.0.0.1')
      if (isCloud && !isTauri()) {
        throw new Error(
          'CORS blocked — cloud APIs (OpenAI, Google) cannot be called directly from the browser. ' +
          'Launch the desktop app with "cargo tauri dev" to route API calls through the Tauri backend, ' +
          'or use a local model (Ollama) which doesn\'t have CORS restrictions.'
        )
      }
    }
    throw e
  }
}

// ── Anthropic Messages API (Claude) ────────────────────────────
async function callAnthropic(
  baseUrl: string,
  model: string,
  apiKey: string,
  messages: ApiMessage[],
): Promise<string> {
  const url = `${baseUrl}/messages`;
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'x-api-key': apiKey,
    'anthropic-version': '2023-06-01',
    'anthropic-dangerous-direct-browser-access': 'true',
  }
  const bodyStr = JSON.stringify({ model, messages, max_tokens: 1024 })

  try {
    const res = await proxyFetch(url, 'POST', headers, bodyStr)

    if (!res.ok) {
      throw new Error(`${res.status}: ${res.text.slice(0, 200)}`);
    }

    const data = JSON.parse(res.text);
    return data.content?.[0]?.text || '(empty response)';
  } catch (e) {
    if (e instanceof TypeError && e.message === 'Failed to fetch' && !isTauri()) {
      throw new Error(
        'CORS blocked — launch the desktop app with "cargo tauri dev" to call cloud APIs, ' +
        'or use a local model (Ollama).'
      )
    }
    throw e
  }
}

// ── Google Gemini API ──────────────────────────────────────────
async function callGemini(
  baseUrl: string,
  model: string,
  apiKey: string,
  messages: ApiMessage[],
): Promise<string> {
  const url = `${baseUrl}/models/${model}:generateContent?key=${apiKey}`;
  const contents = messages.map((m) => ({
    role: m.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: m.content }],
  }));
  const bodyStr = JSON.stringify({ contents })

  try {
    const res = await proxyFetch(url, 'POST', { 'Content-Type': 'application/json' }, bodyStr)

    if (!res.ok) {
      throw new Error(`${res.status}: ${res.text.slice(0, 200)}`);
    }

    const data = JSON.parse(res.text);
    return data.candidates?.[0]?.content?.parts?.[0]?.text || '(empty response)';
  } catch (e) {
    if (e instanceof TypeError && e.message === 'Failed to fetch' && !isTauri()) {
      throw new Error(
        'CORS blocked — launch the desktop app with "cargo tauri dev" to call cloud APIs, ' +
        'or use a local model (Ollama).'
      )
    }
    throw e
  }
}

// ── Main entry point ──────────────────────────────────────────
export async function callAgent(
  agent: Agent,
  history: ChatMessage[],
  userMessage: string,
): Promise<string> {
  const apiKey = getAgentApiKey(agent.id);
  const baseUrl = buildBaseUrl(agent.endpoint);
  const messages = toApiMessages(history, userMessage);
  const provider = detectProvider(agent.endpoint);

  switch (provider) {
    case 'anthropic':
      return callAnthropic(baseUrl, agent.model, apiKey, messages);
    case 'gemini':
      return callGemini(baseUrl, agent.model, apiKey, messages);
    case 'openai-compat':
    default:
      return callOpenAICompat(baseUrl, agent.model, apiKey, messages);
  }
}

// ── Health check — quick test if agent is reachable ────────────
export async function pingAgent(agent: Agent): Promise<{ ok: boolean; latencyMs: number; error?: string }> {
  const apiKey = getAgentApiKey(agent.id);
  const baseUrl = buildBaseUrl(agent.endpoint);
  const provider = detectProvider(agent.endpoint);
  const isCloud = !baseUrl.includes('localhost') && !baseUrl.includes('127.0.0.1')
  const start = performance.now();

  try {
    let url: string;
    const headers: Record<string, string> = {};
    let method = 'GET'
    let body: string | undefined

    if (provider === 'openai-compat') {
      url = `${baseUrl}/models`;
      if (apiKey) headers['Authorization'] = `Bearer ${apiKey}`;
    } else if (provider === 'anthropic') {
      url = `${baseUrl}/messages`;
      headers['x-api-key'] = apiKey;
      headers['anthropic-version'] = '2023-06-01';
      headers['anthropic-dangerous-direct-browser-access'] = 'true';
      headers['Content-Type'] = 'application/json';
      method = 'POST'
      body = JSON.stringify({ model: agent.model, messages: [{ role: 'user', content: 'ping' }], max_tokens: 1 })
    } else {
      url = `${baseUrl}/models?key=${apiKey}`;
    }

    const res = await proxyFetch(url, method, headers, body)
    const latencyMs = Math.round(performance.now() - start);

    if (res.ok || (provider === 'anthropic' && res.status < 500)) {
      return { ok: true, latencyMs };
    }
    return { ok: false, latencyMs, error: `HTTP ${res.status}` };
  } catch (e) {
    const latencyMs = Math.round(performance.now() - start);
    const msg = e instanceof Error ? e.message : String(e)

    // Give clear CORS message in browser mode
    if (isCloud && !isTauri() && (msg === 'Failed to fetch' || msg.includes('NetworkError'))) {
      return { ok: false, latencyMs, error: 'CORS blocked in browser — use Tauri desktop or local models' }
    }

    return { ok: false, latencyMs, error: msg };
  }
}
