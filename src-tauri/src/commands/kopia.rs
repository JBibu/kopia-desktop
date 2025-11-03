use crate::kopia_server::{KopiaServerInfo, KopiaServerState, KopiaServerStatus};
use serde::{Deserialize, Serialize};
use serde::de::DeserializeOwned;
use tauri::State;

// Helper macro for mutex recovery
macro_rules! lock_server {
    ($server:expr) => {
        $server.lock().unwrap_or_else(|poisoned| {
            log::warn!("Mutex poisoned, recovering...");
            poisoned.into_inner()
        })
    };
}

/// Start the Kopia server
#[tauri::command]
pub async fn kopia_server_start(
    server: State<'_, KopiaServerState>,
) -> Result<KopiaServerInfo, String> {
    let config_dir = get_default_config_dir()?;

    let (info, ready_waiter) = {
        let mut server_guard = lock_server!(server);
        let info = server_guard.start(&config_dir)?;
        let waiter = server_guard.get_ready_waiter()?;
        (info, waiter)
    };

    ready_waiter.await?;
    Ok(info)
}

/// Stop the Kopia server
#[tauri::command]
pub async fn kopia_server_stop(server: State<'_, KopiaServerState>) -> Result<(), String> {
    lock_server!(server).stop()
}

/// Get Kopia server status
#[tauri::command]
pub async fn kopia_server_status(
    server: State<'_, KopiaServerState>,
) -> Result<KopiaServerStatus, String> {
    Ok(lock_server!(server).status())
}

