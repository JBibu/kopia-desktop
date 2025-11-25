//! Kopia server lifecycle management
//!
//! This module manages the embedded Kopia server process that runs alongside
//! the desktop application. The server provides a REST API for all backup operations.
//!
//! # Security Model
//!
//! The embedded server is designed for localhost-only access with the following security:
//!
//! - **TLS**: Self-signed certificate with fingerprint validation
//! - **Binding**: 127.0.0.1 only (no network exposure)
//! - **Authentication**: HTTP Basic Auth with Kopia-generated random session password
//! - **CSRF**: Disabled (acceptable for localhost-only server)
//!
//! # Architecture
//!
//! The server is started as a child process. Communication happens via HTTPS on a
//! randomly selected port (by the OS). Server parameters (address, password, certificate)
//! are parsed from stderr output, matching the official KopiaUI approach.
//!
//! Graceful shutdown is achieved via `--shutdown-on-stdin` - closing stdin triggers
//! server shutdown.
//!
//! # Example
//!
//! ```ignore
//! let mut server = KopiaServer::new();
//! let info = server.start("/path/to/config")?;
//! // ... use info.server_url and info.password for API calls
//! server.stop()?;
//! ```

use crate::error::{KopiaError, Result};
use serde::{Deserialize, Serialize};
use std::io::{BufRead, BufReader};
use std::process::{Child, Command, Stdio};
use std::sync::{Arc, Mutex};
use std::time::{Duration, SystemTime};

// Constants
const SERVER_USERNAME: &str = "kopia";

/// Timeout for parsing server parameters from stderr (30 seconds)
const SERVER_PARAM_TIMEOUT_SECS: u64 = 30;
/// Number of retries when waiting for server to become ready (40 * 500ms = 20s total)
const HEALTH_CHECK_RETRIES: u32 = 40;
/// Interval between health check retries (500ms)
const HEALTH_CHECK_INTERVAL_MS: u64 = 500;
/// Maximum timeout for HTTP operations (5 minutes)
const HTTP_OPERATION_TIMEOUT_SECS: u64 = 300;
/// Timeout for establishing HTTP connections (10 seconds)
const HTTP_CONNECT_TIMEOUT_SECS: u64 = 10;

/// Server parameters parsed from Kopia's stderr output
#[derive(Debug, Clone, Default)]
struct ServerParams {
    address: Option<String>,
    password: Option<String>,
    control_password: Option<String>,
    cert_sha256: Option<String>,
    certificate: Option<String>,
}

impl ServerParams {
    /// Check if all required parameters have been received
    fn is_complete(&self) -> bool {
        self.address.is_some()
            && self.password.is_some()
            && self.cert_sha256.is_some()
            && self.certificate.is_some()
    }

