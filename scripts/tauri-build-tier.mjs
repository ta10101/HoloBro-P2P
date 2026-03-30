/**
 * Desktop build wrapper:
 * - Merges `tauri.bundle-happ.conf.json` for Standard/Full when `workdir/holobro.happ` exists.
 * - Merges `tauri.bundle-holochain.conf.json` for Standard/Full when sidecar files exist under
 *   `src-tauri/binaries/` (see README there).
 * Lightweight never merges these (smallest bundle).
 */
import { execSync } from "node:child_process";
import { existsSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const binDir = join(root, "src-tauri", "binaries");
const happPath = join(root, "workdir", "holobro.happ");

function hasHolochainSidecarFiles() {
  if (!existsSync(binDir)) return false;
  const files = readdirSync(binDir);
  const isCandidate = (f) =>
    f !== "README.md" && !f.endsWith(".md") && !f.startsWith(".");
  const hasHolochain = files.some(
    (f) => isCandidate(f) && f.startsWith("holochain-"),
  );
  const hasLair = files.some(
    (f) => isCandidate(f) && f.startsWith("lair-keystore-"),
  );
  const hasHc = files.some((f) => isCandidate(f) && f.startsWith("hc-"));
  return hasHolochain && hasLair && hasHc;
}

const tier =
  process.env.VITE_HOLOBRO_TIER ?? process.env.HOLOBRO_TIER ?? "development";
const wantsBundles = tier === "standard" || tier === "full";
const useHolochainMerge = wantsBundles && hasHolochainSidecarFiles();
const useHappMerge = wantsBundles && existsSync(happPath);

if (wantsBundles && !hasHolochainSidecarFiles()) {
  console.warn(
    "[holobro] Standard/Full tier: need holochain-*, lair-keystore-*, and hc-* under src-tauri/binaries/ — building without bundled sidecars. Run: npm run fetch:sidecars. See src-tauri/binaries/README.md",
  );
}

if (wantsBundles && !existsSync(happPath)) {
  console.warn(
    "[holobro] Standard/Full tier: workdir/holobro.happ not found — skipping bundled hApp resource. Run `npm run pack:happ` (WSL) after building zomes/DNA.",
  );
}

const parts = ["npx", "tauri", "build"];
if (useHappMerge) {
  parts.push("-c", "src-tauri/tauri.bundle-happ.conf.json");
}
if (useHolochainMerge) {
  parts.push("-c", "src-tauri/tauri.bundle-holochain.conf.json");
}

execSync(parts.join(" "), {
  cwd: root,
  stdio: "inherit",
  env: process.env,
  shell: true,
});
