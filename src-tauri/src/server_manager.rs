//! Server Manager for multi-repository support
//!
//! Manages multiple Kopia server instances, one per repository. Each repository
//! has its own isolated config file, server process, and HTTP client.
//!
//! # Architecture
//!
//! The ServerManager maintains a HashMap of KopiaServer instances, keyed by
//! repository ID. Repository IDs are derived from config file names:
//! - `repository.config` → ID: `repository` (default/primary)
//! - `repository-1699123456.config` → ID: `repository-1699123456`
//!
//! # Config Directory Layout
//!
//! ```text
//! ~/.config/kopia/
//! ├── repository.config           # Default repository
//! ├── repository-1699123456.config # Additional repository
//! └── ...
//! ```
//!
//! This matches the official KopiaUI approach for maximum compatibility.

use crate::error::{KopiaError, Result};
use crate::kopia_server::{KopiaServer, KopiaServerInfo, KopiaServerStatus};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::fs;
use std::path::PathBuf;
use std::sync::{Arc, Mutex, MutexGuard, PoisonError};

// ============================================================================
// Mutex Recovery Extension Trait
// ============================================================================

/// Extension trait for Mutex that provides poison recovery with logging
pub trait MutexRecoveryExt<T> {
    /// Lock the mutex, recovering from poison if necessary
    fn lock_or_recover(&self) -> MutexGuard<'_, T>;
}

impl<T> MutexRecoveryExt<T> for Mutex<T> {
    fn lock_or_recover(&self) -> MutexGuard<'_, T> {
        self.lock()
            .unwrap_or_else(|poisoned: PoisonError<MutexGuard<'_, T>>| {
                log::warn!("Mutex poisoned, recovering...");
                poisoned.into_inner()
            })
    }
}

impl<T> MutexRecoveryExt<T> for Arc<Mutex<T>> {
    fn lock_or_recover(&self) -> MutexGuard<'_, T> {
        self.lock()
            .unwrap_or_else(|poisoned: PoisonError<MutexGuard<'_, T>>| {
                log::warn!("Mutex poisoned, recovering...");
                poisoned.into_inner()
            })
    }
}

/// Config file suffix used by Kopia
const CONFIG_SUFFIX: &str = ".config";

/// Default repository ID (matches Kopia CLI default)
const DEFAULT_REPO_ID: &str = "repository";

/// Entry in the repository list
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RepositoryEntry {
    /// Unique identifier (derived from config filename)
    pub id: String,
    /// Display name (from repo description or storage type)
    pub display_name: String,
    /// Full path to config file
    pub config_file: String,
    /// Server status: "starting", "running", "stopped", "error"
    pub status: String,
    /// Whether repository is connected
    pub connected: bool,
    /// Storage type (filesystem, s3, b2, etc.)
    pub storage: Option<String>,
    /// Error message if status is "error"
    pub error: Option<String>,
}

/// Server Manager for multi-repository support
pub struct ServerManager {
    /// Map of repository ID to KopiaServer instance
    servers: HashMap<String, Arc<Mutex<KopiaServer>>>,
    /// Base config directory (e.g., ~/.config/kopia)
    config_dir: String,
}

impl ServerManager {
    /// Create a new ServerManager
    pub fn new(config_dir: &str) -> Self {
        // Ensure config directory exists
        if let Err(e) = fs::create_dir_all(config_dir) {
            log::warn!("Failed to create config directory {}: {}", config_dir, e);
        }

        Self {
            servers: HashMap::new(),
            config_dir: config_dir.to_string(),
        }
    }

