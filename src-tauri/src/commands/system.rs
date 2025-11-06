use crate::error::{KopiaError, Result};
use serde::{Deserialize, Serialize};
use tauri::AppHandle;

#[derive(Debug, Serialize, Deserialize)]
pub struct SystemInfo {
    pub os: String,
    pub arch: String,
    pub version: String,
}

/// Get system information
#[tauri::command]
pub async fn get_system_info() -> Result<SystemInfo> {
    Ok(SystemInfo {
        os: std::env::consts::OS.to_string(),
        arch: std::env::consts::ARCH.to_string(),
        version: env!("CARGO_PKG_VERSION").to_string(),
    })
}

/// Get current username and hostname
#[tauri::command]
pub async fn get_current_user() -> Result<(String, String)> {
    let username = std::env::var("USER")
        .or_else(|_| std::env::var("USERNAME"))
        .unwrap_or_else(|_| "unknown".into());

    let hostname = hostname::get()
        .map_err(|e| KopiaError::EnvironmentError {
            message: format!("Failed to get hostname: {}", e),
        })?
        .to_string_lossy()
        .into_owned();

    Ok((username, hostname))
}

/// Open folder picker dialog
#[tauri::command]
pub async fn select_folder(
    app: AppHandle,
    default_path: Option<String>,
) -> Result<Option<String>> {
    use tauri_plugin_dialog::DialogExt;

    let dialog = configure_dialog(app.dialog().file(), default_path);
    Ok(dialog.blocking_pick_folder().map(|path| path.to_string()))
}

/// Open file picker dialog
#[tauri::command]
pub async fn select_file(
    app: AppHandle,
    default_path: Option<String>,
) -> Result<Option<String>> {
    use tauri_plugin_dialog::DialogExt;

    let dialog = configure_dialog(app.dialog().file(), default_path);
    Ok(dialog.blocking_pick_file().map(|path| path.to_string()))
}

/// Configure dialog with optional default path
fn configure_dialog<R: tauri::Runtime>(
    mut dialog: tauri_plugin_dialog::FileDialogBuilder<R>,
    default_path: Option<String>,
) -> tauri_plugin_dialog::FileDialogBuilder<R> {
    if let Some(path) = default_path {
        dialog = dialog.set_directory(path);
    }
    dialog
}