    /// Parse a line from stderr looking for server parameters
    /// Format: "KEY: value"
    ///
    /// Returns Some(notification_json) if a NOTIFICATION line was found
    fn parse_line(&mut self, line: &str) -> Option<String> {
        if let Some(pos) = line.find(": ") {
            let key = &line[..pos];
            let value = line[pos + 2..].trim();

            match key {
                "SERVER ADDRESS" => {
                    log::info!("Received server address: {}", value);
                    self.address = Some(value.to_string());
                }
                "SERVER PASSWORD" => {
                    log::info!("Received server password");
                    self.password = Some(value.to_string());
                }
                "SERVER CONTROL PASSWORD" => {
                    log::info!("Received server control password");
                    self.control_password = Some(value.to_string());
                }
                "SERVER CERT SHA256" => {
                    log::info!("Received server cert SHA256: {}", value);
                    self.cert_sha256 = Some(value.to_string());
                }
                "SERVER CERTIFICATE" => {
                    log::info!("Received server certificate");
                    self.certificate = Some(value.to_string());
                }
                "NOTIFICATION" => {
                    // Notification JSON from --kopiaui-notifications
                    log::debug!("Received notification: {}", value);
                    return Some(value.to_string());
                }
                _ => {}
            }
        }
        None
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct KopiaServerInfo {
    pub server_url: String,
    pub port: u16,
    pub password: String,
    pub control_password: Option<String>,
    pub cert_sha256: String,
    pub pid: u32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct KopiaServerStatus {
    pub running: bool,
    pub server_url: Option<String>,
    pub port: Option<u16>,
    pub uptime: Option<u64>,
}

pub struct KopiaServer {
    process: Option<Child>,
    info: Option<KopiaServerInfo>,
    start_time: Option<SystemTime>,
    http_client: Option<reqwest::Client>,
    /// PEM certificate for TLS validation
    certificate_pem: Option<String>,
}

impl Default for KopiaServer {
    fn default() -> Self {
        Self::new()
    }
}

impl Drop for KopiaServer {
    fn drop(&mut self) {
        if let Some(mut process) = self.process.take() {
            log::info!(
                "KopiaServer dropping, cleaning up process (PID: {})",
                process.id()
            );

            // Close stdin to trigger graceful shutdown via --shutdown-on-stdin
            drop(process.stdin.take());

            // Give the server a moment to shut down gracefully
            std::thread::sleep(Duration::from_millis(500));

            // Check if it exited, otherwise force kill
            match process.try_wait() {
                Ok(Some(status)) => {
                    log::info!("Server exited gracefully with status: {}", status);
                }
                Ok(None) => {
                    log::warn!("Server didn't exit gracefully, killing process");
                    if let Err(e) = process.kill() {
                        log::error!("Failed to kill process during drop: {}", e);
                    } else {
                        let _ = process.wait();
                        log::info!("Process terminated via kill");
                    }
                }
                Err(e) => {
                    log::error!("Error checking process status: {}", e);
                    let _ = process.kill();
                    let _ = process.wait();
                }
            }

            self.cleanup();
        }
    }
}

impl KopiaServer {
    pub fn new() -> Self {
        Self {
            process: None,
            info: None,
            start_time: None,
            http_client: None,
            certificate_pem: None,
        }
    }

    /// Start the Kopia server process
    ///
    /// This method spawns the Kopia server and waits for it to output its
    /// connection parameters (address, password, certificate) to stderr.
    /// This matches the official KopiaUI approach for secure parameter exchange.
    ///
    /// # Security Model
    /// - TLS with self-signed certificate (validated via fingerprint)
    /// - Localhost-only binding (127.0.0.1)
    /// - Random password generated by Kopia (not visible in process list)
    /// - Graceful shutdown via stdin close
    pub fn start(&mut self, config_dir: &str) -> Result<KopiaServerInfo> {
        if self.is_running() {
            return Err(KopiaError::ServerAlreadyRunning {
                port: self.info.as_ref().map(|i| i.port).unwrap_or(0),
            });
        }

        let binary_path = self.get_kopia_binary_path()?;
        let config_file = format!("{}/kopia-desktop.config", config_dir);

        log::info!("Starting Kopia server with binary: {}", binary_path);
        log::info!("Config file: {}", config_file);

        let mut cmd = Command::new(&binary_path);
        cmd.args([
            "server",
            "start",
            "--ui",
            "--address=127.0.0.1:0", // Let OS pick available port
            "--tls-generate-cert",
            "--tls-generate-cert-name=127.0.0.1",
            "--tls-print-server-cert", // Print certificate to stderr
            "--random-password",       // Kopia generates password, prints to stderr
            "--random-server-control-password", // For control API
            "--disable-csrf-token-checks",
            "--async-repo-connect",
            "--shutdown-on-stdin", // Graceful shutdown when stdin closes
            "--error-notifications=always", // Always show error notifications
            "--kopiaui-notifications", // Print notification JSON to stderr
            "--config-file",
            &config_file,
        ])
        .env("KOPIA_CHECK_FOR_UPDATES", "false")
        .stdin(Stdio::piped()) // Keep stdin open for shutdown signal
        .stdout(Stdio::piped())
        .stderr(Stdio::piped());

        // On Windows, prevent console window from appearing
        #[cfg(target_os = "windows")]
        {
            use std::os::windows::process::CommandExt;
            const CREATE_NO_WINDOW: u32 = 0x08000000;
            cmd.creation_flags(CREATE_NO_WINDOW);
        }

        let mut child = cmd.spawn().map_err(|e| KopiaError::BinaryExecutionFailed {
            message: format!("Failed to spawn Kopia server: {}", e),
            exit_code: None,
            stderr: None,
        })?;

        let pid = child.id();
        log::info!("Kopia server spawned with PID: {}", pid);

        // Parse server parameters from stderr
        let params = self.parse_server_params(&mut child)?;

        // Extract port from address URL
        let port = Self::extract_port(params.address.as_ref().unwrap())?;

        // Decode certificate from base64
        let certificate_pem = Self::decode_certificate(params.certificate.as_ref().unwrap())?;

        let info = KopiaServerInfo {
            server_url: params.address.clone().unwrap(),
            port,
            password: params.password.clone().unwrap(),
            control_password: params.control_password.clone(),
            cert_sha256: params.cert_sha256.clone().unwrap(),
            pid,
        };

        // Create HTTP client with the server's certificate
        let http_client =
            match self.create_http_client(SERVER_USERNAME, &info.password, &certificate_pem) {
                Ok(client) => client,
                Err(e) => {
                    log::error!("Failed to create HTTP client, killing spawned process");
                    drop(child.stdin.take()); // Close stdin to trigger shutdown
                    std::thread::sleep(Duration::from_millis(100));
                    let _ = child.kill();
                    let _ = child.wait();
                    return Err(e);
                }
            };

        // Store state
        self.process = Some(child);
        self.info = Some(info.clone());
        self.start_time = Some(SystemTime::now());
        self.http_client = Some(http_client);
        self.certificate_pem = Some(certificate_pem);

        log::info!("Kopia server started successfully at {}", info.server_url);

        Ok(info)
    }

    /// Parse server parameters from stderr output
    ///
    /// The Kopia server prints parameters in the format:
    /// - SERVER ADDRESS: https://127.0.0.1:54321
    /// - SERVER PASSWORD: <random>
    /// - SERVER CONTROL PASSWORD: <random>
    /// - SERVER CERT SHA256: <hex>
    /// - SERVER CERTIFICATE: <base64>
    fn parse_server_params(&self, child: &mut Child) -> Result<ServerParams> {
        let stderr = child.stderr.take().ok_or(KopiaError::ServerStartFailed {
            message: "Failed to capture server stderr".to_string(),
            details: None,
        })?;

        let reader = BufReader::new(stderr);
        let mut params = ServerParams::default();
        let start = std::time::Instant::now();
        let timeout = Duration::from_secs(SERVER_PARAM_TIMEOUT_SECS);

        for line in reader.lines() {
            // Check timeout
            if start.elapsed() > timeout {
                // Check if process crashed
                if let Ok(Some(status)) = child.try_wait() {
                    return Err(KopiaError::ServerStartFailed {
                        message: format!("Server process exited with status: {}", status),
                        details: None,
                    });
                }
                return Err(KopiaError::ServerStartFailed {
                    message: format!(
                        "Timeout waiting for server parameters after {}s",
                        SERVER_PARAM_TIMEOUT_SECS
                    ),
                    details: None,
                });
            }

            match line {
                Ok(line) => {
                    log::debug!("Server stderr: {}", line);
                    // parse_line returns Some(notification_json) for NOTIFICATION lines
                    // We ignore notifications during startup, they'll be handled later
                    let _ = params.parse_line(&line);

                    if params.is_complete() {
                        log::info!("All server parameters received");
                        return Ok(params);
                    }
                }
                Err(e) => {
                    // Check if process exited
                    if let Ok(Some(status)) = child.try_wait() {
                        return Err(KopiaError::ServerStartFailed {
                            message: format!("Server process exited with status: {}", status),
                            details: Some(format!("stderr read error: {}", e)),
                        });
                    }
                    log::warn!("Error reading stderr line: {}", e);
                }
            }
        }

        // If we get here, stderr was closed but params incomplete
        if let Ok(Some(status)) = child.try_wait() {
            return Err(KopiaError::ServerStartFailed {
                message: format!("Server process exited unexpectedly with status: {}", status),
                details: None,
            });
        }

        Err(KopiaError::ServerStartFailed {
            message: "Server stderr closed before all parameters received".to_string(),
            details: Some(format!("Received: {:?}", params)),
        })
    }

    /// Extract port number from server URL
    fn extract_port(url: &str) -> Result<u16> {
        url::Url::parse(url)
            .map_err(|e| KopiaError::ServerStartFailed {
                message: format!("Invalid server URL: {}", url),
                details: Some(e.to_string()),
            })?
            .port()
            .ok_or_else(|| KopiaError::ServerStartFailed {
                message: format!("No port in server URL: {}", url),
                details: None,
            })
    }

    /// Decode base64-encoded certificate to PEM format
    fn decode_certificate(base64_cert: &str) -> Result<String> {
        use base64::Engine;

        let cert_bytes = base64::prelude::BASE64_STANDARD
            .decode(base64_cert)
            .map_err(|e| KopiaError::ServerStartFailed {
                message: "Failed to decode server certificate".to_string(),
                details: Some(e.to_string()),
            })?;

        String::from_utf8(cert_bytes).map_err(|e| KopiaError::ServerStartFailed {
            message: "Invalid certificate encoding".to_string(),
            details: Some(e.to_string()),
        })
    }

    /// Get a future to wait for server readiness (can be called outside mutex lock)
    pub fn get_ready_waiter(&self) -> Result<impl std::future::Future<Output = Result<()>>> {
        let http_client = self
            .http_client
            .clone()
            .ok_or(KopiaError::ServerNotRunning)?;
        let server_url = self
            .info
            .as_ref()
            .ok_or(KopiaError::ServerNotRunning)?
            .server_url
            .clone();

        Ok(async move { wait_for_server_ready(http_client, server_url).await })
    }

    /// Stop the Kopia server process gracefully
    ///
    /// Closes stdin to trigger shutdown via --shutdown-on-stdin.
    /// Falls back to kill() if graceful shutdown doesn't complete.
    pub fn stop(&mut self) -> Result<()> {
        let mut process = self.process.take().ok_or(KopiaError::ServerNotRunning)?;

        log::info!("Stopping Kopia server (PID: {})", process.id());

        // Close stdin to trigger graceful shutdown
        drop(process.stdin.take());

        // Wait for graceful shutdown (up to 5 seconds)
        for _ in 0..50 {
            match process.try_wait() {
                Ok(Some(status)) => {
                    log::info!("Server stopped gracefully with status: {}", status);
                    self.cleanup();
                    return Ok(());
                }
                Ok(None) => {
                    std::thread::sleep(Duration::from_millis(100));
                }
                Err(e) => {
                    log::warn!("Error checking process status: {}", e);
                    break;
                }
            }
        }

        // Graceful shutdown didn't work, force kill
        log::warn!("Graceful shutdown timed out, killing process");
        process.kill().map_err(|e| KopiaError::ServerStopFailed {
            message: format!("Failed to kill server process: {}", e),
            details: None,
        })?;

        process.wait().map_err(|e| KopiaError::ServerStopFailed {
            message: format!("Failed to wait for server termination: {}", e),
            details: None,
        })?;

        self.cleanup();
        Ok(())
    }

    /// Clean up server state
    fn cleanup(&mut self) {
        self.info = None;
        self.start_time = None;
        self.http_client = None;
        self.certificate_pem = None;
    }

    /// Check if the server is currently running and alive
    pub fn is_running(&mut self) -> bool {
        if let Some(ref mut process) = self.process {
            match process.try_wait() {
                Ok(Some(_)) => {
                    // Process exited, clean up
                    self.process = None;
                    self.cleanup();
                    false
                }
                Ok(None) => true,
                Err(_) => false,
            }
        } else {
            false
        }
    }

    /// Get current server status
    pub fn status(&mut self) -> KopiaServerStatus {
        let running = self.is_running();

        match &self.info {
            Some(info) if running => KopiaServerStatus {
                running: true,
                server_url: Some(info.server_url.clone()),
                port: Some(info.port),
                uptime: self.get_uptime(),
            },
            _ => KopiaServerStatus {
                running: false,
                server_url: None,
                port: None,
                uptime: None,
            },
        }
    }

    fn get_uptime(&self) -> Option<u64> {
        self.start_time.and_then(|start| {
            SystemTime::now()
                .duration_since(start)
                .ok()
                .map(|d| d.as_secs())
        })
    }

    /// Get the path to the Kopia binary
    fn get_kopia_binary_path(&self) -> Result<String> {
        // Check for custom path via environment variable
        if let Ok(custom_path) = std::env::var("KOPIA_PATH") {
            return Ok(custom_path);
        }

        let binary_name = self.get_platform_binary_name();
        let exe_dir = std::env::current_exe()
            .ok()
            .and_then(|p| p.parent().map(std::path::PathBuf::from))
            .ok_or(KopiaError::BinaryNotFound {
                message: "Failed to determine executable directory".to_string(),
                searched_paths: vec![],
            })?;

        // Search paths in priority order
        let search_paths = [
            exe_dir.join("../../../bin").join(binary_name), // Dev: target/debug
            exe_dir.join("../../bin").join(binary_name),    // Dev: alternative
            exe_dir.join("_up_/bin").join(binary_name),     // Production: Windows
            exe_dir.join("resources/bin").join(binary_name), // Production: macOS/Linux
            std::path::PathBuf::from("./bin").join(binary_name), // Current dir fallback
        ];

        search_paths
            .iter()
            .find(|path| path.exists())
            .and_then(|p| p.to_str())
            .map(String::from)
            .ok_or_else(|| KopiaError::BinaryNotFound {
                message: format!("Kopia binary '{}' not found", binary_name),
                searched_paths: search_paths
                    .iter()
                    .filter_map(|p| p.to_str().map(String::from))
                    .collect(),
            })
    }

    /// Get platform-specific binary name
    fn get_platform_binary_name(&self) -> &'static str {
        match (std::env::consts::OS, std::env::consts::ARCH) {
            ("windows", _) => "kopia-windows-x64.exe",
            ("macos", "aarch64") => "kopia-darwin-arm64",
            ("macos", "x86_64") => "kopia-darwin-x64",
            ("macos", arch) => {
                log::warn!(
                    "Unsupported macOS architecture: {}. Falling back to x64 binary.",
                    arch
                );
                "kopia-darwin-x64"
            }
            ("linux", "aarch64") => "kopia-linux-arm64",
            ("linux", "x86_64") => "kopia-linux-x64",
            ("linux", arch) => {
                log::warn!(
                    "Unsupported Linux architecture: {}. Falling back to x64 binary.",
                    arch
                );
                "kopia-linux-x64"
            }
            (os, arch) => {
                log::warn!(
                    "Unsupported platform: OS={}, ARCH={}. Using generic binary name.",
                    os,
                    arch
                );
                "kopia"
            }
        }
    }

    /// Create HTTP client with Basic Auth credentials and certificate validation
    ///
    /// Uses the server's self-signed certificate for TLS validation instead of
    /// blindly accepting all certificates.
    fn create_http_client(
        &self,
        username: &str,
        password: &str,
        certificate_pem: &str,
    ) -> Result<reqwest::Client> {
        use base64::Engine;

        let auth = format!("{}:{}", username, password);
        let auth_header = format!(
            "Basic {}",
            base64::prelude::BASE64_STANDARD.encode(auth.as_bytes())
        );

        let mut headers = reqwest::header::HeaderMap::new();
        headers.insert(
            "X-Kopia-Csrf-Token",
            reqwest::header::HeaderValue::from_static("-"),
        );
        headers.insert(
            reqwest::header::AUTHORIZATION,
            reqwest::header::HeaderValue::from_str(&auth_header).map_err(|e| {
                KopiaError::InternalError {
                    message: format!("Failed to create auth header: {}", e),
                    details: None,
                }
            })?,
        );

        // Parse the certificate for TLS validation
        let cert = reqwest::Certificate::from_pem(certificate_pem.as_bytes()).map_err(|e| {
            KopiaError::InternalError {
                message: format!("Failed to parse server certificate: {}", e),
                details: None,
            }
        })?;

        reqwest::Client::builder()
            .default_headers(headers)
            .timeout(Duration::from_secs(HTTP_OPERATION_TIMEOUT_SECS))
            .connect_timeout(Duration::from_secs(HTTP_CONNECT_TIMEOUT_SECS))
            .add_root_certificate(cert)
            .build()
            .map_err(|e| KopiaError::InternalError {
                message: format!("Failed to create HTTP client: {}", e),
                details: None,
            })
    }

    /// Get the HTTP client for making API requests
    pub fn get_http_client(&self) -> Option<reqwest::Client> {
        self.http_client.clone()
    }

    /// Get the server URL if the server is running
    #[cfg(test)]
    pub(crate) fn get_server_url(&self) -> Option<String> {
        self.info.as_ref().map(|info| info.server_url.clone())
    }
}

// Global server instance managed by Tauri state
pub type KopiaServerState = Arc<Mutex<KopiaServer>>;

pub fn create_server_state() -> KopiaServerState {
    Arc::new(Mutex::new(KopiaServer::new()))
}

/// Wait for server to become ready (standalone async function)
async fn wait_for_server_ready(http_client: reqwest::Client, server_url: String) -> Result<()> {
    let mut last_error = None;

    for _ in 0..HEALTH_CHECK_RETRIES {
        match http_client
            .get(format!("{}/api/v1/repo/status", &server_url))
            .send()
            .await
        {
            Ok(response) => {
                // Any non-5xx response means server is ready
                if response.status().as_u16() < 500 {
                    return Ok(());
                }
                last_error = Some(format!("Server returned status: {}", response.status()));
            }
            Err(e) => {
                last_error = Some(e.to_string());
            }
        }

        tokio::time::sleep(Duration::from_millis(HEALTH_CHECK_INTERVAL_MS)).await;
    }

    let timeout_secs = (HEALTH_CHECK_RETRIES as u64 * HEALTH_CHECK_INTERVAL_MS) / 1000;
    Err(KopiaError::ServerNotReady {
        message: last_error.unwrap_or_else(|| "Unknown error".to_string()),
        timeout_seconds: timeout_secs,
    })
}

#[cfg(test)]
mod tests {
    use super::*;
    use base64::Engine;

    #[test]
    fn test_server_params_parsing() {
        let mut params = ServerParams::default();

        params.parse_line("SERVER ADDRESS: https://127.0.0.1:54321");
        assert_eq!(params.address, Some("https://127.0.0.1:54321".to_string()));

        params.parse_line("SERVER PASSWORD: secret123");
        assert_eq!(params.password, Some("secret123".to_string()));

        params.parse_line("SERVER CONTROL PASSWORD: control456");
        assert_eq!(params.control_password, Some("control456".to_string()));

        params.parse_line("SERVER CERT SHA256: abc123def456");
        assert_eq!(params.cert_sha256, Some("abc123def456".to_string()));

        params.parse_line("SERVER CERTIFICATE: Y2VydGlmaWNhdGU=");
        assert_eq!(params.certificate, Some("Y2VydGlmaWNhdGU=".to_string()));

        assert!(params.is_complete());
    }

    #[test]
    fn test_server_params_incomplete() {
        let mut params = ServerParams::default();
        params.parse_line("SERVER ADDRESS: https://127.0.0.1:54321");
        assert!(!params.is_complete());
    }

    #[test]
    fn test_notification_parsing() {
        let mut params = ServerParams::default();

        // Regular param should return None
        let result = params.parse_line("SERVER ADDRESS: https://127.0.0.1:54321");
        assert!(result.is_none());

        // NOTIFICATION should return the JSON
        let result =
            params.parse_line("NOTIFICATION: {\"type\":\"backup\",\"status\":\"completed\"}");
        assert_eq!(
            result,
            Some("{\"type\":\"backup\",\"status\":\"completed\"}".to_string())
        );
    }

    #[test]
    fn test_extract_port() {
        assert_eq!(
            KopiaServer::extract_port("https://127.0.0.1:54321").unwrap(),
            54321
        );
        assert_eq!(
            KopiaServer::extract_port("https://localhost:8080").unwrap(),
            8080
        );
        assert!(KopiaServer::extract_port("invalid-url").is_err());
    }

    #[test]
    fn test_decode_certificate() {
        let base64_cert = base64::prelude::BASE64_STANDARD.encode("test certificate");
        let decoded = KopiaServer::decode_certificate(&base64_cert).unwrap();
        assert_eq!(decoded, "test certificate");
    }
}
