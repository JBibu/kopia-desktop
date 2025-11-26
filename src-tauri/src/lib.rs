// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

// Module declarations
mod commands;
mod error;
mod kopia_server;
mod kopia_websocket;
mod types;

// Windows-only modules
#[cfg(windows)]
mod windows_ipc;
#[cfg(windows)]
mod windows_service;

// Re-export Windows service entry point
#[cfg(windows)]
pub use windows_service::run_service;

// Test modules
#[cfg(test)]
mod tests;

use kopia_server::{create_server_state, KopiaServerState};
use kopia_websocket::KopiaWebSocket;
use std::sync::Arc;
use tauri::{
    menu::{Menu, MenuItem},
    tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent},
    Manager,
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

    // Clone server state for the exit handler (before it's moved into setup closure)
    let exit_server_state = server_state.clone();

    let app = tauri::Builder::default()
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

            // Clone server state for tray menu handler
            let tray_server_state = server_state.clone();

            let _tray = TrayIconBuilder::new()
                .icon(icon)
                .menu(&menu)
                .show_menu_on_left_click(false)
                .on_menu_event(move |app, event| match event.id.as_ref() {
                    "show" => restore_main_window(app),
                    "hide" => hide_main_window(app),
                    "quit" => {
                        log::info!("Quit requested from tray menu, stopping server...");
                        // Stop the Kopia server before exiting
                        if let Err(e) = tray_server_state
                            .lock()
                            .unwrap_or_else(|poisoned| {
                                log::warn!("Mutex poisoned during quit, recovering...");
                                poisoned.into_inner()
                            })
                            .stop()
                        {
                            log::error!("Failed to stop server during quit: {}", e);
                        }
                        app.exit(0);
                    }
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
            commands::repository_sync,
            commands::repository_create,
            commands::repository_exists,
            commands::repository_get_algorithms,
            commands::repository_update_description,
            commands::repository_get_throttle,
            commands::repository_set_throttle,
            // Snapshot sources
            commands::sources_list,
            commands::snapshot_create,
            commands::snapshot_upload,
            commands::snapshot_cancel,
            commands::snapshot_pause,
            commands::snapshot_resume,
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
            // Utilities
            commands::path_resolve,
            commands::estimate_snapshot,
            // Notifications
            commands::notification_profiles_list,
            commands::notification_profile_create,
            commands::notification_profile_delete,
            commands::notification_profile_test,
            // System utilities
            commands::get_system_info,
            commands::get_current_user,
            commands::select_folder,
            commands::save_file,
            // WebSocket
            commands::websocket_connect,
            commands::websocket_disconnect,
            // Windows Service (Windows only)
            #[cfg(windows)]
            commands::service_install,
            #[cfg(windows)]
            commands::service_uninstall,
            #[cfg(windows)]
            commands::service_start,
            #[cfg(windows)]
            commands::service_stop,
            #[cfg(windows)]
            commands::service_status,
        ])
        .build(tauri::generate_context!())
        .expect("error while building tauri application");

    // Run the app with cleanup handling
    app.run(move |_app_handle, event| {
        if let tauri::RunEvent::ExitRequested { .. } = event {
            log::info!("App exit requested, stopping Kopia server...");

            // Stop the Kopia server before exit
            if let Err(e) = exit_server_state
                .lock()
                .unwrap_or_else(|poisoned| {
                    log::warn!("Mutex poisoned during shutdown, recovering...");
                    poisoned.into_inner()
                })
                .stop()
            {
                log::error!("Failed to stop Kopia server during shutdown: {}", e);
            } else {
                log::info!("Kopia server stopped successfully");
            }
        }
    });
}
