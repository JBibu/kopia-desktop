//! Kopia server lifecycle management
//!
//! This module manages the embedded Kopia server process that runs alongside
//! the desktop application. The server provides a REST API for all backup operations.
//!
//! # Security Model
//!
//! The embedded server is designed for localhost-only access with the following security:
//!
//! - **TLS**: Self-signed certificate (safe for localhost communication)
//! - **Binding**: 127.0.0.1 only (no network exposure)
//! - **Authentication**: HTTP Basic Auth with cryptographically secure random session password
//! - **CSRF**: Disabled (acceptable for localhost-only server with no web UI)
//!
//! # Architecture
//!
//! The server is started as a child process and terminated via process kill when
//! the app closes. Communication happens via HTTPS on a randomly selected port to
//! avoid conflicts.
//!
//! NOTE: Graceful shutdown via `--shutdown-on-stdin` is not available in Kopia 0.21.1.
//!
//! # Example
//!
//! ```no_run
//! let mut server = KopiaServer::new();
//! let info = server.start("/path/to/config")?;
//! // ... use info.server_url and info.http_password for API calls
//! server.stop()?;
//! ```

use crate::error::{KopiaError, Result};
use serde::{Deserialize, Serialize};
use std::process::{Child, Command, Stdio};
use std::sync::{Arc, Mutex};
use std::time::{Duration, SystemTime};

