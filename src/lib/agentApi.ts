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
export type LlmProviderKind = 'anthropic' | 'gemini' | 'openai-compat';

export function detectLlmProvider(endpoint: string): LlmProviderKind {
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
  const provider = detectLlmProvider(agent.endpoint);

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
  const provider = detectLlmProvider(agent.endpoint);
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

// ── Live model catalog (provider List models APIs) ─────────────
function parseOpenAiCompatModelListJson(text: string): string[] {
  try {
    const j = JSON.parse(text) as { data?: { id?: string }[] };
    if (!Array.isArray(j.data)) return [];
    return j.data
      .map((x) => x.id)
      .filter((x): x is string => typeof x === 'string' && x.length > 0);
  } catch {
    return [];
  }
}

async function fetchOpenAiCompatModelIds(apiKey: string, baseUrl: string): Promise<string[]> {
  const headers: Record<string, string> = {};
  if (apiKey) headers['Authorization'] = `Bearer ${apiKey}`;
  const res = await proxyFetch(`${baseUrl}/models`, 'GET', headers);
  if (!res.ok) {
    throw new Error(`${res.status}: ${res.text.slice(0, 200)}`);
  }
  return parseOpenAiCompatModelListJson(res.text);
}

async function fetchAnthropicModelIds(apiKey: string, endpoint: string): Promise<string[]> {
  const base = buildBaseUrl(endpoint);
  const out: string[] = [];
  let after_id: string | undefined;
  for (let page = 0; page < 50; page++) {
    const url = new URL(`${base}/models`);
    url.searchParams.set('limit', '1000');
    if (after_id) url.searchParams.set('after_id', after_id);
    const res = await proxyFetch(url.toString(), 'GET', {
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
    });
    if (!res.ok) {
      throw new Error(`${res.status}: ${res.text.slice(0, 200)}`);
    }
    const j = JSON.parse(res.text) as {
      data?: { id: string }[];
      has_more?: boolean;
      last_id?: string;
    };
    for (const row of j.data ?? []) {
      if (row.id) out.push(row.id);
    }
    if (!j.has_more) break;
    after_id = j.last_id;
    if (!after_id) break;
  }
  return [...new Set(out)];
}

async function fetchGeminiModelIds(apiKey: string, endpoint: string): Promise<string[]> {
  const base = buildBaseUrl(endpoint);
  const out: string[] = [];
  let pageToken: string | undefined;
  for (let page = 0; page < 50; page++) {
    const url = new URL(`${base}/models`);
    url.searchParams.set('key', apiKey);
    if (pageToken) url.searchParams.set('pageToken', pageToken);
    const res = await proxyFetch(url.toString(), 'GET', {});
    if (!res.ok) {
      throw new Error(`${res.status}: ${res.text.slice(0, 200)}`);
    }
    const j = JSON.parse(res.text) as {
      models?: { name?: string; supportedGenerationMethods?: string[] }[];
      nextPageToken?: string;
    };
    for (const m of j.models ?? []) {
      const name = m.name;
      if (!name?.startsWith('models/')) continue;
      const id = name.slice('models/'.length);
      const methods = m.supportedGenerationMethods;
      if (methods?.length && !methods.includes('generateContent')) continue;
      out.push(id);
    }
    pageToken = j.nextPageToken;
    if (!pageToken) break;
  }
  return [...new Set(out)];
}

export type RemoteModelListResult =
  | { ok: true; models: string[] }
  | { ok: false; error: string };

/**
 * Load current model IDs from the vendor’s **List models** HTTP API for this endpoint.
 * Requires API key for cloud providers; local OpenAI-compat (Ollama, etc.) works without a key.
 * In-browser web builds, cloud calls may hit CORS — use the Tauri desktop app.
 */
export async function fetchRemoteModelList(
  endpoint: string,
  apiKey: string,
): Promise<RemoteModelListResult> {
  const ep = endpoint.trim();
  if (!ep) return { ok: false, error: 'Missing API endpoint' };
  const baseUrl = buildBaseUrl(ep);
  const provider = detectLlmProvider(ep);
  const isLocal =
    baseUrl.includes('localhost') ||
    baseUrl.includes('127.0.0.1') ||
    baseUrl.includes('0.0.0.0');

  try {
    if (provider === 'anthropic') {
      const key = apiKey.trim();
      if (!key) return { ok: false, error: 'Add your Anthropic API key to fetch the live model list.' };
      const models = await fetchAnthropicModelIds(key, ep);
      return { ok: true, models };
    }
    if (provider === 'gemini') {
      const key = apiKey.trim();
      if (!key) return { ok: false, error: 'Add your Gemini API key to fetch the live model list.' };
      const models = await fetchGeminiModelIds(key, ep);
      return { ok: true, models };
    }
    if (!isLocal && !apiKey.trim()) {
      return { ok: false, error: 'Add an API key (or use a local OpenAI-compat URL) to list models.' };
    }
    const models = await fetchOpenAiCompatModelIds(apiKey.trim(), baseUrl);
    return { ok: true, models };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (!isLocal && !isTauri() && (msg === 'Failed to fetch' || msg.includes('NetworkError'))) {
      return {
        ok: false,
        error: 'Network/CORS blocked — cloud list-models needs the HoloBro desktop app or a local endpoint.',
      };
    }
    return { ok: false, error: msg };
  }
}
