// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

// Module declarations
mod commands;
mod error;
mod kopia_server;
mod kopia_websocket;
mod types;

// Test modules
#[cfg(test)]
mod advanced_error_tests;
#[cfg(test)]
mod commands_tests;
#[cfg(test)]
mod concurrency_tests;
#[cfg(test)]
mod error_edge_cases_tests;
#[cfg(test)]
mod integration_tests;
#[cfg(test)]
mod kopia_api_integration_tests; // NEW: Actual Kopia binary API integration tests
#[cfg(test)]
mod kopia_commands_tests;
#[cfg(test)]
mod kopia_server_tests;
#[cfg(test)]
mod kopia_websocket_tests;
#[cfg(test)]
mod system_tests;
#[cfg(test)]
mod types_advanced_tests;
#[cfg(test)]
mod types_tests;
#[cfg(test)]
mod types_unit_tests;

use kopia_server::{create_server_state, KopiaServerState};
use kopia_websocket::KopiaWebSocket;
use std::sync::Arc;
use tauri::{
    menu::{Menu, MenuItem},
    tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent},
    Emitter, Manager,
};
use tokio::sync::Mutex;

/// WebSocket state type
pub type KopiaWebSocketState = Arc<Mutex<KopiaWebSocket>>;

/// Create WebSocket state
pub fn create_websocket_state() -> KopiaWebSocketState {
    Arc::new(Mutex::new(KopiaWebSocket::new()))
}

/// Restore and show the main window
///
/// Attempts to unminimize, show, and focus the main window.
/// Logs any errors at debug level for troubleshooting.
fn restore_main_window(app: &tauri::AppHandle) {
    if let Some(window) = app.get_webview_window("main") {
        if let Err(e) = window.unminimize() {
            log::debug!("Failed to unminimize window: {}", e);
        }
        if let Err(e) = window.show() {
            log::debug!("Failed to show window: {}", e);
        }
        if let Err(e) = window.set_focus() {
            log::debug!("Failed to focus window: {}", e);
        }
    }
}

/// Hide the main window
///
/// Attempts to hide the main window.
/// Logs any errors at debug level for troubleshooting.
fn hide_main_window(app: &tauri::AppHandle) {
    if let Some(window) = app.get_webview_window("main") {
        if let Err(e) = window.hide() {
            log::debug!("Failed to hide window: {}", e);
        }
    }
}

/// Auto-start the Kopia server on app launch
async fn auto_start_server(state: KopiaServerState) -> error::Result<()> {
    // Get config directory - fail fast if we can't determine it
    let config_dir = commands::kopia::get_default_config_dir().map_err(|e| {
        error::KopiaError::InternalError {
            message: format!("Failed to determine config directory: {}", e),
            details: None,
        }
    })?;

    // Start server process and get ready waiter
    let (info, ready_waiter) = {
        let mut server = state.lock().unwrap_or_else(|poisoned| {
            log::error!(
                "CRITICAL: Server mutex poisoned during auto-start. \
                 A previous thread panicked while holding the lock. \
                 Attempting to recover by using the poisoned state..."
            );
            #[cfg(debug_assertions)]
            log::debug!(
                "Poison recovery stack trace: {:?}",
                std::backtrace::Backtrace::capture()
            );

            let mut recovered = poisoned.into_inner();

            // Validate recovered state is safe to use
            if recovered.is_running() {
                log::warn!(
                    "Recovered server state shows running process. \
                     This may indicate incomplete shutdown. Proceeding with caution."
                );
            }

            recovered
        });
        let info = server.start(&config_dir)?;
        let waiter = server.get_ready_waiter()?;
        (info, waiter)
    };

    // Wait for server to be ready (outside lock)
    ready_waiter.await?;
    log::info!("Kopia server started successfully on {}", info.server_url);
    Ok(())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    // Initialize Kopia server state
    let server_state = create_server_state();
    let websocket_state = create_websocket_state();

    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_notification::init())
        .plugin(tauri_plugin_dialog::init())
        .manage(server_state.clone())
        .manage(websocket_state.clone())
        .setup(move |app| {
            // Create system tray menu
            let show_i = MenuItem::with_id(app, "show", "Show Window", true, None::<&str>)?;
            let hide_i = MenuItem::with_id(app, "hide", "Hide Window", true, None::<&str>)?;
            let quit_i = MenuItem::with_id(app, "quit", "Quit", true, None::<&str>)?;
            let menu = Menu::with_items(app, &[&show_i, &hide_i, &quit_i])?;

            // Build system tray with default icon
            let icon = app
                .default_window_icon()
                .ok_or_else(|| {
                    tauri::Error::InvalidIcon(std::io::Error::new(
                        std::io::ErrorKind::NotFound,
                        "Default window icon not found",
                    ))
                })?
                .clone();

            let _tray = TrayIconBuilder::new()
                .icon(icon)
                .menu(&menu)
                .show_menu_on_left_click(false)
                .on_menu_event(|app, event| match event.id.as_ref() {
                    "show" => restore_main_window(app),
                    "hide" => hide_main_window(app),
                    "quit" => app.exit(0),
                    _ => {}
                })
                .on_tray_icon_event(|tray, event| {
                    if let TrayIconEvent::Click {
                        button: MouseButton::Left,
                        button_state: MouseButtonState::Up,
                        ..
                    } = event
                    {
                        restore_main_window(tray.app_handle());
                    }
                })
                .build(app)?;

            // Auto-start Kopia server on app launch
            let state = server_state.clone();
            tauri::async_runtime::spawn(async move {
                // Small delay to let UI initialize before starting server
                tokio::time::sleep(tokio::time::Duration::from_millis(100)).await;

                if let Err(e) = auto_start_server(state).await {
                    log::error!("Failed to auto-start Kopia server: {}", e);
                    log::info!("You can start the server manually from the UI");
                }
            });
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            // Kopia server lifecycle
            commands::kopia_server_start,
            commands::kopia_server_stop,
            commands::kopia_server_status,
            // Repository management
            commands::repository_status,
            commands::repository_connect,
            commands::repository_disconnect,
            commands::repository_create,
            commands::repository_exists,
            commands::repository_get_algorithms,
            commands::repository_update_description,
            // Snapshot sources
            commands::sources_list,
            commands::snapshot_create,
            commands::snapshot_cancel,
            // Snapshot history
            commands::snapshots_list,
            commands::snapshot_edit,
            commands::snapshot_delete,
            // Snapshot browsing & restore
            commands::object_browse,
            commands::object_download,
            commands::restore_start,
            commands::mount_snapshot,
            commands::mounts_list,
            commands::mount_unmount,
            // Policies
            commands::policies_list,
            commands::policy_get,
            commands::policy_resolve,
            commands::policy_set,
            commands::policy_delete,
            // Tasks
            commands::tasks_list,
            commands::task_get,
            commands::task_logs,
            commands::task_cancel,
            commands::tasks_summary,
            // Maintenance
            commands::maintenance_info,
            commands::maintenance_run,
            // Utilities
            commands::path_resolve,
            commands::estimate_snapshot,
            commands::ui_preferences_get,
            commands::ui_preferences_set,
            // Notifications
            commands::notification_profiles_list,
            commands::notification_profile_create,
            commands::notification_profile_delete,
            commands::notification_profile_test,
            // System utilities
            commands::get_system_info,
            commands::get_current_user,
            commands::select_folder,
            commands::select_file,
            commands::save_file,
            // WebSocket
            commands::websocket_connect,
            commands::websocket_disconnect,
            commands::websocket_status,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