// Constants
const SERVER_USERNAME: &str = "kopia-desktop";
const DEFAULT_PORT: u16 = 51515;
const PORT_SEARCH_RANGE: u16 = 10;
/// Delay before checking if server process started successfully (100ms)
const STARTUP_CHECK_DELAY_MS: u64 = 100;
/// Number of retries when waiting for server to become ready (40 * 500ms = 20s total)
const HEALTH_CHECK_RETRIES: u32 = 40;
/// Interval between health check retries (500ms)
const HEALTH_CHECK_INTERVAL_MS: u64 = 500;
/// Maximum timeout for HTTP operations (5 minutes)
/// This is used for error reporting in the error module
pub const HTTP_OPERATION_TIMEOUT_SECS: u64 = 300;
/// Timeout for establishing HTTP connections (10 seconds)
const HTTP_CONNECT_TIMEOUT_SECS: u64 = 10;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct KopiaServerInfo {
    pub server_url: String,
    pub port: u16,
    pub http_password: String, // HTTP Basic Auth password (not repository password)
    pub pid: u32,
    pub csrf_token: Option<String>,
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

            // Kill the process directly (no graceful shutdown with Kopia 0.21.1)
            if let Err(e) = process.kill() {
                log::error!("Failed to kill process during drop: {}", e);
            } else {
                // Wait for process to be reaped (prevents zombie)
                let _ = process.wait();
                log::info!("Process terminated successfully during drop");
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
        }
    }

    /// Start the Kopia server process (non-blocking)
    /// Returns server info immediately after spawning
    /// Use wait_for_ready() to ensure server is responding
    ///
    /// # Security Model
    /// - TLS with self-signed certificate (--tls-generate-cert)
    /// - Localhost-only binding (127.0.0.1)
    /// - HTTP Basic Auth with random session password
    /// - CSRF protection disabled (acceptable for localhost-only server)
    pub fn start(&mut self, config_dir: &str) -> Result<KopiaServerInfo> {
        if self.is_running() {
            return Err(KopiaError::ServerAlreadyRunning {
                port: self.info.as_ref().map(|i| i.port).unwrap_or(DEFAULT_PORT),
            });
        }

        let binary_path = self.get_kopia_binary_path()?;
        let port = self.find_available_port(DEFAULT_PORT)?;
        let server_password = self.generate_password();
        let config_file = format!("{}/kopia-desktop.config", config_dir);

        let mut cmd = Command::new(&binary_path);
        cmd.args([
            "server",
            "start",
            "--ui",
            &format!("--address=localhost:{}", port),
            "--tls-generate-cert",               // Generate self-signed TLS certificate
            "--tls-generate-cert-name=localhost", // Certificate for localhost
            "--disable-csrf-token-checks",        // CSRF not needed for localhost-only
            "--async-repo-connect",               // Connect to repository asynchronously (allows server to start even with invalid repo)
            "--server-username",
            SERVER_USERNAME,
            "--server-password",
            &server_password,
            "--config-file",
            &config_file,
            // NOTE: --shutdown-on-stdin flag removed as it's not supported in Kopia 0.21.1
            // Server will be terminated via process kill() instead
        ])
        .env("KOPIA_CHECK_FOR_UPDATES", "false")
        .stdin(Stdio::piped())
        .stdout(Stdio::piped())  // Capture stdout for debugging (was Stdio::null())
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

        // Quick check that process didn't immediately crash
        std::thread::sleep(Duration::from_millis(STARTUP_CHECK_DELAY_MS));
        if let Ok(Some(status)) = child.try_wait() {
            let stderr = self.read_stderr(&mut child);
            return Err(KopiaError::ServerStartFailed {
                message: format!("Server process exited immediately with status: {}", status),
                details: Some(stderr),
            });
        }

        let info = KopiaServerInfo {
            server_url: format!("https://localhost:{}", port),
            port,
            http_password: server_password.clone(),
            pid: child.id(),
            csrf_token: None,
        };

        // Create HTTP client BEFORE storing process (if this fails, kill the child)
        let http_client = match self.create_http_client(SERVER_USERNAME, &server_password) {
            Ok(client) => client,
            Err(e) => {
                log::error!("Failed to create HTTP client, killing spawned process");
                let _ = child.kill();
                let _ = child.wait();
                return Err(e);
            }
        };

        // Only store state after all operations that can fail have succeeded
        self.process = Some(child);
        self.info = Some(info.clone());
        self.start_time = Some(SystemTime::now());
        self.http_client = Some(http_client);

        Ok(info)
    }

    /// Generate a cryptographically secure random password for the server session
    /// Uses 32 bytes of random data (256 bits) encoded as base64
    fn generate_password(&self) -> String {
        use base64::Engine;
        use rand::Rng;

        let mut rng = rand::thread_rng();
        let random_bytes: [u8; 32] = rng.gen();
        format!(
            "kopia-{}",
            base64::prelude::BASE64_STANDARD.encode(random_bytes)
        )
    }

    /// Read stderr from a child process
    fn read_stderr(&self, child: &mut Child) -> String {
        child.stderr.take().map_or(String::new(), |mut err| {
            use std::io::Read;
            let mut stderr = String::new();
            let _ = err.read_to_string(&mut stderr);
            stderr
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
    /// NOTE: With Kopia 0.21.1, we don't have --shutdown-on-stdin support,
    /// so we directly kill the process. This is acceptable for localhost-only operation.
    pub fn stop(&mut self) -> Result<()> {
        let mut process = self.process.take().ok_or(KopiaError::ServerNotRunning)?;

        // Kill the server process
        process.kill().map_err(|e| KopiaError::ServerStopFailed {
            message: format!("Failed to kill server process: {}", e),
            details: None,
        })?;

        // Wait for process to terminate
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
    ///
    /// This checks if the process is actually running (not just if we have state stored).
    /// Requires &mut self to clean up stale state if the process has exited.
    pub fn status(&mut self) -> KopiaServerStatus {
        // Check if process is actually alive (cleans up zombie state)
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
    ///
    /// Searches for the binary in the following locations (in priority order):
    /// 1. Custom path from KOPIA_PATH environment variable
    /// 2. Development paths (relative to target/debug or target/release)
    /// 3. Production paths (bundled with the app)
    /// 4. Current directory fallback
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
    ///
    /// Maps the current platform to the expected Kopia binary name.
    /// Logs warnings for unsupported or unusual platform combinations.
    fn get_platform_binary_name(&self) -> &'static str {
        match (std::env::consts::OS, std::env::consts::ARCH) {
            ("windows", _) => "kopia-windows-x64.exe",
            ("macos", "aarch64") => "kopia-darwin-arm64",
            ("macos", "x86_64") => "kopia-darwin-x64",
            ("macos", arch) => {
                log::warn!(
                    "Unsupported macOS architecture: {}. Falling back to x64 binary, which may not work.",
                    arch
                );
                "kopia-darwin-x64"
            }
            ("linux", "aarch64") => "kopia-linux-arm64",
            ("linux", "x86_64") => "kopia-linux-x64",
            ("linux", arch) => {
                log::warn!(
                    "Unsupported Linux architecture: {}. Falling back to x64 binary, which may not work.",
                    arch
                );
                "kopia-linux-x64"
            }
            (os, arch) => {
                log::warn!(
                    "Unsupported platform: OS={}, ARCH={}. Using generic binary name 'kopia'.",
                    os,
                    arch
                );
                "kopia"
            }
        }
    }

    /// Find an available port starting from the given port
    ///
    /// # Race Condition Note
    ///
    /// This function has a TOCTOU (time-of-check-time-of-use) race condition:
    /// the port may be taken by another process between checking availability
    /// and actually binding to it. This is acceptable because:
    ///
    /// 1. The Kopia server will fail gracefully if the port is unavailable
    /// 2. The error will be reported to the user with a clear message
    /// 3. The application can retry with a different port if needed
    fn find_available_port(&self, start_port: u16) -> Result<u16> {
        use std::net::TcpListener;

        let end_port = start_port.saturating_add(PORT_SEARCH_RANGE);

        (start_port..=end_port)
            .find(|&port| TcpListener::bind(("127.0.0.1", port)).is_ok())
            .ok_or_else(|| KopiaError::ServerStartFailed {
                message: format!("No available ports in range {}-{}", start_port, end_port),
                details: None,
            })
    }

    /// Create HTTP client with Basic Auth credentials
    ///
    /// # Security Note
    /// Accepts self-signed certificates since we control the Kopia server
    /// and it's bound to localhost only. This is safe for local communication.
    fn create_http_client(&self, username: &str, password: &str) -> Result<reqwest::Client> {
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

        reqwest::Client::builder()
            .default_headers(headers)
            .timeout(Duration::from_secs(HTTP_OPERATION_TIMEOUT_SECS))
            .connect_timeout(Duration::from_secs(HTTP_CONNECT_TIMEOUT_SECS))
            .danger_accept_invalid_certs(true) // Accept self-signed certificates (localhost only)
            .build()
            .map_err(|e| KopiaError::InternalError {
                message: format!("Failed to create HTTP client: {}", e),
                details: None,
            })
    }

    /// Get the HTTP client for making API requests
    /// Returns a clone of the client (cheap operation due to internal Arc)
    pub fn get_http_client(&self) -> Option<reqwest::Client> {
        self.http_client.clone()
    }

    /// Get the server URL if the server is running
    ///
    /// This method is primarily used by integration tests to verify server URLs.
    #[allow(dead_code)]
    pub fn get_server_url(&self) -> Option<String> {
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
