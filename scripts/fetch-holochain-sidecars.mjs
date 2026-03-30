/**
 * Download holochain, lair-keystore, and hc into src-tauri/binaries/ with Tauri sidecar names.
 * Config: holochain-sidecars.manifest.json at repo root.
 *
 *   node scripts/fetch-holochain-sidecars.mjs
 */
import { createWriteStream, mkdirSync, chmodSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { pipeline } from "node:stream/promises";
import { fileURLToPath } from "node:url";
import { readFile } from "node:fs/promises";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const manifestPath = join(root, "holochain-sidecars.manifest.json");
const binDir = join(root, "src-tauri", "binaries");

function hostTriple() {
  const { arch, platform } = process;
  if (platform === "win32") {
    if (arch === "x64") return "x86_64-pc-windows-msvc";
    throw new Error(`Unsupported Windows arch: ${arch}`);
  }
  if (platform === "darwin") {
    if (arch === "arm64") return "aarch64-apple-darwin";
    if (arch === "x64") return "x86_64-apple-darwin";
    throw new Error(`Unsupported macOS arch: ${arch}`);
  }
  if (platform === "linux") {
    if (arch === "x64") return "x86_64-unknown-linux-gnu";
    throw new Error(`Unsupported Linux arch: ${arch}`);
  }
  throw new Error(`Unsupported platform: ${platform}`);
}

function mapTriple(manifest, triple) {
  return manifest.tripleAliases?.[triple] ?? triple;
}

function expandTemplate(tpl, manifest, tripleKey) {
  const v = manifest.versions;
  return tpl
    .replace(/\{holochain\}/g, v.holochain)
    .replace(/\{lairKeystore\}/g, v.lairKeystore)
    .replace(/\{hc\}/g, v.hc)
    .replace(/\{triple\}/g, tripleKey);
}

async function download(url, destPath) {
  const res = await fetch(url, { redirect: "follow" });
  if (!res.ok) {
    throw new Error(`GET ${url} → ${res.status} ${res.statusText}`);
  }
  await mkdirSync(dirname(destPath), { recursive: true });
  const out = createWriteStream(destPath);
  await pipeline(res.body, out);
}

async function main() {
  const raw = await readFile(manifestPath, "utf8");
  const manifest = JSON.parse(raw);
  const triple = hostTriple();
  const tripleKey = mapTriple(manifest, triple);
  const base = manifest.baseUrl.replace(/\/$/, "");
  const winExe = process.platform === "win32" ? ".exe" : "";

  mkdirSync(binDir, { recursive: true });

  const logical = ["holochain", "lair-keystore", "hc"];
  for (const name of logical) {
    const tpl = manifest.assetTemplates[name];
    if (!tpl) throw new Error(`Missing assetTemplates.${name}`);
    let remoteName = expandTemplate(tpl, manifest, tripleKey);
    if (process.platform === "win32" && !remoteName.endsWith(".exe")) {
      remoteName += ".exe";
    }
    const url = `${base}/${remoteName}`;
    const dest = join(binDir, `${name}-${triple}${winExe}`);
    console.log(`[holobro] ${name}: ${url}`);
    console.log(`           → ${dest}`);
    await download(url, dest);
    if (process.platform !== "win32") {
      try {
        chmodSync(dest, 0o755);
      } catch {
        /* ignore */
      }
    }
  }
  console.log("[holobro] Sidecars ready for Tauri externalBin (holochain, lair-keystore, hc).");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
