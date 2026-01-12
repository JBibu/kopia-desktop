//! WebSocket client for Kopia server real-time updates
//!
//! Connects to Kopia's WebSocket endpoint (wss://localhost:{port}/api/v1/ws)
//! to receive real-time task and snapshot progress updates.
//!
//! Features:
//! - Multi-repository support (one connection per repository)
//! - Automatic event parsing and emission to frontend with repo_id
//! - HTTP Basic Auth support
//! - Graceful connection/disconnection handling
//! - TLS support (required for Kopia server)

use crate::error::{KopiaError, Result};
use crate::types::SourceInfo;
use futures_util::{SinkExt, StreamExt};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::sync::Arc;
use tauri::{AppHandle, Emitter};
use tokio::sync::Mutex;
use tokio_tungstenite::{connect_async, tungstenite::Message};

/// WebSocket connection manager for Kopia server
/// Supports multiple connections (one per repository)
pub struct KopiaWebSocket {
    connections: Arc<Mutex<HashMap<String, WebSocketConnection>>>,
}

struct WebSocketConnection {
    url: String,
    handle: tokio::task::JoinHandle<()>,
    shutdown_tx: tokio::sync::mpsc::Sender<()>,
}

/// WebSocket event types that mirror the frontend types
/// Now includes repo_id for multi-repository routing
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "type", rename_all = "kebab-case")]
pub enum WebSocketEvent {
    TaskProgress {
        #[serde(rename = "repoId")]
        repo_id: String,
        #[serde(rename = "taskID")]
        task_id: String,
        status: String,
        progress: ProgressInfo,
        counters: CountersInfo,
    },
    SnapshotProgress {
        #[serde(rename = "repoId")]
        repo_id: String,
        source: SourceInfo,
        status: String,
        upload: UploadInfo,
    },
    Error {
        #[serde(rename = "repoId")]
        repo_id: String,
        message: String,
        details: Option<String>,
    },
    Notification {
        #[serde(rename = "repoId")]
        repo_id: String,
        level: String,
        message: String,
    },
}

