//! System utility command handlers for Tauri
//!
//! Provides system-level utility commands for file/folder selection, system information,
//! and user detection.

use super::lock_server;
use crate::error::{HttpResultExt, KopiaError, Result};
use crate::kopia_server::KopiaServerState;
use serde::{Deserialize, Serialize};
use tauri::{AppHandle, State};

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

/// Get current username and hostname from Kopia server
///
/// When the Kopia server is running, this queries the `/api/v1/current-user` endpoint
/// to get the username and hostname that Kopia will use for snapshots. This ensures
/// consistency with how Kopia identifies the user.
///
/// Falls back to OS-level detection if the server is not running.
#[tauri::command]
pub async fn get_current_user(server: State<'_, KopiaServerState>) -> Result<(String, String)> {
    // Try to get from Kopia server first
    let server_result = {
        let mut server_guard = lock_server!(server);
        let status = server_guard.status();

        if status.running {
            if let (Some(server_url), Some(client)) =
                (status.server_url, server_guard.get_http_client())
            {
                Some((server_url, client))
            } else {
                None
            }
        } else {
            None
        }
    };

    if let Some((server_url, client)) = server_result {
        #[derive(Deserialize)]
        struct CurrentUserResponse {
            username: String,
            hostname: String,
        }

        let response = client
            .get(format!("{}/api/v1/current-user", server_url))
            .send()
            .await
            .map_http_error("Failed to get current user")?;

        if response.status().is_success() {
            let user_info: CurrentUserResponse = response
                .json()
                .await
                .map_http_error("Failed to parse current user response")?;

            return Ok((user_info.username, user_info.hostname));
        }
        // If request failed, fall through to OS-level detection
        log::warn!("Failed to get current user from Kopia server, falling back to OS detection");
    }

    // Fallback to OS-level detection when server is not running
    get_current_user_from_os()
}

/// Get current username and hostname from OS (fallback)
pub fn get_current_user_from_os() -> Result<(String, String)> {
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
pub async fn select_folder(app: AppHandle, default_path: Option<String>) -> Result<Option<String>> {
    use tauri_plugin_dialog::DialogExt;

    let dialog = configure_dialog(app.dialog().file(), default_path);
    Ok(dialog.blocking_pick_folder().map(|path| path.to_string()))
}

/// Open save file dialog
#[tauri::command]
pub async fn save_file(app: AppHandle, default_filename: Option<String>) -> Result<Option<String>> {
    use tauri_plugin_dialog::DialogExt;

    let mut dialog = app.dialog().file();
    if let Some(filename) = default_filename {
        dialog = dialog.set_file_name(&filename);
    }
    Ok(dialog.blocking_save_file().map(|path| path.to_string()))
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
