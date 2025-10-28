// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

// Module declarations
mod commands;
mod kopia_server;

use kopia_server::create_server_state;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    // Initialize Kopia server state
    let server_state = create_server_state();

    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_notification::init())
        .manage(server_state)
        .invoke_handler(tauri::generate_handler![
            commands::kopia_server_start,
            commands::kopia_server_stop,
            commands::kopia_server_status,
            commands::repository_status,
            commands::repository_connect,
            commands::repository_disconnect,
            commands::get_system_info,
            commands::get_current_user,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
