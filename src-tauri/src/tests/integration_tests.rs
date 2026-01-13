//! Integration tests for end-to-end scenarios
//!
//! These tests verify complex workflows and interactions between modules.

#[cfg(test)]
mod tests {
    use crate::error::KopiaError;
    use crate::kopia_server::KopiaServer;
    use crate::types::{RepositoryConnectRequest, StorageConfig};

    #[test]
    fn test_server_lifecycle_state_transitions() {
        let mut server = KopiaServer::new();

        // Initial state: not running
        assert!(!server.is_running());
        let status1 = server.status();
        assert!(!status1.running);
        assert!(status1.server_url.is_none());
        assert!(status1.port.is_none());

        // Stop when not running should error
        let stop_result = server.stop();
        assert!(stop_result.is_err());
        assert!(matches!(
            stop_result.unwrap_err(),
            KopiaError::ServerNotRunning
        ));

        // Getting HTTP client when not running should return None
        assert!(server.get_http_client().is_none());

        // Status should still be not running after failed operations
        let status2 = server.status();
        assert!(!status2.running);
    }

    #[test]
    fn test_repository_connect_request_validation() {
        // Valid filesystem config
        let valid_request = RepositoryConnectRequest {
            storage: StorageConfig {
                storage_type: "filesystem".to_string(),
                config: serde_json::json!({"path": "/backup"}),
            },
            password: "test-password-123".to_string(),
            token: None,
            client_options: None,
            sync_wait_time: None,
        };

        let json = serde_json::to_string(&valid_request).unwrap();
        let deserialized: RepositoryConnectRequest = serde_json::from_str(&json).unwrap();

        assert_eq!(deserialized.password, "test-password-123");
        assert_eq!(deserialized.storage.storage_type, "filesystem");
    }

    #[test]
    fn test_storage_config_json_roundtrip() {
        let configs = vec![
            ("filesystem", serde_json::json!({"path": "/backup/data"})),
            (
                "s3",
                serde_json::json!({
                    "bucket": "my-backup-bucket",
                    "region": "us-west-2",
                    "prefix": "kopia/"
                }),
            ),
            (
                "b2",
                serde_json::json!({
                    "bucket": "my-b2-bucket",
                    "keyId": "key123",
                    "key": "secret456"
                }),
            ),
            (
                "azure",
                serde_json::json!({
                    "container": "backups",
                    "storageAccount": "myaccount",
                    "storageKey": "key=="
                }),
            ),
            (
                "gcs",
                serde_json::json!({
                    "bucket": "gcs-bucket",
                    "credentialsFile": "/path/to/creds.json"
                }),
            ),
            (
                "sftp",
                serde_json::json!({
                    "host": "backup.example.com",
                    "port": 2222,
                    "path": "/backups",
                    "username": "backup-user"
                }),
            ),
            (
                "webdav",
                serde_json::json!({
                    "url": "https://webdav.example.com/backups",
                    "username": "user",
                    "password": "pass"
                }),
            ),
            (
                "rclone",
                serde_json::json!({
                    "remotePath": "myremote:backups",
                    "rcloneExe": "/usr/bin/rclone"
                }),
            ),
        ];

        for (storage_type, config_value) in configs {
            let config = StorageConfig {
                storage_type: storage_type.to_string(),
                config: config_value.clone(),
            };

            // Serialize
            let json = serde_json::to_string(&config).unwrap();

            // Deserialize
            let deserialized: StorageConfig = serde_json::from_str(&json).unwrap();

            // Verify
            assert_eq!(deserialized.storage_type, storage_type);

            // Verify config structure is preserved
            let original_keys: Vec<_> = config_value.as_object().unwrap().keys().collect();
            let deserialized_keys: Vec<_> =
                deserialized.config.as_object().unwrap().keys().collect();
            assert_eq!(original_keys.len(), deserialized_keys.len());
        }
    }

    #[test]
    fn test_error_chain_conversions() {
        // Test error conversion from HTTP
        let http_err = KopiaError::HttpRequestFailed {
            message: "Connection refused".to_string(),
            status_code: None,
            operation: "Test".to_string(),
        };
        assert!(http_err.to_string().contains("Connection refused"));

        // Test error conversion from API response
        let api_err = KopiaError::from_api_response(401, "Invalid token", "Login");
        assert!(matches!(api_err, KopiaError::AuthenticationFailed { .. }));

        let api_err = KopiaError::from_api_response(404, "Not found", "Get snapshot");
        assert!(matches!(api_err, KopiaError::NotFound { .. }));

        let api_err = KopiaError::from_api_response(500, "Internal error", "Operation");
        assert!(matches!(api_err, KopiaError::ApiError { .. }));
    }

