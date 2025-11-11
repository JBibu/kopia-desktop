//! Unified error handling for Kopia Desktop
//!
//! This module provides a consistent, type-safe error system across the entire application.
//! All Tauri commands return `Result<T, KopiaError>` for consistent error handling.

use serde::{Deserialize, Serialize};
use thiserror::Error;

/// Main error type for all Kopia Desktop operations
///
/// This enum represents all possible errors that can occur in the application.
/// Each variant includes structured data that can be serialized to JSON for the frontend.
#[derive(Debug, Error, Serialize, Deserialize, PartialEq, Eq)]
#[serde(tag = "type", content = "data", rename_all = "SCREAMING_SNAKE_CASE")]
pub enum KopiaError {
    // ============================================================================
    // Server Lifecycle Errors
    // ============================================================================
    /// Kopia server failed to start
    #[error("Failed to start Kopia server: {message}")]
    ServerStartFailed {
        message: String,
        #[serde(skip_serializing_if = "Option::is_none")]
        details: Option<String>,
    },

    /// Kopia server failed to stop
    #[error("Failed to stop Kopia server: {message}")]
    ServerStopFailed {
        message: String,
        #[serde(skip_serializing_if = "Option::is_none")]
        details: Option<String>,
    },

    /// Kopia server is not running
    #[error("Kopia server is not running")]
    ServerNotRunning,

    /// Kopia server is already running
    #[error("Kopia server is already running on port {port}")]
    ServerAlreadyRunning { port: u16 },

    /// Kopia server failed health check
    #[error("Kopia server failed to become ready: {message}")]
    ServerNotReady {
        message: String,
        timeout_seconds: u64,
    },

    /// Kopia binary not found
    #[error("Kopia binary not found: {message}")]
    BinaryNotFound {
        message: String,
        searched_paths: Vec<String>,
    },

    /// Kopia binary execution failed
    #[error("Failed to execute Kopia binary: {message}")]
    BinaryExecutionFailed {
        message: String,
        #[serde(skip_serializing_if = "Option::is_none")]
        exit_code: Option<i32>,
        #[serde(skip_serializing_if = "Option::is_none")]
        stderr: Option<String>,
    },

    // ============================================================================
    // Repository Errors
    // ============================================================================
    /// Repository connection failed
    #[error("Failed to connect to repository: {message}")]
    RepositoryConnectionFailed {
        message: String,
        #[serde(skip_serializing_if = "Option::is_none")]
        storage_type: Option<String>,
    },

    /// Repository not connected
    #[error("Repository is not connected")]
    RepositoryNotConnected,

    /// Repository creation failed
    #[error("Failed to create repository: {message}")]
    RepositoryCreationFailed {
        message: String,
        #[serde(skip_serializing_if = "Option::is_none")]
        storage_type: Option<String>,
    },

    /// Repository operation failed
    #[error("Repository operation failed: {operation} - {message}")]
    RepositoryOperationFailed { operation: String, message: String },

    /// Repository already exists
    #[error("Repository already exists: {message}")]
    RepositoryAlreadyExists { message: String },

    /// Invalid repository configuration
    #[error("Invalid repository configuration: {message}")]
    InvalidRepositoryConfig {
        message: String,
        #[serde(skip_serializing_if = "Option::is_none")]
        field: Option<String>,
    },

    // ============================================================================
    // Snapshot Errors
    // ============================================================================
    /// Snapshot creation failed
    #[error("Failed to create snapshot: {message}")]
    SnapshotCreationFailed {
        message: String,
        #[serde(skip_serializing_if = "Option::is_none")]
        snapshot_source: Option<String>,
        #[serde(skip_serializing_if = "Option::is_none")]
        snapshot_path: Option<String>,
    },

    /// Snapshot not found
    #[error("Snapshot not found: {snapshot_id}")]
    SnapshotNotFound { snapshot_id: String },

