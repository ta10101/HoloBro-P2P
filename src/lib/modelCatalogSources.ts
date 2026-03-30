// ============================================================
// HoloBro — Where model lists “live” (docs + list-models APIs)
// ============================================================
// Human-readable pages change copy; API reference URLs below are the
// stable entry points vendors maintain. Live IDs always come from each
// provider’s authenticated **List models** HTTP API (see `fetchRemoteModelList`
// in `agentApi.ts`) — there is no single public JSON file for all vendors.

/** Curated model guides (updated by vendors; use for manual checks). */
export const MODEL_DOCS_PERMALINKS = {
  anthropic: 'https://docs.anthropic.com/en/docs/about-claude/models',
  openai: 'https://platform.openai.com/docs/models',
  gemini: 'https://ai.google.dev/gemini-api/docs/models',
  mistral: 'https://docs.mistral.ai/getting-started/models/models_overview/',
  ollamaLibrary: 'https://ollama.com/library',
  ollamaOpenaiCompat: 'https://github.com/ollama/ollama/blob/main/docs/openai.md',
} as const;

/**
 * Official API reference for the **List models** call (stable permalinks).
 * HoloBro uses these patterns at runtime; see `fetchRemoteModelList`.
 */
export const MODEL_LIST_API_DOCS = {
  anthropic: 'https://docs.anthropic.com/en/api/models-list',
  openai: 'https://platform.openai.com/docs/api-reference/models/list',
  gemini: 'https://ai.google.dev/api/models',
  mistral: 'https://docs.mistral.ai/api/#operation/listModels',
} as const;
