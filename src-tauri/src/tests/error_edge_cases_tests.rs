//! Error edge case tests
//!
//! Tests for error handling edge cases and boundary conditions with the simplified error system.

#[cfg(test)]
mod tests {
    use crate::error::KopiaError;

    #[test]
    fn test_error_with_empty_strings() {
        // Test errors with empty string fields
        let err = KopiaError::OperationFailed {
            operation: "".to_string(),
            message: "".to_string(),
            details: None,
            status_code: None,
            api_error_code: None,
        };

        let json = serde_json::to_string(&err).unwrap();
        let deserialized: KopiaError = serde_json::from_str(&json).unwrap();
        assert_eq!(err, deserialized);
    }

    #[test]
    fn test_error_with_very_long_strings() {
        // Test errors with very long string fields
        let long_string = "a".repeat(10000);
        let err = KopiaError::OperationFailed {
            operation: long_string.clone(),
            message: long_string.clone(),
            details: Some(long_string.clone()),
            status_code: None,
            api_error_code: None,
        };

        let json = serde_json::to_string(&err).unwrap();
        let deserialized: KopiaError = serde_json::from_str(&json).unwrap();
        assert_eq!(err, deserialized);
    }

    #[test]
    fn test_error_with_special_characters() {
        // Test errors with special characters in strings
        let special = "Error: \n\t\r\"{}[]<>&'\\";
        let err = KopiaError::OperationFailed {
            operation: special.to_string(),
            message: special.to_string(),
            details: Some(special.to_string()),
            status_code: None,
            api_error_code: None,
        };

        let json = serde_json::to_string(&err).unwrap();
        let deserialized: KopiaError = serde_json::from_str(&json).unwrap();
        assert_eq!(err, deserialized);
    }

    #[test]
    fn test_error_with_unicode() {
        // Test errors with Unicode characters
        let unicode = "Error: ❌ 测试 🚀 مرحبا こんにちは";
        let err = KopiaError::OperationFailed {
            operation: unicode.to_string(),
            message: unicode.to_string(),
            details: Some(unicode.to_string()),
            status_code: None,
            api_error_code: None,
        };

        let json = serde_json::to_string(&err).unwrap();
        let deserialized: KopiaError = serde_json::from_str(&json).unwrap();
        assert_eq!(err, deserialized);
    }

    #[test]
    fn test_error_with_max_status_code() {
        // Test with maximum u16 status code
        let err = KopiaError::HttpRequestFailed {
            message: "test".to_string(),
            status_code: Some(u16::MAX),
            operation: "test".to_string(),
        };

        let json = serde_json::to_string(&err).unwrap();
        let deserialized: KopiaError = serde_json::from_str(&json).unwrap();
        assert_eq!(err, deserialized);
    }

    #[test]
    fn test_error_with_max_port() {
        // Test with maximum u16 port number
        let err = KopiaError::ServerAlreadyRunning { port: u16::MAX };

        let json = serde_json::to_string(&err).unwrap();
        let deserialized: KopiaError = serde_json::from_str(&json).unwrap();
        assert_eq!(err, deserialized);
    }

    #[test]
    fn test_error_nested_json_in_message() {
        // Test error with JSON-like string in message
        let json_message = r#"{"error": "nested", "code": 500}"#;
        let err = KopiaError::OperationFailed {
            operation: "test".to_string(),
            message: json_message.to_string(),
            details: None,
            status_code: None,
            api_error_code: None,
        };

        let json = serde_json::to_string(&err).unwrap();
        let deserialized: KopiaError = serde_json::from_str(&json).unwrap();
        assert_eq!(err, deserialized);
    }

    #[test]
    fn test_multiple_consecutive_serializations() {
        // Test that multiple serializations produce identical results
        let err = KopiaError::OperationFailed {
            operation: "test".to_string(),
            message: "failed".to_string(),
            details: Some("details".to_string()),
            status_code: Some(500),
            api_error_code: Some("INTERNAL".to_string()),
        };

        let json1 = serde_json::to_string(&err).unwrap();
        let json2 = serde_json::to_string(&err).unwrap();
        let json3 = serde_json::to_string(&err).unwrap();

        assert_eq!(json1, json2);
        assert_eq!(json2, json3);
    }

    #[test]
    fn test_error_cloning() {
        // Test that errors can be cloned
        let err1 = KopiaError::ServerNotRunning;
        let err2 = err1.clone();
        assert_eq!(err1, err2);

        let err3 = KopiaError::OperationFailed {
            operation: "test".to_string(),
            message: "failed".to_string(),
            details: Some("details".to_string()),
            status_code: Some(500),
            api_error_code: Some("INTERNAL".to_string()),
        };
        let err4 = err3.clone();
        assert_eq!(err3, err4);
    }

    #[test]
    fn test_error_display_stability() {
        // Test that display output is stable across multiple calls
        let err = KopiaError::OperationFailed {
            operation: "test".to_string(),
            message: "failed".to_string(),
            details: None,
            status_code: None,
            api_error_code: None,
        };

        let display1 = err.to_string();
        let display2 = err.to_string();
        let display3 = err.to_string();

        assert_eq!(display1, display2);
        assert_eq!(display2, display3);
    }

    #[test]
    fn test_all_simplified_variants() {
        // Test all simplified error variants for basic functionality
        let errors = vec![
            KopiaError::ServerNotRunning,
            KopiaError::ServerAlreadyRunning { port: 8080 },
            KopiaError::RepositoryNotConnected {
                api_error_code: None,
            },
            KopiaError::RepositoryAlreadyExists {
                message: "test".to_string(),
            },
            KopiaError::PolicyNotFound {
                target: "global".to_string(),
            },
            KopiaError::HttpRequestFailed {
                message: "test".to_string(),
                status_code: None,
                operation: "test".to_string(),
            },
            KopiaError::ResponseParseError {
                message: "test".to_string(),
                expected_type: "Test".to_string(),
            },
            KopiaError::NotFound {
                resource: "test".to_string(),
            },
            KopiaError::OperationFailed {
                operation: "test".to_string(),
                message: "test".to_string(),
                details: None,
                status_code: None,
                api_error_code: None,
            },
        ];

        for err in errors {
            // Test display
            let _ = err.to_string();

            // Test serialization
            let json = serde_json::to_string(&err).unwrap();
            let deserialized: KopiaError = serde_json::from_str(&json).unwrap();
            assert_eq!(err, deserialized);

            // Test clone
            let cloned = err.clone();
            assert_eq!(err, cloned);
        }
    }
}