    /// Discover existing repositories by scanning config directory
    ///
    /// Returns list of repository IDs found (based on *.config files)
    pub fn discover_repositories(&self) -> Result<Vec<String>> {
        let config_path = PathBuf::from(&self.config_dir);

        if !config_path.exists() {
            log::info!("Config directory does not exist, no repositories to discover");
            return Ok(vec![]);
        }

        let entries = fs::read_dir(&config_path).map_err(|e| KopiaError::InternalError {
            message: format!("Failed to read config directory: {}", e),
            details: None,
        })?;

        let mut repo_ids = Vec::new();

        for entry in entries.flatten() {
            let path = entry.path();
            if let Some(filename) = path.file_name().and_then(|f| f.to_str()) {
                if filename.ends_with(CONFIG_SUFFIX) {
                    let repo_id = filename.trim_end_matches(CONFIG_SUFFIX).to_string();
                    log::info!("Discovered repository: {} ({})", repo_id, path.display());
                    repo_ids.push(repo_id);
                }
            }
        }

        // Sort to ensure consistent ordering (default "repository" first)
        repo_ids.sort_by(|a, b| {
            if a == DEFAULT_REPO_ID {
                std::cmp::Ordering::Less
            } else if b == DEFAULT_REPO_ID {
                std::cmp::Ordering::Greater
            } else {
                a.cmp(b)
            }
        });

        Ok(repo_ids)
    }

    /// Get or create a server instance for a repository
    fn get_or_create_server(&mut self, repo_id: &str) -> Arc<Mutex<KopiaServer>> {
        if let Some(server) = self.servers.get(repo_id) {
            return server.clone();
        }

        let server = Arc::new(Mutex::new(KopiaServer::new()));
        self.servers.insert(repo_id.to_string(), server.clone());
        server
    }

    /// Start a server for a specific repository
    pub fn start_server(&mut self, repo_id: &str) -> Result<KopiaServerInfo> {
        let config_file = self.get_config_file_path(repo_id);
        let config_dir = self.config_dir.clone();

        log::info!(
            "Starting server for repository '{}' with config: {}",
            repo_id,
            config_file
        );

        let server = self.get_or_create_server(repo_id);

        let mut server_guard = server.lock_or_recover();

        // Check if already running
        if server_guard.is_running() {
            return Err(KopiaError::ServerAlreadyRunning {
                port: server_guard.status().port.unwrap_or(0),
            });
        }

        // Start with repo-specific config
        server_guard.start_with_config(&config_dir, repo_id)
    }

    /// Stop a server for a specific repository
    pub fn stop_server(&mut self, repo_id: &str) -> Result<()> {
        let server = self
            .servers
            .get(repo_id)
            .ok_or_else(|| KopiaError::RepositoryNotFound {
                repo_id: repo_id.to_string(),
            })?;

        let mut server_guard = server.lock_or_recover();

        server_guard.stop()
    }

    /// Stop all running servers
    pub fn stop_all(&mut self) -> Result<()> {
        let mut errors = Vec::new();

        for (repo_id, server) in self.servers.iter() {
            let mut server_guard = server.lock_or_recover();

            if server_guard.is_running() {
                log::info!("Stopping server for repository '{}'", repo_id);
                if let Err(e) = server_guard.stop() {
                    errors.push(format!("{}: {}", repo_id, e));
                }
            }
        }

        if errors.is_empty() {
            Ok(())
        } else {
            Err(KopiaError::InternalError {
                message: "Failed to stop some servers".to_string(),
                details: Some(errors.join(", ")),
            })
        }
    }

    /// Get server reference for a repository (for command routing)
    #[allow(dead_code)]
    pub fn get_server(&self, repo_id: &str) -> Option<Arc<Mutex<KopiaServer>>> {
        self.servers.get(repo_id).cloned()
    }

    /// Get server status for a specific repository
    pub fn get_server_status(&mut self, repo_id: &str) -> Result<KopiaServerStatus> {
        let server = self
            .servers
            .get(repo_id)
            .ok_or_else(|| KopiaError::RepositoryNotFound {
                repo_id: repo_id.to_string(),
            })?;

        let mut server_guard = server.lock_or_recover();

        Ok(server_guard.status())
    }