    /// Snapshot deletion failed
    #[error("Failed to delete snapshot: {message}")]
    SnapshotDeletionFailed {
        message: String,
        snapshot_id: String,
    },

    /// Snapshot edit failed
    #[error("Failed to edit snapshot: {message}")]
    SnapshotEditFailed {
        message: String,
        snapshot_id: String,
    },

    // ============================================================================
    // Policy Errors
    // ============================================================================
    /// Policy not found
    #[error("Policy not found for target: {target}")]
    PolicyNotFound { target: String },

    /// Policy update failed
    #[error("Failed to update policy: {message}")]
    PolicyUpdateFailed {
        message: String,
        #[serde(skip_serializing_if = "Option::is_none")]
        target: Option<String>,
    },

    /// Invalid policy configuration
    #[error("Invalid policy configuration: {message}")]
    InvalidPolicyConfig {
        message: String,
        #[serde(skip_serializing_if = "Option::is_none")]
        field: Option<String>,
    },

    // ============================================================================
    // Task Errors
    // ============================================================================
    /// Task not found
    #[error("Task not found: {task_id}")]
    TaskNotFound { task_id: String },

    /// Task cancellation failed
    #[error("Failed to cancel task: {message}")]
    TaskCancellationFailed { message: String, task_id: String },

    // ============================================================================
    // Restore/Mount Errors
    // ============================================================================
    /// Restore operation failed
    #[error("Restore operation failed: {message}")]
    RestoreFailed {
        message: String,
        #[serde(skip_serializing_if = "Option::is_none")]
        restore_source: Option<String>,
    },

    /// Mount operation failed
    #[error("Failed to mount snapshot: {message}")]
    MountFailed {
        message: String,
        #[serde(skip_serializing_if = "Option::is_none")]
        snapshot_id: Option<String>,
    },

    /// Unmount operation failed
    #[error("Failed to unmount snapshot: {message}")]
    UnmountFailed { message: String, mount_id: String },

    /// Mount not found
    #[error("Mount not found: {mount_id}")]
    MountNotFound { mount_id: String },

    // ============================================================================
    // Maintenance Errors
    // ============================================================================
    /// Maintenance operation failed
    #[error("Maintenance operation failed: {message}")]
    MaintenanceFailed {
        message: String,
        #[serde(skip_serializing_if = "Option::is_none")]
        operation: Option<String>,
    },

    // ============================================================================
    // WebSocket Errors
    // ============================================================================
    /// WebSocket connection failed
    #[error("WebSocket connection failed: {message}")]
    WebSocketConnectionFailed { message: String },

    /// WebSocket already connected
    #[error("WebSocket is already connected")]
    WebSocketAlreadyConnected,

    /// WebSocket not connected
    #[error("WebSocket is not connected")]
    WebSocketNotConnected,

    /// WebSocket message parsing failed
    #[error("Failed to parse WebSocket message: {message}")]
    WebSocketMessageParseFailed { message: String },

    // ============================================================================
    // HTTP/API Errors
    // ============================================================================
    /// HTTP request failed
    #[error("HTTP request failed: {message}")]
    HttpRequestFailed {
        message: String,
        #[serde(skip_serializing_if = "Option::is_none")]
        status_code: Option<u16>,
        operation: String,
    },

    /// HTTP response parsing failed
    #[error("Failed to parse HTTP response: {message}")]
    ResponseParseError {
        message: String,
        expected_type: String,
    },

    /// API error from Kopia server
    #[error("Kopia API error ({status_code}): {message}")]
    ApiError {
        status_code: u16,
        message: String,
        operation: String,
    },

    /// Authentication failed
    #[error("Authentication failed: {message}")]
    AuthenticationFailed { message: String },

    /// Unauthorized access
    #[error("Unauthorized access to: {resource}")]
    Unauthorized { resource: String },

    /// Not found (404)
    #[error("{resource} not found")]
    NotFound { resource: String },

