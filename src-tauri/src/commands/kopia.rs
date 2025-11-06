use crate::error::{HttpResultExt, IoResultExt, JsonResultExt, KopiaError, Result};
use crate::kopia_server::{KopiaServerInfo, KopiaServerState, KopiaServerStatus};
use serde::de::DeserializeOwned;
use serde::{Deserialize, Serialize};
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
pub async fn kopia_server_start(server: State<'_, KopiaServerState>) -> Result<KopiaServerInfo> {
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
pub async fn kopia_server_stop(server: State<'_, KopiaServerState>) -> Result<()> {
    lock_server!(server).stop()
}

/// Get Kopia server status
#[tauri::command]
pub async fn kopia_server_status(
    server: State<'_, KopiaServerState>,
) -> Result<KopiaServerStatus> {
    Ok(lock_server!(server).status())
}

/// Get the default Kopia configuration directory
pub fn get_default_config_dir() -> Result<String> {
    let home_dir = std::env::var("HOME")
        .or_else(|_| std::env::var("USERPROFILE"))
        .map_err(|_| KopiaError::EnvironmentError {
            message: "Cannot determine home directory (HOME or USERPROFILE not set)".to_string(),
        })?;

    #[cfg(target_os = "windows")]
    let config_dir = format!("{}\\AppData\\Roaming\\kopia", home_dir);

    #[cfg(not(target_os = "windows"))]
    let config_dir = format!("{}/.config/kopia", home_dir);

    // Ensure directory exists
    std::fs::create_dir_all(&config_dir).map_io_error(&config_dir)?;

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
pub async fn repository_status(server: State<'_, KopiaServerState>) -> Result<RepositoryStatus> {
    let (server_url, client) = get_server_client(&server)?;

    let response = client
        .get(format!("{}/api/v1/repo/status", server_url))
        .send()
        .await
        .map_http_error("Get repository status")?;

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
) -> Result<RepositoryStatus> {
    let (server_url, client) = get_server_client(&server)?;

    let response = client
        .post(format!("{}/api/v1/repo/connect", server_url))
        .json(&config)
        .send()
        .await
        .map_http_error("Failed to connect to repository")?;

    if !response.status().is_success() {
        let status = response.status();
        let error_text = response
            .text()
            .await
            .unwrap_or_else(|_| "Unknown error".to_string());
        return Err(KopiaError::from_api_response(
            status.as_u16(),
            &error_text,
            "Connect to repository",
        ));
    }

    // Return updated status
    repository_status(server).await
}

/// Disconnect from repository
#[tauri::command]
pub async fn repository_disconnect(server: State<'_, KopiaServerState>) -> Result<()> {
    let (server_url, client) = get_server_client(&server)?;

    let response = client
        .post(format!("{}/api/v1/repo/disconnect", server_url))
        .send()
        .await
        .map_http_error("Failed to disconnect")?;

    handle_empty_response(response, "Disconnect from repository").await
}

/// Create a new repository
#[tauri::command]
pub async fn repository_create(
    server: State<'_, KopiaServerState>,
    config: crate::types::RepositoryCreateRequest,
) -> Result<String> {
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
        .map_http_error("Failed to create repository")?;

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
) -> Result<bool> {
    let (server_url, client) = get_server_client(&server)?;

    let response = client
        .post(format!("{}/api/v1/repo/exists", server_url))
        .json(&serde_json::json!({ "storage": storage }))
        .send()
        .await
        .map_http_error("Failed to check repository")?;

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
            return Err(KopiaError::RepositoryOperationFailed {
                operation: "Check repository exists".to_string(),
                message: err.error.unwrap_or(error_text),
            });
        }

        return Err(KopiaError::RepositoryOperationFailed {
            operation: "Check repository exists".to_string(),
            message: error_text,
        });
    }

    // Success response is just an empty object {}, which means repository exists
    Ok(true)
}

/// Get available algorithms
#[tauri::command]
pub async fn repository_get_algorithms(
    server: State<'_, KopiaServerState>,
) -> Result<crate::types::AlgorithmsResponse> {
    let (server_url, client) = get_server_client(&server)?;

    let response = client
        .get(format!("{}/api/v1/repo/algorithms", server_url))
        .send()
        .await
        .map_http_error("Failed to get algorithms")?;

    handle_response(response, "Get algorithms").await
}