    /// List all repositories with their status
    pub fn list_repositories(&mut self) -> Result<Vec<RepositoryEntry>> {
        // First, discover all repos from config files
        let repo_ids = self.discover_repositories()?;

        let mut entries = Vec::new();

        for repo_id in repo_ids {
            let config_file = self.get_config_file_path(&repo_id);

            // Get or create server to check status
            let server = self.get_or_create_server(&repo_id);
            let mut server_guard = server.lock_or_recover();

            let status = server_guard.status();
            let status_str = if status.running { "running" } else { "stopped" };

            entries.push(RepositoryEntry {
                id: repo_id.clone(),
                display_name: repo_id.clone(), // Will be updated with actual description
                config_file,
                status: status_str.to_string(),
                connected: false, // Will be updated by checking repo status
                storage: None,    // Will be updated by checking repo status
                error: None,
            });
        }

        Ok(entries)
    }

    /// Add a new repository configuration and start the server
    ///
    /// If `repo_id` is None, generates a unique ID based on timestamp.
    /// Also starts the Kopia server for this repository (required for API calls).
    /// Returns the repository ID.
    pub fn add_repository(&mut self, repo_id: Option<String>) -> Result<String> {
        let id = repo_id.unwrap_or_else(|| {
            let timestamp = std::time::SystemTime::now()
                .duration_since(std::time::UNIX_EPOCH)
                .map(|d| d.as_millis())
                .unwrap_or(0);
            format!("{}-{}", DEFAULT_REPO_ID, timestamp)
        });

        // Validate ID doesn't already exist
        let config_file = self.get_config_file_path(&id);
        if PathBuf::from(&config_file).exists() {
            return Err(KopiaError::RepositoryConfigAlreadyExists { repo_id: id });
        }

        // Create and start server instance (required for API calls)
        // Config file will be created by Kopia when connecting/creating
        log::info!("Adding new repository '{}' and starting server...", id);

        // Start the server for this new repository
        self.start_server(&id)?;

        log::info!(
            "Added new repository '{}' (server started, config will be created on connect)",
            id
        );
        Ok(id)
    }

    /// Remove a repository configuration
    ///
    /// Stops the server if running and removes the config file.
    pub fn remove_repository(&mut self, repo_id: &str) -> Result<()> {
        // Cannot remove default repository
        if repo_id == DEFAULT_REPO_ID {
            return Err(KopiaError::InternalError {
                message: "Cannot remove the default repository".to_string(),
                details: None,
            });
        }

        // Stop server if running
        if let Some(server) = self.servers.get(repo_id) {
            let mut server_guard = server.lock_or_recover();

            if server_guard.is_running() {
                server_guard.stop()?;
            }
        }

        // Remove from servers map
        self.servers.remove(repo_id);

        // Note: We don't delete the config file automatically
        // User should disconnect first which handles cleanup

        log::info!("Removed repository '{}'", repo_id);
        Ok(())
    }

    /// Get config file path for a repository
    pub fn get_config_file_path(&self, repo_id: &str) -> String {
        PathBuf::from(&self.config_dir)
            .join(format!("{}{}", repo_id, CONFIG_SUFFIX))
            .to_string_lossy()
            .to_string()
    }

    /// Get the config directory
    #[allow(dead_code)]
    pub fn get_config_dir(&self) -> &str {
        &self.config_dir
    }

    /// Check if a repository exists (has a config file)
    #[allow(dead_code)]
    pub fn repository_exists(&self, repo_id: &str) -> bool {
        PathBuf::from(self.get_config_file_path(repo_id)).exists()
    }

    /// Get HTTP client for a repository (for API calls)
    pub fn get_http_client(&self, repo_id: &str) -> Option<reqwest::Client> {
        self.servers
            .get(repo_id)
            .and_then(|server| server.lock_or_recover().get_http_client())
    }

    /// Get server URL for a repository
    pub fn get_server_url(&self, repo_id: &str) -> Option<String> {
        self.servers.get(repo_id).and_then(|server| {
            let mut server_guard = server.lock_or_recover();
            server_guard.status().server_url
        })
    }

    /// Get server info for a repository
    #[allow(dead_code)]
    pub fn get_server_info(&self, repo_id: &str) -> Option<KopiaServerInfo> {
        self.servers
            .get(repo_id)
            .and_then(|server| server.lock_or_recover().get_info())
    }

