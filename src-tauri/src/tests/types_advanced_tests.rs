//! Advanced type tests
//!
//! Tests for complex type scenarios and edge cases.

#[cfg(test)]
mod tests {
    use crate::types::{
        ClientOptions, RepositoryConnectRequest, RepositoryCreateOptions, RepositoryCreateRequest,
        SourceInfo, StorageConfig,
    };

    #[test]
    fn test_source_info_all_combinations() {
        let sources = vec![
            ("user", "host", "/path"),
            ("admin", "localhost", "/backup"),
            ("test-user", "test.example.com", "/home/test"),
            ("user.name", "host-123", "/var/backups"),
        ];

        for (user, host, path) in sources {
            let source = SourceInfo {
                user_name: user.to_string(),
                host: host.to_string(),
                path: path.to_string(),
            };

            let json = serde_json::to_string(&source).unwrap();
            let deserialized: SourceInfo = serde_json::from_str(&json).unwrap();

            assert_eq!(deserialized.user_name, user);
            assert_eq!(deserialized.host, host);
            assert_eq!(deserialized.path, path);
        }
    }

    #[test]
    fn test_client_options_all_fields() {
        let options = ClientOptions {
            description: Some("Test repository".to_string()),
            username: Some("custom-user".to_string()),
            hostname: Some("custom-host".to_string()),
            readonly: Some(true),
            ..Default::default()
        };

        let json = serde_json::to_string(&options).unwrap();
        assert!(json.contains("Test repository"));
        assert!(json.contains("custom-user"));
        assert!(json.contains("custom-host"));

        let deserialized: ClientOptions = serde_json::from_str(&json).unwrap();
        assert_eq!(
            deserialized.description,
            Some("Test repository".to_string())
        );
        assert_eq!(deserialized.readonly, Some(true));
    }

    #[test]
    fn test_client_options_default() {
        let options = ClientOptions::default();

        assert_eq!(options.description, None);
        assert_eq!(options.username, None);
        assert_eq!(options.hostname, None);
        assert_eq!(options.readonly, None);
    }

    #[test]
    fn test_client_options_partial() {
        let options = ClientOptions {
            description: Some("Partial".to_string()),
            username: None,
            hostname: Some("host".to_string()),
            readonly: None,
            ..Default::default()
        };

        let json = serde_json::to_string(&options).unwrap();
        let deserialized: ClientOptions = serde_json::from_str(&json).unwrap();

        assert_eq!(deserialized.description, Some("Partial".to_string()));
        assert_eq!(deserialized.username, None);
        assert_eq!(deserialized.hostname, Some("host".to_string()));
    }

    #[test]
    fn test_repository_create_request_with_options() {
        let request = RepositoryCreateRequest {
            storage: StorageConfig {
                storage_type: "filesystem".to_string(),
                config: serde_json::json!({"path": "/backup"}),
            },
            password: "secure-password".to_string(),
            options: Some(RepositoryCreateOptions::default()),
            client_options: Some(ClientOptions {
                description: Some("My Backup".to_string()),
                username: None,
                hostname: None,
                readonly: Some(false),
                ..Default::default()
            }),
            sync_wait_time: None,
        };

        let json = serde_json::to_string(&request).unwrap();
        assert!(json.contains("My Backup"));
        assert!(json.contains("secure-password"));

        let deserialized: RepositoryCreateRequest = serde_json::from_str(&json).unwrap();
        assert!(deserialized.options.is_some());
        assert!(deserialized.client_options.is_some());
    }

    #[test]
    fn test_repository_create_options_default() {
        let options = RepositoryCreateOptions::default();

        assert_eq!(options.block_format, None);
        assert_eq!(options.object_format, None);
        assert_eq!(options.retention_mode, None);
        assert_eq!(options.retention_period, None);
        assert_eq!(options.ecc, None);
        assert_eq!(options.ecc_overhead_percent, None);
    }

