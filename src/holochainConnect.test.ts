import { describe, it, expect, vi, afterEach } from 'vitest';
import { hasEffectiveHoloConfig, normalizeAppWebsocketUrl } from './holochainConnect';

function createLs(initial: Record<string, string>) {
  const store = { ...initial };
  return {
    getItem: (k: string) => store[k] ?? null,
    setItem: (k: string, v: string) => {
      store[k] = v;
    },
    removeItem: (k: string) => {
      delete store[k];
    },
    clear: () => {
      Object.keys(store).forEach((k) => {
        delete store[k];
      });
    },
    key: (i: number) => Object.keys(store)[i] ?? null,
    get length() {
      return Object.keys(store).length;
    },
  };
}

describe('normalizeAppWebsocketUrl', () => {
  it('maps localhost to 127.0.0.1', () => {
    expect(normalizeAppWebsocketUrl('ws://localhost:8888/')).toContain('127.0.0.1');
  });
});

describe('hasEffectiveHoloConfig', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  it('true when localStorage has ws and token', () => {
    vi.stubGlobal(
      'localStorage',
      createLs({
        'holobro-hc-ws': 'ws://127.0.0.1:8888',
        'holobro-hc-token': 'test-token',
      }),
    );
    expect(hasEffectiveHoloConfig()).toBe(true);
  });

  it('false when neither localStorage nor env provides both ws and token', () => {
    vi.stubGlobal('localStorage', createLs({}));
    vi.stubEnv('VITE_HC_APP_WS', '');
    vi.stubEnv('VITE_HC_APP_TOKEN', '');
    expect(hasEffectiveHoloConfig()).toBe(false);
  });
});
