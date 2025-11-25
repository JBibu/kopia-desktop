//! Tests for kopia_websocket module
//!
//! These tests verify WebSocket connection management and event handling.

#[cfg(test)]
mod tests {
    use crate::error::KopiaError;
    use crate::kopia_websocket::{
        CountersInfo, KopiaWebSocket, ProgressInfo, UploadInfo, WebSocketEvent,
    };
    use crate::types::SourceInfo;

    #[test]
    fn test_new_websocket() {
        let ws = KopiaWebSocket::new();
        // Can't directly test internal state, but we can verify it doesn't panic
        drop(ws);
    }

    #[test]
    fn test_default_websocket() {
        let ws = KopiaWebSocket::default();
        drop(ws);
    }

    #[tokio::test]
    async fn test_is_connected_when_not_connected() {
        let ws = KopiaWebSocket::new();
        assert!(!ws.is_connected().await);
    }

    #[tokio::test]
    async fn test_disconnect_when_not_connected() {
        let ws = KopiaWebSocket::new();
        let result = ws.disconnect().await;

        assert!(result.is_err());
        assert!(matches!(
            result.unwrap_err(),
            KopiaError::WebSocketNotConnected
        ));
    }

    #[test]
    fn test_progress_info_serde() {
        let progress = ProgressInfo {
            current: 50,
            total: 100,
            percentage: 50.0,
        };

        let json = serde_json::to_string(&progress).unwrap();
        let deserialized: ProgressInfo = serde_json::from_str(&json).unwrap();

        assert_eq!(progress.current, deserialized.current);
        assert_eq!(progress.total, deserialized.total);
        assert_eq!(progress.percentage, deserialized.percentage);
    }

    #[test]
    fn test_counters_info_serde() {
        let counters = CountersInfo {
            hashed_files: 100,
            hashed_bytes: 1024000,
            cached_files: 50,
            cached_bytes: 512000,
        };

        let json = serde_json::to_string(&counters).unwrap();
        let deserialized: CountersInfo = serde_json::from_str(&json).unwrap();

        assert_eq!(counters.hashed_files, deserialized.hashed_files);
        assert_eq!(counters.hashed_bytes, deserialized.hashed_bytes);
    }

    #[test]
    fn test_upload_info_serde() {
        let upload = UploadInfo {
            hashed_files: 10,
            hashed_bytes: 1024,
            estimated_bytes: Some(2048),
            directory: "/test/path".to_string(),
        };

        let json = serde_json::to_string(&upload).unwrap();
        assert!(json.contains("hashedFiles")); // camelCase
        assert!(json.contains("hashedBytes"));
        assert!(json.contains("estimatedBytes"));

        let deserialized: UploadInfo = serde_json::from_str(&json).unwrap();
        assert_eq!(upload.hashed_files, deserialized.hashed_files);
        assert_eq!(upload.estimated_bytes, deserialized.estimated_bytes);
    }

    #[test]
    fn test_websocket_event_task_progress() {
        let event = WebSocketEvent::TaskProgress {
            task_id: "task-123".to_string(),
            status: "RUNNING".to_string(),
            progress: ProgressInfo {
                current: 50,
                total: 100,
                percentage: 50.0,
            },
            counters: CountersInfo {
                hashed_files: 10,
                hashed_bytes: 1024,
                cached_files: 5,
                cached_bytes: 512,
            },
        };

        let json = serde_json::to_string(&event).unwrap();
        assert!(json.contains("task-progress")); // kebab-case
        assert!(json.contains("taskID")); // Field name

        let deserialized: WebSocketEvent = serde_json::from_str(&json).unwrap();
        if let WebSocketEvent::TaskProgress { task_id, .. } = deserialized {
            assert_eq!(task_id, "task-123");
        } else {
            panic!("Expected TaskProgress event");
        }
    }

    #[test]
    fn test_websocket_event_snapshot_progress() {
        let event = WebSocketEvent::SnapshotProgress {
            source: SourceInfo {
                user_name: "test".to_string(),
                host: "localhost".to_string(),
                path: "/test/path".to_string(),
            },
            status: "UPLOADING".to_string(),
            upload: UploadInfo {
                hashed_files: 10,
                hashed_bytes: 1024,
                estimated_bytes: Some(2048),
                directory: "/test".to_string(),
            },
        };

        let json = serde_json::to_string(&event).unwrap();
        assert!(json.contains("snapshot-progress"));

        let deserialized: WebSocketEvent = serde_json::from_str(&json).unwrap();
        if let WebSocketEvent::SnapshotProgress { source, .. } = deserialized {
            assert_eq!(source.user_name, "test");
        } else {
            panic!("Expected SnapshotProgress event");
        }
    }

    #[test]
    fn test_websocket_event_error() {
        let event = WebSocketEvent::Error {
            message: "Test error".to_string(),
            details: Some("Error details".to_string()),
        };

        let json = serde_json::to_string(&event).unwrap();
        let deserialized: WebSocketEvent = serde_json::from_str(&json).unwrap();

        if let WebSocketEvent::Error { message, details } = deserialized {
            assert_eq!(message, "Test error");
            assert_eq!(details, Some("Error details".to_string()));
        } else {
            panic!("Expected Error event");
        }
    }

    #[test]
    fn test_websocket_event_notification() {
        let event = WebSocketEvent::Notification {
            level: "info".to_string(),
            message: "Test notification".to_string(),
        };

        let json = serde_json::to_string(&event).unwrap();
        let deserialized: WebSocketEvent = serde_json::from_str(&json).unwrap();

        if let WebSocketEvent::Notification { level, message } = deserialized {
            assert_eq!(level, "info");
            assert_eq!(message, "Test notification");
        } else {
            panic!("Expected Notification event");
        }
    }

    // Integration tests
    #[tokio::test]
    #[ignore = "Requires running Kopia server with WebSocket endpoint"]
    async fn test_websocket_connect_and_disconnect() {
        // This would test actual WebSocket connection
    }

    #[tokio::test]
    #[ignore = "Requires running Kopia server"]
    async fn test_websocket_receive_events() {
        // This would test receiving and parsing events
    }

    #[tokio::test]
    #[ignore = "Requires running Kopia server"]
    async fn test_websocket_reconnect() {
        // This would test reconnection logic
    }
}
