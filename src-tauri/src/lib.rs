// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

// Module declarations
mod commands;
mod kopia_server;
mod types;

use kopia_server::create_server_state;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    // Initialize Kopia server state
    let server_state = create_server_state();

    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_notification::init())
        .plugin(tauri_plugin_dialog::init())
        .manage(server_state.clone())
        .setup(move |_app| {
            // Auto-start Kopia server on app launch
            let state = server_state.clone();
            tauri::async_runtime::spawn(async move {
                let config_dir = commands::kopia::get_default_config_dir().unwrap_or_else(|_| {
                    eprintln!("Failed to get config directory, using fallback");
                    String::from(".")
                });

                match state.lock() {
                    Ok(mut server) => {
                        match server.start(&config_dir) {
                            Ok(info) => {
                                println!("Kopia server started successfully on {}", info.server_url);
                            }
                            Err(e) => {
                                eprintln!("Failed to start Kopia server: {}", e);
                                eprintln!("You can try starting it manually from the UI");
                            }
                        }
                    }
                    Err(e) => {
                        eprintln!("Failed to lock server state: {}", e);
                        eprintln!("Server auto-start aborted. You can try starting it manually from the UI");
                    }
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
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
