use serde::{Deserialize, Serialize};
use std::process::{Child, Command};
use std::sync::{Arc, Mutex};
use std::time::{Duration, SystemTime};

/// HTTP server username for Kopia API authentication
const SERVER_USERNAME: &str = "kopia-ui";

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct KopiaServerInfo {
    pub server_url: String,
    pub port: u16,
    pub http_password: String,  // HTTP Basic Auth password (not repository password)
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

impl KopiaServer {
    pub fn new() -> Self {
        Self {
            process: None,
            info: None,
            start_time: None,
            http_client: None,
        }
    }

    /// Start the Kopia server process
    pub fn start(&mut self, config_dir: &str) -> Result<KopiaServerInfo, String> {
        if self.is_running() {
            return Err("Kopia server is already running".to_string());
        }

        // Determine binary path
        let binary_path = self.get_kopia_binary_path()
            .map_err(|e| format!("Failed to locate Kopia binary: {}", e))?;

        // Find an available port, starting with default
        let port: u16 = self.find_available_port(51515)?;

        // Generate server credentials for Basic Auth
        let server_password = format!("kopia-{}",
            SystemTime::now()
                .duration_since(SystemTime::UNIX_EPOCH)
                .unwrap_or(Duration::from_secs(0))
                .as_millis()
        );

        // Start server with embedded mode flags
        // NOTE: We start the server without connecting to any repository.
        // The repository connection will be handled by the UI later via API calls.
        // We use a non-existent config file path to prevent auto-connection to any repository.
        let temp_config = format!("{}/kopia-ui-temp.config", config_dir);

        let mut command = Command::new(&binary_path);
        command
            .args([
                "server", "start",
                "--ui",                                    // Enable REST API
                &format!("--address=localhost:{}", port),  // Fixed port for now
                "--insecure",                              // Don't use TLS for localhost
                "--disable-csrf-token-checks",             // For embedded use
                "--override-hostname=kopia-ui",            // Set hostname for server
                "--override-username=kopia-ui",            // Set username for server
                "--server-username", SERVER_USERNAME,      // HTTP Basic Auth username
                "--server-password", &server_password,     // HTTP Basic Auth password
                "--config-file", &temp_config,            // Use a temp config file that doesn't exist yet
            ])
            .env("KOPIA_CHECK_FOR_UPDATES", "false")  // Disable update checks
            .stdin(std::process::Stdio::null())  // Don't pipe stdin to avoid shutdown-on-stdin issues
            .stdout(std::process::Stdio::piped())
            .stderr(std::process::Stdio::piped());

        let mut child = command
            .spawn()
            .map_err(|e| format!("Failed to spawn Kopia server: {}", e))?;

        let pid = child.id();

        // Wait a bit for server to start
        // Note: Using thread::sleep here as this function is sync.
        // To use tokio::time::sleep, this function would need to be async.
        std::thread::sleep(Duration::from_millis(500));

        // Check if the process is still running
        match child.try_wait() {
            Ok(Some(status)) => {
                // Process has already exited - try to get error output
                let mut stderr = String::new();
                if let Some(mut err) = child.stderr.take() {
                    use std::io::Read;
                    let _ = err.read_to_string(&mut stderr);
                }
                return Err(format!("Kopia server exited immediately with status: {}. Error: {}", status, stderr));
            }
            Ok(None) => {
                // Process is still running - good!
            }
            Err(e) => {
                return Err(format!("Failed to check server status: {}", e));
            }
        }

        let server_url = format!("http://localhost:{}", port);

        // Create reusable HTTP client with authentication
        let http_client = self.create_http_client(SERVER_USERNAME, &server_password)?;

        let info = KopiaServerInfo {
            server_url,
            port,
            http_password: server_password,
            pid,
            csrf_token: None, // CSRF disabled for embedded server
        };

        self.process = Some(child);
        self.info = Some(info.clone());
        self.start_time = Some(SystemTime::now());
        self.http_client = Some(http_client);

        Ok(info)
    }

    /// Stop the Kopia server process
    pub fn stop(&mut self) -> Result<(), String> {
        if let Some(mut process) = self.process.take() {
            process
                .kill()
                .map_err(|e| format!("Failed to kill Kopia server: {}", e))?;

            process
                .wait()
                .map_err(|e| format!("Failed to wait for Kopia server: {}", e))?;

            self.info = None;
            self.start_time = None;
            self.http_client = None;

            Ok(())
        } else {
            Err("Kopia server is not running".to_string())
        }
    }

    /// Check if the server is currently running
    pub fn is_running(&self) -> bool {
        self.process.is_some()
    }

    /// Get current server status
    pub fn status(&self) -> KopiaServerStatus {
        if let Some(info) = &self.info {
            let uptime = self.start_time.and_then(|start| {
                SystemTime::now()
                    .duration_since(start)
                    .ok()
                    .map(|d| d.as_secs())
            });

            KopiaServerStatus {
                running: true,
                server_url: Some(info.server_url.clone()),
                port: Some(info.port),
                uptime,
            }
        } else {
            KopiaServerStatus {
                running: false,
                server_url: None,
                port: None,
                uptime: None,
            }
        }
    }

    /// Get the path to the Kopia binary
    fn get_kopia_binary_path(&self) -> Result<String, String> {
        // Check for custom path via environment variable
        if let Ok(custom_path) = std::env::var("KOPIA_PATH") {
            return Ok(custom_path);
        }

        // Determine platform-specific binary name
        #[cfg(target_os = "windows")]
        let binary_name = "kopia-windows-x64.exe";

        #[cfg(target_os = "macos")]
        let binary_name = if cfg!(target_arch = "aarch64") {
            "kopia-darwin-arm64"
        } else {
            "kopia-darwin-x64"
        };

        #[cfg(target_os = "linux")]
        let binary_name = if cfg!(target_arch = "aarch64") {
            "kopia-linux-arm64"
        } else {
            "kopia-linux-x64"
        };

        // Get the executable path and work backwards to find the project root
        let exe_path = std::env::current_exe()
            .map_err(|e| format!("Failed to get executable path: {}", e))?;

        // In development: binary is in target/debug/, so go up 3 levels to project root
        // In production: binary is in the app bundle
        let exe_dir = exe_path.parent()
            .ok_or_else(|| "Failed to get executable directory".to_string())?;

        // Try development path (../../../bin/kopia-*)
        let dev_path = exe_dir
            .join("../../../bin")
            .join(binary_name);

        // Try production path (./resources/bin/kopia-*)
        let prod_path = exe_dir
            .join("resources/bin")
            .join(binary_name);

        // Try alternative development path (../../bin/kopia-*) for different build configs
        let alt_dev_path = exe_dir
            .join("../../bin")
            .join(binary_name);

        if dev_path.exists() {
            Ok(dev_path.to_string_lossy().to_string())
        } else if alt_dev_path.exists() {
            Ok(alt_dev_path.to_string_lossy().to_string())
        } else if prod_path.exists() {
            Ok(prod_path.to_string_lossy().to_string())
        } else {
            // Try current directory as last resort
            let current_dir_path = std::path::Path::new("./bin").join(binary_name);
            if current_dir_path.exists() {
                Ok(current_dir_path.to_string_lossy().to_string())
            } else {
                Err(format!(
                    "Kopia binary not found: {}\nSearched in:\n  - {:?}\n  - {:?}\n  - {:?}\n  - {:?}",
                    binary_name, dev_path, alt_dev_path, prod_path, current_dir_path
                ))
            }
        }
    }

    /// Find an available port starting from the given port
    fn find_available_port(&self, start_port: u16) -> Result<u16, String> {
        use std::net::TcpListener;

        let end_port = start_port.saturating_add(10);

        for port in start_port..=end_port {
            if TcpListener::bind(("127.0.0.1", port)).is_ok() {
                return Ok(port);
            }
        }

        Err(format!("No available ports found in range {}-{}", start_port, end_port))
    }

    /// Create HTTP client with Basic Auth credentials
    fn create_http_client(&self, username: &str, password: &str) -> Result<reqwest::Client, String> {
        use base64::Engine;

        let mut headers = reqwest::header::HeaderMap::new();

        // Add CSRF token (always use "-" since we disabled CSRF checks)
        headers.insert(
            "X-Kopia-Csrf-Token",
            reqwest::header::HeaderValue::from_static("-"),
        );

        // Add Basic Auth header
        let auth = format!("{}:{}", username, password);
        let auth_header = format!("Basic {}", base64::prelude::BASE64_STANDARD.encode(auth.as_bytes()));
        headers.insert(
            reqwest::header::AUTHORIZATION,
            reqwest::header::HeaderValue::from_str(&auth_header)
                .map_err(|e| format!("Failed to create auth header: {}", e))?
        );

        // Build client with all headers (reusable with connection pooling)
        reqwest::Client::builder()
            .default_headers(headers)
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
