// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

// Module declarations
mod commands;
mod error;
mod kopia_server;
mod kopia_websocket;
mod types;

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

/// Auto-start the Kopia server on app launch
async fn auto_start_server(state: KopiaServerState) -> error::Result<()> {
    let config_dir = commands::kopia::get_default_config_dir().unwrap_or_else(|e| {
        log::warn!(
            "Failed to get config directory: {}, using current directory",
            e
        );
        ".".to_string()
    });

    // Start server process and get ready waiter
    let (info, ready_waiter) = {
        let mut server = state.lock().unwrap_or_else(|poisoned| {
            log::warn!("Mutex poisoned during auto-start, recovering...");
            poisoned.into_inner()
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

            // Build system tray
            let _tray = TrayIconBuilder::new()
                .icon(app.default_window_icon().unwrap().clone())
                .menu(&menu)
                .show_menu_on_left_click(false)
                .on_menu_event(|app, event| match event.id.as_ref() {
                    "show" => {
                        if let Some(window) = app.get_webview_window("main") {
                            let _ = window.unminimize();
                            let _ = window.show();
                            let _ = window.set_focus();
                        }
                    }
                    "hide" => {
                        if let Some(window) = app.get_webview_window("main") {
                            let _ = window.hide();
                        }
                    }
                    "quit" => {
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
                        let app = tray.app_handle();
                        if let Some(window) = app.get_webview_window("main") {
                            let _ = window.unminimize();
                            let _ = window.show();
                            let _ = window.set_focus();
                        }
                    }
                })
                .build(app)?;

            // Auto-start Kopia server on app launch
            let state = server_state.clone();
            tauri::async_runtime::spawn(async move {
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
            commands::current_user_get,
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
            // WebSocket
            commands::websocket_connect,
            commands::websocket_disconnect,
            commands::websocket_status,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
