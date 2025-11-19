//! WebSocket command handlers for Tauri
//!
//! Provides frontend commands for managing WebSocket connections to Kopia server.

use crate::error::Result;
use crate::kopia_websocket::KopiaWebSocket;
use std::sync::Arc;
use tauri::{AppHandle, State};
use tokio::sync::Mutex;

/// WebSocket state type
pub type WebSocketState = Arc<Mutex<KopiaWebSocket>>;

/// Connect to Kopia WebSocket for real-time task/snapshot updates
///
/// # Arguments
/// * `server_url` - Kopia server URL (e.g., "https://localhost:51515")
/// * `username` - Server username (typically "kopia-desktop")
/// * `password` - Server password from KopiaServerInfo
/// * `ws_state` - Managed WebSocket state
/// * `app_handle` - Tauri app handle for event emission
///
/// # Events Emitted
/// * `kopia-ws-event` - WebSocket events (task-progress, snapshot-progress, etc.)
/// * `kopia-ws-disconnected` - Connection closed/lost
#[tauri::command]
pub async fn websocket_connect(
    server_url: String,
    username: String,
    password: String,
    ws_state: State<'_, WebSocketState>,
    app_handle: AppHandle,
) -> Result<()> {
    let ws = ws_state.lock().await;
    ws.connect(&server_url, &username, &password, app_handle)
        .await
}

/// Disconnect from Kopia WebSocket
///
/// Gracefully closes the WebSocket connection and cleans up resources.
#[tauri::command]
pub async fn websocket_disconnect(ws_state: State<'_, WebSocketState>) -> Result<()> {
    let ws = ws_state.lock().await;
    ws.disconnect().await
}