/// Update repository description
#[tauri::command]
pub async fn repository_update_description(
    server: State<'_, KopiaServerState>,
    description: String,
) -> Result<()> {
    let (server_url, client) = get_server_client(&server)?;

    let response = client
        .post(format!("{}/api/v1/repo/description", server_url))
        .json(&serde_json::json!({ "description": description }))
        .send()
        .await
        .map_http_error("Failed to update description")?;

    handle_empty_response(response, "Update description").await
}

// ============================================================================
// Snapshot Sources Commands
// ============================================================================

/// List all snapshot sources
#[tauri::command]
pub async fn sources_list(
    server: State<'_, KopiaServerState>,
) -> Result<crate::types::SourcesResponse> {
    let (server_url, client) = get_server_client(&server)?;

    let response = client
        .get(format!("{}/api/v1/sources", server_url))
        .send()
        .await
        .map_http_error("Failed to list sources")?;

    handle_response(response, "List sources").await
}

/// Create a snapshot
#[tauri::command]
pub async fn snapshot_create(
    server: State<'_, KopiaServerState>,
    path: String,
    user_name: Option<String>,
    host: Option<String>,
) -> Result<crate::types::SourceInfo> {
    let (server_url, client) = get_server_client(&server)?;

    // First, resolve the path to get source info (userName@host)
    log::info!("Resolving path: {}", path);
    let source_info = {
        let resolve_response = client
            .post(format!("{}/api/v1/paths/resolve", server_url))
            .json(&serde_json::json!({ "path": path }))
            .send()
            .await
            .map_http_error("Failed to resolve path")?;

        let status = resolve_response.status();
        log::info!("Resolve response status: {}", status);

        if !status.is_success() {
            let error_text = resolve_response
                .text()
                .await
                .unwrap_or_else(|_| "Unknown error".to_string());
            log::error!("Failed to resolve path: {}", error_text);
            return Err(KopiaError::PathResolutionFailed {
                path: path.clone(),
                message: error_text,
            });
        }

        #[derive(Deserialize)]
        #[serde(rename_all = "camelCase")]
        struct ResolveResponse {
            source: crate::types::SourceInfo,
        }

        let resolve_result: ResolveResponse = resolve_response
            .json()
            .await
            .map_http_error("Failed to parse resolve response")?;

        resolve_result.source
    };

    // Use provided userName/host or fall back to resolved values
    let final_user_name = user_name.unwrap_or(source_info.user_name.clone());
    let final_host = host.unwrap_or(source_info.host.clone());

    // Create source and start snapshot
    let mut payload = serde_json::Map::new();
    payload.insert(
        "path".to_string(),
        serde_json::json!(source_info.path.clone()),
    );
    payload.insert("createSnapshot".to_string(), serde_json::json!(true));
    payload.insert(
        "userName".to_string(),
        serde_json::json!(final_user_name.clone()),
    );
    payload.insert("host".to_string(), serde_json::json!(final_host.clone()));
    // Add empty policy to use defaults (required by Kopia API)
    payload.insert("policy".to_string(), serde_json::json!({}));

    log::info!(
        "Creating snapshot for {}@{}:{}",
        final_user_name,
        final_host,
        source_info.path
    );
    log::debug!("Snapshot payload: {:?}", payload);

    let response = client
        .post(format!("{}/api/v1/sources", server_url))
        .json(&payload)
        .send()
        .await
        .map_http_error("Failed to create snapshot")?;

    let status = response.status();
    log::info!("Create snapshot response status: {}", status);

    if !status.is_success() {
        let error_text = response
            .text()
            .await
            .unwrap_or_else(|_| "Unknown error".to_string());
        log::error!("Failed to create snapshot: {}", error_text);
        return Err(KopiaError::SnapshotCreationFailed {
            message: error_text,
            path: Some(path.clone()),
        });
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
        .map_http_error("Failed to parse response")?;

    if !result.snapshotted {
        return Err(KopiaError::SnapshotCreationFailed {
            message: "Snapshot was not started by server".to_string(),
            path: Some(path),
        });
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
) -> Result<()> {
    let (server_url, client) = get_server_client(&server)?;

    let query_params = format!(
        "?userName={}&host={}&path={}",
        urlencoding::encode(&user_name),
        urlencoding::encode(&host),
        urlencoding::encode(&path)
    );

    let response = client
        .post(format!(
            "{}/api/v1/sources/cancel{}",
            server_url, query_params
        ))
        .send()
        .await
        .map_http_error("Failed to cancel snapshot")?;

    if !response.status().is_success() {
        return Err(KopiaError::HttpRequestFailed { message: "Failed to cancel snapshot".to_string(), status_code: Some(response.status().as_u16()), url: None });
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
) -> Result<crate::types::SnapshotsResponse> {
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
        .map_http_error("Failed to list snapshots")?;

    if !response.status().is_success() {
        return Err(KopiaError::HttpRequestFailed { message: "Failed to list snapshots".to_string(), status_code: Some(response.status().as_u16()), url: None });
    }

    let result = response
        .json()
        .await
        .map_http_error("Failed to parse response")?;

    Ok(result)
}

/// Edit snapshot metadata
#[tauri::command]
pub async fn snapshot_edit(
    server: State<'_, KopiaServerState>,
    request: crate::types::SnapshotEditRequest,
) -> Result<()> {
    let (server_url, client) = get_server_client(&server)?;

    let response = client
        .post(format!("{}/api/v1/snapshots/edit", server_url))
        .json(&request)
        .send()
        .await
        .map_http_error("Failed to edit snapshot")?;

    if !response.status().is_success() {
        let status = response.status();
        let error_text = response
            .text()
            .await
            .unwrap_or_else(|_| "Unknown error".to_string());
        return Err(KopiaError::from_api_response(
            status.as_u16(),
            &error_text,
            "Edit snapshot",
        ));
    }

    Ok(())
}

/// Delete snapshots
#[tauri::command]
pub async fn snapshot_delete(
    server: State<'_, KopiaServerState>,
    manifest_ids: Vec<String>,
) -> Result<i64> {
    let (server_url, client) = get_server_client(&server)?;

    // The API expects "snapshotManifestIds" (not "manifestIDs")
    let response = client
        .post(format!("{}/api/v1/snapshots/delete", server_url))
        .json(&serde_json::json!({ "snapshotManifestIds": manifest_ids }))
        .send()
        .await
        .map_http_error("Failed to delete snapshots")?;

    if !response.status().is_success() {
        let status = response.status();
        let error_text = response
            .text()
            .await
            .unwrap_or_else(|_| "Unknown error".to_string());
        return Err(KopiaError::from_api_response(
            status.as_u16(),
            &error_text,
            "Delete snapshots",
        ));
    }

    #[derive(Deserialize)]
    struct DeleteResponse {
        deleted: i64,
    }

    let result: DeleteResponse = response
        .json()
        .await
        .map_http_error("Failed to parse response")?;

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
) -> Result<crate::types::DirectoryObject> {
    let (server_url, client) = get_server_client(&server)?;

    let response = client
        .get(format!("{}/api/v1/objects/{}", server_url, object_id))
        .send()
        .await
        .map_http_error("Failed to browse object")?;

    if !response.status().is_success() {
        return Err(KopiaError::HttpRequestFailed { message: "Failed to browse object".to_string(), status_code: Some(response.status().as_u16()), url: None });
    }

    let result = response
        .json()
        .await
        .map_http_error("Failed to parse response")?;

    Ok(result)
}

/// Download a single file from a snapshot
#[tauri::command]
pub async fn object_download(
    server: State<'_, KopiaServerState>,
    object_id: String,
    filename: String,
    target_path: String,
) -> Result<()> {
    let (server_url, client) = get_server_client(&server)?;

    let query_params = format!("?fname={}", urlencoding::encode(&filename));

    let response = client
        .get(format!(
            "{}/api/v1/objects/{}{}",
            server_url, object_id, query_params
        ))
        .send()
        .await
        .map_http_error("Failed to download object")?;

    if !response.status().is_success() {
        return Err(KopiaError::HttpRequestFailed { message: "Failed to download object".to_string(), status_code: Some(response.status().as_u16()), url: None });
    }

    // Get the file content
    let bytes = response
        .bytes()
        .await
        .map_http_error("Failed to read response")?;

    // Write to target path
    std::fs::write(&target_path, bytes).map_io_error(&target_path)?;

    Ok(())
}

/// Start a restore operation
#[tauri::command]
pub async fn restore_start(
    server: State<'_, KopiaServerState>,
    request: crate::types::RestoreRequest,
) -> Result<String> {
    let (server_url, client) = get_server_client(&server)?;

    let response = client
        .post(format!("{}/api/v1/restore", server_url))
        .json(&request)
        .send()
        .await
        .map_http_error("Failed to start restore")?;

    let status = response.status();
    if !status.is_success() {
        let error_text = response
            .text()
            .await
            .unwrap_or_else(|_| "Unknown error".to_string());
        return Err(KopiaError::HttpRequestFailed { message: format!("Failed to start restore: {}", error_text), status_code: Some(status.as_u16()), url: None });
    }

    #[derive(Deserialize)]
    struct RestoreResponse {
        id: String,
    }

    let result: RestoreResponse = response
        .json()
        .await
        .map_http_error("Failed to parse response")?;

    Ok(result.id)
}

/// Mount a snapshot
#[tauri::command]
pub async fn mount_snapshot(
    server: State<'_, KopiaServerState>,
    root: String,
) -> Result<String> {
    let (server_url, client) = get_server_client(&server)?;

    let response = client
        .post(format!("{}/api/v1/mounts", server_url))
        .json(&serde_json::json!({ "root": root }))
        .send()
        .await
        .map_http_error("Failed to mount snapshot")?;

    let status = response.status();
    if !status.is_success() {
        let error_text = response
            .text()
            .await
            .unwrap_or_else(|_| "Unknown error".to_string());
        return Err(KopiaError::HttpRequestFailed { message: format!("Failed to mount snapshot: {}", error_text), status_code: Some(status.as_u16()), url: None });
    }

    let result: crate::types::MountResponse = response
        .json()
        .await
        .map_http_error("Failed to parse response")?;

    Ok(result.path)
}

/// List all mounted snapshots
#[tauri::command]
pub async fn mounts_list(
    server: State<'_, KopiaServerState>,
) -> Result<crate::types::MountsResponse> {
    let (server_url, client) = get_server_client(&server)?;

    let response = client
        .get(format!("{}/api/v1/mounts", server_url))
        .send()
        .await
        .map_http_error("Failed to list mounts")?;

    if !response.status().is_success() {
        return Err(KopiaError::HttpRequestFailed { message: "Failed to list mounts".to_string(), status_code: Some(response.status().as_u16()), url: None });
    }

    let result = response
        .json()
        .await
        .map_http_error("Failed to parse response")?;

    Ok(result)
}

/// Unmount a snapshot
#[tauri::command]
pub async fn mount_unmount(
    server: State<'_, KopiaServerState>,
    object_id: String,
) -> Result<()> {
    let (server_url, client) = get_server_client(&server)?;

    let response = client
        .delete(format!("{}/api/v1/mounts/{}", server_url, object_id))
        .send()
        .await
        .map_http_error("Failed to unmount snapshot")?;

    if !response.status().is_success() {
        return Err(KopiaError::HttpRequestFailed { message: "Failed to unmount snapshot".to_string(), status_code: Some(response.status().as_u16()), url: None });
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
) -> Result<crate::types::PoliciesResponse> {
    let (server_url, client) = get_server_client(&server)?;

    let response = client
        .get(format!("{}/api/v1/policies", server_url))
        .send()
        .await
        .map_http_error("Failed to list policies")?;

    if !response.status().is_success() {
        let status = response.status();
        let body = response.text().await.unwrap_or_default();
        return Err(KopiaError::from_api_response(
            status.as_u16(),
            &body,
            "List policies",
        ));
    }

    let result = response
        .json()
        .await
        .map_http_error("Failed to parse policies response")?;

    Ok(result)
}

/// Get policy for a specific target
#[tauri::command]
pub async fn policy_get(
    server: State<'_, KopiaServerState>,
    user_name: Option<String>,
    host: Option<String>,
    path: Option<String>,
) -> Result<crate::types::PolicyWithTarget> {
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
        .map_http_error("Failed to get policy")?;

    if !response.status().is_success() {
        return Err(KopiaError::HttpRequestFailed { message: "Failed to get policy".to_string(), status_code: Some(response.status().as_u16()), url: None });
    }

    let result = response
        .json()
        .await
        .map_http_error("Failed to parse response")?;

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
) -> Result<crate::types::ResolvedPolicyResponse> {
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
            .map_json_error("Failed to serialize policy updates")?;
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
        .map_http_error("Failed to resolve policy")?;

    let status = response.status();
    if !status.is_success() {
        let error_text = response
            .text()
            .await
            .unwrap_or_else(|_| "Unknown error".to_string());
        return Err(KopiaError::HttpRequestFailed { message: format!("Failed to resolve policy: {}", error_text), status_code: Some(status.as_u16()), url: None });
    }

    let result = response
        .json()
        .await
        .map_http_error("Failed to parse response")?;

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
) -> Result<()> {
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
        .map_http_error("Failed to set policy")?;

    let status = response.status();
    if !status.is_success() {
        let error_text = response
            .text()
            .await
            .unwrap_or_else(|_| "Unknown error".to_string());
        return Err(KopiaError::HttpRequestFailed { message: format!("Failed to set policy: {}", error_text), status_code: Some(status.as_u16()), url: None });
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
) -> Result<()> {
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
        .map_http_error("Failed to delete policy")?;

    if !response.status().is_success() {
        return Err(KopiaError::HttpRequestFailed { message: "Failed to delete policy".to_string(), status_code: Some(response.status().as_u16()), url: None });
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
) -> Result<crate::types::TasksResponse> {
    let (server_url, client) = get_server_client(&server)?;

    let response = client
        .get(format!("{}/api/v1/tasks", server_url))
        .send()
        .await
        .map_http_error("Failed to list tasks")?;

    if !response.status().is_success() {
        return Err(KopiaError::HttpRequestFailed { message: "Failed to list tasks".to_string(), status_code: Some(response.status().as_u16()), url: None });
    }

    let result = response
        .json()
        .await
        .map_http_error("Failed to parse response")?;

    Ok(result)
}

/// Get task details
#[tauri::command]
pub async fn task_get(
    server: State<'_, KopiaServerState>,
    task_id: String,
) -> Result<crate::types::TaskDetail> {
    let (server_url, client) = get_server_client(&server)?;

    let response = client
        .get(format!("{}/api/v1/tasks/{}", server_url, task_id))
        .send()
        .await
        .map_http_error("Failed to get task")?;

    if !response.status().is_success() {
        return Err(KopiaError::HttpRequestFailed { message: "Failed to get task".to_string(), status_code: Some(response.status().as_u16()), url: None });
    }

    let result: crate::types::TaskDetail = response
        .json()
        .await
        .map_http_error("Failed to parse response")?;

    Ok(result)
}

/// Get task logs
#[tauri::command]
pub async fn task_logs(
    server: State<'_, KopiaServerState>,
    task_id: String,
) -> Result<Vec<String>> {
    let (server_url, client) = get_server_client(&server)?;

    let response = client
        .get(format!("{}/api/v1/tasks/{}/logs", server_url, task_id))
        .send()
        .await
        .map_http_error("Failed to get task logs")?;

    if !response.status().is_success() {
        return Err(KopiaError::HttpRequestFailed { message: "Failed to get task logs".to_string(), status_code: Some(response.status().as_u16()), url: None });
    }

    #[derive(Deserialize)]
    struct LogsResponse {
        logs: Vec<String>,
    }

    let result: LogsResponse = response
        .json()
        .await
        .map_http_error("Failed to parse response")?;

    Ok(result.logs)
}

/// Cancel a task
#[tauri::command]
pub async fn task_cancel(
    server: State<'_, KopiaServerState>,
    task_id: String,
) -> Result<()> {
    let (server_url, client) = get_server_client(&server)?;

    let response = client
        .post(format!("{}/api/v1/tasks/{}/cancel", server_url, task_id))
        .send()
        .await
        .map_http_error("Failed to cancel task")?;

    if !response.status().is_success() {
        return Err(KopiaError::HttpRequestFailed { message: "Failed to cancel task".to_string(), status_code: Some(response.status().as_u16()), url: None });
    }

    Ok(())
}

/// Get task summary
#[tauri::command]
pub async fn tasks_summary(
    server: State<'_, KopiaServerState>,
) -> Result<crate::types::TasksSummary> {
    let (server_url, client) = get_server_client(&server)?;

    let response = client
        .get(format!("{}/api/v1/tasks-summary", server_url))
        .send()
        .await
        .map_http_error("Failed to get tasks summary")?;

    if !response.status().is_success() {
        let status = response.status();
        return Err(KopiaError::HttpRequestFailed {
            message: "Failed to get tasks summary".to_string(),
            status_code: Some(status.as_u16()),
            url: None,
        });
    }

    let result = response
        .json()
        .await
        .map_http_error("Failed to parse response")?;

    Ok(result)
}

// ============================================================================
// Maintenance Commands
// ============================================================================

/// Get maintenance information
#[tauri::command]
pub async fn maintenance_info(
    server: State<'_, KopiaServerState>,
) -> Result<crate::types::MaintenanceInfo> {
    let (server_url, client) = get_server_client(&server)?;

    let response = client
        .get(format!("{}/api/v1/repo/maintenance/info", server_url))
        .send()
        .await
        .map_http_error("Failed to get maintenance info")?;

    if !response.status().is_success() {
        return Err(KopiaError::HttpRequestFailed { message: "Failed to get maintenance info".to_string(), status_code: Some(response.status().as_u16()), url: None });
    }

    let result = response
        .json()
        .await
        .map_http_error("Failed to parse response")?;

    Ok(result)
}

/// Run maintenance
#[tauri::command]
pub async fn maintenance_run(
    server: State<'_, KopiaServerState>,
    full: bool,
    safety: Option<String>,
) -> Result<String> {
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
        .map_http_error("Failed to run maintenance")?;

    let status = response.status();
    if !status.is_success() {
        let error_text = response
            .text()
            .await
            .unwrap_or_else(|_| "Unknown error".to_string());
        return Err(KopiaError::HttpRequestFailed { message: format!("Failed to run maintenance: {}", error_text), status_code: Some(status.as_u16()), url: None });
    }

    #[derive(Deserialize)]
    struct MaintenanceResponse {
        id: String,
    }

    let result: MaintenanceResponse = response
        .json()
        .await
        .map_http_error("Failed to parse response")?;

    Ok(result.id)
}

// ============================================================================
// Utility Commands
// ============================================================================

/// Get current user information
#[tauri::command]
pub async fn current_user_get(
    server: State<'_, KopiaServerState>,
) -> Result<crate::types::CurrentUserResponse> {
    let (server_url, client) = get_server_client(&server)?;

    let response = client
        .get(format!("{}/api/v1/current-user", server_url))
        .send()
        .await
        .map_http_error("Failed to get current user")?;

    if !response.status().is_success() {
        return Err(KopiaError::HttpRequestFailed { message: "Failed to get current user".to_string(), status_code: Some(response.status().as_u16()), url: None });
    }

    let result = response
        .json()
        .await
        .map_http_error("Failed to parse response")?;

    Ok(result)
}

/// Resolve path to source
#[tauri::command]
pub async fn path_resolve(
    server: State<'_, KopiaServerState>,
    path: String,
) -> Result<crate::types::SourceInfo> {
    let (server_url, client) = get_server_client(&server)?;

    let response = client
        .post(format!("{}/api/v1/paths/resolve", server_url))
        .json(&serde_json::json!({ "path": path }))
        .send()
        .await
        .map_http_error("Failed to resolve path")?;

    let status = response.status();
    if !status.is_success() {
        let error_text = response
            .text()
            .await
            .unwrap_or_else(|_| "Unknown error".to_string());
        return Err(KopiaError::HttpRequestFailed { message: format!("Failed to resolve path: {}", error_text), status_code: Some(status.as_u16()), url: None });
    }

    #[derive(Deserialize)]
    #[serde(rename_all = "camelCase")]
    struct PathResolveResponse {
        source: crate::types::SourceInfo,
    }

    let result: PathResolveResponse = response
        .json()
        .await
        .map_http_error("Failed to parse response")?;

    Ok(result.source)
}

/// Estimate snapshot size for a given path
///
/// This command starts an estimation task that calculates the size, file count,
/// and other statistics for a potential snapshot. It returns a task ID that can
/// be polled to get the estimation results.
///
/// # Arguments
/// * `path` - The path to estimate (can be relative or absolute)
/// * `max_examples_per_bucket` - Optional limit for examples per bucket
///
/// # Returns
/// EstimateResponse containing the task ID to poll for results
#[tauri::command]
pub async fn estimate_snapshot(
    server: State<'_, KopiaServerState>,
    path: String,
    max_examples_per_bucket: Option<i64>,
) -> Result<crate::types::EstimateResponse> {
    let (server_url, client) = get_server_client(&server)?;

    // Step 1: Resolve the path to get the absolute path
    let resolved_path = {
        let resolve_response = client
            .post(format!("{}/api/v1/paths/resolve", server_url))
            .json(&serde_json::json!({ "path": path }))
            .send()
            .await
            .map_http_error("Failed to resolve path")?;

        let status = resolve_response.status();
        if !status.is_success() {
            let error_text = resolve_response
                .text()
                .await
                .unwrap_or_else(|_| "Unknown error".to_string());
            return Err(KopiaError::HttpRequestFailed { message: format!("Failed to resolve path: {}", error_text), status_code: Some(status.as_u16()), url: None });
        }

        #[derive(Deserialize)]
        #[serde(rename_all = "camelCase")]
        struct ResolveResponse {
            source: crate::types::SourceInfo,
        }

        let resolve_result: ResolveResponse = resolve_response
            .json()
            .await
            .map_http_error("Failed to parse resolve response")?;

        resolve_result.source.path
    };

    // Step 2: Start the estimation task
    let estimate_req = crate::types::EstimateRequest {
        root: resolved_path,
        max_examples_per_bucket,
    };

    let response = client
        .post(format!("{}/api/v1/estimate", server_url))
        .json(&estimate_req)
        .send()
        .await
        .map_http_error("Failed to estimate snapshot")?;

    let status = response.status();
    if !status.is_success() {
        let error_text = response
            .text()
            .await
            .unwrap_or_else(|_| "Unknown error".to_string());
        return Err(KopiaError::HttpRequestFailed { message: format!("Failed to estimate snapshot: {}", error_text), status_code: Some(status.as_u16()), url: None });
    }

    let result: crate::types::EstimateResponse = response
        .json()
        .await
        .map_http_error("Failed to parse estimate response")?;

    Ok(result)
}

/// Get UI preferences
#[tauri::command]
pub async fn ui_preferences_get(
    server: State<'_, KopiaServerState>,
) -> Result<crate::types::UIPreferences> {
    let (server_url, client) = get_server_client(&server)?;

    let response = client
        .get(format!("{}/api/v1/ui-preferences", server_url))
        .send()
        .await
        .map_http_error("Failed to get UI preferences")?;

    if !response.status().is_success() {
        return Err(KopiaError::HttpRequestFailed { message: "Failed to get UI preferences".to_string(), status_code: Some(response.status().as_u16()), url: None });
    }

    let result = response
        .json()
        .await
        .map_http_error("Failed to parse response")?;

    Ok(result)
}

/// Save UI preferences
#[tauri::command]
pub async fn ui_preferences_set(
    server: State<'_, KopiaServerState>,
    preferences: crate::types::UIPreferences,
) -> Result<()> {
    let (server_url, client) = get_server_client(&server)?;

    let response = client
        .put(format!("{}/api/v1/ui-preferences", server_url))
        .json(&preferences)
        .send()
        .await
        .map_http_error("Failed to set UI preferences")?;

    let status = response.status();
    if !status.is_success() {
        let error_text = response
            .text()
            .await
            .unwrap_or_else(|_| "Unknown error".to_string());
        return Err(KopiaError::HttpRequestFailed { message: format!("Failed to set UI preferences: {}", error_text), status_code: Some(status.as_u16()), url: None });
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
) -> Result<Vec<crate::types::NotificationProfile>> {
    let (server_url, client) = get_server_client(&server)?;

    let response = client
        .get(format!("{}/api/v1/notificationProfiles", server_url))
        .send()
        .await
        .map_http_error("Failed to list notification profiles")?;

    if !response.status().is_success() {
        // If 404 or no profiles, return empty array
        if response.status().as_u16() == 404 {
            return Ok(vec![]);
        }
        return Err(KopiaError::HttpRequestFailed { message: "Failed to list notification profiles".to_string(), status_code: Some(response.status().as_u16()), url: None });
    }

    let result: Vec<crate::types::NotificationProfile> =
        response.json().await.unwrap_or_else(|_| vec![]); // Return empty array if parsing fails

    Ok(result)
}

/// Create notification profile
#[tauri::command]
pub async fn notification_profile_create(
    server: State<'_, KopiaServerState>,
    profile: crate::types::NotificationProfile,
) -> Result<()> {
    let (server_url, client) = get_server_client(&server)?;

    let response = client
        .post(format!("{}/api/v1/notificationProfiles", server_url))
        .json(&profile)
        .send()
        .await
        .map_http_error("Failed to create notification profile")?;

    let status = response.status();
    if !status.is_success() {
        let error_text = response
            .text()
            .await
            .unwrap_or_else(|_| "Unknown error".to_string());
        return Err(KopiaError::HttpRequestFailed {
            message: format!("Failed to create notification profile: {}", error_text),
            status_code: Some(status.as_u16()),
            url: None,
        });
    }

    Ok(())
}

/// Delete notification profile
#[tauri::command]
pub async fn notification_profile_delete(
    server: State<'_, KopiaServerState>,
    profile_name: String,
) -> Result<()> {
    let (server_url, client) = get_server_client(&server)?;

    let response = client
        .delete(format!(
            "{}/api/v1/notificationProfiles/{}",
            server_url, profile_name
        ))
        .send()
        .await
        .map_http_error("Failed to delete notification profile")?;

    if !response.status().is_success() {
        return Err(KopiaError::HttpRequestFailed { message: "Failed to delete notification profile".to_string(), status_code: Some(response.status().as_u16()), url: None });
    }

    Ok(())
}

/// Test notification profile (send test notification)
#[tauri::command]
pub async fn notification_profile_test(
    server: State<'_, KopiaServerState>,
    profile: crate::types::NotificationProfile,
) -> Result<()> {
    let (server_url, client) = get_server_client(&server)?;

    let response = client
        .post(format!("{}/api/v1/testNotificationProfile", server_url))
        .json(&profile)
        .send()
        .await
        .map_http_error("Failed to test notification profile")?;

    let status = response.status();
    if !status.is_success() {
        let error_text = response
            .text()
            .await
            .unwrap_or_else(|_| "Unknown error".to_string());
        return Err(KopiaError::HttpRequestFailed {
            message: format!("Failed to test notification profile: {}", error_text),
            status_code: Some(status.as_u16()),
            url: None,
        });
    }

    Ok(())
}

// ============================================================================
// Helper Functions
// ============================================================================

/// Get server URL and HTTP client
fn get_server_client(server: &State<'_, KopiaServerState>) -> Result<(String, reqwest::Client)> {
    let server_guard = lock_server!(server);
    let status = server_guard.status();

    if !status.running {
        return Err(KopiaError::ServerNotRunning);
    }

    let server_url = status.server_url.ok_or(KopiaError::ServerNotRunning)?;
    let client = server_guard
        .get_http_client()
        .ok_or(KopiaError::ServerNotRunning)?;

    Ok((server_url, client))
}

/// Handle API response - check status and parse JSON
async fn handle_response<T: DeserializeOwned>(
    response: reqwest::Response,
    operation: &str,
) -> Result<T> {
    let status = response.status();

    if !status.is_success() {
        let error_text = response
            .text()
            .await
            .unwrap_or_else(|_| "Unknown error".to_string());
        return Err(KopiaError::from_api_response(
            status.as_u16(),
            &error_text,
            operation,
        ));
    }

    response.json().await.map_err(|e| KopiaError::ResponseParseError {
        message: e.to_string(),
        expected_type: std::any::type_name::<T>().to_string(),
    })
}

/// Handle API response that returns empty/unit result
async fn handle_empty_response(response: reqwest::Response, operation: &str) -> Result<()> {
    let status = response.status();

    if !status.is_success() {
        let error_text = response
            .text()
            .await
            .unwrap_or_else(|_| "Unknown error".to_string());
        return Err(KopiaError::from_api_response(
            status.as_u16(),
            &error_text,
            operation,
        ));
    }
    Ok(())
}
