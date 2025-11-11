/// Unit tests for types.rs
/// Tests Default implementations and other derived traits

#[cfg(test)]
mod tests {
    use crate::types::*;

    #[test]
    fn test_client_options_default() {
        let options = ClientOptions::default();

        assert!(options.description.is_none());
        assert!(options.username.is_none());
        assert!(options.hostname.is_none());
        assert!(options.readonly.is_none());
    }

    #[test]
    fn test_repository_create_options_default() {
        let options = RepositoryCreateOptions::default();

        assert!(options.block_format.is_none());
        assert!(options.object_format.is_none());
        assert!(options.retention_mode.is_none());
        assert!(options.retention_period.is_none());
        assert!(options.ecc.is_none());
        assert!(options.ecc_overhead_percent.is_none());
    }

    #[test]
    fn test_block_format_options_default() {
        let options = BlockFormatOptions::default();

        assert!(options.hash.is_none());
        assert!(options.encryption.is_none());
        assert!(options.splitter.is_none());
        assert!(options.version.is_none());
    }

    #[test]
    fn test_object_format_options_default() {
        let options = ObjectFormatOptions::default();

        assert!(options.splitter.is_none());
        assert!(options.min_content_size.is_none());
        assert!(options.max_content_size.is_none());
    }

    #[test]
    fn test_client_options_clone() {
        let options = ClientOptions {
            description: Some("desc".to_string()),
            username: Some("user".to_string()),
            hostname: Some("host".to_string()),
            readonly: Some(true),
        };

        let cloned = options.clone();

        assert_eq!(cloned.description, Some("desc".to_string()));
        assert_eq!(cloned.username, Some("user".to_string()));
        assert_eq!(cloned.hostname, Some("host".to_string()));
        assert_eq!(cloned.readonly, Some(true));
    }

    #[test]
    fn test_repository_create_options_clone() {
        let options = RepositoryCreateOptions {
            block_format: Some(BlockFormatOptions {
                hash: Some("BLAKE3".to_string()),
                encryption: None,
                splitter: None,
                version: None,
            }),
            object_format: None,
            retention_mode: Some("locked".to_string()),
            retention_period: Some("30d".to_string()),
            ecc: Some("reed-solomon".to_string()),
            ecc_overhead_percent: Some(2.5),
        };

        let cloned = options.clone();

        assert!(cloned.block_format.is_some());
        assert_eq!(cloned.retention_mode, Some("locked".to_string()));
        assert_eq!(cloned.ecc_overhead_percent, Some(2.5));
    }

    #[test]
    fn test_block_format_options_partial_eq() {
        let opts1 = BlockFormatOptions {
            hash: Some("BLAKE3".to_string()),
            encryption: Some("AES256".to_string()),
            splitter: None,
            version: None,
        };

        let opts2 = BlockFormatOptions {
            hash: Some("BLAKE3".to_string()),
            encryption: Some("AES256".to_string()),
            splitter: None,
            version: None,
        };

        assert_eq!(opts1, opts2);
    }

    #[test]
    fn test_object_format_options_partial_eq() {
        let opts1 = ObjectFormatOptions {
            splitter: Some("DYNAMIC".to_string()),
            min_content_size: Some(1024),
            max_content_size: Some(10240),
        };

        let opts2 = ObjectFormatOptions {
            splitter: Some("DYNAMIC".to_string()),
            min_content_size: Some(1024),
            max_content_size: Some(10240),
        };

        assert_eq!(opts1, opts2);
    }

    #[test]
    fn test_block_format_options_not_equal() {
        let opts1 = BlockFormatOptions {
            hash: Some("BLAKE3".to_string()),
            encryption: None,
            splitter: None,
            version: None,
        };

        let opts2 = BlockFormatOptions {
            hash: Some("SHA256".to_string()),
            encryption: None,
            splitter: None,
            version: None,
        };

        assert_ne!(opts1, opts2);
    }

    #[test]
    fn test_storage_config_debug() {
        use serde_json::json;

        let config = StorageConfig {
            storage_type: "filesystem".to_string(),
            config: json!({"path": "/backup"}),
        };

        let debug_str = format!("{:?}", config);
        assert!(debug_str.contains("StorageConfig"));
        assert!(debug_str.contains("filesystem"));
    }

    #[test]
    fn test_source_info_debug() {
        let source = SourceInfo {
            user_name: "user".to_string(),
            host: "localhost".to_string(),
            path: "/data".to_string(),
        };

        let debug_str = format!("{:?}", source);
        assert!(debug_str.contains("SourceInfo"));
        assert!(debug_str.contains("user"));
        assert!(debug_str.contains("localhost"));
    }

    #[test]
    fn test_repository_connect_request_debug() {
        use serde_json::json;

        let request = RepositoryConnectRequest {
            storage: StorageConfig {
                storage_type: "filesystem".to_string(),
                config: json!({"path": "/backup"}),
            },
            password: "secret".to_string(),
            token: None,
            client_options: None,
        };

        let debug_str = format!("{:?}", request);
        assert!(debug_str.contains("RepositoryConnectRequest"));
    }

    #[test]
    fn test_repository_create_request_debug() {
        use serde_json::json;

        let request = RepositoryCreateRequest {
            storage: StorageConfig {
                storage_type: "filesystem".to_string(),
                config: json!({"path": "/backup"}),
            },
            password: "secret".to_string(),
            options: None,
            client_options: None,
        };

        let debug_str = format!("{:?}", request);
        assert!(debug_str.contains("RepositoryCreateRequest"));
    }
}
