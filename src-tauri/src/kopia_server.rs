use serde::{Deserialize, Serialize};
use std::process::{Child, Command};
use std::sync::{Arc, Mutex};
use std::time::{Duration, SystemTime};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct KopiaServerInfo {
    pub server_url: String,
    pub port: u16,
    pub password: String,
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
}

impl KopiaServer {
    pub fn new() -> Self {
        Self {
            process: None,
            info: None,
            start_time: None,
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

        // Generate random password for local-only access
        let password = self.generate_random_password();

        // Start server with embedded mode flags
        let mut command = Command::new(&binary_path);
        command
            .args(&[
                "server", "start",
                "--ui",                             // Enable REST API
                "--address=localhost:0",            // Random available port
                "--tls-generate-cert",              // Self-signed cert
                "--tls-generate-cert-name=localhost",
                "--random-password",                // Secure password
                "--shutdown-on-stdin",              // Exit when stdin closes
                "--disable-csrf-token-checks",      // For embedded use
                "--config-file", config_dir,
            ])
            .stdin(std::process::Stdio::piped())
            .stdout(std::process::Stdio::piped())
            .stderr(std::process::Stdio::piped());

        let child = command
            .spawn()
            .map_err(|e| format!("Failed to spawn Kopia server: {}", e))?;

        let pid = child.id();

        // Wait for server to start and parse output to get port
        // In a real implementation, we'd parse stdout/stderr for the actual port
        // For now, we'll use a placeholder approach
        std::thread::sleep(Duration::from_secs(2));

        let port = self.detect_server_port().unwrap_or(51515);
        let server_url = format!("http://localhost:{}", port);

        let info = KopiaServerInfo {
            server_url: server_url.clone(),
            port,
            password,
            pid,
            csrf_token: None, // CSRF disabled for embedded server
        };

        self.process = Some(child);
        self.info = Some(info.clone());
        self.start_time = Some(SystemTime::now());

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

    /// Get server info including CSRF token
    ///
    /// Used by get_server_client() to retrieve CSRF token for API requests.
    pub fn info(&self) -> Option<&KopiaServerInfo> {
        self.info.as_ref()
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

        // In development: use ./bin/kopia-*
        // In production: use bundled resource
        let dev_path = format!("./bin/{}", binary_name);
        let prod_path = format!("./resources/bin/{}", binary_name);

        if std::path::Path::new(&dev_path).exists() {
            Ok(dev_path)
        } else if std::path::Path::new(&prod_path).exists() {
            Ok(prod_path)
        } else {
            Err(format!("Kopia binary not found: {}", binary_name))
        }
    }

    /// Generate a random password for local server
    fn generate_random_password(&self) -> String {
        use std::time::SystemTime;
        let timestamp = SystemTime::now()
            .duration_since(SystemTime::UNIX_EPOCH)
            .unwrap()
            .as_millis();
        format!("kopia-local-{}", timestamp)
    }

    /// Detect which port the server started on
    /// In a real implementation, parse stdout/stderr
    fn detect_server_port(&self) -> Option<u16> {
        // TODO: Parse actual port from server output
        // For now, return None to use default detection
        None
    }
}

// Global server instance managed by Tauri state
pub type KopiaServerState = Arc<Mutex<KopiaServer>>;

pub fn create_server_state() -> KopiaServerState {
    Arc::new(Mutex::new(KopiaServer::new()))
}