    // ============================================================================
    // File System Errors
    // ============================================================================
    /// File I/O error
    #[error("File I/O error: {message}")]
    FileIOError {
        message: String,
        #[serde(skip_serializing_if = "Option::is_none")]
        path: Option<String>,
    },

    /// Invalid file path
    #[error("Invalid file path: {path}")]
    InvalidPath {
        path: String,
        #[serde(skip_serializing_if = "Option::is_none")]
        reason: Option<String>,
    },

    /// Path does not exist
    #[error("Path does not exist: {path}")]
    PathNotFound { path: String },

    /// Permission denied
    #[error("Permission denied: {path}")]
    PermissionDenied {
        path: String,
        #[serde(skip_serializing_if = "Option::is_none")]
        operation: Option<String>,
    },

    /// Path resolution failed
    #[error("Failed to resolve path {path}: {message}")]
    PathResolutionFailed { path: String, message: String },

    // ============================================================================
    // Notification Errors
    // ============================================================================
    /// Notification profile creation failed
    #[error("Failed to create notification profile: {message}")]
    NotificationProfileCreationFailed { message: String },

    /// Notification profile deletion failed
    #[error("Failed to delete notification profile: {message}")]
    NotificationProfileDeletionFailed { message: String, profile_id: String },

    /// Notification test failed
    #[error("Failed to send test notification: {message}")]
    NotificationTestFailed { message: String, profile_id: String },

    // ============================================================================
    // General Errors
    // ============================================================================
    /// JSON serialization/deserialization error
    #[error("JSON error: {message}")]
    JsonError { message: String },

    /// Invalid input provided
    #[error("Invalid input: {message}")]
    InvalidInput {
        message: String,
        #[serde(skip_serializing_if = "Option::is_none")]
        field: Option<String>,
    },

    /// Internal error (unexpected state)
    #[error("Internal error: {message}")]
    InternalError {
        message: String,
        #[serde(skip_serializing_if = "Option::is_none")]
        details: Option<String>,
    },

    /// Environment error (missing env vars, etc.)
    #[error("Environment error: {message}")]
    EnvironmentError { message: String },

    /// Operation timeout
    #[error("Operation timed out after {timeout_seconds} seconds: {operation}")]
    Timeout {
        operation: String,
        timeout_seconds: u64,
    },

    /// Operation cancelled by user
    #[error("Operation cancelled: {operation}")]
    Cancelled { operation: String },
}

/// Result type alias using KopiaError
pub type Result<T> = std::result::Result<T, KopiaError>;

impl KopiaError {
    /// Create error from HTTP status code and response body
    pub fn from_api_response(status_code: u16, body: &str, operation: &str) -> Self {
        match status_code {
            401 => KopiaError::AuthenticationFailed {
                message: body.to_string(),
            },
            403 => KopiaError::Unauthorized {
                resource: operation.to_string(),
            },
            404 => KopiaError::NotFound {
                resource: operation.to_string(),
            },
            _ => KopiaError::ApiError {
                status_code,
                message: body.to_string(),
                operation: operation.to_string(),
            },
        }
    }
}

/// Extension trait for Result<T, reqwest::Error> to convert to Result<T, KopiaError>
pub trait HttpResultExt<T> {
    fn map_http_error(self, operation: &str) -> Result<T>;
}

impl<T> HttpResultExt<T> for std::result::Result<T, reqwest::Error> {
    fn map_http_error(self, operation: &str) -> Result<T> {
        self.map_err(|e| {
            let status_code = e.status().map(|s| s.as_u16());
            KopiaError::HttpRequestFailed {
                message: e.to_string(),
                status_code,
                operation: operation.to_string(),
            }
        })
    }
}

/// Extension trait for Result<T, std::io::Error> to convert to Result<T, KopiaError>
pub trait IoResultExt<T> {
    fn map_io_error(self, path: &str) -> Result<T>;
}

