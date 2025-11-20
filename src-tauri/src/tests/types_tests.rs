//! Tests for types module
//!
//! These tests verify type serialization, deserialization, and conversions.

#[cfg(test)]
mod tests {
    use crate::types::{RepositoryConnectRequest, RepositoryStatus, SourceInfo, StorageConfig};

    #[test]
    fn test_source_info_serde() {
        let source = SourceInfo {
            user_name: "test".to_string(),
            host: "localhost".to_string(),
            path: "/test/path".to_string(),
        };

        let json = serde_json::to_string(&source).unwrap();
        assert!(json.contains("userName")); // camelCase
        assert!(json.contains("test"));
        assert!(json.contains("localhost"));

        let deserialized: SourceInfo = serde_json::from_str(&json).unwrap();
        assert_eq!(source.user_name, deserialized.user_name);
        assert_eq!(source.host, deserialized.host);
        assert_eq!(source.path, deserialized.path);
    }

    #[test]
    fn test_repository_status_serde() {
        let status_json = r#"{
            "connected": true,
            "configFile": "/path/to/config"
        }"#;

        let status: RepositoryStatus = serde_json::from_str(status_json).unwrap();
        assert!(status.connected);
        assert_eq!(status.config_file, Some("/path/to/config".to_string()));
    }

    #[test]
    fn test_storage_config_filesystem() {
        let config = StorageConfig {
            storage_type: "filesystem".to_string(),
            config: serde_json::json!({
                "path": "/backup/path"
            }),
        };

        let json = serde_json::to_string(&config).unwrap();
        assert!(json.contains("filesystem"));
        assert!(json.contains("/backup/path"));

        let deserialized: StorageConfig = serde_json::from_str(&json).unwrap();
        assert_eq!(deserialized.storage_type, "filesystem");
    }

    #[test]
    fn test_storage_config_s3() {
        let config = StorageConfig {
            storage_type: "s3".to_string(),
            config: serde_json::json!({
                "bucket": "my-bucket",
                "region": "us-east-1"
            }),
        };

        let json = serde_json::to_string(&config).unwrap();
        assert!(json.contains("s3"));
        assert!(json.contains("my-bucket"));
        assert!(json.contains("us-east-1"));

        let deserialized: StorageConfig = serde_json::from_str(&json).unwrap();
        assert_eq!(deserialized.storage_type, "s3");
        assert_eq!(deserialized.config["bucket"], "my-bucket");
    }

    #[test]
    fn test_repository_connect_request() {
        let request = RepositoryConnectRequest {
            storage: StorageConfig {
                storage_type: "filesystem".to_string(),
                config: serde_json::json!({"path": "/test"}),
            },
            password: "secret".to_string(),
            token: None,
            client_options: None,
        };

        let json = serde_json::to_string(&request).unwrap();
        assert!(json.contains("storage"));
        assert!(json.contains("password"));
        assert!(json.contains("filesystem"));
    }

    // Note: TaskInfo and TaskStatus tests removed as they don't exist in types.rs
    // They might be defined elsewhere or may need to be added

    #[test]
    fn test_storage_config_all_types() {
        // Test that all storage types can be serialized/deserialized
        let storage_types = vec![
            ("filesystem", serde_json::json!({"path": "/test"})),
            ("s3", serde_json::json!({"bucket": "bucket"})),
            ("b2", serde_json::json!({"bucket": "bucket"})),
            ("azure", serde_json::json!({"container": "container"})),
            ("gcs", serde_json::json!({"bucket": "bucket"})),
            (
                "sftp",
                serde_json::json!({"host": "server.com", "path": "/backup"}),
            ),
            (
                "webdav",
                serde_json::json!({"url": "https://webdav.example.com"}),
            ),
            ("rclone", serde_json::json!({"remotePath": "remote:backup"})),
        ];

        for (storage_type, config_value) in storage_types {
            let config = StorageConfig {
                storage_type: storage_type.to_string(),
                config: config_value,
            };

            let json = serde_json::to_string(&config).unwrap();
            let deserialized: StorageConfig = serde_json::from_str(&json).unwrap();

            assert_eq!(deserialized.storage_type, storage_type);
            // If we got here, serialization worked
        }
    }
}
