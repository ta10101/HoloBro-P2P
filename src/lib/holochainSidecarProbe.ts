import { safeInvoke } from './tauri';

export type HolochainBundledRuntimeProbeResult = {
  sidecarsResolved: boolean;
  /** holochain + lair + hc sidecars all runnable (for `hc sandbox run`). */
  sandboxReady: boolean;
  holochainVersionLine?: string | null;
  lairKeystoreVersionLine?: string | null;
  hcVersionLine?: string | null;
  message?: string | null;
};

/** Desktop only; undefined in browser dev or if the command is missing. */
export async function fetchHolochainBundledRuntimeProbe(): Promise<
  HolochainBundledRuntimeProbeResult | undefined
> {
  return safeInvoke<HolochainBundledRuntimeProbeResult>('holochain_bundled_runtime_probe');
}

export type BundledSandboxStartResult = {
  ok: boolean;
  message: string;
  workDir?: string | null;
};

export async function invokeBundledSandboxStart(): Promise<BundledSandboxStartResult | undefined> {
  return safeInvoke<BundledSandboxStartResult>('bundled_sandbox_start');
}

export async function invokeBundledSandboxStop(): Promise<void> {
  await safeInvoke('bundled_sandbox_stop');
}

export async function invokeBundledSandboxRunning(): Promise<boolean | undefined> {
  return safeInvoke<boolean>('bundled_sandbox_running');
}
