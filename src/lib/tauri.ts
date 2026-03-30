// ============================================================
// HoloBro — Safe Tauri invoke wrapper
// ============================================================
// In browser dev mode, window.__TAURI__ doesn't exist and the
// static `import { invoke } from '@tauri-apps/api/core'` would
// crash with "Cannot read properties of undefined".
//
// This module lazily loads `invoke` only when running inside Tauri,
// and silently returns undefined when called from a plain browser.
// ============================================================

let _invoke: ((cmd: string, args?: Record<string, unknown>) => Promise<unknown>) | null = null;
let _checked = false;

/**
 * Returns `true` when running inside a Tauri webview.
 */
export function isTauri(): boolean {
  return !!(window as any).__TAURI__;
}

/**
 * Safe wrapper around Tauri's `invoke()`.
 * - In browser dev mode → returns `undefined` immediately.
 * - In Tauri → lazily imports and calls `invoke`.
 */
export async function safeInvoke<T = unknown>(
  cmd: string,
  args?: Record<string, unknown>,
): Promise<T> {
  try {
    if (!_checked) {
      _checked = true;
      if (!isTauri()) return undefined as T;
      const mod = await import('@tauri-apps/api/core');
      _invoke = mod.invoke as any;
    }
    if (!_invoke) return undefined as T;
    return (await _invoke(cmd, args)) as T;
  } catch {
    /* not in Tauri env or command not found */
  }
  return undefined as T;
}

/**
 * Safe wrapper for @tauri-apps/plugin-opener openUrl.
 * Falls back to window.open in browser dev mode.
 */
export async function safeOpenUrl(url: string): Promise<void> {
  if (!isTauri()) {
    window.open(url, '_blank');
    return;
  }
  try {
    const mod = await import('@tauri-apps/plugin-opener');
    await mod.openUrl(url);
  } catch {
    window.open(url, '_blank');
  }
}
