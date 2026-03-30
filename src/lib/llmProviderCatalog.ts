// ============================================================
// HoloBro — LLM provider presets (Agent Hub + Assistant)
// ============================================================
// Model ids are the strings provider APIs expect. Prefer refreshing at runtime via
// `fetchRemoteModelList()` in `agentApi.ts` (vendor List-models APIs). Static
// fallbacks live here; permalinks + API spec links live in `modelCatalogSources.ts`.
//
// Offline maintenance — vendor guides:
// - Anthropic: https://docs.anthropic.com/en/docs/about-claude/models
// - OpenAI: https://platform.openai.com/docs/models
// - Gemini: https://ai.google.dev/gemini-api/docs/models
// - Mistral: https://docs.mistral.ai/getting-started/models/models_overview/
// - Ollama: https://ollama.com/library · OpenAI-compat: https://github.com/ollama/ollama/blob/main/docs/openai.md

import type { AgentTemplate } from '../types';

/** Assistant panel: raw server base (Rust adds /api/chat or /v1 paths). */
export const ASSISTANT_BASE_URL_PRESETS: readonly { label: string; value: string }[] = [
  { label: 'Ollama default', value: 'http://127.0.0.1:11434' },
  { label: 'LM Studio (typical)', value: 'http://127.0.0.1:1234' },
];

/**
 * Ollama exposes an OpenAI-compatible surface at host:11434/v1/*
 * (Agent Hub / agentApi). Same host as Assistant’s base URL above.
 */
export const OLLAMA_OPENAI_COMPAT_ENDPOINT = '127.0.0.1:11434/v1';

/** Build AgentTemplate rows — single source of truth for endpoint ↔ model lists. */
export const LLM_AGENT_PROVIDER_PRESETS: Omit<AgentTemplate, 'accentColor' | 'accentGradient' | 'avatarBg'>[] = [
  // Claude — model param: Anthropic Messages API
  {
    label: 'Claude',
    emoji: '\u{1F9E0}',
    endpoint: 'api.anthropic.com/v1',
    model: 'claude-sonnet-4-20250514',
    models: [
      'claude-sonnet-4-20250514',
      'claude-opus-4-20250514',
      'claude-3-5-sonnet-20241022',
      'claude-3-5-haiku-20241022',
    ],
  },
  // OpenAI — chat/completions `model` field
  {
    label: 'OpenAI',
    emoji: '\u{1F9BE}',
    endpoint: 'api.openai.com/v1',
    model: 'gpt-4o',
    models: [
      'gpt-4o',
      'gpt-4o-mini',
      'gpt-4-turbo',
      'gpt-4',
      'gpt-3.5-turbo',
      'o1',
      'o1-mini',
      'o3-mini',
    ],
  },
  {
    label: 'Gemini',
    emoji: '\u{1F48E}',
    endpoint: 'generativelanguage.googleapis.com/v1',
    model: 'gemini-2.0-flash',
    models: ['gemini-2.0-flash', 'gemini-2.5-flash', 'gemini-2.5-pro', 'gemini-1.5-pro', 'gemini-1.5-flash'],
  },
  // Mistral — chat `model` id (often `*-latest` aliases)
  {
    label: 'Mistral',
    emoji: '\u26A1',
    endpoint: 'api.mistral.ai/v1',
    model: 'mistral-large-latest',
    models: [
      'mistral-large-latest',
      'mistral-medium-latest',
      'mistral-small-latest',
      'open-mixtral-8x22b',
      'codestral-latest',
    ],
  },
  // Ollama — OpenAI-compat /v1/chat/completions; names match `ollama list` / library tags
  {
    label: 'Ollama',
    emoji: '\u{1F5A5}\uFE0F',
    endpoint: OLLAMA_OPENAI_COMPAT_ENDPOINT,
    model: 'llama3.2',
    models: [
      'llama3.2',
      'llama3.1',
      'llama3',
      'mistral',
      'mixtral',
      'codellama',
      'phi3',
      'qwen2.5',
      'gemma2',
      'deepseek-r1',
    ],
  },
  {
    label: 'Custom',
    emoji: '\u{1F52E}',
    endpoint: '',
    model: '',
    models: [],
  },
];
