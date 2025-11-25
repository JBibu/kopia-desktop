//! Tests for Kopia command handlers
//!
//! These tests verify command handler logic and error handling.

#[cfg(test)]
mod tests {
    use crate::commands::kopia::get_default_config_dir;
    use crate::error::KopiaError;
    use crate::types::{RepositoryConnectRequest, RepositoryCreateRequest, StorageConfig};

    #[test]
    fn test_repository_connect_request_all_fields() {
        let request = RepositoryConnectRequest {
            storage: StorageConfig {
                storage_type: "filesystem".to_string(),
                config: serde_json::json!({"path": "/test/path"}),
            },
            password: "super-secret-password".to_string(),
            token: Some("auth-token-123".to_string()),
            client_options: None,
        };

        // Serialize and verify
        let json = serde_json::to_string(&request).unwrap();
        assert!(json.contains("super-secret-password"));
        assert!(json.contains("auth-token-123"));
        assert!(json.contains("filesystem"));

        // Deserialize and verify
        let deserialized: RepositoryConnectRequest = serde_json::from_str(&json).unwrap();
        assert_eq!(deserialized.password, "super-secret-password");
        assert_eq!(deserialized.token, Some("auth-token-123".to_string()));
    }

    #[test]
    fn test_repository_create_request_minimal() {
        let request = RepositoryCreateRequest {
            storage: StorageConfig {
                storage_type: "s3".to_string(),
                config: serde_json::json!({
                    "bucket": "my-backup-bucket",
                    "region": "us-west-2"
                }),
            },
            password: "password123".to_string(),
            options: None,
            client_options: None,
        };

        let json = serde_json::to_string(&request).unwrap();
        let deserialized: RepositoryCreateRequest = serde_json::from_str(&json).unwrap();

        assert_eq!(deserialized.storage.storage_type, "s3");
        assert_eq!(deserialized.password, "password123");
        assert!(deserialized.options.is_none());
    }

    #[test]
    fn test_config_dir_multiple_calls_same_result() {
        let dir1 = get_default_config_dir().unwrap();
        let dir2 = get_default_config_dir().unwrap();
        let dir3 = get_default_config_dir().unwrap();

        assert_eq!(dir1, dir2);
        assert_eq!(dir2, dir3);
    }

    #[test]
    fn test_config_dir_ends_with_kopia() {
        let dir = get_default_config_dir().unwrap();
        assert!(
            dir.ends_with("kopia"),
            "Config dir should end with 'kopia', got: {}",
            dir
        );
    }

    #[cfg(unix)]
    #[test]
    fn test_config_dir_unix_absolute_path() {
        let dir = get_default_config_dir().unwrap();
        assert!(
            dir.starts_with('/'),
            "Unix config dir should be absolute: {}",
            dir
        );
        assert!(dir.contains(".config"));
    }

    #[cfg(windows)]
    #[test]
    fn test_config_dir_windows_absolute_path() {
        let dir = get_default_config_dir().unwrap();
        assert!(
            dir.contains(":\\") || dir.starts_with("\\\\"),
            "Windows config dir should be absolute: {}",
            dir
        );
        assert!(dir.contains("AppData"));
        assert!(dir.contains("Roaming"));
    }

    #[test]
    fn test_storage_config_empty_config() {
        let config = StorageConfig {
            storage_type: "test".to_string(),
            config: serde_json::json!({}),
        };

        let json = serde_json::to_string(&config).unwrap();
        let deserialized: StorageConfig = serde_json::from_str(&json).unwrap();

        assert_eq!(deserialized.storage_type, "test");
        assert!(deserialized.config.is_object());
        assert_eq!(deserialized.config.as_object().unwrap().len(), 0);
    }

    #[test]
    fn test_storage_config_nested_json() {
        let config = StorageConfig {
            storage_type: "complex".to_string(),
            config: serde_json::json!({
                "nested": {
                    "deep": {
                        "value": "test"
                    }
                },
                "array": [1, 2, 3]
            }),
        };

        let json = serde_json::to_string(&config).unwrap();
        let deserialized: StorageConfig = serde_json::from_str(&json).unwrap();

        assert_eq!(deserialized.config["nested"]["deep"]["value"], "test");
        assert_eq!(deserialized.config["array"][1], 2);
    }

    #[test]
    fn test_repository_connect_request_without_token() {
        let request = RepositoryConnectRequest {
            storage: StorageConfig {
                storage_type: "b2".to_string(),
                config: serde_json::json!({"bucket": "test"}),
            },
            password: "pass".to_string(),
            token: None,
            client_options: None,
        };

        let json = serde_json::to_string(&request).unwrap();

        // Token field should not be present when None
        // (depends on serde skip_serializing_if)
        let deserialized: RepositoryConnectRequest = serde_json::from_str(&json).unwrap();
        assert_eq!(deserialized.token, None);
    }

    #[test]
    fn test_multiple_storage_types_distinct() {
        let types = [
            "filesystem",
            "s3",
            "b2",
            "azure",
            "gcs",
            "sftp",
            "webdav",
            "rclone",
        ];

        let configs: Vec<_> = types
            .iter()
            .map(|&t| StorageConfig {
                storage_type: t.to_string(),
                config: serde_json::json!({"type_marker": t}),
            })
            .collect();

        // Each should serialize uniquely
        for (i, config) in configs.iter().enumerate() {
            let json = serde_json::to_string(config).unwrap();
            assert!(json.contains(types[i]));
        }
    }

    #[test]
    fn test_error_display_messages() {
        let errors = vec![
            (KopiaError::ServerNotRunning, "Kopia server is not running"),
            (
                KopiaError::RepositoryNotConnected,
                "Repository is not connected",
            ),
            (
                KopiaError::WebSocketNotConnected,
                "WebSocket is not connected",
            ),
        ];

        for (error, expected) in errors {
            assert_eq!(error.to_string(), expected);
        }
    }

    #[test]
    fn test_error_with_details() {
        let error = KopiaError::ServerStartFailed {
            message: "Failed to bind port".to_string(),
            details: Some("Port 51515 already in use".to_string()),
        };

        let display = error.to_string();
        assert!(display.contains("Failed to bind port"));
    }

    #[test]
    fn test_binary_not_found_error() {
        let error = KopiaError::BinaryNotFound {
            message: "Kopia binary not found".to_string(),
            searched_paths: vec![
                "/usr/bin/kopia".to_string(),
                "/usr/local/bin/kopia".to_string(),
                "./bin/kopia".to_string(),
            ],
        };

        let json = serde_json::to_string(&error).unwrap();
        assert!(json.contains("searched_paths"));
        assert!(json.contains("/usr/bin/kopia"));
    }
}
