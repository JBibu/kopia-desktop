//! Advanced error handling tests
//!
//! Tests for complex error scenarios and edge cases with the simplified error system.

#[cfg(test)]
mod tests {
    use crate::error::KopiaError;

    #[test]
    fn test_all_error_variants_have_display() {
        // Test all simplified error variants can be displayed
        let errors = vec![
            KopiaError::ServerNotRunning,
            KopiaError::ServerAlreadyRunning { port: 8080 },
            KopiaError::RepositoryNotConnected {
                api_error_code: None,
            },
            KopiaError::RepositoryNotConnected {
                api_error_code: Some("NOT_CONNECTED".to_string()),
            },
            KopiaError::RepositoryAlreadyExists {
                message: "Repository already initialized".to_string(),
            },
            KopiaError::PolicyNotFound {
                target: "global".to_string(),
            },
            KopiaError::HttpRequestFailed {
                message: "Connection refused".to_string(),
                status_code: None,
                operation: "get status".to_string(),
            },
            KopiaError::HttpRequestFailed {
                message: "Unauthorized".to_string(),
                status_code: Some(401),
                operation: "login".to_string(),
            },
            KopiaError::ResponseParseError {
                message: "Invalid JSON".to_string(),
                expected_type: "StatusResponse".to_string(),
            },
            KopiaError::NotFound {
                resource: "snapshot abc123".to_string(),
            },
            KopiaError::OperationFailed {
                operation: "server startup".to_string(),
                message: "Failed to bind port".to_string(),
                details: None,
                status_code: None,
                api_error_code: None,
            },
            KopiaError::OperationFailed {
                operation: "snapshot creation".to_string(),
                message: "Permission denied".to_string(),
                details: Some("Path /root not accessible".to_string()),
                status_code: Some(403),
                api_error_code: Some("ACCESS_DENIED".to_string()),
            },
        ];

        for error in &errors {
            let display = error.to_string();
            assert!(!display.is_empty(), "Error display should not be empty");
        }
    }

    #[test]
    fn test_error_serialization() {
        // Test that all error variants can be serialized and deserialized
        let errors = vec![
            KopiaError::ServerNotRunning,
            KopiaError::ServerAlreadyRunning { port: 51515 },
            KopiaError::RepositoryNotConnected {
                api_error_code: Some("NOT_CONNECTED".to_string()),
            },
            KopiaError::OperationFailed {
                operation: "test".to_string(),
                message: "failed".to_string(),
                details: Some("details".to_string()),
                status_code: Some(500),
                api_error_code: Some("INTERNAL".to_string()),
            },
        ];

        for error in errors {
            let json = serde_json::to_string(&error).unwrap();
            let deserialized: KopiaError = serde_json::from_str(&json).unwrap();
            assert_eq!(error, deserialized);
        }
    }

    #[test]
    fn test_operation_failed_helper_methods() {
        // Test the helper methods for creating OperationFailed errors
        let err1 = KopiaError::operation_failed("test operation", "something went wrong");
        assert!(matches!(err1, KopiaError::OperationFailed { .. }));
        assert!(err1.to_string().contains("test operation"));
        assert!(err1.to_string().contains("something went wrong"));

        let err2 = KopiaError::operation_failed_with_details(
            "test operation",
            "something went wrong",
            "additional context",
        );
        assert!(matches!(err2, KopiaError::OperationFailed { .. }));
        if let KopiaError::OperationFailed { details, .. } = err2 {
            assert_eq!(details, Some("additional context".to_string()));
        }
    }

    #[test]
    fn test_error_from_io_error() {
        // Test automatic conversion from std::io::Error
        let io_err = std::io::Error::new(std::io::ErrorKind::NotFound, "file not found");
        let kopia_err: KopiaError = io_err.into();
        assert!(matches!(kopia_err, KopiaError::OperationFailed { .. }));
        assert!(kopia_err.to_string().contains("file not found"));
    }

    #[test]
    fn test_error_from_serde_error() {
        // Test automatic conversion from serde_json::Error
        let invalid_json = "{invalid json}";
        let serde_err = serde_json::from_str::<serde_json::Value>(invalid_json).unwrap_err();
        let kopia_err: KopiaError = serde_err.into();
        assert!(matches!(kopia_err, KopiaError::OperationFailed { .. }));
    }

    #[test]
    fn test_optional_fields_serialization() {
        // Test that optional fields are properly handled in serialization
        let err_with_all = KopiaError::OperationFailed {
            operation: "test".to_string(),
            message: "failed".to_string(),
            details: Some("details".to_string()),
            status_code: Some(500),
            api_error_code: Some("INTERNAL".to_string()),
        };

        let err_with_none = KopiaError::OperationFailed {
            operation: "test".to_string(),
            message: "failed".to_string(),
            details: None,
            status_code: None,
            api_error_code: None,
        };

        let json_all = serde_json::to_string(&err_with_all).unwrap();
        let json_none = serde_json::to_string(&err_with_none).unwrap();

        // Optional fields should be present when Some
        assert!(json_all.contains("details"));
        assert!(json_all.contains("status_code"));
        assert!(json_all.contains("api_error_code"));

        // Optional fields should be omitted when None
        assert!(!json_none.contains("details"));
        assert!(!json_none.contains("status_code"));
        assert!(!json_none.contains("api_error_code"));
    }

    #[test]
    fn test_error_equality() {
        // Test that error equality works correctly
        let err1 = KopiaError::ServerNotRunning;
        let err2 = KopiaError::ServerNotRunning;
        assert_eq!(err1, err2);

        let err3 = KopiaError::ServerAlreadyRunning { port: 8080 };
        let err4 = KopiaError::ServerAlreadyRunning { port: 8080 };
        assert_eq!(err3, err4);

        let err5 = KopiaError::ServerAlreadyRunning { port: 8081 };
        assert_ne!(err3, err5);
    }

    #[test]
    fn test_api_error_code_propagation() {
        // Test that API error codes are properly stored
        let err = KopiaError::RepositoryNotConnected {
            api_error_code: Some("NOT_CONNECTED".to_string()),
        };

        if let KopiaError::RepositoryNotConnected { api_error_code } = err {
            assert_eq!(api_error_code, Some("NOT_CONNECTED".to_string()));
        } else {
            panic!("Wrong error variant");
        }
    }

    #[test]
    fn test_error_message_formatting() {
        // Test that error messages are properly formatted
        let err = KopiaError::OperationFailed {
            operation: "snapshot creation".to_string(),
            message: "Permission denied".to_string(),
            details: None,
            status_code: None,
            api_error_code: None,
        };

        let message = err.to_string();
        assert!(message.contains("snapshot creation"));
        assert!(message.contains("Permission denied"));
    }
}
