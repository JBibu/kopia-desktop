//! Error edge case tests
//!
//! Tests for error handling edge cases and boundary conditions.

#[cfg(test)]
mod tests {
    use crate::error::KopiaError;

    #[test]
    fn test_error_with_empty_strings() {
        let errors = vec![
            KopiaError::ServerStartFailed {
                message: String::new(),
                details: Some(String::new()),
            },
            KopiaError::InvalidInput {
                message: String::new(),
                field: Some(String::new()),
            },
            KopiaError::PathNotFound {
                path: String::new(),
            },
        ];

        for error in errors {
            // Should not panic with empty strings
            let display = error.to_string();
            assert!(!display.is_empty());

            // Should serialize/deserialize
            let json = serde_json::to_string(&error).unwrap();
            let _: KopiaError = serde_json::from_str(&json).unwrap();
        }
    }

    #[test]
    fn test_error_with_very_long_strings() {
        let long_message = "x".repeat(10000);
        let error = KopiaError::InternalError {
            message: long_message.clone(),
            details: Some(long_message.clone()),
        };

        let json = serde_json::to_string(&error).unwrap();
        let deserialized: KopiaError = serde_json::from_str(&json).unwrap();

        if let KopiaError::InternalError { message, .. } = deserialized {
            assert_eq!(message.len(), 10000);
        } else {
            panic!("Expected InternalError");
        }
    }

    #[test]
    fn test_error_with_special_json_characters() {
        let message = r#"Message with "quotes" and \backslashes\ and /slashes/"#;
        let error = KopiaError::JsonError {
            message: message.to_string(),
        };

        let json = serde_json::to_string(&error).unwrap();
        let deserialized: KopiaError = serde_json::from_str(&json).unwrap();

        if let KopiaError::JsonError { message: msg } = deserialized {
            assert_eq!(msg, message);
        } else {
            panic!("Expected JsonError");
        }
    }

    #[test]
    fn test_error_with_unicode() {
        let errors = vec![
            KopiaError::FileIOError {
                message: "错误消息".to_string(),      // Chinese
                path: Some("/путь/файл".to_string()), // Russian
            },
            KopiaError::SnapshotNotFound {
                snapshot_id: "スナップショット-123".to_string(), // Japanese
            },
            KopiaError::InvalidInput {
                message: "😀🎉🔥".to_string(), // Emoji
                field: Some("フィールド".to_string()),
            },
        ];

        for error in errors {
            let json = serde_json::to_string(&error).unwrap();
            let deserialized: KopiaError = serde_json::from_str(&json).unwrap();
            assert_eq!(error, deserialized);
        }
    }

    #[test]
    fn test_error_with_newlines_and_tabs() {
        let message = "Line 1\nLine 2\tTabbed\r\nWindows newline";
        let error = KopiaError::ServerStartFailed {
            message: message.to_string(),
            details: None,
        };

        let json = serde_json::to_string(&error).unwrap();
        let deserialized: KopiaError = serde_json::from_str(&json).unwrap();

        if let KopiaError::ServerStartFailed { message: msg, .. } = deserialized {
            assert!(msg.contains("Line 1"));
            assert!(msg.contains("Line 2"));
        } else {
            panic!("Expected ServerStartFailed");
        }
    }

    #[test]
    fn test_error_status_code_boundaries() {
        let codes = vec![
            0,
            100,
            200,
            301,
            400,
            401,
            403,
            404,
            500,
            503,
            999,
            u16::MAX,
        ];

        for code in codes {
            let error = KopiaError::ApiError {
                status_code: code,
                message: "test".to_string(),
                operation: "test".to_string(),
            };

            let json = serde_json::to_string(&error).unwrap();
            let deserialized: KopiaError = serde_json::from_str(&json).unwrap();

            if let KopiaError::ApiError { status_code, .. } = deserialized {
                assert_eq!(status_code, code);
            } else {
                panic!("Expected ApiError");
            }
        }
    }

    #[test]
    fn test_error_timeout_seconds_boundaries() {
        let timeouts = vec![0, 1, 30, 60, 300, 3600, u64::MAX];

        for timeout in timeouts {
            let error = KopiaError::Timeout {
                operation: "test".to_string(),
                timeout_seconds: timeout,
            };

            let json = serde_json::to_string(&error).unwrap();
            let deserialized: KopiaError = serde_json::from_str(&json).unwrap();

            if let KopiaError::Timeout {
                timeout_seconds, ..
            } = deserialized
            {
                assert_eq!(timeout_seconds, timeout);
            } else {
                panic!("Expected Timeout");
            }
        }
    }

