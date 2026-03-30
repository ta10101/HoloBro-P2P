export type HolobroReleaseTier = 'development' | 'lightweight' | 'standard' | 'full';

const VALID = new Set<HolobroReleaseTier>(['development', 'lightweight', 'standard', 'full']);

/** For tests and tooling; production UI uses `holobroReleaseTier()`. */
export function parseHolobroReleaseTier(raw: string | undefined | null): HolobroReleaseTier {
  const t = raw?.trim().toLowerCase();
  if (t && VALID.has(t as HolobroReleaseTier)) return t as HolobroReleaseTier;
  return 'development';
}

/** Baked at Vite build time via `VITE_HOLOBRO_TIER`. Invalid or missing → `development`. */
export function holobroReleaseTier(): HolobroReleaseTier {
  return parseHolobroReleaseTier(import.meta.env.VITE_HOLOBRO_TIER as string | undefined);
}

export function isDevelopmentTier(): boolean {
  return holobroReleaseTier() === 'development';
}

/** Standard/Full retail builds are intended to ship Holochain + Lair sidecars and (optionally) the packed hApp. */
export function tierBundlesHolochainArtifacts(): boolean {
  const t = holobroReleaseTier();
  return t === 'standard' || t === 'full';
}

export function releaseTierLabel(): string {
  const labels: Record<HolobroReleaseTier, string> = {
    development: 'Development',
    lightweight: 'Lightweight',
    standard: 'Standard',
    full: 'Full',
  };
  return labels[holobroReleaseTier()];
}

/** Short badge for the shell header. */
export function releaseTierAbbrev(): string {
  const abbrevs: Record<HolobroReleaseTier, string> = {
    development: 'DEV',
    lightweight: 'LITE',
    standard: 'STD',
    full: 'FULL',
  };
  return abbrevs[holobroReleaseTier()];
}
