//! Kopia API command handlers for Tauri
//!
//! Provides 40+ Tauri commands that wrap the Kopia REST API for repository management,
//! snapshots, policies, tasks, maintenance, and notifications.

use crate::error::{HttpResultExt, IoResultExt, JsonResultExt, KopiaError, Result};
use crate::kopia_server::{KopiaServerInfo, KopiaServerState, KopiaServerStatus};
use crate::types::{RepositoryConnectRequest, RepositoryStatus, StorageConfig};
use serde::de::DeserializeOwned;
use serde::Deserialize;
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
///
/// Spawns the Kopia server process with a random password and waits for it to become ready.
/// The server listens on a random available port (localhost-only) with TLS enabled.
///
/// # Returns
/// `KopiaServerInfo` containing server URL, username, password, and CSRF token
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
///
/// Gracefully terminates the Kopia server process and cleans up resources.
#[tauri::command]
pub async fn kopia_server_stop(server: State<'_, KopiaServerState>) -> Result<()> {
    lock_server!(server).stop()
}

/// Get Kopia server status
///
/// Returns the current status of the Kopia server including whether it's running,
/// server URL (if running), and uptime.
#[tauri::command]
pub async fn kopia_server_status(server: State<'_, KopiaServerState>) -> Result<KopiaServerStatus> {
    Ok(lock_server!(server).status())
}

/// Get the default Kopia configuration directory
///
/// Returns the platform-specific configuration directory:
/// - Windows: `%USERPROFILE%\AppData\Roaming\kopia`
/// - Unix/Linux/macOS: `$HOME/.config/kopia`
///
/// Creates the directory if it doesn't exist.
pub fn get_default_config_dir() -> Result<String> {
    use std::path::PathBuf;

    let home_dir = std::env::var("HOME")
        .or_else(|_| std::env::var("USERPROFILE"))
        .map_err(|_| KopiaError::EnvironmentError {
            message: "Cannot determine home directory (HOME or USERPROFILE not set)".to_string(),
        })?;

    let mut config_path = PathBuf::from(home_dir);

    #[cfg(target_os = "windows")]
    config_path.extend(&["AppData", "Roaming", "kopia"]);

    #[cfg(not(target_os = "windows"))]
    config_path.extend(&[".config", "kopia"]);

    // Ensure directory exists
    std::fs::create_dir_all(&config_path)
        .map_io_error(config_path.to_str().unwrap_or("config directory"))?;

    config_path
        .to_str()
        .map(String::from)
        .ok_or_else(|| KopiaError::InternalError {
            message: "Config path contains invalid UTF-8 characters".to_string(),
            details: None,
        })
}

// ============================================================================
// Repository Commands
// ============================================================================