    #[test]
    fn test_error_with_empty_vec() {
        let error = KopiaError::BinaryNotFound {
            message: "not found".to_string(),
            searched_paths: vec![],
        };

        let json = serde_json::to_string(&error).unwrap();
        let deserialized: KopiaError = serde_json::from_str(&json).unwrap();

        if let KopiaError::BinaryNotFound { searched_paths, .. } = deserialized {
            assert!(searched_paths.is_empty());
        } else {
            panic!("Expected BinaryNotFound");
        }
    }

    #[test]
    fn test_error_with_many_paths() {
        let paths: Vec<_> = (0..100).map(|i| format!("/path/to/binary{}", i)).collect();

        let error = KopiaError::BinaryNotFound {
            message: "not found".to_string(),
            searched_paths: paths.clone(),
        };

        let json = serde_json::to_string(&error).unwrap();
        let deserialized: KopiaError = serde_json::from_str(&json).unwrap();

        if let KopiaError::BinaryNotFound { searched_paths, .. } = deserialized {
            assert_eq!(searched_paths.len(), 100);
            assert_eq!(searched_paths[0], "/path/to/binary0");
            assert_eq!(searched_paths[99], "/path/to/binary99");
        } else {
            panic!("Expected BinaryNotFound");
        }
    }

    #[test]
    fn test_all_simple_errors_serialize() {
        // Errors with no fields
        let simple_errors = vec![
            KopiaError::ServerNotRunning,
            KopiaError::RepositoryNotConnected,
            KopiaError::WebSocketAlreadyConnected,
            KopiaError::WebSocketNotConnected,
        ];

        for error in simple_errors {
            let json = serde_json::to_string(&error).unwrap();
            let deserialized: KopiaError = serde_json::from_str(&json).unwrap();
            assert_eq!(error, deserialized);

            // JSON should be compact for simple errors
            assert!(json.len() < 100);
        }
    }

    #[test]
    fn test_error_json_field_order_independent() {
        // Test that deserializing with different field orders works
        let json1 = r#"{"type":"SERVER_ALREADY_RUNNING","data":{"port":8080}}"#;
        let json2 = r#"{"data":{"port":8080},"type":"SERVER_ALREADY_RUNNING"}"#;

        let err1: KopiaError = serde_json::from_str(json1).unwrap();
        let err2: KopiaError = serde_json::from_str(json2).unwrap();

        assert_eq!(err1, err2);
    }

    #[test]
    fn test_error_serialization_idempotent() {
        let error = KopiaError::SnapshotCreationFailed {
            message: "Failed".to_string(),
            snapshot_source: Some("source".to_string()),
            snapshot_path: Some("path".to_string()),
        };

        // Serialize -> Deserialize -> Serialize should be identical
        let json1 = serde_json::to_string(&error).unwrap();
        let deserialized: KopiaError = serde_json::from_str(&json1).unwrap();
        let json2 = serde_json::to_string(&deserialized).unwrap();

        assert_eq!(json1, json2);
    }

    #[test]
    fn test_error_display_never_empty() {
        // Create one error of each variant type and verify display is never empty
        let error_variants = vec![
            KopiaError::ServerNotRunning,
            KopiaError::ServerAlreadyRunning { port: 0 },
            KopiaError::RepositoryNotConnected,
            KopiaError::WebSocketNotConnected,
            KopiaError::InvalidInput {
                message: "x".to_string(),
                field: None,
            },
        ];

        for error in error_variants {
            let display = format!("{}", error);
            assert!(!display.is_empty());
            assert!(display.len() > 0);
        }
    }

    #[test]
    fn test_error_port_number_boundaries() {
        let ports = vec![0, 1, 80, 443, 1024, 8080, 51515, 65535];

        for port in ports {
            let error = KopiaError::ServerAlreadyRunning { port };

            let json = serde_json::to_string(&error).unwrap();
            let deserialized: KopiaError = serde_json::from_str(&json).unwrap();

            if let KopiaError::ServerAlreadyRunning { port: p } = deserialized {
                assert_eq!(p, port);
            } else {
                panic!("Expected ServerAlreadyRunning");
            }
        }
    }

    #[test]
    fn test_error_paths_with_special_characters() {
        let paths = vec![
            "/path/with spaces/file.txt",
            "C:\\Windows\\Path\\file.txt",
            "/path/with/ünïcödé/chars",
            "/path/with/$special/!chars",
            "\\\\network\\share\\path",
        ];

        for path in paths {
            let error = KopiaError::PathNotFound {
                path: path.to_string(),
            };

            let json = serde_json::to_string(&error).unwrap();
            let deserialized: KopiaError = serde_json::from_str(&json).unwrap();

            if let KopiaError::PathNotFound { path: p } = deserialized {
                assert_eq!(p, path);
            } else {
                panic!("Expected PathNotFound");
            }
        }
    }
}
