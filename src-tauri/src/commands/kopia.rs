use crate::kopia_server::{KopiaServerInfo, KopiaServerState, KopiaServerStatus};
use serde::{Deserialize, Serialize};
use tauri::State;

/// Start the Kopia server
#[tauri::command]
pub async fn kopia_server_start(
    server: State<'_, KopiaServerState>,
) -> Result<KopiaServerInfo, String> {
    let config_dir = get_default_config_dir()?;
    let mut server = server.lock().map_err(|e| format!("Lock error: {}", e))?;
    server.start(&config_dir)
}

/// Stop the Kopia server
#[tauri::command]
pub async fn kopia_server_stop(server: State<'_, KopiaServerState>) -> Result<(), String> {
    let mut server = server.lock().map_err(|e| format!("Lock error: {}", e))?;
    server.stop()
}

/// Get Kopia server status
#[tauri::command]
pub async fn kopia_server_status(
    server: State<'_, KopiaServerState>,
) -> Result<KopiaServerStatus, String> {
    let server = server.lock().map_err(|e| format!("Lock error: {}", e))?;
    Ok(server.status())
}

/// Get the default Kopia configuration directory
fn get_default_config_dir() -> Result<String, String> {
    let home_dir = std::env::var("HOME")
        .or_else(|_| std::env::var("USERPROFILE"))
        .map_err(|_| "Cannot determine home directory".to_string())?;

    #[cfg(target_os = "windows")]
    let config_dir = format!("{}\\AppData\\Roaming\\kopia", home_dir);

    #[cfg(not(target_os = "windows"))]
    let config_dir = format!("{}/.config/kopia", home_dir);

    // Ensure directory exists
    std::fs::create_dir_all(&config_dir)
        .map_err(|e| format!("Failed to create config directory: {}", e))?;

    Ok(config_dir)
}

// ============================================================================
// Repository Commands
// ============================================================================

#[derive(Debug, Serialize, Deserialize)]
pub struct RepositoryStatus {
    pub connected: bool,
    pub config_file: Option<String>,
    pub storage: Option<String>,
    pub hash: Option<String>,
    pub encryption: Option<String>,
}

/// Get repository status
#[tauri::command]
pub async fn repository_status(
    server: State<'_, KopiaServerState>,
) -> Result<RepositoryStatus, String> {
    let server_status = {
        let server = server.lock().map_err(|e| format!("Lock error: {}", e))?;
        server.status()
    };

    if !server_status.running {
        return Err("Kopia server is not running".to_string());
    }

    let server_url = server_status
        .server_url
        .ok_or("Server URL not available".to_string())?;

    // Make HTTP request to Kopia API
    let client = reqwest::Client::new();
    let response = client
        .get(format!("{}/api/v1/repo/status", server_url))
        .send()
        .await
        .map_err(|e| format!("Failed to get repository status: {}", e))?;

    if !response.status().is_success() {
        return Err(format!("API error: {}", response.status()));
    }

    let status: RepositoryStatus = response
        .json()
        .await
        .map_err(|e| format!("Failed to parse response: {}", e))?;

    Ok(status)
}

#[derive(Debug, Serialize, Deserialize)]
pub struct StorageConfig {
    pub r#type: String,
    pub path: Option<String>,
    // Add more fields as needed for different storage types
    pub bucket: Option<String>,
    pub endpoint: Option<String>,
    pub access_key_id: Option<String>,
    pub secret_access_key: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct RepositoryConnectRequest {
    pub storage: StorageConfig,
    pub password: String,
    pub token: Option<String>,
}

/// Connect to an existing repository
#[tauri::command]
pub async fn repository_connect(
    server: State<'_, KopiaServerState>,
    config: RepositoryConnectRequest,
) -> Result<RepositoryStatus, String> {
    let server_status = {
        let server = server.lock().map_err(|e| format!("Lock error: {}", e))?;
        server.status()
    };

    if !server_status.running {
        return Err("Kopia server is not running".to_string());
    }

    let server_url = server_status
        .server_url
        .ok_or("Server URL not available".to_string())?;

    // Make HTTP request to connect
    let client = reqwest::Client::new();
    let response = client
        .post(format!("{}/api/v1/repo/connect", server_url))
        .json(&config)
        .send()
        .await
        .map_err(|e| format!("Failed to connect to repository: {}", e))?;

    if !response.status().is_success() {
        let error_text = response
            .text()
            .await
            .unwrap_or_else(|_| "Unknown error".to_string());
        return Err(format!("Failed to connect: {}", error_text));
    }

    // Return updated status
    repository_status(server).await
}

/// Disconnect from repository
#[tauri::command]
pub async fn repository_disconnect(
    server: State<'_, KopiaServerState>,
) -> Result<(), String> {
    let server_status = {
        let server = server.lock().map_err(|e| format!("Lock error: {}", e))?;
        server.status()
    };

    if !server_status.running {
        return Err("Kopia server is not running".to_string());
    }

    let server_url = server_status
        .server_url
        .ok_or("Server URL not available".to_string())?;

    // Make HTTP request to disconnect
    let client = reqwest::Client::new();
    let response = client
        .post(format!("{}/api/v1/repo/disconnect", server_url))
        .send()
        .await
        .map_err(|e| format!("Failed to disconnect: {}", e))?;

    if !response.status().is_success() {
        return Err(format!("Failed to disconnect: {}", response.status()));
    }

    Ok(())
}
