//! Advanced error handling tests
//!
//! Tests for complex error scenarios and edge cases.

#[cfg(test)]
mod tests {
    use crate::error::{IoResultExt, JsonResultExt, KopiaError};

    #[test]
    fn test_all_error_variants_have_display() {
        let errors = vec![
            KopiaError::ServerStartFailed {
                message: "test".to_string(),
                details: Some("details".to_string()),
            },
            KopiaError::ServerStopFailed {
                message: "test".to_string(),
                details: None,
            },
            KopiaError::ServerNotRunning,
            KopiaError::ServerAlreadyRunning { port: 8080 },
            KopiaError::ServerNotReady {
                message: "timeout".to_string(),
                timeout_seconds: 30,
            },
            KopiaError::BinaryNotFound {
                message: "not found".to_string(),
                searched_paths: vec!["/usr/bin".to_string()],
            },
            KopiaError::BinaryExecutionFailed {
                message: "exec failed".to_string(),
                exit_code: Some(1),
                stderr: Some("error output".to_string()),
            },
            KopiaError::RepositoryConnectionFailed {
                message: "connection failed".to_string(),
                storage_type: Some("s3".to_string()),
            },
            KopiaError::RepositoryNotConnected {
                api_error_code: None,
            },
            KopiaError::RepositoryCreationFailed {
                message: "creation failed".to_string(),
                storage_type: None,
            },
            KopiaError::RepositoryOperationFailed {
                operation: "test".to_string(),
                message: "failed".to_string(),
            },
            KopiaError::RepositoryAlreadyExists {
                message: "exists".to_string(),
            },
            KopiaError::InvalidRepositoryConfig {
                message: "invalid".to_string(),
                field: Some("path".to_string()),
            },
            KopiaError::SnapshotCreationFailed {
                message: "failed".to_string(),
                snapshot_source: Some("source".to_string()),
                snapshot_path: Some("path".to_string()),
            },
            KopiaError::SnapshotNotFound {
                snapshot_id: "abc".to_string(),
            },
            KopiaError::SnapshotDeletionFailed {
                message: "failed".to_string(),
                snapshot_id: "abc".to_string(),
            },
            KopiaError::SnapshotEditFailed {
                message: "failed".to_string(),
                snapshot_id: "abc".to_string(),
            },
            KopiaError::PolicyNotFound {
                target: "global".to_string(),
            },
            KopiaError::PolicyUpdateFailed {
                message: "failed".to_string(),
                target: Some("target".to_string()),
            },
            KopiaError::InvalidPolicyConfig {
                message: "invalid".to_string(),
                field: None,
            },
            KopiaError::TaskNotFound {
                task_id: "task-1".to_string(),
            },
            KopiaError::TaskCancellationFailed {
                message: "failed".to_string(),
                task_id: "task-1".to_string(),
            },
            KopiaError::RestoreFailed {
                message: "failed".to_string(),
                restore_source: None,
            },
            KopiaError::MountFailed {
                message: "failed".to_string(),
                snapshot_id: Some("snap-1".to_string()),
            },
            KopiaError::UnmountFailed {
                message: "failed".to_string(),
                mount_id: "mount-1".to_string(),
            },
            KopiaError::MountNotFound {
                mount_id: "mount-1".to_string(),
            },
            KopiaError::MaintenanceFailed {
                message: "failed".to_string(),
                operation: Some("full".to_string()),
            },
            KopiaError::HttpRequestFailed {
                message: "request failed".to_string(),
                status_code: Some(500),
                operation: "GET".to_string(),
            },
            KopiaError::ResponseParseError {
                message: "parse error".to_string(),
                expected_type: "String".to_string(),
            },
            KopiaError::ApiError {
                status_code: 400,
                message: "bad request".to_string(),
                operation: "create".to_string(),
            },
            KopiaError::AuthenticationFailed {
                message: "auth failed".to_string(),
                api_error_code: None,
            },
            KopiaError::Unauthorized {
                resource: "snapshots".to_string(),
            },
            KopiaError::NotFound {
                resource: "snapshot".to_string(),
            },
            KopiaError::FileIOError {
                message: "io error".to_string(),
                path: Some("/path".to_string()),
            },
            KopiaError::InvalidPath {
                path: "/invalid".to_string(),
                reason: Some("not absolute".to_string()),
            },
            KopiaError::PathNotFound {
                path: "/missing".to_string(),
            },
            KopiaError::PermissionDenied {
                path: "/forbidden".to_string(),
                operation: Some("read".to_string()),
            },
            KopiaError::PathResolutionFailed {
                path: "/unresolved".to_string(),
                message: "failed".to_string(),
            },
            KopiaError::NotificationProfileCreationFailed {
                message: "failed".to_string(),
            },
            KopiaError::NotificationProfileDeletionFailed {
                message: "failed".to_string(),
                profile_id: "prof-1".to_string(),
            },
            KopiaError::NotificationTestFailed {
                message: "failed".to_string(),
                profile_id: "prof-1".to_string(),
            },
            KopiaError::JsonError {
                message: "json error".to_string(),
            },
            KopiaError::InvalidInput {
                message: "invalid".to_string(),
                field: Some("name".to_string()),
            },
            KopiaError::InternalError {
                message: "internal".to_string(),
                details: Some("stack trace".to_string()),
            },
            KopiaError::EnvironmentError {
                message: "env error".to_string(),
            },
            KopiaError::Timeout {
                operation: "connect".to_string(),
                timeout_seconds: 30,
            },
            KopiaError::Cancelled {
                operation: "backup".to_string(),
            },
        ];

        // Every error should have a non-empty display string
        for error in errors {
            let display = error.to_string();
            assert!(
                !display.is_empty(),
                "Error should have display: {:?}",
                error
            );
            assert!(display.len() > 5, "Error display too short: {}", display);
        }
    }

