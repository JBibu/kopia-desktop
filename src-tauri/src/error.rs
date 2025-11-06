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
#[derive(Debug, Error, Serialize, Deserialize)]
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

    /// Repository already connected
    #[error("Repository is already connected")]
    RepositoryAlreadyConnected,

    /// Repository does not exist
    #[error("Repository not found at the specified location")]
    RepositoryNotFound { location: String },

    /// Repository initialization failed
    #[error("Failed to initialize repository: {message}")]
    RepositoryInitializationFailed {
        message: String,
        #[serde(skip_serializing_if = "Option::is_none")]
        storage_type: Option<String>,
    },

    /// Invalid repository password
    #[error("Invalid repository password")]
    InvalidPassword,

    /// Repository operation failed
    #[error("Repository operation failed: {operation} - {message}")]
    RepositoryOperationFailed {
        operation: String,
        message: String,
    },

    // ============================================================================
    // Storage Errors
    // ============================================================================
    /// Storage connection failed
    #[error("Failed to connect to storage: {message}")]
    StorageConnectionFailed {
        message: String,
        storage_type: String,
    },

    /// Storage configuration invalid
    #[error("Invalid storage configuration: {message}")]
    InvalidStorageConfig {
        message: String,
        storage_type: String,
        #[serde(skip_serializing_if = "Option::is_none")]
        field: Option<String>,
    },

    /// Storage access denied
    #[error("Access denied to storage: {message}")]
    StorageAccessDenied {
        message: String,
        storage_type: String,
    },

    // ============================================================================
    // Snapshot Errors
    // ============================================================================
    /// Snapshot creation failed
    #[error("Failed to create snapshot: {message}")]
    SnapshotCreationFailed {
        message: String,
        #[serde(skip_serializing_if = "Option::is_none")]
        path: Option<String>,
    },

    /// Snapshot not found
    #[error("Snapshot not found: {snapshot_id}")]
    SnapshotNotFound { snapshot_id: String },

    /// Snapshot operation failed
    #[error("Snapshot operation failed: {operation} - {message}")]
    SnapshotOperationFailed {
        operation: String,
        message: String,
    },

    /// Path resolution failed
    #[error("Failed to resolve path: {path}")]
    PathResolutionFailed { path: String, message: String },

    // ============================================================================
    // Policy Errors
    // ============================================================================
    /// Policy not found
    #[error("Policy not found for target: {target}")]
    PolicyNotFound { target: String },

    /// Policy operation failed
    #[error("Policy operation failed: {operation} - {message}")]
    PolicyOperationFailed {
        operation: String,
        message: String,
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

    /// Task operation failed
    #[error("Task operation failed: {operation} - {message}")]
    TaskOperationFailed {
        operation: String,
        message: String,
    },

    // ============================================================================
    // Restore Errors
    // ============================================================================
    /// Restore operation failed
    #[error("Restore operation failed: {message}")]
    RestoreFailed {
        message: String,
        #[serde(skip_serializing_if = "Option::is_none")]
        target_path: Option<String>,
    },

    /// Mount operation failed
    #[error("Mount operation failed: {message}")]
    MountFailed {
        message: String,
        #[serde(skip_serializing_if = "Option::is_none")]
        mount_point: Option<String>,
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

    // ============================================================================
    // Network Errors
    // ============================================================================
    /// HTTP request failed
    #[error("HTTP request failed: {message}")]
    HttpRequestFailed {
        message: String,
        #[serde(skip_serializing_if = "Option::is_none")]
        status_code: Option<u16>,
        #[serde(skip_serializing_if = "Option::is_none")]
        url: Option<String>,
    },

    /// Network timeout
    #[error("Operation timed out after {timeout_seconds} seconds")]
    Timeout { timeout_seconds: u64 },

    /// Connection refused
    #[error("Connection refused: {message}")]
    ConnectionRefused { message: String },

    // ============================================================================
    // Validation Errors
    // ============================================================================
    /// Invalid input
    #[error("Invalid input: {message}")]
    InvalidInput {
        message: String,
        #[serde(skip_serializing_if = "Option::is_none")]
        field: Option<String>,
    },

    /// Missing required field
    #[error("Missing required field: {field}")]
    MissingField { field: String },

    // ============================================================================
    // Filesystem Errors
    // ============================================================================
    /// File not found
    #[error("File not found: {path}")]
    FileNotFound { path: String },

    /// Permission denied
    #[error("Permission denied: {path}")]
    PermissionDenied { path: String },

    /// IO error
    #[error("IO error: {message}")]
    IoError {
        message: String,
        #[serde(skip_serializing_if = "Option::is_none")]
        path: Option<String>,
    },

    // ============================================================================
    // System Errors
    // ============================================================================
    /// Configuration error
    #[error("Configuration error: {message}")]
    ConfigError { message: String },

    /// Environment error
    #[error("Environment error: {message}")]
    EnvironmentError { message: String },

    /// Internal error (should not normally occur)
    #[error("Internal error: {message}")]
    InternalError {
        message: String,
        #[serde(skip_serializing_if = "Option::is_none")]
        details: Option<String>,
    },

    // ============================================================================
    // Parsing Errors
    // ============================================================================
    /// JSON parsing failed
    #[error("Failed to parse JSON: {message}")]
    JsonParseError {
        message: String,
        #[serde(skip_serializing_if = "Option::is_none")]
        context: Option<String>,
    },

    /// Response parsing failed
    #[error("Failed to parse API response: {message}")]
    ResponseParseError {
        message: String,
        expected_type: String,
    },
}

/// Extension trait for converting reqwest errors
pub trait HttpResultExt<T> {
    fn map_http_error(self, operation: &str) -> Result<T>;
}

/// Extension trait for converting IO errors
pub trait IoResultExt<T> {
    fn map_io_error(self, path: &str) -> Result<T>;
}

/// Extension trait for converting JSON parsing errors
pub trait JsonResultExt<T> {
    fn map_json_error(self, context: &str) -> Result<T>;
}

impl<T> HttpResultExt<T> for std::result::Result<T, reqwest::Error> {
    fn map_http_error(self, operation: &str) -> Result<T> {
        self.map_err(|e| {
            let status_code = e.status().map(|s| s.as_u16());
            let url = e.url().map(|u| u.to_string());

            if e.is_timeout() {
                KopiaError::Timeout {
                    timeout_seconds: 300,
                }
            } else if e.is_connect() {
                KopiaError::ConnectionRefused {
                    message: format!("{}: {}", operation, e),
                }
            } else {
                KopiaError::HttpRequestFailed {
                    message: format!("{}: {}", operation, e),
                    status_code,
                    url,
                }
            }
        })
    }
}

impl<T> IoResultExt<T> for std::result::Result<T, std::io::Error> {
    fn map_io_error(self, path: &str) -> Result<T> {
        self.map_err(|e| match e.kind() {
            std::io::ErrorKind::NotFound => KopiaError::FileNotFound {
                path: path.to_string(),
            },
            std::io::ErrorKind::PermissionDenied => KopiaError::PermissionDenied {
                path: path.to_string(),
            },
            _ => KopiaError::IoError {
                message: e.to_string(),
                path: Some(path.to_string()),
            },
        })
    }
}

impl<T> JsonResultExt<T> for std::result::Result<T, serde_json::Error> {
    fn map_json_error(self, context: &str) -> Result<T> {
        self.map_err(|e| KopiaError::JsonParseError {
            message: e.to_string(),
            context: Some(context.to_string()),
        })
    }
}

/// Helper to parse Kopia API error responses
#[derive(Debug, Deserialize)]
struct ApiErrorResponse {
    #[serde(default)]
    code: Option<String>,
    #[serde(default)]
    error: Option<String>,
    #[serde(default)]
    message: Option<String>,
}

impl KopiaError {
    /// Parse Kopia API error response
    pub fn from_api_response(status: u16, body: &str, operation: &str) -> Self {
        // Try to parse as JSON error response
        if let Ok(api_error) = serde_json::from_str::<ApiErrorResponse>(body) {
            let message = api_error
                .error
                .or(api_error.message)
                .unwrap_or_else(|| "Unknown error".to_string());

            // Map known error codes to specific error types
            match api_error.code.as_deref() {
                Some("NOT_INITIALIZED") => Self::RepositoryNotFound {
                    location: "specified location".to_string(),
                },
                Some("INVALID_PASSWORD") => Self::InvalidPassword,
                Some("ALREADY_CONNECTED") => Self::RepositoryAlreadyConnected,
                Some("NOT_CONNECTED") => Self::RepositoryNotConnected,
                Some("STORAGE_ERROR") => Self::StorageConnectionFailed {
                    message,
                    storage_type: "unknown".to_string(),
                },
                _ => Self::HttpRequestFailed {
                    message: format!("{}: {}", operation, message),
                    status_code: Some(status),
                    url: None,
                },
            }
        } else {
            // Fallback for non-JSON responses
            Self::HttpRequestFailed {
                message: format!("{}: {} - {}", operation, status, body),
                status_code: Some(status),
                url: None,
            }
        }
    }

    /// Check if error is recoverable (operation can be retried)
    pub fn is_recoverable(&self) -> bool {
        matches!(
            self,
            Self::Timeout { .. }
                | Self::ConnectionRefused { .. }
                | Self::HttpRequestFailed { .. }
                | Self::ServerNotReady { .. }
        )
    }

    /// Get error code for frontend categorization
    pub fn code(&self) -> &'static str {
        match self {
            // Server errors
            Self::ServerStartFailed { .. } => "SERVER_START_FAILED",
            Self::ServerStopFailed { .. } => "SERVER_STOP_FAILED",
            Self::ServerNotRunning => "SERVER_NOT_RUNNING",
            Self::ServerAlreadyRunning { .. } => "SERVER_ALREADY_RUNNING",
            Self::ServerNotReady { .. } => "SERVER_NOT_READY",
            Self::BinaryNotFound { .. } => "BINARY_NOT_FOUND",
            Self::BinaryExecutionFailed { .. } => "BINARY_EXECUTION_FAILED",

            // Repository errors
            Self::RepositoryConnectionFailed { .. } => "REPOSITORY_CONNECTION_FAILED",
            Self::RepositoryNotConnected => "REPOSITORY_NOT_CONNECTED",
            Self::RepositoryAlreadyConnected => "REPOSITORY_ALREADY_CONNECTED",
            Self::RepositoryNotFound { .. } => "REPOSITORY_NOT_FOUND",
            Self::RepositoryInitializationFailed { .. } => "REPOSITORY_INITIALIZATION_FAILED",
            Self::InvalidPassword => "INVALID_PASSWORD",
            Self::RepositoryOperationFailed { .. } => "REPOSITORY_OPERATION_FAILED",

            // Storage errors
            Self::StorageConnectionFailed { .. } => "STORAGE_CONNECTION_FAILED",
            Self::InvalidStorageConfig { .. } => "INVALID_STORAGE_CONFIG",
            Self::StorageAccessDenied { .. } => "STORAGE_ACCESS_DENIED",

            // Snapshot errors
            Self::SnapshotCreationFailed { .. } => "SNAPSHOT_CREATION_FAILED",
            Self::SnapshotNotFound { .. } => "SNAPSHOT_NOT_FOUND",
            Self::SnapshotOperationFailed { .. } => "SNAPSHOT_OPERATION_FAILED",
            Self::PathResolutionFailed { .. } => "PATH_RESOLUTION_FAILED",

            // Policy errors
            Self::PolicyNotFound { .. } => "POLICY_NOT_FOUND",
            Self::PolicyOperationFailed { .. } => "POLICY_OPERATION_FAILED",
            Self::InvalidPolicyConfig { .. } => "INVALID_POLICY_CONFIG",

            // Task errors
            Self::TaskNotFound { .. } => "TASK_NOT_FOUND",
            Self::TaskOperationFailed { .. } => "TASK_OPERATION_FAILED",

            // Restore errors
            Self::RestoreFailed { .. } => "RESTORE_FAILED",
            Self::MountFailed { .. } => "MOUNT_FAILED",

            // WebSocket errors
            Self::WebSocketConnectionFailed { .. } => "WEBSOCKET_CONNECTION_FAILED",
            Self::WebSocketAlreadyConnected => "WEBSOCKET_ALREADY_CONNECTED",
            Self::WebSocketNotConnected => "WEBSOCKET_NOT_CONNECTED",

            // Network errors
            Self::HttpRequestFailed { .. } => "HTTP_REQUEST_FAILED",
            Self::Timeout { .. } => "TIMEOUT",
            Self::ConnectionRefused { .. } => "CONNECTION_REFUSED",

            // Validation errors
            Self::InvalidInput { .. } => "INVALID_INPUT",
            Self::MissingField { .. } => "MISSING_FIELD",

            // Filesystem errors
            Self::FileNotFound { .. } => "FILE_NOT_FOUND",
            Self::PermissionDenied { .. } => "PERMISSION_DENIED",
            Self::IoError { .. } => "IO_ERROR",

            // System errors
            Self::ConfigError { .. } => "CONFIG_ERROR",
            Self::EnvironmentError { .. } => "ENVIRONMENT_ERROR",
            Self::InternalError { .. } => "INTERNAL_ERROR",

            // Parsing errors
            Self::JsonParseError { .. } => "JSON_PARSE_ERROR",
            Self::ResponseParseError { .. } => "RESPONSE_PARSE_ERROR",
        }
    }
}

/// Helper type for consistent result types across the application
pub type Result<T> = std::result::Result<T, KopiaError>;
