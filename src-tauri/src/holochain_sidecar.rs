//! Bundled Holochain / Lair / `hc` sidecars (Standard/Full desktop builds with `externalBin` set).
//! Paths must match `tauri.bundle-holochain.conf.json` → `bundle.externalBin`.

use serde::Serialize;
use std::path::Path;
use tauri::AppHandle;
use tauri_plugin_shell::process::Output;
use tauri_plugin_shell::ShellExt;

pub const HOLOCHAIN_SIDECAR: &str = "binaries/holochain";
pub const LAIR_SIDECAR: &str = "binaries/lair-keystore";
pub const HC_SIDECAR: &str = "binaries/hc";

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct HolochainBundledRuntimeProbeResult {
    /// holochain + lair-keystore probes succeeded.
    pub sidecars_resolved: bool,
    /// holochain + lair-keystore + hc all succeeded — `hc sandbox run` can be attempted.
    pub sandbox_ready: bool,
    pub holochain_version_line: Option<String>,
    pub lair_keystore_version_line: Option<String>,
    pub hc_version_line: Option<String>,
    pub message: Option<String>,
}

fn merge_output(out: &Output) -> String {
    let stdout = String::from_utf8_lossy(&out.stdout).trim().to_string();
    let stderr = String::from_utf8_lossy(&out.stderr).trim().to_string();
    if !stdout.is_empty() {
        stdout
    } else {
        stderr
    }
}

async fn sidecar_version_line(app: &AppHandle, sidecar: &str, args: &[&str]) -> Result<String, String> {
    let cmd = app
        .shell()
        .sidecar(Path::new(sidecar))
        .map_err(|e| e.to_string())?;
    let out: Output = cmd.args(args).output().await.map_err(|e| e.to_string())?;
    let merged = merge_output(&out);
    if merged.is_empty() {
        return Err("empty output".into());
    }
    Ok(merged)
}

async fn probe_sidecar_version(app: &AppHandle, sidecar: &str) -> Result<String, String> {
    match sidecar_version_line(app, sidecar, &["--version"]).await {
        Ok(s) => Ok(s),
        Err(e1) => match sidecar_version_line(app, sidecar, &["-V"]).await {
            Ok(s) => Ok(s),
            Err(e2) => Err(format!("{e1}; {e2}")),
        },
    }
}

#[tauri::command]
pub async fn holochain_bundled_runtime_probe(app: AppHandle) -> HolochainBundledRuntimeProbeResult {
    let holo = probe_sidecar_version(&app, HOLOCHAIN_SIDECAR).await;
    let lair = probe_sidecar_version(&app, LAIR_SIDECAR).await;
    let hc_cli = probe_sidecar_version(&app, HC_SIDECAR).await;

    let sidecars_resolved = holo.is_ok() && lair.is_ok();
    let sandbox_ready = sidecars_resolved && hc_cli.is_ok();

    let holochain_version_line = holo.as_ref().ok().cloned();
    let lair_keystore_version_line = lair.as_ref().ok().cloned();
    let hc_version_line = hc_cli.as_ref().ok().cloned();

    let message = if sandbox_ready {
        None
    } else {
        let hb = match &holo {
            Ok(s) => format!("ok: {s}"),
            Err(e) => e.clone(),
        };
        let lb = match &lair {
            Ok(s) => format!("ok: {s}"),
            Err(e) => e.clone(),
        };
        let cb = match &hc_cli {
            Ok(s) => format!("ok: {s}"),
            Err(e) => e.clone(),
        };
        Some(format!(
            "holochain: {hb}; lair-keystore: {lb}; hc: {cb}. (Dev builds without `externalBin` fail here.)"
        ))
    };

    HolochainBundledRuntimeProbeResult {
        sidecars_resolved,
        sandbox_ready,
        holochain_version_line,
        lair_keystore_version_line,
        hc_version_line,
        message,
    }
}
