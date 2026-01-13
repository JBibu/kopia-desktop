//! Unified error handling for Kopia Desktop
//!
//! This module provides a consistent, type-safe error system across the entire application.
//! All Tauri commands return `Result<T, KopiaError>` for consistent error handling.
//!
//! Error codes are kept minimal - only those that drive different UI behaviors are represented
//! as distinct variants. All other errors use the generic OperationFailed variant.

use serde::{Deserialize, Serialize};
use thiserror::Error;

/// Main error type for all Kopia Desktop operations
///
/// This enum contains only error variants that are explicitly checked in the UI:
/// - ServerNotRunning: Suppressed during polling
/// - ServerAlreadyRunning: Suppressed during startup
/// - RepositoryNotConnected: Shows specific error message
/// - RepositoryAlreadyExists: Shows specific error message
/// - PolicyNotFound: Treated as "new policy" scenario
/// - HttpRequestFailed: Policy load fallback
/// - ResponseParseError: Policy load fallback
/// - NotFound: Policy load fallback + general 404
///
/// All other errors use OperationFailed with a descriptive message.
#[derive(Debug, Clone, Error, Serialize, Deserialize, PartialEq, Eq)]
#[serde(tag = "type", content = "data", rename_all = "SCREAMING_SNAKE_CASE")]
pub enum KopiaError {
    // ============================================================================
    // Active Error Codes (checked in UI business logic)
    // ============================================================================
    /// Kopia server is not running
    #[error("Kopia server is not running")]
    ServerNotRunning,

    /// Kopia server is already running
    #[error("Kopia server is already running on port {port}")]
    ServerAlreadyRunning { port: u16 },

    /// Repository not connected
    #[error("Repository is not connected")]
    RepositoryNotConnected {
        #[serde(skip_serializing_if = "Option::is_none")]
        api_error_code: Option<String>,
    },

    /// Repository already exists (from API - storage already initialized)
    #[error("Repository already exists: {message}")]
    RepositoryAlreadyExists { message: String },

    /// Policy not found
    #[error("Policy not found for target: {target}")]
    PolicyNotFound { target: String },

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

    /// Not found (404)
    #[error("{resource} not found")]
    NotFound { resource: String },

    // ============================================================================
    // Generic Fallback (replaces all unused specific error codes)
    // ============================================================================
    /// Generic operation failure
    /// Used for all errors that don't need special handling in the UI
    #[error("{operation} failed: {message}")]
    OperationFailed {
        operation: String,
        message: String,
        #[serde(skip_serializing_if = "Option::is_none")]
        details: Option<String>,
        #[serde(skip_serializing_if = "Option::is_none")]
        status_code: Option<u16>,
        #[serde(skip_serializing_if = "Option::is_none")]
        api_error_code: Option<String>,
    },
}

/// Result type alias using KopiaError
pub type Result<T> = std::result::Result<T, KopiaError>;

/// Kopia API error response format
#[derive(Debug, serde::Deserialize)]
struct KopiaApiErrorResponse {
    code: Option<String>,
    error: Option<String>,
}

impl KopiaError {
    /// Create error from HTTP status code and response body
    ///
    /// Parses the Kopia API error format: `{"code": "...", "error": "..."}`
    /// Falls back to using raw body if parsing fails.
    ///
    /// Maps official Kopia API error codes to our simplified error variants.
    pub fn from_api_response(status_code: u16, body: &str, operation: &str) -> Self {
        // Try to parse Kopia's error format
        let (code, message) = match serde_json::from_str::<KopiaApiErrorResponse>(body) {
            Ok(err_response) => {
                let code = err_response.code.clone();
                let message = match (err_response.code, err_response.error) {
                    (Some(code), Some(error)) => format!("{}: {}", code, error),
                    (Some(code), None) => code,
                    (None, Some(error)) => error,
                    (None, None) => body.to_string(),
                };
                (code, message)
            }
            Err(_) => (None, body.to_string()),
        };

        // Handle specific error codes that drive different UI behaviors
        if let Some(ref error_code) = code {
            match error_code.as_str() {
                "NOT_CONNECTED" => {
                    return KopiaError::RepositoryNotConnected {
                        api_error_code: Some(error_code.clone()),
                    };
                }
                "ALREADY_INITIALIZED" => {
                    return KopiaError::RepositoryAlreadyExists { message };
                }
                "NOT_FOUND" => {
                    return KopiaError::NotFound {
                        resource: operation.to_string(),
                    };
                }
                // All other API codes → generic OperationFailed with preserved api_error_code
                _ => {
                    return KopiaError::OperationFailed {
                        operation: operation.to_string(),
                        message,
                        details: None,
                        status_code: Some(status_code),
                        api_error_code: Some(error_code.clone()),
                    };
                }
            }
        }

        // Handle by HTTP status code
        match status_code {
            404 => KopiaError::NotFound {
                resource: operation.to_string(),
            },
            _ => KopiaError::OperationFailed {
                operation: operation.to_string(),
                message,
                details: None,
                status_code: Some(status_code),
                api_error_code: None,
            },
        }
    }

    /// Create generic operation failed error
    pub fn operation_failed(operation: impl Into<String>, message: impl Into<String>) -> Self {
        KopiaError::OperationFailed {
            operation: operation.into(),
            message: message.into(),
            details: None,
            status_code: None,
            api_error_code: None,
        }
    }

    /// Create operation failed with details
    pub fn operation_failed_with_details(
        operation: impl Into<String>,
        message: impl Into<String>,
        details: impl Into<String>,
    ) -> Self {
        KopiaError::OperationFailed {
            operation: operation.into(),
            message: message.into(),
            details: Some(details.into()),
            status_code: None,
            api_error_code: None,
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
            let message = e.to_string();

            if let Some(code) = status_code {
                KopiaError::HttpRequestFailed {
                    message,
                    status_code: Some(code),
                    operation: operation.to_string(),
                }
            } else {
                KopiaError::HttpRequestFailed {
                    message,
                    status_code: None,
                    operation: operation.to_string(),
                }
            }
        })
    }
}

/// Convert from std::io::Error
impl From<std::io::Error> for KopiaError {
    fn from(err: std::io::Error) -> Self {
        KopiaError::operation_failed("I/O operation", err.to_string())
    }
}

/// Convert from serde_json::Error
impl From<serde_json::Error> for KopiaError {
    fn from(err: serde_json::Error) -> Self {
        KopiaError::operation_failed("JSON serialization", err.to_string())
    }
}