/// Get the default Kopia configuration directory
pub fn get_default_config_dir() -> Result<String, String> {
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
#[serde(rename_all = "camelCase")]
pub struct RepositoryStatus {
    pub connected: bool,
    #[serde(rename = "configFile")]
    pub config_file: Option<String>,
    #[serde(rename = "formatVersion")]
    pub format_version: Option<i32>,
    pub hash: Option<String>,
    pub encryption: Option<String>,
    pub ecc: Option<String>,
    #[serde(rename = "eccOverheadPercent")]
    pub ecc_overhead_percent: Option<i32>,
    pub splitter: Option<String>,
    #[serde(rename = "maxPackSize")]
    pub max_pack_size: Option<i32>,
    pub storage: Option<String>,
    #[serde(rename = "apiServerURL")]
    pub api_server_url: Option<String>,
    #[serde(rename = "supportsContentCompression")]
    pub supports_content_compression: Option<bool>,
    // ClientOptions fields (embedded in Go via struct embedding)
    pub description: Option<String>,
    pub username: Option<String>,
    pub hostname: Option<String>,
    pub readonly: Option<bool>,
    #[serde(rename = "enableActions")]
    pub enable_actions: Option<bool>,
    #[serde(rename = "formatBlobCacheDuration")]
    pub format_blob_cache_duration: Option<i64>,
    // Repository initialization task ID
    #[serde(rename = "initTaskID")]
    pub init_task_id: Option<String>,
}

/// Get repository status
#[tauri::command]
pub async fn repository_status(
    server: State<'_, KopiaServerState>,
) -> Result<RepositoryStatus, String> {
    let (server_url, client) = get_server_client(&server)?;

    let response = client
        .get(format!("{}/api/v1/repo/status", server_url))
        .send()
        .await
        .map_err(|e| format!("Failed to get repository status: {}", e))?;

    handle_response(response, "Get repository status").await
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct StorageConfig {
    #[serde(rename = "type")]
    pub storage_type: String,
    pub config: serde_json::Value, // Storage-type specific config (e.g., {"path": "..."} for filesystem)
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RepositoryConnectRequest {
    pub storage: StorageConfig,
    pub password: String,
    pub token: Option<String>,
    pub client_options: Option<crate::types::ClientOptions>,
}

/// Connect to an existing repository
#[tauri::command]
pub async fn repository_connect(
    server: State<'_, KopiaServerState>,
    config: RepositoryConnectRequest,
) -> Result<RepositoryStatus, String> {
    let (server_url, client) = get_server_client(&server)?;

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
    let (server_url, client) = get_server_client(&server)?;

    let response = client
        .post(format!("{}/api/v1/repo/disconnect", server_url))
        .send()
        .await
        .map_err(|e| format!("Failed to disconnect: {}", e))?;

    handle_empty_response(response, "Disconnect from repository").await
}

/// Create a new repository
#[tauri::command]
pub async fn repository_create(
    server: State<'_, KopiaServerState>,
    config: crate::types::RepositoryCreateRequest,
) -> Result<String, String> {
    let (server_url, client) = get_server_client(&server)?;

    #[derive(Deserialize)]
    #[serde(rename_all = "camelCase")]
    struct CreateResponse {
        init_task_id: String,
    }

    let response = client
        .post(format!("{}/api/v1/repo/create", server_url))
        .json(&config)
        .send()
        .await
        .map_err(|e| format!("Failed to create repository: {}", e))?;

    let result: CreateResponse = handle_response(response, "Create repository").await?;
    Ok(result.init_task_id)
}

/// Check if repository exists
///
/// The Kopia API returns:
/// - Success (200) with empty object `{}` if repository exists
/// - Error with `{"code": "NOT_INITIALIZED", "error": "..."}` if repository doesn't exist
#[tauri::command]
pub async fn repository_exists(
    server: State<'_, KopiaServerState>,
    storage: StorageConfig,
) -> Result<bool, String> {
    let (server_url, client) = get_server_client(&server)?;

    let response = client
        .post(format!("{}/api/v1/repo/exists", server_url))
        .json(&serde_json::json!({ "storage": storage }))
        .send()
        .await
        .map_err(|e| format!("Failed to check repository: {}", e))?;

    if !response.status().is_success() {
        let error_text = response
            .text()
            .await
            .unwrap_or_else(|_| "Unknown error".to_string());

        // Parse the error response to get more details
        #[derive(Deserialize)]
        struct ErrorResponse {
            code: Option<String>,
            error: Option<String>,
        }

        if let Ok(err) = serde_json::from_str::<ErrorResponse>(&error_text) {
            if err.code.as_deref() == Some("NOT_INITIALIZED") {
                // Repository location is accessible but not initialized - return false
                return Ok(false);
            }
            // Return the detailed error message
            return Err(err.error.unwrap_or(error_text));
        }

        return Err(format!("Failed to check repository: {}", error_text));
    }

    // Success response is just an empty object {}, which means repository exists
    Ok(true)
}

/// Get available algorithms
#[tauri::command]
pub async fn repository_get_algorithms(
    server: State<'_, KopiaServerState>,
) -> Result<crate::types::AlgorithmsResponse, String> {
    let (server_url, client) = get_server_client(&server)?;

    let response = client
        .get(format!("{}/api/v1/repo/algorithms", server_url))
        .send()
        .await
        .map_err(|e| format!("Failed to get algorithms: {}", e))?;

    handle_response(response, "Get algorithms").await
}

/// Update repository description
#[tauri::command]
pub async fn repository_update_description(
    server: State<'_, KopiaServerState>,
    description: String,
) -> Result<(), String> {
    let (server_url, client) = get_server_client(&server)?;

    let response = client
        .post(format!("{}/api/v1/repo/description", server_url))
        .json(&serde_json::json!({ "description": description }))
        .send()
        .await
        .map_err(|e| format!("Failed to update description: {}", e))?;

    handle_empty_response(response, "Update description").await
}

// ============================================================================
// Snapshot Sources Commands
// ============================================================================

/// List all snapshot sources
#[tauri::command]
pub async fn sources_list(
    server: State<'_, KopiaServerState>,
) -> Result<crate::types::SourcesResponse, String> {
    let (server_url, client) = get_server_client(&server)?;

    let response = client
        .get(format!("{}/api/v1/sources", server_url))
        .send()
        .await
        .map_err(|e| format!("Failed to list sources: {}", e))?;

    handle_response(response, "List sources").await
}

/// Create a snapshot
#[tauri::command]
pub async fn snapshot_create(
    server: State<'_, KopiaServerState>,
    path: String,
    user_name: Option<String>,
    host: Option<String>,
) -> Result<crate::types::SourceInfo, String> {
    let (server_url, client) = get_server_client(&server)?;

    // First, resolve the path to get source info (userName@host)
    log::info!("Resolving path: {}", path);
    let source_info = {
        let resolve_response = client
            .post(format!("{}/api/v1/paths/resolve", server_url))
            .json(&serde_json::json!({ "path": path }))
            .send()
            .await
            .map_err(|e| format!("Failed to resolve path: {}", e))?;

        let status = resolve_response.status();
        log::info!("Resolve response status: {}", status);

        if !status.is_success() {
            let error_text = resolve_response
                .text()
                .await
                .unwrap_or_else(|_| "Unknown error".to_string());
            log::error!("Failed to resolve path: {}", error_text);
            return Err(format!("Failed to resolve path: {}", error_text));
        }

        #[derive(Deserialize)]
        #[serde(rename_all = "camelCase")]
        struct ResolveResponse {
            source: crate::types::SourceInfo,
        }

        let resolve_result: ResolveResponse = resolve_response
            .json()
            .await
            .map_err(|e| format!("Failed to parse resolve response: {}", e))?;

        resolve_result.source
    };

    // Use provided userName/host or fall back to resolved values
    let final_user_name = user_name.unwrap_or(source_info.user_name.clone());
    let final_host = host.unwrap_or(source_info.host.clone());

    // Create source and start snapshot
    let mut payload = serde_json::Map::new();
    payload.insert("path".to_string(), serde_json::json!(source_info.path.clone()));
    payload.insert("createSnapshot".to_string(), serde_json::json!(true));
    payload.insert("userName".to_string(), serde_json::json!(final_user_name.clone()));
    payload.insert("host".to_string(), serde_json::json!(final_host.clone()));
    // Add empty policy to use defaults (required by Kopia API)
    payload.insert("policy".to_string(), serde_json::json!({}));

    log::info!("Creating snapshot for {}@{}:{}", final_user_name, final_host, source_info.path);
    log::debug!("Snapshot payload: {:?}", payload);

    let response = client
        .post(format!("{}/api/v1/sources", server_url))
        .json(&payload)
        .send()
        .await
        .map_err(|e| format!("Failed to create snapshot: {}", e))?;

    let status = response.status();
    log::info!("Create snapshot response status: {}", status);

    if !status.is_success() {
        let error_text = response
            .text()
            .await
            .unwrap_or_else(|_| "Unknown error".to_string());
        log::error!("Failed to create snapshot: {}", error_text);
        return Err(format!("Failed to create snapshot: {}", error_text));
    }

    // API returns {"snapshotted": bool}
    #[derive(Deserialize)]
    #[serde(rename_all = "camelCase")]
    struct CreateResponse {
        snapshotted: bool,
    }

    let result: CreateResponse = response
        .json()
        .await
        .map_err(|e| format!("Failed to parse response: {}", e))?;

    if !result.snapshotted {
        return Err("Snapshot was not started".to_string());
    }

    Ok(source_info)
}

/// Cancel a snapshot
#[tauri::command]
pub async fn snapshot_cancel(
    server: State<'_, KopiaServerState>,
    user_name: String,
    host: String,
    path: String,
) -> Result<(), String> {
    let (server_url, client) = get_server_client(&server)?;

    let query_params = format!(
        "?userName={}&host={}&path={}",
        urlencoding::encode(&user_name),
        urlencoding::encode(&host),
        urlencoding::encode(&path)
    );

    let response = client
        .post(format!("{}/api/v1/sources/cancel{}", server_url, query_params))
        .send()
        .await
        .map_err(|e| format!("Failed to cancel snapshot: {}", e))?;

    if !response.status().is_success() {
        return Err(format!("Failed to cancel snapshot: {}", response.status()));
    }

    Ok(())
}

// ============================================================================
// Snapshot History Commands
// ============================================================================

/// List snapshots for a source
#[tauri::command]
pub async fn snapshots_list(
    server: State<'_, KopiaServerState>,
    user_name: String,
    host: String,
    path: String,
    all: bool,
) -> Result<crate::types::SnapshotsResponse, String> {
    let (server_url, client) = get_server_client(&server)?;

    let query_params = format!(
        "?userName={}&host={}&path={}&all={}",
        urlencoding::encode(&user_name),
        urlencoding::encode(&host),
        urlencoding::encode(&path),
        if all { "1" } else { "0" }
    );

    let response = client
        .get(format!("{}/api/v1/snapshots{}", server_url, query_params))
        .send()
        .await
        .map_err(|e| format!("Failed to list snapshots: {}", e))?;

    if !response.status().is_success() {
        return Err(format!("Failed to list snapshots: {}", response.status()));
    }

    let result = response
        .json()
        .await
        .map_err(|e| format!("Failed to parse response: {}", e))?;

    Ok(result)
}

/// Edit snapshot metadata
#[tauri::command]
pub async fn snapshot_edit(
    server: State<'_, KopiaServerState>,
    request: crate::types::SnapshotEditRequest,
) -> Result<(), String> {
    let (server_url, client) = get_server_client(&server)?;

    let response = client
        .post(format!("{}/api/v1/snapshots/edit", server_url))
        .json(&request)
        .send()
        .await
        .map_err(|e| format!("Failed to edit snapshot: {}", e))?;

    if !response.status().is_success() {
        let error_text = response
            .text()
            .await
            .unwrap_or_else(|_| "Unknown error".to_string());
        return Err(format!("Failed to edit snapshot: {}", error_text));
    }

    Ok(())
}

/// Delete snapshots
#[tauri::command]
pub async fn snapshot_delete(
    server: State<'_, KopiaServerState>,
    manifest_ids: Vec<String>,
) -> Result<i64, String> {
    let (server_url, client) = get_server_client(&server)?;

    // The API expects "snapshotManifestIds" (not "manifestIDs")
    let response = client
        .post(format!("{}/api/v1/snapshots/delete", server_url))
        .json(&serde_json::json!({ "snapshotManifestIds": manifest_ids }))
        .send()
        .await
        .map_err(|e| format!("Failed to delete snapshots: {}", e))?;

    if !response.status().is_success() {
        let error_text = response
            .text()
            .await
            .unwrap_or_else(|_| "Unknown error".to_string());
        return Err(format!("Failed to delete snapshots: {}", error_text));
    }

    #[derive(Deserialize)]
    struct DeleteResponse {
        deleted: i64,
    }

    let result: DeleteResponse = response
        .json()
        .await
        .map_err(|e| format!("Failed to parse response: {}", e))?;

    Ok(result.deleted)
}

// ============================================================================
// Snapshot Browsing & Restore Commands
// ============================================================================

/// Browse directory contents in a snapshot
#[tauri::command]
pub async fn object_browse(
    server: State<'_, KopiaServerState>,
    object_id: String,
) -> Result<crate::types::DirectoryObject, String> {
    let (server_url, client) = get_server_client(&server)?;

    let response = client
        .get(format!("{}/api/v1/objects/{}", server_url, object_id))
        .send()
        .await
        .map_err(|e| format!("Failed to browse object: {}", e))?;

    if !response.status().is_success() {
        return Err(format!("Failed to browse object: {}", response.status()));
    }

    let result = response
        .json()
        .await
        .map_err(|e| format!("Failed to parse response: {}", e))?;

    Ok(result)
}

/// Download a single file from a snapshot
#[tauri::command]
pub async fn object_download(
    server: State<'_, KopiaServerState>,
    object_id: String,
    filename: String,
    target_path: String,
) -> Result<(), String> {
    let (server_url, client) = get_server_client(&server)?;

    let query_params = format!("?fname={}", urlencoding::encode(&filename));

    let response = client
        .get(format!(
            "{}/api/v1/objects/{}{}",
            server_url, object_id, query_params
        ))
        .send()
        .await
        .map_err(|e| format!("Failed to download object: {}", e))?;

    if !response.status().is_success() {
        return Err(format!("Failed to download object: {}", response.status()));
    }

    // Get the file content
    let bytes = response
        .bytes()
        .await
        .map_err(|e| format!("Failed to read response: {}", e))?;

    // Write to target path
    std::fs::write(&target_path, bytes)
        .map_err(|e| format!("Failed to write file: {}", e))?;

    Ok(())
}

/// Start a restore operation
#[tauri::command]
pub async fn restore_start(
    server: State<'_, KopiaServerState>,
    request: crate::types::RestoreRequest,
) -> Result<String, String> {
    let (server_url, client) = get_server_client(&server)?;

    let response = client
        .post(format!("{}/api/v1/restore", server_url))
        .json(&request)
        .send()
        .await
        .map_err(|e| format!("Failed to start restore: {}", e))?;

    if !response.status().is_success() {
        let error_text = response
            .text()
            .await
            .unwrap_or_else(|_| "Unknown error".to_string());
        return Err(format!("Failed to start restore: {}", error_text));
    }

    #[derive(Deserialize)]
    struct RestoreResponse {
        id: String,
    }

    let result: RestoreResponse = response
        .json()
        .await
        .map_err(|e| format!("Failed to parse response: {}", e))?;

    Ok(result.id)
}

/// Mount a snapshot
#[tauri::command]
pub async fn mount_snapshot(
    server: State<'_, KopiaServerState>,
    root: String,
) -> Result<String, String> {
    let (server_url, client) = get_server_client(&server)?;

    let response = client
        .post(format!("{}/api/v1/mounts", server_url))
        .json(&serde_json::json!({ "root": root }))
        .send()
        .await
        .map_err(|e| format!("Failed to mount snapshot: {}", e))?;

    if !response.status().is_success() {
        let error_text = response
            .text()
            .await
            .unwrap_or_else(|_| "Unknown error".to_string());
        return Err(format!("Failed to mount snapshot: {}", error_text));
    }

    let result: crate::types::MountResponse = response
        .json()
        .await
        .map_err(|e| format!("Failed to parse response: {}", e))?;

    Ok(result.path)
}

/// List all mounted snapshots
#[tauri::command]
pub async fn mounts_list(
    server: State<'_, KopiaServerState>,
) -> Result<crate::types::MountsResponse, String> {
    let (server_url, client) = get_server_client(&server)?;

    let response = client
        .get(format!("{}/api/v1/mounts", server_url))
        .send()
        .await
        .map_err(|e| format!("Failed to list mounts: {}", e))?;

    if !response.status().is_success() {
        return Err(format!("Failed to list mounts: {}", response.status()));
    }

    let result = response
        .json()
        .await
        .map_err(|e| format!("Failed to parse response: {}", e))?;

    Ok(result)
}

/// Unmount a snapshot
#[tauri::command]
pub async fn mount_unmount(
    server: State<'_, KopiaServerState>,
    object_id: String,
) -> Result<(), String> {
    let (server_url, client) = get_server_client(&server)?;

    let response = client
        .delete(format!("{}/api/v1/mounts/{}", server_url, object_id))
        .send()
        .await
        .map_err(|e| format!("Failed to unmount snapshot: {}", e))?;

    if !response.status().is_success() {
        return Err(format!("Failed to unmount snapshot: {}", response.status()));
    }

    Ok(())
}

// ============================================================================
// Policy Commands
// ============================================================================

/// List all policies
#[tauri::command]
pub async fn policies_list(
    server: State<'_, KopiaServerState>,
) -> Result<crate::types::PoliciesResponse, String> {
    let (server_url, client) = get_server_client(&server)?;

    let response = client
        .get(format!("{}/api/v1/policies", server_url))
        .send()
        .await
        .map_err(|e| format!("Failed to list policies: {}", e))?;

    if !response.status().is_success() {
        return Err(format!("Failed to list policies: {}", response.status()));
    }

    let result = response
        .json()
        .await
        .map_err(|e| format!("Failed to parse response: {}", e))?;

    Ok(result)
}

/// Get policy for a specific target
#[tauri::command]
pub async fn policy_get(
    server: State<'_, KopiaServerState>,
    user_name: Option<String>,
    host: Option<String>,
    path: Option<String>,
) -> Result<crate::types::PolicyWithTarget, String> {
    let (server_url, client) = get_server_client(&server)?;

    let mut query_parts = Vec::new();
    if let Some(user) = user_name {
        query_parts.push(format!("userName={}", urlencoding::encode(&user)));
    }
    if let Some(h) = host {
        query_parts.push(format!("host={}", urlencoding::encode(&h)));
    }
    if let Some(p) = path {
        query_parts.push(format!("path={}", urlencoding::encode(&p)));
    }

    let query_string = if query_parts.is_empty() {
        String::new()
    } else {
        format!("?{}", query_parts.join("&"))
    };

    let response = client
        .get(format!("{}/api/v1/policy{}", server_url, query_string))
        .send()
        .await
        .map_err(|e| format!("Failed to get policy: {}", e))?;

    if !response.status().is_success() {
        return Err(format!("Failed to get policy: {}", response.status()));
    }

    let result = response
        .json()
        .await
        .map_err(|e| format!("Failed to parse response: {}", e))?;

    Ok(result)
}

/// Resolve effective policy with inheritance
#[tauri::command]
pub async fn policy_resolve(
    server: State<'_, KopiaServerState>,
    user_name: Option<String>,
    host: Option<String>,
    path: Option<String>,
    updates: Option<crate::types::PolicyDefinition>,
) -> Result<crate::types::ResolvedPolicyResponse, String> {
    let (server_url, client) = get_server_client(&server)?;

    let mut query_parts = Vec::new();
    if let Some(user) = user_name {
        query_parts.push(format!("userName={}", urlencoding::encode(&user)));
    }
    if let Some(h) = host {
        query_parts.push(format!("host={}", urlencoding::encode(&h)));
    }
    if let Some(p) = path {
        query_parts.push(format!("path={}", urlencoding::encode(&p)));
    }

    let query_string = if query_parts.is_empty() {
        String::new()
    } else {
        format!("?{}", query_parts.join("&"))
    };

    let mut payload = serde_json::Map::new();
    if let Some(upd) = updates {
        let value = serde_json::to_value(upd)
            .map_err(|e| format!("Failed to serialize policy updates: {}", e))?;
        payload.insert("updates".to_string(), value);
    }

    let response = client
        .post(format!(
            "{}/api/v1/policy/resolve{}",
            server_url, query_string
        ))
        .json(&payload)
        .send()
        .await
        .map_err(|e| format!("Failed to resolve policy: {}", e))?;

    if !response.status().is_success() {
        let error_text = response
            .text()
            .await
            .unwrap_or_else(|_| "Unknown error".to_string());
        return Err(format!("Failed to resolve policy: {}", error_text));
    }

    let result = response
        .json()
        .await
        .map_err(|e| format!("Failed to parse response: {}", e))?;

    Ok(result)
}

/// Set/update policy
#[tauri::command]
pub async fn policy_set(
    server: State<'_, KopiaServerState>,
    user_name: Option<String>,
    host: Option<String>,
    path: Option<String>,
    policy: crate::types::PolicyDefinition,
) -> Result<(), String> {
    let (server_url, client) = get_server_client(&server)?;

    let mut query_parts = Vec::new();
    if let Some(user) = user_name {
        query_parts.push(format!("userName={}", urlencoding::encode(&user)));
    }
    if let Some(h) = host {
        query_parts.push(format!("host={}", urlencoding::encode(&h)));
    }
    if let Some(p) = path {
        query_parts.push(format!("path={}", urlencoding::encode(&p)));
    }

    let query_string = if query_parts.is_empty() {
        String::new()
    } else {
        format!("?{}", query_parts.join("&"))
    };

    let response = client
        .put(format!("{}/api/v1/policy{}", server_url, query_string))
        .json(&serde_json::json!({ "policy": policy }))
        .send()
        .await
        .map_err(|e| format!("Failed to set policy: {}", e))?;

    if !response.status().is_success() {
        let error_text = response
            .text()
            .await
            .unwrap_or_else(|_| "Unknown error".to_string());
        return Err(format!("Failed to set policy: {}", error_text));
    }

    Ok(())
}

/// Delete policy (revert to inherited)
#[tauri::command]
pub async fn policy_delete(
    server: State<'_, KopiaServerState>,
    user_name: Option<String>,
    host: Option<String>,
    path: Option<String>,
) -> Result<(), String> {
    let (server_url, client) = get_server_client(&server)?;

    let mut query_parts = Vec::new();
    if let Some(user) = user_name {
        query_parts.push(format!("userName={}", urlencoding::encode(&user)));
    }
    if let Some(h) = host {
        query_parts.push(format!("host={}", urlencoding::encode(&h)));
    }
    if let Some(p) = path {
        query_parts.push(format!("path={}", urlencoding::encode(&p)));
    }

    let query_string = if query_parts.is_empty() {
        String::new()
    } else {
        format!("?{}", query_parts.join("&"))
    };

    let response = client
        .delete(format!("{}/api/v1/policy{}", server_url, query_string))
        .send()
        .await
        .map_err(|e| format!("Failed to delete policy: {}", e))?;

    if !response.status().is_success() {
        return Err(format!("Failed to delete policy: {}", response.status()));
    }

    Ok(())
}

// ============================================================================
// Task Commands
// ============================================================================

/// List all tasks
#[tauri::command]
pub async fn tasks_list(
    server: State<'_, KopiaServerState>,
) -> Result<crate::types::TasksResponse, String> {
    let (server_url, client) = get_server_client(&server)?;

    let response = client
        .get(format!("{}/api/v1/tasks", server_url))
        .send()
        .await
        .map_err(|e| format!("Failed to list tasks: {}", e))?;

    if !response.status().is_success() {
        return Err(format!("Failed to list tasks: {}", response.status()));
    }

    let result = response
        .json()
        .await
        .map_err(|e| format!("Failed to parse response: {}", e))?;

    Ok(result)
}

/// Get task details
#[tauri::command]
pub async fn task_get(
    server: State<'_, KopiaServerState>,
    task_id: String,
) -> Result<crate::types::TaskDetail, String> {
    let (server_url, client) = get_server_client(&server)?;

    let response = client
        .get(format!("{}/api/v1/tasks/{}", server_url, task_id))
        .send()
        .await
        .map_err(|e| format!("Failed to get task: {}", e))?;

    if !response.status().is_success() {
        return Err(format!("Failed to get task: {}", response.status()));
    }

    let result = response
        .json()
        .await
        .map_err(|e| format!("Failed to parse response: {}", e))?;

    Ok(result)
}

/// Get task logs
#[tauri::command]
pub async fn task_logs(
    server: State<'_, KopiaServerState>,
    task_id: String,
) -> Result<Vec<String>, String> {
    let (server_url, client) = get_server_client(&server)?;

    let response = client
        .get(format!("{}/api/v1/tasks/{}/logs", server_url, task_id))
        .send()
        .await
        .map_err(|e| format!("Failed to get task logs: {}", e))?;

    if !response.status().is_success() {
        return Err(format!("Failed to get task logs: {}", response.status()));
    }

    #[derive(Deserialize)]
    struct LogsResponse {
        logs: Vec<String>,
    }

    let result: LogsResponse = response
        .json()
        .await
        .map_err(|e| format!("Failed to parse response: {}", e))?;

    Ok(result.logs)
}

/// Cancel a task
#[tauri::command]
pub async fn task_cancel(
    server: State<'_, KopiaServerState>,
    task_id: String,
) -> Result<(), String> {
    let (server_url, client) = get_server_client(&server)?;

    let response = client
        .post(format!("{}/api/v1/tasks/{}/cancel", server_url, task_id))
        .send()
        .await
        .map_err(|e| format!("Failed to cancel task: {}", e))?;

    if !response.status().is_success() {
        return Err(format!("Failed to cancel task: {}", response.status()));
    }

    Ok(())
}

/// Get task summary
#[tauri::command]
pub async fn tasks_summary(
    server: State<'_, KopiaServerState>,
) -> Result<crate::types::TasksSummary, String> {
    let (server_url, client) = get_server_client(&server)?;

    let response = client
        .get(format!("{}/api/v1/tasks-summary", server_url))
        .send()
        .await
        .map_err(|e| format!("Failed to get tasks summary: {}", e))?;

    if !response.status().is_success() {
        return Err(format!("Failed to get tasks summary: {}", response.status()));
    }

    let result = response
        .json()
        .await
        .map_err(|e| format!("Failed to parse response: {}", e))?;

    Ok(result)
}

// ============================================================================
// Maintenance Commands
// ============================================================================

/// Get maintenance information
#[tauri::command]
pub async fn maintenance_info(
    server: State<'_, KopiaServerState>,
) -> Result<crate::types::MaintenanceInfo, String> {
    let (server_url, client) = get_server_client(&server)?;

    let response = client
        .get(format!("{}/api/v1/repo/maintenance/info", server_url))
        .send()
        .await
        .map_err(|e| format!("Failed to get maintenance info: {}", e))?;

    if !response.status().is_success() {
        return Err(format!(
            "Failed to get maintenance info: {}",
            response.status()
        ));
    }

    let result = response
        .json()
        .await
        .map_err(|e| format!("Failed to parse response: {}", e))?;

    Ok(result)
}

/// Run maintenance
#[tauri::command]
pub async fn maintenance_run(
    server: State<'_, KopiaServerState>,
    full: bool,
    safety: Option<String>,
) -> Result<String, String> {
    let (server_url, client) = get_server_client(&server)?;

    let mut payload = serde_json::Map::new();
    payload.insert("full".to_string(), serde_json::json!(full));
    if let Some(s) = safety {
        payload.insert("safety".to_string(), serde_json::json!(s));
    }

    let response = client
        .post(format!("{}/api/v1/repo/maintenance/run", server_url))
        .json(&payload)
        .send()
        .await
        .map_err(|e| format!("Failed to run maintenance: {}", e))?;

    if !response.status().is_success() {
        let error_text = response
            .text()
            .await
            .unwrap_or_else(|_| "Unknown error".to_string());
        return Err(format!("Failed to run maintenance: {}", error_text));
    }

    #[derive(Deserialize)]
    struct MaintenanceResponse {
        id: String,
    }

    let result: MaintenanceResponse = response
        .json()
        .await
        .map_err(|e| format!("Failed to parse response: {}", e))?;

    Ok(result.id)
}

// ============================================================================
// Utility Commands
// ============================================================================

/// Get current user information
#[tauri::command]
pub async fn current_user_get(
    server: State<'_, KopiaServerState>,
) -> Result<crate::types::CurrentUserResponse, String> {
    let (server_url, client) = get_server_client(&server)?;

    let response = client
        .get(format!("{}/api/v1/current-user", server_url))
        .send()
        .await
        .map_err(|e| format!("Failed to get current user: {}", e))?;

    if !response.status().is_success() {
        return Err(format!("Failed to get current user: {}", response.status()));
    }

    let result = response
        .json()
        .await
        .map_err(|e| format!("Failed to parse response: {}", e))?;

    Ok(result)
}

/// Resolve path to source
#[tauri::command]
pub async fn path_resolve(
    server: State<'_, KopiaServerState>,
    path: String,
) -> Result<crate::types::SourceInfo, String> {
    let (server_url, client) = get_server_client(&server)?;

    let response = client
        .post(format!("{}/api/v1/paths/resolve", server_url))
        .json(&serde_json::json!({ "path": path }))
        .send()
        .await
        .map_err(|e| format!("Failed to resolve path: {}", e))?;

    if !response.status().is_success() {
        let error_text = response
            .text()
            .await
            .unwrap_or_else(|_| "Unknown error".to_string());
        return Err(format!("Failed to resolve path: {}", error_text));
    }

    #[derive(Deserialize)]
    #[serde(rename_all = "camelCase")]
    struct PathResolveResponse {
        source: crate::types::SourceInfo,
    }

    let result: PathResolveResponse = response
        .json()
        .await
        .map_err(|e| format!("Failed to parse response: {}", e))?;

    Ok(result.source)
}

/// Estimate snapshot size
#[tauri::command]
pub async fn estimate_snapshot(
    server: State<'_, KopiaServerState>,
    root: String,
    max_examples: Option<i64>,
) -> Result<String, String> {
    let (server_url, client) = get_server_client(&server)?;

    let mut payload = serde_json::Map::new();
    payload.insert("root".to_string(), serde_json::json!(root));
    if let Some(max) = max_examples {
        payload.insert(
            "maxExamplesPerBucket".to_string(),
            serde_json::json!(max),
        );
    }

    let response = client
        .post(format!("{}/api/v1/estimate", server_url))
        .json(&payload)
        .send()
        .await
        .map_err(|e| format!("Failed to estimate snapshot: {}", e))?;

    if !response.status().is_success() {
        let error_text = response
            .text()
            .await
            .unwrap_or_else(|_| "Unknown error".to_string());
        return Err(format!("Failed to estimate snapshot: {}", error_text));
    }

    #[derive(Deserialize)]
    #[serde(rename_all = "camelCase")]
    struct EstimateResponse {
        task_id: String,
    }

    let result: EstimateResponse = response
        .json()
        .await
        .map_err(|e| format!("Failed to parse response: {}", e))?;

    Ok(result.task_id)
}

/// Get UI preferences
#[tauri::command]
pub async fn ui_preferences_get(
    server: State<'_, KopiaServerState>,
) -> Result<crate::types::UIPreferences, String> {
    let (server_url, client) = get_server_client(&server)?;

    let response = client
        .get(format!("{}/api/v1/ui-preferences", server_url))
        .send()
        .await
        .map_err(|e| format!("Failed to get UI preferences: {}", e))?;

    if !response.status().is_success() {
        return Err(format!(
            "Failed to get UI preferences: {}",
            response.status()
        ));
    }

    let result = response
        .json()
        .await
        .map_err(|e| format!("Failed to parse response: {}", e))?;

    Ok(result)
}

/// Save UI preferences
#[tauri::command]
pub async fn ui_preferences_set(
    server: State<'_, KopiaServerState>,
    preferences: crate::types::UIPreferences,
) -> Result<(), String> {
    let (server_url, client) = get_server_client(&server)?;

    let response = client
        .put(format!("{}/api/v1/ui-preferences", server_url))
        .json(&preferences)
        .send()
        .await
        .map_err(|e| format!("Failed to set UI preferences: {}", e))?;

    if !response.status().is_success() {
        let error_text = response
            .text()
            .await
            .unwrap_or_else(|_| "Unknown error".to_string());
        return Err(format!("Failed to set UI preferences: {}", error_text));
    }

    Ok(())
}

// ============================================================================
// Notification Commands
// ============================================================================

/// List notification profiles
#[tauri::command]
pub async fn notification_profiles_list(
    server: State<'_, KopiaServerState>,
) -> Result<crate::types::NotificationProfilesResponse, String> {
    let (server_url, client) = get_server_client(&server)?;

    let response = client
        .get(format!("{}/api/v1/notificationProfiles", server_url))
        .send()
        .await
        .map_err(|e| format!("Failed to list notification profiles: {}", e))?;

    if !response.status().is_success() {
        return Err(format!(
            "Failed to list notification profiles: {}",
            response.status()
        ));
    }

    let result = response
        .json()
        .await
        .map_err(|e| format!("Failed to parse response: {}", e))?;

    Ok(result)
}

/// Create notification profile
#[tauri::command]
pub async fn notification_profile_create(
    server: State<'_, KopiaServerState>,
    profile: crate::types::NotificationProfile,
) -> Result<(), String> {
    let (server_url, client) = get_server_client(&server)?;

    let response = client
        .post(format!("{}/api/v1/notificationProfiles", server_url))
        .json(&profile)
        .send()
        .await
        .map_err(|e| format!("Failed to create notification profile: {}", e))?;

    if !response.status().is_success() {
        let error_text = response
            .text()
            .await
            .unwrap_or_else(|_| "Unknown error".to_string());
        return Err(format!(
            "Failed to create notification profile: {}",
            error_text
        ));
    }

    Ok(())
}

/// Delete notification profile
#[tauri::command]
pub async fn notification_profile_delete(
    server: State<'_, KopiaServerState>,
    profile_name: String,
) -> Result<(), String> {
    let (server_url, client) = get_server_client(&server)?;

    let response = client
        .delete(format!(
            "{}/api/v1/notificationProfiles/{}",
            server_url, profile_name
        ))
        .send()
        .await
        .map_err(|e| format!("Failed to delete notification profile: {}", e))?;

    if !response.status().is_success() {
        return Err(format!(
            "Failed to delete notification profile: {}",
            response.status()
        ));
    }

    Ok(())
}

/// Test notification profile
#[tauri::command]
pub async fn notification_profile_test(
    server: State<'_, KopiaServerState>,
    profile_name: String,
) -> Result<(), String> {
    let (server_url, client) = get_server_client(&server)?;

    let response = client
        .post(format!("{}/api/v1/testNotificationProfile", server_url))
        .json(&serde_json::json!({ "profileName": profile_name }))
        .send()
        .await
        .map_err(|e| format!("Failed to test notification profile: {}", e))?;

    if !response.status().is_success() {
        let error_text = response
            .text()
            .await
            .unwrap_or_else(|_| "Unknown error".to_string());
        return Err(format!(
            "Failed to test notification profile: {}",
            error_text
        ));
    }

    Ok(())
}

// ============================================================================
// Helper Functions
// ============================================================================

/// Get server URL and HTTP client
fn get_server_client(server: &State<'_, KopiaServerState>) -> Result<(String, reqwest::Client), String> {
    let server_guard = lock_server!(server);
    let status = server_guard.status();

    if !status.running {
        return Err("Kopia server is not running".into());
    }

    let server_url = status.server_url.ok_or("Server URL not available")?;
    let client = server_guard.get_http_client().ok_or("HTTP client not available")?;

    Ok((server_url, client))
}

/// Build query string from optional parameters
#[allow(dead_code)]
fn build_query(params: &[(&str, Option<&str>)]) -> String {
    let parts: Vec<_> = params
        .iter()
        .filter_map(|(key, val)| val.map(|v| format!("{}={}", key, urlencoding::encode(v))))
        .collect();

    if parts.is_empty() {
        String::new()
    } else {
        format!("?{}", parts.join("&"))
    }
}

/// Handle API response - check status and parse JSON
async fn handle_response<T: DeserializeOwned>(
    response: reqwest::Response,
    operation: &str,
) -> Result<T, String> {
    if !response.status().is_success() {
        let error_text = response.text().await.unwrap_or_else(|_| "Unknown error".into());
        return Err(format!("{}: {}", operation, error_text));
    }

    response
        .json()
        .await
        .map_err(|e| format!("Failed to parse response: {}", e))
}

/// Handle API response that returns empty/unit result
async fn handle_empty_response(response: reqwest::Response, operation: &str) -> Result<(), String> {
    if !response.status().is_success() {
        let error_text = response.text().await.unwrap_or_else(|_| "Unknown error".into());
        return Err(format!("{}: {}", operation, error_text));
    }
    Ok(())
}