/// Internal event type for parsing Kopia server messages (without repo_id)
#[derive(Debug, Clone, Deserialize)]
#[serde(tag = "type", rename_all = "kebab-case")]
enum RawWebSocketEvent {
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

impl RawWebSocketEvent {
    /// Convert raw event to WebSocketEvent with repo_id
    fn with_repo_id(self, repo_id: String) -> WebSocketEvent {
        match self {
            RawWebSocketEvent::TaskProgress {
                task_id,
                status,
                progress,
                counters,
            } => WebSocketEvent::TaskProgress {
                repo_id,
                task_id,
                status,
                progress,
                counters,
            },
            RawWebSocketEvent::SnapshotProgress {
                source,
                status,
                upload,
            } => WebSocketEvent::SnapshotProgress {
                repo_id,
                source,
                status,
                upload,
            },
            RawWebSocketEvent::Error { message, details } => WebSocketEvent::Error {
                repo_id,
                message,
                details,
            },
            RawWebSocketEvent::Notification { level, message } => WebSocketEvent::Notification {
                repo_id,
                level,
                message,
            },
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProgressInfo {
    pub current: i64,
    pub total: i64,
    pub percentage: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CountersInfo {
    pub hashed_files: i64,
    pub hashed_bytes: i64,
    pub cached_files: i64,
    pub cached_bytes: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UploadInfo {
    pub hashed_files: i64,
    pub hashed_bytes: i64,
    pub estimated_bytes: Option<i64>,
    pub directory: String,
}

/// Disconnection event payload with repo_id
#[derive(Debug, Clone, Serialize)]
pub struct DisconnectEvent {
    #[serde(rename = "repoId")]
    pub repo_id: String,
}

impl KopiaWebSocket {
    pub fn new() -> Self {
        Self {
            connections: Arc::new(Mutex::new(HashMap::new())),
        }
    }

    /// Connect to Kopia WebSocket endpoint for a specific repository
    /// URL format: wss://localhost:{port}/api/v1/ws
    pub async fn connect(
        &self,
        repo_id: &str,
        server_url: &str,
        username: &str,
        password: &str,
        app_handle: AppHandle,
    ) -> Result<()> {
        let mut connections = self.connections.lock().await;

        // Check if already connected for this repo
        if connections.contains_key(repo_id) {
            return Err(KopiaError::WebSocketAlreadyConnected);
        }

        // Build WebSocket URL from HTTPS server URL
        let ws_url = server_url
            .replace("https://", "wss://")
            .replace("http://", "ws://");
        let ws_url = format!("{}/api/v1/ws", ws_url);

        // Create Basic Auth header
        use base64::Engine;
        let auth = base64::prelude::BASE64_STANDARD.encode(format!("{}:{}", username, password));
        let auth_header = format!("Basic {}", auth);

        log::info!(
            "Connecting to Kopia WebSocket for repo '{}': {}",
            repo_id,
            ws_url
        );

        // Build WebSocket request with Basic Auth header
        let request = http::Request::builder()
            .uri(&ws_url)
            .header("Authorization", auth_header)
            .header("Sec-WebSocket-Version", "13")
            .header(
                "Sec-WebSocket-Key",
                tokio_tungstenite::tungstenite::handshake::client::generate_key(),
            )
            .header("Connection", "Upgrade")
            .header("Upgrade", "websocket")
            .body(())
            .map_err(|e| KopiaError::WebSocketConnectionFailed {
                message: format!("Failed to build WebSocket request: {}", e),
            })?;

        let (ws_stream, _) =
            connect_async(request)
                .await
                .map_err(|e| KopiaError::WebSocketConnectionFailed {
                    message: format!("Failed to connect to WebSocket: {}", e),
                })?;

        log::info!("WebSocket connected successfully for repo '{}'", repo_id);

        let (mut write, mut read) = ws_stream.split();

        // Create shutdown channel
        let (shutdown_tx, mut shutdown_rx) = tokio::sync::mpsc::channel::<()>(1);

        // Clone repo_id for the spawned task
        let repo_id_owned = repo_id.to_string();
        let repo_id_for_task = repo_id_owned.clone();

        // Spawn task to handle incoming messages
        let app_handle_clone = app_handle.clone();
        let handle = tokio::spawn(async move {
            loop {
                tokio::select! {
                    // Handle incoming messages
                    message = read.next() => {
                        let Some(message) = message else {
                            log::info!("WebSocket stream ended for repo '{}'", repo_id_for_task);
                            break;
                        };

                        match message {
                            Ok(Message::Text(text)) => {
                                log::debug!("WebSocket message received for repo '{}': {}", repo_id_for_task, text);

                                // Parse and emit event to frontend with repo_id
                                match serde_json::from_str::<RawWebSocketEvent>(&text) {
                                    Ok(raw_event) => {
                                        let event = raw_event.with_repo_id(repo_id_for_task.clone());
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
                                log::info!("WebSocket connection closed by server for repo '{}'", repo_id_for_task);
                                break;
                            }
                            Ok(Message::Ping(_data)) => {
                                log::debug!("Received ping for repo '{}', pong handled automatically", repo_id_for_task);
                                // Pongs are handled automatically by tungstenite
                            }
                            Ok(_) => {
                                // Ignore binary, pong, and frame messages
                            }
                            Err(e) => {
                                log::error!("WebSocket error for repo '{}': {}", repo_id_for_task, e);
                                break;
                            }
                        }
                    }
                    // Handle shutdown signal
                    _ = shutdown_rx.recv() => {
                        log::info!("Received shutdown signal for repo '{}', closing WebSocket gracefully", repo_id_for_task);
                        // Send close frame
                        if let Err(e) = write.close().await {
                            log::error!("Failed to send close frame for repo '{}': {}", repo_id_for_task, e);
                        }
                        break;
                    }
                }
            }

            log::info!(
                "WebSocket message handler terminated for repo '{}'",
                repo_id_for_task
            );
            // Emit disconnection event with repo_id
            let _ = app_handle_clone.emit(
                "kopia-ws-disconnected",
                DisconnectEvent {
                    repo_id: repo_id_for_task,
                },
            );
        });

        // Store connection info
        connections.insert(
            repo_id_owned,
            WebSocketConnection {
                url: ws_url,
                handle,
                shutdown_tx,
            },
        );

        Ok(())
    }

    /// Disconnect from WebSocket gracefully for a specific repository
    pub async fn disconnect(&self, repo_id: &str) -> Result<()> {
        let mut connections = self.connections.lock().await;

        if let Some(mut conn) = connections.remove(repo_id) {
            log::info!(
                "Disconnecting WebSocket for repo '{}': {}",
                repo_id,
                conn.url
            );

            // Send shutdown signal for graceful close
            let _ = conn.shutdown_tx.send(()).await;

            // Wait for handler to finish (with timeout)
            let timeout = tokio::time::Duration::from_secs(5);
            match tokio::time::timeout(timeout, &mut conn.handle).await {
                Ok(Ok(())) => {
                    log::info!("WebSocket disconnected gracefully for repo '{}'", repo_id)
                }
                Ok(Err(e)) => log::warn!("WebSocket handler panicked for repo '{}': {}", repo_id, e),
                Err(_) => {
                    log::warn!(
                        "WebSocket disconnect timeout for repo '{}', aborting task",
                        repo_id
                    );
                    conn.handle.abort();
                }
            }

            Ok(())
        } else {
            Err(crate::error::KopiaError::WebSocketNotConnected)
        }
    }

    /// Disconnect all WebSocket connections (for app shutdown)
    pub async fn disconnect_all(&self) {
        let mut connections = self.connections.lock().await;
        let repo_ids: Vec<String> = connections.keys().cloned().collect();

        for repo_id in repo_ids {
            if let Some(mut conn) = connections.remove(&repo_id) {
                log::info!("Disconnecting WebSocket for repo '{}' during shutdown", repo_id);
                let _ = conn.shutdown_tx.send(()).await;

                let timeout = tokio::time::Duration::from_secs(2);
                match tokio::time::timeout(timeout, &mut conn.handle).await {
                    Ok(_) => log::info!("WebSocket disconnected for repo '{}'", repo_id),
                    Err(_) => {
                        log::warn!("WebSocket disconnect timeout for repo '{}', aborting", repo_id);
                        conn.handle.abort();
                    }
                }
            }
        }
    }

    /// Check if WebSocket is connected for a specific repository
    #[allow(dead_code)]
    pub async fn is_connected(&self, repo_id: &str) -> bool {
        let connections = self.connections.lock().await;
        connections.contains_key(repo_id)
    }

    /// Get list of connected repository IDs (for debugging)
    #[allow(dead_code)]
    pub async fn connected_repos(&self) -> Vec<String> {
        let connections = self.connections.lock().await;
        connections.keys().cloned().collect()
    }
}

impl Default for KopiaWebSocket {
    fn default() -> Self {
        Self::new()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_default_websocket() {
        let ws = KopiaWebSocket::default();
        assert!(ws.connections.try_lock().is_ok());
    }

    #[test]
    fn test_new_websocket() {
        let ws = KopiaWebSocket::new();
        let connections = ws.connections.try_lock().unwrap();
        assert!(connections.is_empty());
    }

    #[tokio::test]
    async fn test_is_connected_when_not_connected() {
        let ws = KopiaWebSocket::new();
        assert!(!ws.is_connected("test-repo").await);
    }

    #[tokio::test]
    async fn test_disconnect_when_not_connected() {
        let ws = KopiaWebSocket::new();
        let result = ws.disconnect("test-repo").await;
        assert!(result.is_err());
    }

    #[tokio::test]
    async fn test_connected_repos_empty() {
        let ws = KopiaWebSocket::new();
        let repos = ws.connected_repos().await;
        assert!(repos.is_empty());
    }

    #[test]
    fn test_progress_info_serde() {
        let progress = ProgressInfo {
            current: 50,
            total: 100,
            percentage: 50.0,
        };

        let json = serde_json::to_string(&progress).unwrap();
        assert!(json.contains("\"current\":50"));
        assert!(json.contains("\"total\":100"));
        assert!(json.contains("\"percentage\":50.0"));

        let deserialized: ProgressInfo = serde_json::from_str(&json).unwrap();
        assert_eq!(deserialized.current, 50);
        assert_eq!(deserialized.total, 100);
    }

    #[test]
    fn test_counters_info_serde() {
        let counters = CountersInfo {
            hashed_files: 100,
            hashed_bytes: 1000000,
            cached_files: 50,
            cached_bytes: 500000,
        };

        let json = serde_json::to_string(&counters).unwrap();
        assert!(json.contains("\"hashedFiles\":100"));
        assert!(json.contains("\"cachedBytes\":500000"));

        let deserialized: CountersInfo = serde_json::from_str(&json).unwrap();
        assert_eq!(deserialized.hashed_files, 100);
    }

    #[test]
    fn test_upload_info_serde() {
        let upload = UploadInfo {
            hashed_files: 25,
            hashed_bytes: 250000,
            estimated_bytes: Some(1000000),
            directory: "/home/user/docs".to_string(),
        };

        let json = serde_json::to_string(&upload).unwrap();
        assert!(json.contains("\"hashedFiles\":25"));
        assert!(json.contains("\"estimatedBytes\":1000000"));
        assert!(json.contains("\"directory\":\"/home/user/docs\""));

        let deserialized: UploadInfo = serde_json::from_str(&json).unwrap();
        assert_eq!(deserialized.directory, "/home/user/docs");
    }

    #[test]
    fn test_websocket_event_task_progress() {
        let event = WebSocketEvent::TaskProgress {
            repo_id: "default".to_string(),
            task_id: "task-123".to_string(),
            status: "RUNNING".to_string(),
            progress: ProgressInfo {
                current: 50,
                total: 100,
                percentage: 50.0,
            },
            counters: CountersInfo {
                hashed_files: 10,
                hashed_bytes: 1000,
                cached_files: 5,
                cached_bytes: 500,
            },
        };

        let json = serde_json::to_string(&event).unwrap();
        assert!(json.contains("\"type\":\"task-progress\""));
        assert!(json.contains("\"repoId\":\"default\""));
        assert!(json.contains("\"taskID\":\"task-123\""));
    }

    #[test]
    fn test_websocket_event_snapshot_progress() {
        let event = WebSocketEvent::SnapshotProgress {
            repo_id: "backup-repo".to_string(),
            source: SourceInfo {
                user_name: "user".to_string(),
                host: "host".to_string(),
                path: "/path".to_string(),
            },
            status: "UPLOADING".to_string(),
            upload: UploadInfo {
                hashed_files: 10,
                hashed_bytes: 1000,
                estimated_bytes: Some(2000),
                directory: "/path".to_string(),
            },
        };

        let json = serde_json::to_string(&event).unwrap();
        assert!(json.contains("\"type\":\"snapshot-progress\""));
        assert!(json.contains("\"repoId\":\"backup-repo\""));
    }

    #[test]
    fn test_websocket_event_error() {
        let event = WebSocketEvent::Error {
            repo_id: "test".to_string(),
            message: "Connection failed".to_string(),
            details: Some("Network timeout".to_string()),
        };

        let json = serde_json::to_string(&event).unwrap();
        assert!(json.contains("\"type\":\"error\""));
        assert!(json.contains("\"repoId\":\"test\""));
        assert!(json.contains("\"message\":\"Connection failed\""));
    }

    #[test]
    fn test_websocket_event_notification() {
        let event = WebSocketEvent::Notification {
            repo_id: "main".to_string(),
            level: "info".to_string(),
            message: "Backup complete".to_string(),
        };

        let json = serde_json::to_string(&event).unwrap();
        assert!(json.contains("\"type\":\"notification\""));
        assert!(json.contains("\"repoId\":\"main\""));
    }

    #[test]
    fn test_disconnect_event_serde() {
        let event = DisconnectEvent {
            repo_id: "test-repo".to_string(),
        };

        let json = serde_json::to_string(&event).unwrap();
        assert!(json.contains("\"repoId\":\"test-repo\""));
    }

    #[test]
    fn test_raw_event_with_repo_id() {
        let raw = RawWebSocketEvent::Notification {
            level: "warning".to_string(),
            message: "Low disk space".to_string(),
        };

        let event = raw.with_repo_id("my-repo".to_string());
        match event {
            WebSocketEvent::Notification {
                repo_id,
                level,
                message,
            } => {
                assert_eq!(repo_id, "my-repo");
                assert_eq!(level, "warning");
                assert_eq!(message, "Low disk space");
            }
            _ => panic!("Expected Notification event"),
        }
    }
}