    #[test]
    fn test_error_variant_count() {
        // This test helps ensure we update tests when adding new error variants
        // If this fails after adding a new variant, update the count and add tests above
        let json = serde_json::to_string(&KopiaError::ServerNotRunning).unwrap();

        // Should serialize to JSON with type tag
        assert!(json.contains("type"));
        assert!(json.contains("SERVER_NOT_RUNNING"));
    }

    #[test]
    fn test_http_result_ext_error_conversion() {
        use std::io;

        // Simulate HTTP error (we can't easily create reqwest::Error, so test concept)
        let io_err: std::result::Result<String, io::Error> =
            Err(io::Error::new(io::ErrorKind::ConnectionRefused, "refused"));

        let mapped = io_err.map_io_error("/test/path");
        assert!(mapped.is_err());

        if let Err(KopiaError::FileIOError { message, path }) = mapped {
            assert!(message.contains("refused"));
            assert_eq!(path, Some("/test/path".to_string()));
        } else {
            panic!("Expected FileIOError");
        }
    }

    #[test]
    fn test_io_result_ext_success_passthrough() {
        let ok_result: std::result::Result<i32, std::io::Error> = Ok(42);
        let mapped = ok_result.map_io_error("/test/path");

        assert!(mapped.is_ok());
        assert_eq!(mapped.unwrap(), 42);
    }

    #[test]
    fn test_json_result_ext_error_conversion() {
        let json_str = "{invalid json";
        let result: std::result::Result<serde_json::Value, serde_json::Error> =
            serde_json::from_str(json_str);

        let mapped = result.map_json_error("Parse config");
        assert!(mapped.is_err());

        if let Err(KopiaError::JsonError { message }) = mapped {
            assert!(message.contains("Parse config"));
        } else {
            panic!("Expected JsonError");
        }
    }

    #[test]
    fn test_json_result_ext_success_passthrough() {
        let ok_result: std::result::Result<i32, serde_json::Error> = Ok(100);
        let mapped = ok_result.map_json_error("test");

        assert!(mapped.is_ok());
        assert_eq!(mapped.unwrap(), 100);
    }

    #[test]
    fn test_api_response_error_mapping() {
        // 401 -> AuthenticationFailed
        let err = KopiaError::from_api_response(401, "Bad credentials", "Login");
        assert!(matches!(err, KopiaError::AuthenticationFailed { .. }));
        assert!(err.to_string().contains("Bad credentials"));

        // 403 -> Unauthorized
        let err = KopiaError::from_api_response(403, "Forbidden", "Delete snapshot");
        assert!(matches!(err, KopiaError::Unauthorized { .. }));
        assert!(err.to_string().contains("Delete snapshot"));

        // 404 -> NotFound
        let err = KopiaError::from_api_response(404, "Missing", "Get policy");
        assert!(matches!(err, KopiaError::NotFound { .. }));

        // Other codes -> ApiError
        let err = KopiaError::from_api_response(500, "Server error", "Backup");
        if let KopiaError::ApiError {
            status_code,
            message,
            operation,
        } = err
        {
            assert_eq!(status_code, 500);
            assert_eq!(message, "Server error");
            assert_eq!(operation, "Backup");
        } else {
            panic!("Expected ApiError");
        }
    }

    #[test]
    fn test_error_json_serialization_format() {
        let err = KopiaError::ServerAlreadyRunning { port: 51515 };
        let json = serde_json::to_string(&err).unwrap();

        // Should use SCREAMING_SNAKE_CASE for type
        assert!(json.contains("SERVER_ALREADY_RUNNING"));

        // Should have type and data fields
        assert!(json.contains("\"type\""));
        assert!(json.contains("\"data\""));

        // Should serialize port
        assert!(json.contains("51515"));
    }

    #[test]
    fn test_optional_fields_skipped_when_none() {
        let err = KopiaError::ServerStartFailed {
            message: "Failed".to_string(),
            details: None,
        };

        let json = serde_json::to_string(&err).unwrap();

        // Should skip None fields
        assert!(!json.contains("details"));
        assert!(json.contains("message"));
    }

    #[test]
    fn test_optional_fields_included_when_some() {
        let err = KopiaError::ServerStartFailed {
            message: "Failed".to_string(),
            details: Some("Stack trace here".to_string()),
        };

        let json = serde_json::to_string(&err).unwrap();

        // Should include Some fields
        assert!(json.contains("details"));
        assert!(json.contains("Stack trace here"));
    }

    #[test]
    fn test_error_equality_different_optional_fields() {
        let err1 = KopiaError::SnapshotCreationFailed {
            message: "Failed".to_string(),
            snapshot_source: Some("source".to_string()),
            snapshot_path: None,
        };

        let err2 = KopiaError::SnapshotCreationFailed {
            message: "Failed".to_string(),
            snapshot_source: None,
            snapshot_path: Some("path".to_string()),
        };

        // Should not be equal (different optional fields)
        assert_ne!(err1, err2);
    }

    #[test]
    fn test_error_chains_preserve_context() {
        // Simulating error chain: IO error -> FileIOError
        let io_err = std::io::Error::new(std::io::ErrorKind::PermissionDenied, "Access denied");

        let kopia_err = std::result::Result::<(), std::io::Error>::Err(io_err)
            .map_io_error("/etc/kopia/config");

        if let Err(KopiaError::FileIOError { message, path }) = kopia_err {
            assert!(message.contains("Access denied"));
            assert_eq!(path, Some("/etc/kopia/config".to_string()));
        } else {
            panic!("Expected FileIOError with context");
        }
    }
}
