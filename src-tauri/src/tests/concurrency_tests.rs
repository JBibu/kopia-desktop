//! Concurrency and thread safety tests
//!
//! Tests for concurrent access and thread safety.

#[cfg(test)]
mod tests {
    use crate::kopia_server::KopiaServer;
    use crate::kopia_websocket::KopiaWebSocket;
    use std::sync::Arc;
    use std::thread;

    #[test]
    fn test_server_multiple_status_calls() {
        let mut server = KopiaServer::new();

        // Multiple status calls should work without issue
        for _ in 0..100 {
            let status = server.status();
            assert!(!status.running);
        }
    }

    #[test]
    fn test_websocket_multiple_is_connected_calls() {
        let ws = Arc::new(tokio::sync::Mutex::new(KopiaWebSocket::new()));

        // Run multiple checks concurrently
        let runtime = tokio::runtime::Runtime::new().unwrap();
        runtime.block_on(async {
            let mut handles = vec![];

            for i in 0..10 {
                let ws_clone = Arc::clone(&ws);
                let repo_id = format!("test-repo-{}", i);
                let handle = tokio::spawn(async move {
                    let ws = ws_clone.lock().await;
                    ws.is_connected(&repo_id).await
                });
                handles.push(handle);
            }

            for handle in handles {
                let connected = handle.await.unwrap();
                assert!(!connected);
            }
        });
    }

    #[test]
    fn test_server_from_multiple_threads() {
        let handles: Vec<_> = (0..5)
            .map(|i| {
                thread::spawn(move || {
                    let mut server = KopiaServer::new();
                    let status = server.status();
                    assert!(!status.running);
                    assert!(status.server_url.is_none());
                    i
                })
            })
            .collect();

        for handle in handles {
            handle.join().unwrap();
        }
    }

    #[test]
    fn test_error_serialization_concurrent() {
        use crate::error::KopiaError;

        let errors = vec![
            KopiaError::ServerNotRunning,
            KopiaError::RepositoryNotConnected {
                api_error_code: None,
            },
            KopiaError::WebSocketNotConnected,
        ];

        let handles: Vec<_> = errors
            .into_iter()
            .map(|err| {
                thread::spawn(move || {
                    let json = serde_json::to_string(&err).unwrap();
                    let _deserialized: KopiaError = serde_json::from_str(&json).unwrap();
                })
            })
            .collect();

        for handle in handles {
            handle.join().unwrap();
        }
    }

    #[test]
    fn test_config_dir_from_multiple_threads() {
        use crate::commands::kopia::get_default_config_dir;

        let handles: Vec<_> = (0..5)
            .map(|_| {
                thread::spawn(|| {
                    let dir = get_default_config_dir().unwrap();
                    assert!(!dir.is_empty());
                    assert!(dir.ends_with("kopia"));
                    dir
                })
            })
            .collect();

        let results: Vec<_> = handles.into_iter().map(|h| h.join().unwrap()).collect();

        // All threads should get the same result
        for i in 1..results.len() {
            assert_eq!(results[0], results[i]);
        }
    }

    #[test]
    fn test_password_generation_uniqueness() {
        use base64::Engine;
        use rand::Rng;
        use std::collections::HashSet;

        let passwords: Vec<_> = (0..100)
            .map(|_| {
                let mut rng = rand::thread_rng();
                let random_bytes: [u8; 32] = rng.gen();
                base64::prelude::BASE64_STANDARD.encode(random_bytes)
            })
            .collect();

        // All passwords should be unique (statistically)
        let unique_passwords: HashSet<_> = passwords.iter().collect();
        assert_eq!(unique_passwords.len(), 100);

        // All should be 44 characters
        for password in &passwords {
            assert_eq!(password.len(), 44);
        }
    }

    #[test]
    fn test_storage_config_concurrent_serialization() {
        use crate::types::StorageConfig;

        let configs = vec![
            StorageConfig {
                storage_type: "filesystem".to_string(),
                config: serde_json::json!({"path": "/backup1"}),
            },
            StorageConfig {
                storage_type: "s3".to_string(),
                config: serde_json::json!({"bucket": "bucket1"}),
            },
            StorageConfig {
                storage_type: "b2".to_string(),
                config: serde_json::json!({"bucket": "bucket2"}),
            },
        ];

        let handles: Vec<_> = configs
            .into_iter()
            .map(|config| {
                thread::spawn(move || {
                    let json = serde_json::to_string(&config).unwrap();
                    let deserialized: StorageConfig = serde_json::from_str(&json).unwrap();
                    assert_eq!(config.storage_type, deserialized.storage_type);
                })
            })
            .collect();

        for handle in handles {
            handle.join().unwrap();
        }
    }

    #[test]
    fn test_server_state_isolation() {
        // Each server instance should have independent state
        let mut server1 = KopiaServer::new();
        let mut server2 = KopiaServer::new();

        let status1 = server1.status();
        let status2 = server2.status();

        // Both should be not running
        assert!(!status1.running);
        assert!(!status2.running);

        // Calling stop on one shouldn't affect the other
        let _ = server1.stop();
        let status2_after = server2.status();
        assert_eq!(status2.running, status2_after.running);
    }

    #[test]
    #[ignore = "Stress test - run manually"]
    fn test_stress_concurrent_server_creation() {
        let handles: Vec<_> = (0..100)
            .map(|_| {
                thread::spawn(|| {
                    let mut server = KopiaServer::new();
                    let _ = server.status();
                    let _ = server.is_running();
                    let _ = server.get_http_client();
                })
            })
            .collect();

        for handle in handles {
            handle.join().unwrap();
        }
    }

    #[test]
    #[ignore = "Stress test - run manually"]
    fn test_stress_error_serialization() {
        use crate::error::KopiaError;

        let handles: Vec<_> = (0..1000)
            .map(|i| {
                thread::spawn(move || {
                    let err = KopiaError::SnapshotNotFound {
                        snapshot_id: format!("snap-{}", i),
                    };
                    let json = serde_json::to_string(&err).unwrap();
                    let _: KopiaError = serde_json::from_str(&json).unwrap();
                })
            })
            .collect();

        for handle in handles {
            handle.join().unwrap();
        }
    }
}