    /// Get ready waiter for a repository (for waiting after start)
    pub fn get_ready_waiter(
        &self,
        repo_id: &str,
    ) -> Result<impl std::future::Future<Output = Result<()>>> {
        let server = self
            .servers
            .get(repo_id)
            .ok_or_else(|| KopiaError::RepositoryNotFound {
                repo_id: repo_id.to_string(),
            })?;

        server.lock_or_recover().get_ready_waiter()
    }
}

/// Tauri state type for the ServerManager
pub type ServerManagerState = Arc<Mutex<ServerManager>>;

/// Create a new ServerManager state
pub fn create_server_manager_state(config_dir: &str) -> ServerManagerState {
    Arc::new(Mutex::new(ServerManager::new(config_dir)))
}

#[cfg(test)]
mod tests {
    use super::*;
    use tempfile::tempdir;

    #[test]
    fn test_server_manager_new() {
        let temp_dir = tempdir().unwrap();
        let config_dir = temp_dir.path().to_str().unwrap();

        let manager = ServerManager::new(config_dir);
        assert_eq!(manager.config_dir, config_dir);
        assert!(manager.servers.is_empty());
    }

    #[test]
    fn test_discover_repositories_empty() {
        let temp_dir = tempdir().unwrap();
        let config_dir = temp_dir.path().to_str().unwrap();

        let manager = ServerManager::new(config_dir);
        let repos = manager.discover_repositories().unwrap();
        assert!(repos.is_empty());
    }

    #[test]
    fn test_discover_repositories_with_configs() {
        let temp_dir = tempdir().unwrap();
        let config_dir = temp_dir.path().to_str().unwrap();

        // Create some config files
        fs::write(temp_dir.path().join("repository.config"), "test config").unwrap();
        fs::write(temp_dir.path().join("repository-123.config"), "test config").unwrap();
        fs::write(temp_dir.path().join("other-file.txt"), "not a config").unwrap();

        let manager = ServerManager::new(config_dir);
        let repos = manager.discover_repositories().unwrap();

        assert_eq!(repos.len(), 2);
        assert_eq!(repos[0], "repository"); // Default should be first
        assert_eq!(repos[1], "repository-123");
    }

    #[test]
    fn test_config_file_path() {
        let temp_dir = tempdir().unwrap();
        let config_dir = temp_dir.path().to_str().unwrap();

        let manager = ServerManager::new(config_dir);

        let path = manager.get_config_file_path("repository");
        assert!(path.ends_with("repository.config"));

        let path = manager.get_config_file_path("repository-123");
        assert!(path.ends_with("repository-123.config"));
    }

    #[test]
    #[ignore = "Requires Kopia binary to start server"]
    fn test_add_repository() {
        let temp_dir = tempdir().unwrap();
        let config_dir = temp_dir.path().to_str().unwrap();

        let mut manager = ServerManager::new(config_dir);

        // Add with specific ID (starts server)
        let id = manager.add_repository(Some("my-repo".to_string())).unwrap();
        assert_eq!(id, "my-repo");
        assert!(manager.servers.contains_key("my-repo"));

        // Add with generated ID (starts server)
        let id = manager.add_repository(None).unwrap();
        assert!(id.starts_with("repository-"));
    }

    #[test]
    fn test_repository_exists() {
        let temp_dir = tempdir().unwrap();
        let config_dir = temp_dir.path().to_str().unwrap();

        // Create a config file
        fs::write(temp_dir.path().join("repository.config"), "test config").unwrap();

        let manager = ServerManager::new(config_dir);

        assert!(manager.repository_exists("repository"));
        assert!(!manager.repository_exists("nonexistent"));
    }

    #[test]
    fn test_cannot_remove_default_repository() {
        let temp_dir = tempdir().unwrap();
        let config_dir = temp_dir.path().to_str().unwrap();

        let mut manager = ServerManager::new(config_dir);

        let result = manager.remove_repository("repository");
        assert!(result.is_err());
    }
}
