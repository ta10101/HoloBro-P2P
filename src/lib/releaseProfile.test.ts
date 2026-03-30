import { describe, it, expect, vi, afterEach } from 'vitest';
import { parseHolobroReleaseTier, tierBundlesHolochainArtifacts } from './releaseProfile';

describe('parseHolobroReleaseTier', () => {
  it('defaults to development when empty or unknown', () => {
    expect(parseHolobroReleaseTier(undefined)).toBe('development');
    expect(parseHolobroReleaseTier('')).toBe('development');
    expect(parseHolobroReleaseTier('  ')).toBe('development');
    expect(parseHolobroReleaseTier('nope')).toBe('development');
  });

  it('accepts all tiers case-insensitively', () => {
    expect(parseHolobroReleaseTier('STANDARD')).toBe('standard');
    expect(parseHolobroReleaseTier(' LightWeight ')).toBe('lightweight');
    expect(parseHolobroReleaseTier('full')).toBe('full');
    expect(parseHolobroReleaseTier('Development')).toBe('development');
  });
});

describe('tierBundlesHolochainArtifacts', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('is true only for standard and full', () => {
    vi.stubEnv('VITE_HOLOBRO_TIER', 'standard');
    expect(tierBundlesHolochainArtifacts()).toBe(true);
    vi.stubEnv('VITE_HOLOBRO_TIER', 'full');
    expect(tierBundlesHolochainArtifacts()).toBe(true);
    vi.stubEnv('VITE_HOLOBRO_TIER', 'lightweight');
    expect(tierBundlesHolochainArtifacts()).toBe(false);
    vi.stubEnv('VITE_HOLOBRO_TIER', 'development');
    expect(tierBundlesHolochainArtifacts()).toBe(false);
  });
});