/// Get repository status
///
/// Returns information about the connected repository including storage configuration,
/// connection status, and repository description.
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

    handle_empty_response(response, "Connect to repository").await?;

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
///
/// The Kopia API returns an empty object `{}` on success.
/// We just need to verify the request succeeded, no task ID is returned.
#[tauri::command]
pub async fn repository_create(
    server: State<'_, KopiaServerState>,
    config: crate::types::RepositoryCreateRequest,
) -> Result<String> {
    let (server_url, client) = get_server_client(&server)?;

    let response = client
        .post(format!("{}/api/v1/repo/create", server_url))
        .json(&config)
        .send()
        .await
        .map_http_error("Failed to create repository")?;

    // API returns empty object on success, just validate response
    handle_empty_response(response, "Create repository").await?;
    Ok("Repository created successfully".to_string())
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
///
/// Returns the list of available compression, encryption, and hashing algorithms
/// supported by the Kopia server for repository creation.
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
///
/// Returns information about all backup sources in the repository, including last snapshot
/// time, upload progress, next scheduled snapshot, and source path.
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

/// Create a snapshot source and optionally start a snapshot
#[tauri::command]
pub async fn snapshot_create(
    server: State<'_, KopiaServerState>,
    path: String,
    user_name: Option<String>,
    host: Option<String>,
    create_snapshot: Option<bool>,
    policy: Option<crate::types::PolicyDefinition>,
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

    // Create source and optionally start snapshot
    let should_create_snapshot = create_snapshot.unwrap_or(false); // Default to false - user must explicitly opt-in
    let mut payload = serde_json::Map::new();
    payload.insert(
        "path".to_string(),
        serde_json::json!(source_info.path.clone()),
    );
    payload.insert(
        "createSnapshot".to_string(),
        serde_json::json!(should_create_snapshot),
    );
    payload.insert(
        "userName".to_string(),
        serde_json::json!(final_user_name.clone()),
    );
    payload.insert("host".to_string(), serde_json::json!(final_host.clone()));
    // Add policy (use provided policy or empty object for defaults)
    payload.insert(
        "policy".to_string(),
        serde_json::json!(policy.unwrap_or_default()),
    );

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
            snapshot_source: None,
            snapshot_path: Some(path.clone()),
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

    // Only check if snapshot was started if we requested it
    if should_create_snapshot && !result.snapshotted {
        return Err(KopiaError::SnapshotCreationFailed {
            message: "Snapshot was not started by server".to_string(),
            snapshot_source: None,
            snapshot_path: Some(path),
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

    let query_params = build_source_query(&user_name, &host, &path);

    let response = client
        .post(format!(
            "{}/api/v1/sources/cancel{}",
            server_url, query_params
        ))
        .send()
        .await
        .map_http_error("Failed to cancel snapshot")?;

    handle_empty_response(response, "Cancel snapshot").await
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
        "{}&all={}",
        build_source_query(&user_name, &host, &path),
        if all { "1" } else { "0" }
    );

    let response = client
        .get(format!("{}/api/v1/snapshots{}", server_url, query_params))
        .send()
        .await
        .map_http_error("Failed to list snapshots")?;

    handle_response(response, "List snapshots").await
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

    handle_empty_response(response, "Edit snapshot").await
}

/// Delete snapshots
#[tauri::command]
pub async fn snapshot_delete(
    server: State<'_, KopiaServerState>,
    user_name: String,
    host: String,
    path: String,
    manifest_ids: Vec<String>,
) -> Result<i64> {
    let (server_url, client) = get_server_client(&server)?;

    // API expects source info + manifest IDs
    let payload = crate::types::SnapshotDeleteRequest {
        source: crate::types::SourceInfo {
            user_name,
            host,
            path,
        },
        snapshot_manifest_ids: manifest_ids,
        delete_source_and_policy: Some(false),
    };

    let response = client
        .post(format!("{}/api/v1/snapshots/delete", server_url))
        .json(&payload)
        .send()
        .await
        .map_http_error("Failed to delete snapshots")?;

    #[derive(Deserialize)]
    struct DeleteResponse {
        deleted: i64,
    }

    let result: DeleteResponse = handle_response(response, "Delete snapshots").await?;

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

    handle_response(response, "Browse object").await
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

    // Check status before reading bytes
    let status = response.status();
    if !status.is_success() {
        return Err(http_request_failed(
            "Failed to download object",
            status.as_u16(),
        ));
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

    #[derive(Deserialize)]
    struct RestoreResponse {
        id: String,
    }

    let result: RestoreResponse = handle_response(response, "Start restore").await?;

    Ok(result.id)
}

/// Mount a snapshot
#[tauri::command]
pub async fn mount_snapshot(server: State<'_, KopiaServerState>, root: String) -> Result<String> {
    let (server_url, client) = get_server_client(&server)?;

    let response = client
        .post(format!("{}/api/v1/mounts", server_url))
        .json(&serde_json::json!({ "root": root }))
        .send()
        .await
        .map_http_error("Failed to mount snapshot")?;

    let result: crate::types::MountResponse = handle_response(response, "Mount snapshot").await?;

    Ok(result.path)
}

/// List all mounted snapshots
///
/// Returns all currently mounted snapshots with their mount paths and root object IDs.
/// Mounted snapshots appear as local filesystems for easy file browsing and restoration.
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

    handle_response(response, "List mounts").await
}

/// Unmount a snapshot
#[tauri::command]
pub async fn mount_unmount(server: State<'_, KopiaServerState>, object_id: String) -> Result<()> {
    let (server_url, client) = get_server_client(&server)?;

    let response = client
        .delete(format!("{}/api/v1/mounts/{}", server_url, object_id))
        .send()
        .await
        .map_http_error("Failed to unmount snapshot")?;

    handle_empty_response(response, "Unmount snapshot").await
}

// ============================================================================
// Policy Commands
// ============================================================================

/// List all policies
///
/// Returns all backup policies in the repository with their inheritance hierarchy.
/// Policies control retention, scheduling, compression, and other backup behavior.
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

    handle_response(response, "List policies").await
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

    let query_string = build_policy_query(user_name.as_deref(), host.as_deref(), path.as_deref());

    let response = client
        .get(format!("{}/api/v1/policy{}", server_url, query_string))
        .send()
        .await
        .map_http_error("Failed to get policy")?;

    handle_response(response, "Get policy").await
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

    let query_string = build_policy_query(user_name.as_deref(), host.as_deref(), path.as_deref());

    // Build request payload - KopiaUI always sends updates field and numUpcomingSnapshotTimes
    let mut payload = serde_json::Map::new();

    if let Some(upd) = updates {
        let value =
            serde_json::to_value(upd).map_json_error("Failed to serialize policy updates")?;
        payload.insert("updates".to_string(), value);
    } else {
        // Send null for updates when just fetching (not modifying)
        payload.insert("updates".to_string(), serde_json::Value::Null);
    }

    // Always request upcoming snapshot times
    payload.insert("numUpcomingSnapshotTimes".to_string(), serde_json::json!(5));

    let response = client
        .post(format!(
            "{}/api/v1/policy/resolve{}",
            server_url, query_string
        ))
        .json(&payload)
        .send()
        .await
        .map_http_error("Failed to resolve policy")?;

    handle_response(response, "Resolve policy").await
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

    let query_string = build_policy_query(user_name.as_deref(), host.as_deref(), path.as_deref());

    let response = client
        .put(format!("{}/api/v1/policy{}", server_url, query_string))
        .json(&serde_json::json!({ "policy": policy }))
        .send()
        .await
        .map_http_error("Failed to set policy")?;

    handle_empty_response(response, "Set policy").await
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

    let query_string = build_policy_query(user_name.as_deref(), host.as_deref(), path.as_deref());

    let response = client
        .delete(format!("{}/api/v1/policy{}", server_url, query_string))
        .send()
        .await
        .map_http_error("Failed to delete policy")?;

    handle_empty_response(response, "Delete policy").await
}

// ============================================================================
// Task Commands
// ============================================================================

/// List all tasks
///
/// Returns all active and recent tasks including snapshots, maintenance, and restore operations.
/// Each task includes status, progress, start time, and error information (if failed).
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

    handle_response(response, "List tasks").await
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

    handle_response(response, "Get task").await
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

    #[derive(Deserialize)]
    struct LogsResponse {
        logs: Vec<String>,
    }

    let result: LogsResponse = handle_response(response, "Get task logs").await?;

    Ok(result.logs)
}

/// Cancel a task
#[tauri::command]
pub async fn task_cancel(server: State<'_, KopiaServerState>, task_id: String) -> Result<()> {
    let (server_url, client) = get_server_client(&server)?;

    let response = client
        .post(format!("{}/api/v1/tasks/{}/cancel", server_url, task_id))
        .send()
        .await
        .map_http_error("Failed to cancel task")?;

    handle_empty_response(response, "Cancel task").await
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

    handle_response(response, "Get tasks summary").await
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

    handle_response(response, "Get maintenance info").await
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

    #[derive(Deserialize)]
    struct MaintenanceResponse {
        id: String,
    }

    let result: MaintenanceResponse = handle_response(response, "Run maintenance").await?;

    Ok(result.id)
}

// ============================================================================
// Utility Commands
// ============================================================================

/// Resolve a file system path to get source info (user@host:/path)
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
        return Err(KopiaError::PathResolutionFailed {
            path,
            message: error_text,
        });
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

/// Estimate snapshot size
#[tauri::command]
pub async fn estimate_snapshot(
    path: String,
    max_examples_per_bucket: Option<i64>,
    server: State<'_, KopiaServerState>,
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

        #[derive(Deserialize)]
        #[serde(rename_all = "camelCase")]
        struct ResolveResponse {
            source: crate::types::SourceInfo,
        }

        let resolve_result: ResolveResponse =
            handle_response(resolve_response, "Resolve path").await?;

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

    handle_response(response, "Estimate snapshot").await
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

    // Handle 404 as "no profiles configured" (common case)
    if response.status().as_u16() == 404 {
        return Ok(vec![]);
    }

    // For other non-success status codes, return error
    if !response.status().is_success() {
        return Err(http_request_failed(
            "Failed to list notification profiles",
            response.status().as_u16(),
        ));
    }

    // Parse response - handle null as empty array (Kopia returns null when no profiles)
    let result: Option<Vec<crate::types::NotificationProfile>> = response
        .json()
        .await
        .map_http_error("Failed to parse notification profiles response")?;

    Ok(result.unwrap_or_default())
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

    handle_empty_response(response, "Create notification profile").await
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

    handle_empty_response(response, "Delete notification profile").await
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

    handle_empty_response(response, "Test notification profile").await
}

// ============================================================================
// Helper Functions
// ============================================================================

/// Get server URL and HTTP client
fn get_server_client(server: &State<'_, KopiaServerState>) -> Result<(String, reqwest::Client)> {
    let mut server_guard = lock_server!(server);
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

    response
        .json()
        .await
        .map_err(|e| KopiaError::ResponseParseError {
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

/// Create an HttpRequestFailed error with consistent structure
///
/// This helper reduces boilerplate when constructing HTTP request failures
/// throughout the API commands.
///
/// # Arguments
/// * `message` - Error message describing what failed
/// * `status_code` - HTTP status code from the response
///
/// # Returns
/// A `KopiaError::HttpRequestFailed` with url set to None (not tracked for localhost API)
fn http_request_failed(message: impl Into<String>, status_code: u16) -> KopiaError {
    KopiaError::HttpRequestFailed {
        message: message.into(),
        status_code: Some(status_code),
        operation: "API Request".to_string(),
    }
}

/// Build URL query string for snapshot source (user@host:/path)
///
/// # Arguments
/// * `user_name` - Username for the snapshot source
/// * `host` - Hostname for the snapshot source
/// * `path` - File path for the snapshot source
///
/// # Returns
/// URL-encoded query string in format: `?userName=X&host=Y&path=Z`
fn build_source_query(user_name: &str, host: &str, path: &str) -> String {
    format!(
        "?userName={}&host={}&path={}",
        urlencoding::encode(user_name),
        urlencoding::encode(host),
        urlencoding::encode(path)
    )
}

/// Build URL query string for policy target (optional user/host/path)
///
/// # Arguments
/// * `user_name` - Optional username filter
/// * `host` - Optional hostname filter
/// * `path` - Optional path filter
///
/// # Returns
/// URL-encoded query string, or empty string if no parameters
fn build_policy_query(user_name: Option<&str>, host: Option<&str>, path: Option<&str>) -> String {
    let parts: Vec<_> = [
        user_name.map(|u| format!("userName={}", urlencoding::encode(u))),
        host.map(|h| format!("host={}", urlencoding::encode(h))),
        path.map(|p| format!("path={}", urlencoding::encode(p))),
    ]
    .into_iter()
    .flatten()
    .collect();

    if parts.is_empty() {
        String::new()
    } else {
        format!("?{}", parts.join("&"))
    }
}
