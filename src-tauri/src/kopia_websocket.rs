//! WebSocket client for Kopia server real-time updates
//!
//! Connects to Kopia's WebSocket endpoint (wss://localhost:{port}/api/v1/ws)
//! to receive real-time task and snapshot progress updates.
//!
//! Features:
//! - Automatic event parsing and emission to frontend
//! - HTTP Basic Auth support
//! - Graceful connection/disconnection handling
//! - TLS support (required for Kopia server)

use base64::Engine;
use futures_util::StreamExt;
use serde::{Deserialize, Serialize};
use std::sync::Arc;
use tauri::{AppHandle, Emitter};
use tokio::sync::Mutex;
use tokio_tungstenite::{connect_async, tungstenite::Message};

/// WebSocket connection manager for Kopia server
pub struct KopiaWebSocket {
    connection: Arc<Mutex<Option<WebSocketConnection>>>,
}

struct WebSocketConnection {
    url: String,
    handle: tokio::task::JoinHandle<()>,
}

/// WebSocket event types that mirror the frontend types
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "type", rename_all = "kebab-case")]
pub enum WebSocketEvent {
    TaskProgress {
        #[serde(rename = "taskID")]
        task_id: String,
        status: String,
        progress: ProgressInfo,
        counters: CountersInfo,
    },
    SnapshotProgress {
        source: SourceInfo,
        status: String,
        upload: UploadInfo,
    },
    Error {
        message: String,
        details: Option<String>,
    },
    Notification {
        level: String,
        message: String,
    },
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProgressInfo {
    pub current: i64,
    pub total: i64,
    pub percentage: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CountersInfo {
    pub hashed_files: i64,
    pub hashed_bytes: i64,
    pub cached_files: i64,
    pub cached_bytes: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SourceInfo {
    pub host: String,
    #[serde(rename = "userName")]
    pub user_name: String,
    pub path: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UploadInfo {
    #[serde(rename = "hashedFiles")]
    pub hashed_files: i64,
    #[serde(rename = "hashedBytes")]
    pub hashed_bytes: i64,
    #[serde(rename = "estimatedBytes")]
    pub estimated_bytes: Option<i64>,
    pub directory: String,
}

impl KopiaWebSocket {
    pub fn new() -> Self {
        Self {
            connection: Arc::new(Mutex::new(None)),
        }
    }

    /// Connect to Kopia WebSocket endpoint
    /// URL format: wss://localhost:{port}/api/v1/ws
    pub async fn connect(
        &self,
        server_url: &str,
        username: &str,
        password: &str,
        app_handle: AppHandle,
    ) -> Result<(), String> {
        // Check if already connected
        let mut conn_guard = self.connection.lock().await;
        if conn_guard.is_some() {
            return Err("WebSocket already connected".to_string());
        }

        // Build WebSocket URL from HTTPS server URL
        let ws_url = server_url
            .replace("https://", "wss://")
            .replace("http://", "ws://");
        let ws_url = format!("{}/api/v1/ws", ws_url);

        // Create Basic Auth header
        let auth = base64::engine::general_purpose::STANDARD
            .encode(format!("{}:{}", username, password));
        let auth_header = format!("Basic {}", auth);

        log::info!("Connecting to Kopia WebSocket: {}", ws_url);

        // Build WebSocket request with Basic Auth header
        let request = http::Request::builder()
            .uri(&ws_url)
            .header("Authorization", auth_header)
            .header("Sec-WebSocket-Version", "13")
            .header("Sec-WebSocket-Key", tokio_tungstenite::tungstenite::handshake::client::generate_key())
            .header("Connection", "Upgrade")
            .header("Upgrade", "websocket")
            .body(())
            .map_err(|e| format!("Failed to build WebSocket request: {}", e))?;

        let (ws_stream, _) = connect_async(request)
            .await
            .map_err(|e| format!("Failed to connect to WebSocket: {}", e))?;

        log::info!("WebSocket connected successfully");

        let (_write, mut read) = ws_stream.split();

        // Spawn task to handle incoming messages
        let app_handle_clone = app_handle.clone();
        let handle = tokio::spawn(async move {
            while let Some(message) = read.next().await {
                match message {
                    Ok(Message::Text(text)) => {
                        log::debug!("WebSocket message received: {}", text);

                        // Parse and emit event to frontend
                        match serde_json::from_str::<WebSocketEvent>(&text) {
                            Ok(event) => {
                                // Emit event to frontend via Tauri
                                if let Err(e) = app_handle_clone.emit("kopia-ws-event", &event) {
                                    log::error!("Failed to emit WebSocket event: {}", e);
                                }
                            }
                            Err(e) => {
                                log::warn!("Failed to parse WebSocket message: {}", e);
                                log::debug!("Raw message: {}", text);
                            }
                        }
                    }
                    Ok(Message::Close(_)) => {
                        log::info!("WebSocket connection closed by server");
                        break;
                    }
                    Ok(Message::Ping(_data)) => {
                        log::debug!("Received ping, sending pong");
                        // Pongs are handled automatically by tungstenite
                    }
                    Ok(_) => {
                        // Ignore binary, pong, and frame messages
                    }
                    Err(e) => {
                        log::error!("WebSocket error: {}", e);
                        break;
                    }
                }
            }

            log::info!("WebSocket message handler terminated");
            // Emit disconnection event
            let _ = app_handle_clone.emit("kopia-ws-disconnected", ());
        });

        // Store connection info
        *conn_guard = Some(WebSocketConnection {
            url: ws_url,
            handle,
        });

        Ok(())
    }

    /// Disconnect from WebSocket
    pub async fn disconnect(&self) -> Result<(), String> {
        let mut conn_guard = self.connection.lock().await;

        if let Some(conn) = conn_guard.take() {
            log::info!("Disconnecting WebSocket: {}", conn.url);
            conn.handle.abort();
            Ok(())
        } else {
            Err("WebSocket not connected".to_string())
        }
    }

    /// Check if WebSocket is connected
    pub async fn is_connected(&self) -> bool {
        let conn_guard = self.connection.lock().await;
        conn_guard.is_some()
    }
}

impl Default for KopiaWebSocket {
    fn default() -> Self {
        Self::new()
    }
}