    #[test]
    fn test_multiple_storage_configs_in_sequence() {
        let storage_types = [
            "filesystem",
            "s3",
            "b2",
            "azure",
            "gcs",
            "sftp",
            "webdav",
            "rclone",
        ];

        for storage_type in storage_types {
            let config = StorageConfig {
                storage_type: storage_type.to_string(),
                config: serde_json::json!({"test": "value"}),
            };

            let json = serde_json::to_string(&config).unwrap();
            let deserialized: StorageConfig = serde_json::from_str(&json).unwrap();

            assert_eq!(deserialized.storage_type, storage_type);
            assert!(deserialized.config.is_object());
        }
    }

    #[test]
    fn test_error_serialization_roundtrip() {
        let errors = vec![
            KopiaError::ServerNotRunning,
            KopiaError::ServerAlreadyRunning { port: 51515 },
            KopiaError::RepositoryNotConnected {
                api_error_code: None,
            },
            KopiaError::SnapshotNotFound {
                snapshot_id: "abc123".to_string(),
            },
            KopiaError::TaskNotFound {
                task_id: "task-456".to_string(),
            },
            KopiaError::InvalidInput {
                message: "Invalid path".to_string(),
                field: Some("path".to_string()),
            },
        ];

        for error in errors {
            let json = serde_json::to_string(&error).unwrap();
            let deserialized: KopiaError = serde_json::from_str(&json).unwrap();
            assert_eq!(error, deserialized);
        }
    }

    #[test]
    fn test_complex_error_with_optional_fields() {
        // Error with all optional fields present
        let err1 = KopiaError::SnapshotCreationFailed {
            message: "Failed to create".to_string(),
            snapshot_source: Some("user@host:/path".to_string()),
            snapshot_path: Some("/backup/path".to_string()),
        };

        let json1 = serde_json::to_string(&err1).unwrap();
        let deser1: KopiaError = serde_json::from_str(&json1).unwrap();
        assert_eq!(err1, deser1);

        // Error with no optional fields
        let err2 = KopiaError::SnapshotCreationFailed {
            message: "Failed to create".to_string(),
            snapshot_source: None,
            snapshot_path: None,
        };

        let json2 = serde_json::to_string(&err2).unwrap();
        let deser2: KopiaError = serde_json::from_str(&json2).unwrap();
        assert_eq!(err2, deser2);

        // JSON should skip None fields
        assert!(!json2.contains("snapshot_source"));
        assert!(!json2.contains("snapshot_path"));
    }

    #[test]
    fn test_password_strength_requirements() {
        // Passwords should be long enough for security
        use base64::Engine;
        use rand::Rng;

        let mut rng = rand::thread_rng();
        let random_bytes: [u8; 32] = rng.gen();
        let password = base64::prelude::BASE64_STANDARD.encode(random_bytes);

        // Should be 44 characters (Base64 of 32 bytes)
        assert_eq!(password.len(), 44);

        // Should only contain Base64 characters
        assert!(password
            .chars()
            .all(|c| c.is_alphanumeric() || c == '+' || c == '/' || c == '='));
    }

    #[test]
    fn test_config_dir_path_structure() {
        use crate::commands::kopia::get_default_config_dir;

        let config_dir = get_default_config_dir().unwrap();

        // Should be absolute path
        #[cfg(unix)]
        assert!(config_dir.starts_with('/'));

        #[cfg(windows)]
        assert!(config_dir.contains(":\\") || config_dir.starts_with("\\\\"));

        // Should end with "kopia"
        assert!(config_dir.ends_with("kopia"));

        // Should contain .config on Unix
        #[cfg(unix)]
        assert!(config_dir.contains(".config"));

        // Should contain AppData\Roaming on Windows
        #[cfg(windows)]
        {
            assert!(config_dir.contains("AppData"));
            assert!(config_dir.contains("Roaming"));
        }
    }
}
