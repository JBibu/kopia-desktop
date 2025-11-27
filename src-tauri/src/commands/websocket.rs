//! WebSocket command handlers for Tauri
//!
//! Provides frontend commands for managing WebSocket connections to Kopia server.
//! Supports multi-repository by including repo_id in events.

use crate::error::Result;
use crate::KopiaWebSocketState;
use tauri::{AppHandle, State};

/// Connect to Kopia WebSocket for real-time task/snapshot updates
///
/// # Arguments
/// * `repo_id` - Repository identifier for routing events
/// * `server_url` - Kopia server URL (e.g., "https://localhost:51515")
/// * `username` - Server username (typically "kopia")
/// * `password` - Server password from KopiaServerInfo
/// * `ws_state` - Managed WebSocket state
/// * `app_handle` - Tauri app handle for event emission
///
/// # Events Emitted
/// * `kopia-ws-event` - WebSocket events with repo_id (task-progress, snapshot-progress, etc.)
/// * `kopia-ws-disconnected` - Connection closed/lost with repo_id
#[tauri::command]
pub async fn websocket_connect(
    _repo_id: String,
    server_url: String,
    username: String,
    password: String,
    ws_state: State<'_, KopiaWebSocketState>,
    app_handle: AppHandle,
) -> Result<()> {
    let ws = ws_state.lock().await;
    // TODO: Update KopiaWebSocket to support repo_id for event routing
    // For now, connect without repo_id tracking
    ws.connect(&server_url, &username, &password, app_handle)
        .await
}

/// Disconnect from Kopia WebSocket for a repository
///
/// Gracefully closes the WebSocket connection and cleans up resources.
#[tauri::command]
pub async fn websocket_disconnect(
    repo_id: String,
    ws_state: State<'_, KopiaWebSocketState>,
) -> Result<()> {
    // TODO: Update KopiaWebSocket to support repo_id for multi-connection
    let _ = repo_id; // Silence unused warning until full implementation
    let ws = ws_state.lock().await;
    ws.disconnect().await
}