    #[test]
    fn test_storage_config_all_storage_types_detailed() {
        let configs = vec![
            (
                "filesystem",
                serde_json::json!({
                    "path": "/mnt/backup",
                    "dirShards": [1, 2]
                }),
            ),
            (
                "s3",
                serde_json::json!({
                    "bucket": "my-backups",
                    "region": "eu-west-1",
                    "endpoint": "s3.amazonaws.com",
                    "prefix": "kopia/"
                }),
            ),
            (
                "b2",
                serde_json::json!({
                    "bucket": "b2-bucket",
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
                    "bucket": "gcs-backups",
                    "credentialsFile": "/path/to/creds.json",
                    "readOnly": false
                }),
            ),
            (
                "sftp",
                serde_json::json!({
                    "host": "sftp.example.com",
                    "port": 22,
                    "path": "/backups",
                    "username": "backup-user",
                    "keyfile": "/home/user/.ssh/id_rsa"
                }),
            ),
            (
                "webdav",
                serde_json::json!({
                    "url": "https://webdav.example.com/remote.php/dav/files/user/",
                    "username": "user",
                    "password": "pass"
                }),
            ),
            (
                "rclone",
                serde_json::json!({
                    "remotePath": "gdrive:Backups",
                    "rcloneExe": "/usr/bin/rclone",
                    "rcloneArgs": ["--verbose"]
                }),
            ),
        ];

        for (storage_type, config_value) in configs {
            let config = StorageConfig {
                storage_type: storage_type.to_string(),
                config: config_value.clone(),
            };

            // Test serialization
            let json = serde_json::to_string(&config).unwrap();
            assert!(json.contains(storage_type));

            // Test deserialization
            let deserialized: StorageConfig = serde_json::from_str(&json).unwrap();
            assert_eq!(deserialized.storage_type, storage_type);

            // Verify config structure preserved
            assert_eq!(
                deserialized.config.as_object().unwrap().len(),
                config_value.as_object().unwrap().len()
            );
        }
    }

    #[test]
    fn test_source_info_special_characters() {
        let source = SourceInfo {
            user_name: "user-name.test".to_string(),
            host: "host-123.example.com".to_string(),
            path: "/path/with spaces/and-dashes".to_string(),
        };

        let json = serde_json::to_string(&source).unwrap();
        let deserialized: SourceInfo = serde_json::from_str(&json).unwrap();

        assert_eq!(deserialized.user_name, "user-name.test");
        assert_eq!(deserialized.host, "host-123.example.com");
        assert_eq!(deserialized.path, "/path/with spaces/and-dashes");
    }

    #[test]
    fn test_source_info_unicode() {
        let source = SourceInfo {
            user_name: "用户".to_string(),     // Chinese
            host: "хост".to_string(),          // Russian
            path: "/путь/к/файлу".to_string(), // Russian path
        };

        let json = serde_json::to_string(&source).unwrap();
        let deserialized: SourceInfo = serde_json::from_str(&json).unwrap();

        assert_eq!(deserialized.user_name, "用户");
        assert_eq!(deserialized.host, "хост");
        assert_eq!(deserialized.path, "/путь/к/файлу");
    }

    #[test]
    fn test_repository_connect_request_json_field_names() {
        let request = RepositoryConnectRequest {
            storage: StorageConfig {
                storage_type: "test".to_string(),
                config: serde_json::json!({}),
            },
            password: "pass".to_string(),
            token: Some("token".to_string()),
            client_options: Some(ClientOptions {
                description: Some("desc".to_string()),
                username: Some("user".to_string()),
                hostname: Some("host".to_string()),
                readonly: Some(true),
                ..Default::default()
            }),
            sync_wait_time: None,
        };

        let json = serde_json::to_string(&request).unwrap();

        // Verify camelCase field names
        assert!(json.contains("clientOptions"));
        assert!(!json.contains("client_options"));
    }

    #[test]
    fn test_storage_config_with_null_values() {
        let json = r#"{
            "type": "test",
            "config": {
                "field1": null,
                "field2": "value"
            }
        }"#;

        let config: StorageConfig = serde_json::from_str(json).unwrap();
        assert_eq!(config.storage_type, "test");
        assert!(config.config["field1"].is_null());
        assert_eq!(config.config["field2"], "value");
    }

    #[test]
    fn test_multiple_repository_requests_sequence() {
        for i in 0..10 {
            let request = RepositoryConnectRequest {
                storage: StorageConfig {
                    storage_type: format!("type{}", i),
                    config: serde_json::json!({"index": i}),
                },
                password: format!("password{}", i),
                token: None,
                client_options: None,
                sync_wait_time: None,
            };

            let json = serde_json::to_string(&request).unwrap();
            let deserialized: RepositoryConnectRequest = serde_json::from_str(&json).unwrap();

            assert_eq!(deserialized.storage.storage_type, format!("type{}", i));
            assert_eq!(deserialized.password, format!("password{}", i));
        }
    }

    #[test]
    fn test_client_options_readonly_variations() {
        let variations = vec![(Some(true), "true"), (Some(false), "false"), (None, "null")];

        for (readonly, expected_in_json) in variations {
            let options = ClientOptions {
                description: None,
                username: None,
                hostname: None,
                readonly,
                ..Default::default()
            };

            let json = serde_json::to_string(&options).unwrap();
            if readonly.is_some() {
                assert!(json.contains(expected_in_json));
            }
        }
    }
}
