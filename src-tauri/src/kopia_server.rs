use serde::{Deserialize, Serialize};
use std::io::Write;
use std::process::{Child, Command, Stdio};
use std::sync::{Arc, Mutex};
use std::time::{Duration, SystemTime};

// Constants
const SERVER_USERNAME: &str = "kopia-desktop";
const DEFAULT_PORT: u16 = 51515;
const PORT_SEARCH_RANGE: u16 = 10;
const STARTUP_CHECK_DELAY_MS: u64 = 100;
const HEALTH_CHECK_RETRIES: u32 = 20;
const HEALTH_CHECK_INTERVAL_MS: u64 = 500;
const GRACEFUL_SHUTDOWN_TIMEOUT_MS: u64 = 5000;
const HTTP_OPERATION_TIMEOUT_SECS: u64 = 300;
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
    pub fn start(&mut self, config_dir: &str) -> Result<KopiaServerInfo, String> {
        if self.is_running() {
            return Err("Kopia server is already running".into());
        }

        let binary_path = self.get_kopia_binary_path()?;
        let port = self.find_available_port(DEFAULT_PORT)?;
        let server_password = self.generate_password();
        let config_file = format!("{}/kopia-desktop.config", config_dir);

        let mut child = Command::new(&binary_path)
            .args([
                "server",
                "start",
                "--ui",
                &format!("--address=localhost:{}", port),
                "--tls-generate-cert",               // Generate self-signed TLS certificate
                "--tls-generate-cert-name=localhost", // Certificate for localhost
                "--disable-csrf-token-checks",        // CSRF not needed for localhost-only
                "--server-username",
                SERVER_USERNAME,
                "--server-password",
                &server_password,
                "--config-file",
                &config_file,
                "--shutdown-on-stdin",
            ])
            .env("KOPIA_CHECK_FOR_UPDATES", "false")
            .stdin(Stdio::piped())
            .stdout(Stdio::piped())
            .stderr(Stdio::piped())
            .spawn()
            .map_err(|e| format!("Failed to spawn Kopia server: {}", e))?;

        // Quick check that process didn't immediately crash
        std::thread::sleep(Duration::from_millis(STARTUP_CHECK_DELAY_MS));
        if let Ok(Some(status)) = child.try_wait() {
            let stderr = self.read_stderr(&mut child);
            return Err(format!(
                "Kopia server exited with status {}: {}",
                status, stderr
            ));
        }

        let info = KopiaServerInfo {
            server_url: format!("https://localhost:{}", port),
            port,
            http_password: server_password.clone(),
            pid: child.id(),
            csrf_token: None,
        };

        self.process = Some(child);
        self.info = Some(info.clone());
        self.start_time = Some(SystemTime::now());
        self.http_client = Some(self.create_http_client(SERVER_USERNAME, &server_password)?);

        Ok(info)
    }

    /// Generate a unique password for the server session
    fn generate_password(&self) -> String {
        format!(
            "kopia-{}",
            SystemTime::now()
                .duration_since(SystemTime::UNIX_EPOCH)
                .unwrap_or(Duration::from_secs(0))
                .as_millis()
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
    pub fn get_ready_waiter(
        &self,
    ) -> Result<impl std::future::Future<Output = Result<(), String>>, String> {
        let http_client = self.http_client.clone().ok_or("Server not started")?;
        let server_url = self
            .info
            .as_ref()
            .ok_or("Server info not available")?
            .server_url
            .clone();

        Ok(async move { wait_for_server_ready(http_client, server_url).await })
    }

    /// Stop the Kopia server process gracefully
    pub fn stop(&mut self) -> Result<(), String> {
        let mut process = self.process.take().ok_or("Kopia server is not running")?;

        // Try graceful shutdown via stdin
        if self.try_graceful_shutdown(&mut process)? {
            self.cleanup();
            return Ok(());
        }

        // Force kill if graceful shutdown failed
        log::warn!("Graceful shutdown timed out, forcing kill");
        process
            .kill()
            .map_err(|e| format!("Failed to kill server: {}", e))?;
        process
            .wait()
            .map_err(|e| format!("Failed to wait for server: {}", e))?;
        self.cleanup();
        Ok(())
    }

    /// Try to gracefully shutdown the process via stdin
    fn try_graceful_shutdown(&self, process: &mut Child) -> Result<bool, String> {
        let Some(mut stdin) = process.stdin.take() else {
            return Ok(false);
        };

        let _ = stdin.write_all(b"\n");
        let _ = stdin.flush();
        drop(stdin);

        // Wait for graceful shutdown
        const SHUTDOWN_INTERVAL_MS: u64 = 500;
        let retries = GRACEFUL_SHUTDOWN_TIMEOUT_MS / SHUTDOWN_INTERVAL_MS;

        for _ in 0..retries {
            if let Ok(Some(_)) = process.try_wait() {
                return Ok(true);
            }
            std::thread::sleep(Duration::from_millis(SHUTDOWN_INTERVAL_MS));
        }

        Ok(false)
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
    pub fn status(&self) -> KopiaServerStatus {
        match &self.info {
            Some(info) => KopiaServerStatus {
                running: true,
                server_url: Some(info.server_url.clone()),
                port: Some(info.port),
                uptime: self.get_uptime(),
            },
            None => KopiaServerStatus {
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
    fn get_kopia_binary_path(&self) -> Result<String, String> {
        // Check for custom path via environment variable
        if let Ok(custom_path) = std::env::var("KOPIA_PATH") {
            return Ok(custom_path);
        }

        let binary_name = self.get_platform_binary_name();
        let exe_dir = std::env::current_exe()
            .ok()
            .and_then(|p| p.parent().map(std::path::PathBuf::from))
            .ok_or("Failed to get executable directory")?;

        // Search paths in priority order
        [
            exe_dir.join("../../../bin").join(binary_name), // Dev: target/debug
            exe_dir.join("../../bin").join(binary_name),    // Dev: alternative
            exe_dir.join("_up_/bin").join(binary_name),     // Production: Windows
            exe_dir.join("resources/bin").join(binary_name), // Production: macOS/Linux
            std::path::PathBuf::from("./bin").join(binary_name), // Current dir fallback
        ]
        .iter()
        .find(|path| path.exists())
        .and_then(|p| p.to_str())
        .map(String::from)
        .ok_or_else(|| {
            format!(
                "Kopia binary '{}' not found in standard locations",
                binary_name
            )
        })
    }

    /// Get platform-specific binary name
    fn get_platform_binary_name(&self) -> &'static str {
        match (std::env::consts::OS, std::env::consts::ARCH) {
            ("windows", _) => "kopia-windows-x64.exe",
            ("macos", "aarch64") => "kopia-darwin-arm64",
            ("macos", _) => "kopia-darwin-x64",
            ("linux", "aarch64") => "kopia-linux-arm64",
            ("linux", _) => "kopia-linux-x64",
            _ => "kopia", // Generic fallback
        }
    }

    /// Find an available port starting from the given port
    fn find_available_port(&self, start_port: u16) -> Result<u16, String> {
        use std::net::TcpListener;

        let end_port = start_port.saturating_add(PORT_SEARCH_RANGE);

        (start_port..=end_port)
            .find(|&port| TcpListener::bind(("127.0.0.1", port)).is_ok())
            .ok_or_else(|| format!("No available ports in range {}-{}", start_port, end_port))
    }

    /// Create HTTP client with Basic Auth credentials
    ///
    /// # Security Note
    /// Accepts self-signed certificates since we control the Kopia server
    /// and it's bound to localhost only. This is safe for local communication.
    fn create_http_client(
        &self,
        username: &str,
        password: &str,
    ) -> Result<reqwest::Client, String> {
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
            reqwest::header::HeaderValue::from_str(&auth_header)
                .map_err(|e| format!("Failed to create auth header: {}", e))?,
        );

        reqwest::Client::builder()
            .default_headers(headers)
            .timeout(Duration::from_secs(HTTP_OPERATION_TIMEOUT_SECS))
            .connect_timeout(Duration::from_secs(HTTP_CONNECT_TIMEOUT_SECS))
            .danger_accept_invalid_certs(true) // Accept self-signed certificates (localhost only)
            .build()
            .map_err(|e| format!("Failed to create HTTP client: {}", e))
    }

    /// Get the HTTP client for making API requests
    /// Returns a clone of the client (cheap operation due to internal Arc)
    pub fn get_http_client(&self) -> Option<reqwest::Client> {
        self.http_client.clone()
    }
}

// Global server instance managed by Tauri state
pub type KopiaServerState = Arc<Mutex<KopiaServer>>;

pub fn create_server_state() -> KopiaServerState {
    Arc::new(Mutex::new(KopiaServer::new()))
}

/// Wait for server to become ready (standalone async function)
async fn wait_for_server_ready(
    http_client: reqwest::Client,
    server_url: String,
) -> Result<(), String> {
    for _ in 0..HEALTH_CHECK_RETRIES {
        if let Ok(response) = http_client
            .get(format!("{}/api/v1/repo/status", &server_url))
            .send()
            .await
        {
            // Any non-5xx response means server is ready
            if response.status().as_u16() < 500 {
                return Ok(());
            }
        }

        tokio::time::sleep(Duration::from_millis(HEALTH_CHECK_INTERVAL_MS)).await;
    }

    let timeout_secs = (HEALTH_CHECK_RETRIES as u64 * HEALTH_CHECK_INTERVAL_MS) / 1000;
    Err(format!(
        "Server failed to respond within {} seconds",
        timeout_secs
    ))
}