impl<T> IoResultExt<T> for std::result::Result<T, std::io::Error> {
    fn map_io_error(self, path: &str) -> Result<T> {
        self.map_err(|e| KopiaError::FileIOError {
            message: e.to_string(),
            path: Some(path.to_string()),
        })
    }
}

/// Extension trait for Result<T, serde_json::Error> to convert to Result<T, KopiaError>
pub trait JsonResultExt<T> {
    fn map_json_error(self, context: &str) -> Result<T>;
}

impl<T> JsonResultExt<T> for std::result::Result<T, serde_json::Error> {
    fn map_json_error(self, context: &str) -> Result<T> {
        self.map_err(|e| KopiaError::JsonError {
            message: format!("{}: {}", context, e),
        })
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_error_display() {
        let err = KopiaError::ServerNotRunning;
        assert_eq!(err.to_string(), "Kopia server is not running");

        let err = KopiaError::ServerAlreadyRunning { port: 51515 };
        assert_eq!(
            err.to_string(),
            "Kopia server is already running on port 51515"
        );
    }

    #[test]
    fn test_error_serialization() {
        let err = KopiaError::SnapshotNotFound {
            snapshot_id: "abc123".to_string(),
        };

        let json = serde_json::to_string(&err).unwrap();
        assert!(json.contains("SNAPSHOT_NOT_FOUND"));
        assert!(json.contains("abc123"));

        let deserialized: KopiaError = serde_json::from_str(&json).unwrap();
        assert_eq!(err, deserialized);
    }

    #[test]
    fn test_from_api_response() {
        let err = KopiaError::from_api_response(401, "Invalid credentials", "Login");
        assert!(matches!(err, KopiaError::AuthenticationFailed { .. }));

        let err = KopiaError::from_api_response(403, "Forbidden", "Access resource");
        assert!(matches!(err, KopiaError::Unauthorized { .. }));

        let err = KopiaError::from_api_response(404, "Not found", "Get snapshot");
        assert!(matches!(err, KopiaError::NotFound { .. }));

        let err = KopiaError::from_api_response(500, "Server error", "Create snapshot");
        assert!(matches!(err, KopiaError::ApiError { .. }));
    }

    #[test]
    fn test_http_result_ext() {
        let ok_result: std::result::Result<String, reqwest::Error> = Ok("success".to_string());
        let mapped = ok_result.map_http_error("test operation");
        assert!(mapped.is_ok());
        assert_eq!(mapped.unwrap(), "success");
    }

    #[test]
    fn test_io_result_ext() {
        let ok_result: std::result::Result<(), std::io::Error> = Ok(());
        let mapped = ok_result.map_io_error("/test/path");
        assert!(mapped.is_ok());

        let err_result: std::result::Result<(), std::io::Error> = Err(std::io::Error::new(
            std::io::ErrorKind::NotFound,
            "not found",
        ));
        let mapped = err_result.map_io_error("/test/path");
        assert!(mapped.is_err());
        if let Err(KopiaError::FileIOError { path, .. }) = mapped {
            assert_eq!(path, Some("/test/path".to_string()));
        } else {
            panic!("Expected FileIOError");
        }
    }

    #[test]
    fn test_json_result_ext() {
        let ok_result: std::result::Result<i32, serde_json::Error> = Ok(42);
        let mapped = ok_result.map_json_error("test context");
        assert!(mapped.is_ok());
        assert_eq!(mapped.unwrap(), 42);
    }

    #[test]
    fn test_error_equality() {
        let err1 = KopiaError::ServerNotRunning;
        let err2 = KopiaError::ServerNotRunning;
        assert_eq!(err1, err2);

        let err3 = KopiaError::ServerAlreadyRunning { port: 51515 };
        let err4 = KopiaError::ServerAlreadyRunning { port: 51515 };
        assert_eq!(err3, err4);

        assert_ne!(err1, err3);
    }
}
