//! Best-effort `hc sandbox run` using the bundled `hc` sidecar (Standard/Full installs).
//! Requires `happ/holobro.happ` in app resources and matching Holochain major/minor for your DNA.

use serde::Serialize;
use std::path::{Path, PathBuf};
use std::sync::Arc;
use tauri::path::BaseDirectory;
use tauri::{AppHandle, Manager};
use tauri_plugin_shell::process::CommandChild;
use tauri_plugin_shell::process::CommandEvent;
use tauri_plugin_shell::ShellExt;
use tokio::sync::Mutex;

pub type BundledSandboxChild = Arc<Mutex<Option<CommandChild>>>;

pub fn bundled_sandbox_handle() -> BundledSandboxChild {
    Arc::new(Mutex::new(None))
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct BundledSandboxStartResult {
    pub ok: bool,
    pub message: String,
    pub work_dir: Option<String>,
}

fn ensure_sandbox_workdir(app: &AppHandle) -> Result<PathBuf, String> {
    let data = app.path().app_local_data_dir().map_err(|e| e.to_string())?;
    let work = data.join("holobro-hc-sandbox");
    std::fs::create_dir_all(&work).map_err(|e| e.to_string())?;

    let src = app
        .path()
        .resolve("happ/holobro.happ", BaseDirectory::Resource)
        .map_err(|e| {
            format!(
                "No bundled happ at resources/happ/holobro.happ ({e}). Build Standard/Full with workdir/holobro.happ present."
            )
        })?;
    if !src.is_file() {
        return Err(
            "resources/happ/holobro.happ missing. Run npm run pack:happ and rebuild the desktop bundle."
                .into(),
        );
    }

    let dst = work.join("holobro.happ");
    let need_copy = match (std::fs::metadata(&src), std::fs::metadata(&dst)) {
        (Ok(a), Ok(b)) => a.len() != b.len(),
        _ => true,
    };
    if need_copy {
        std::fs::copy(&src, &dst).map_err(|e| e.to_string())?;
    }

    Ok(work)
}

#[tauri::command]
pub async fn bundled_sandbox_start(
    app: AppHandle,
    child_state: tauri::State<'_, BundledSandboxChild>,
) -> Result<BundledSandboxStartResult, String> {
    let mut guard = child_state.lock().await;
    if guard.is_some() {
        return Ok(BundledSandboxStartResult {
            ok: false,
            message: "Bundled sandbox already running; use Stop first.".into(),
            work_dir: None,
        });
    }

    let work_dir = ensure_sandbox_workdir(&app)?;
    let (rx, child) = app
        .shell()
        .sidecar(Path::new(crate::holochain_sidecar::HC_SIDECAR))
        .map_err(|e| e.to_string())?
        .args(["sandbox", "run"])
        .current_dir(&work_dir)
        .spawn()
        .map_err(|e| e.to_string())?;

    tauri::async_runtime::spawn(async move {
        while let Some(event) = rx.recv().await {
            match event {
                CommandEvent::Stdout(line) => {
                    eprintln!("[hc sandbox] {}", String::from_utf8_lossy(&line));
                }
                CommandEvent::Stderr(line) => {
                    eprintln!("[hc sandbox] {}", String::from_utf8_lossy(&line));
                }
                CommandEvent::Terminated(p) => {
                    eprintln!("[hc sandbox] exited: {:?}", p.code);
                    break;
                }
                CommandEvent::Error(s) => {
                    eprintln!("[hc sandbox] error: {s}");
                    break;
                }
                _ => {}
            }
        }
    });

    *guard = Some(child);

    Ok(BundledSandboxStartResult {
        ok: true,
        message: "Started `hc sandbox run` in the work dir. Watch stderr above or Holochain output for the app WebSocket URL, then set it (and token) in Setup. Stop the sandbox before exiting or when switching conductors.".into(),
        work_dir: Some(work_dir.to_string_lossy().into_owned()),
    })
}

#[tauri::command]
pub async fn bundled_sandbox_stop(
    child_state: tauri::State<'_, BundledSandboxChild>,
) -> Result<(), String> {
    let mut g = child_state.lock().await;
    if let Some(c) = g.take() {
        c.kill().map_err(|e| e.to_string())?;
    }
    Ok(())
}

#[tauri::command]
pub async fn bundled_sandbox_running(
    child_state: tauri::State<'_, BundledSandboxChild>,
) -> Result<bool, String> {
    Ok(child_state.lock().await.is_some())
}
