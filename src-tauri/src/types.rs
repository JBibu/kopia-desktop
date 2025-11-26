//! Type definitions for Kopia API
//!
//! This module contains Rust types that mirror the Kopia server REST API.
//! Types are organized by functional area: Repository, Snapshots, Policies, Tasks, etc.
//!
//! # JSON Serialization
//!
//! All types use `#[serde(rename_all = "camelCase")]` to match Go's JSON naming conventions.
//! Some fields use custom deserialization (`deserialize_null_default`) to handle Go's
//! nil maps/slices that serialize as JSON `null` instead of empty arrays/objects.
//!
//! # API Compatibility
//!
//! These types are based on Kopia's Go source code and should remain compatible
//! with the Kopia server API. Many types include comments linking to the original
//! Go definitions for reference.

use serde::{Deserialize, Deserializer, Serialize};
use std::collections::HashMap;

// Helper function to deserialize null as default value
fn deserialize_null_default<'de, D, T>(deserializer: D) -> Result<T, D::Error>
where
    T: Default + Deserialize<'de>,
    D: Deserializer<'de>,
{
    let opt = Option::deserialize(deserializer)?;
    Ok(opt.unwrap_or_default())
}

// ============================================================================
// Core Types
// ============================================================================

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SourceInfo {
    pub user_name: String,
    pub host: String,
    pub path: String,
}

// ============================================================================
// Repository Types
// ============================================================================

/// RepositoryStatus matches serverapi.StatusResponse
/// Combines StatusResponse + embedded repo.ClientOptions
/// See: internal/serverapi/serverapi.go:22-40, repo/local_config.go
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
    #[serde(rename = "permissiveCacheLoading")]
    pub permissive_cache_loading: Option<bool>, // Advanced feature
    #[serde(rename = "throttlingLimits")]
    pub throttling_limits: Option<ThrottlingLimits>, // Advanced feature
    // Repository initialization task ID
    #[serde(rename = "initTaskID")]
    pub init_task_id: Option<String>,
}

/// ThrottlingLimits matches throttling.Limits from official Kopia
/// See: internal/throttling/throttling.go
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ThrottlingLimits {
    pub upload_bytes_per_second: Option<f64>,
    pub download_bytes_per_second: Option<f64>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AlgorithmsResponse {
    #[serde(rename = "defaultHash")]
    pub default_hash: String,
    #[serde(rename = "defaultEncryption")]
    pub default_encryption: String,
    #[serde(rename = "defaultSplitter")]
    pub default_splitter: String,
    #[serde(rename = "defaultEcc")]
    pub default_ecc: Option<String>,
    pub hash: Vec<AlgorithmOption>,
    pub encryption: Vec<AlgorithmOption>,
    pub splitter: Vec<AlgorithmOption>,
    pub ecc: Option<Vec<AlgorithmOption>>,
    pub compression: Option<Vec<AlgorithmOption>>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AlgorithmOption {
    pub id: String,
    pub deprecated: Option<bool>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct StorageConfig {
    #[serde(rename = "type")]
    pub storage_type: String,
    pub config: serde_json::Value, // Storage-type specific config (e.g., {"path": "..."} for filesystem)
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RepositoryConnectRequest {
    pub storage: StorageConfig,
    pub password: String,
    pub token: Option<String>,
    pub client_options: Option<ClientOptions>,
    /// Time in seconds to wait for repository sync after connection
    #[serde(skip_serializing_if = "Option::is_none")]
    pub sync_wait_time: Option<i32>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RepositoryCreateRequest {
    pub storage: StorageConfig,
    pub password: String,
    pub options: Option<RepositoryCreateOptions>,
    pub client_options: Option<ClientOptions>,
    /// Time in seconds to wait for repository sync after creation
    #[serde(skip_serializing_if = "Option::is_none")]
    pub sync_wait_time: Option<i32>,
}

#[derive(Debug, Clone, Default, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ClientOptions {
    pub description: Option<String>,
    pub username: Option<String>,
    pub hostname: Option<String>,
    pub readonly: Option<bool>,
}

#[derive(Debug, Clone, Default, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RepositoryCreateOptions {
    pub block_format: Option<BlockFormatOptions>,
    pub object_format: Option<ObjectFormatOptions>,
    pub retention_mode: Option<String>,
    pub retention_period: Option<String>,
    pub ecc: Option<String>,
    pub ecc_overhead_percent: Option<f64>,
}

#[derive(Debug, Clone, Default, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct BlockFormatOptions {
    pub hash: Option<String>,
    pub encryption: Option<String>,
    pub splitter: Option<String>,
    pub version: Option<String>,
}

#[derive(Debug, Clone, Default, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct ObjectFormatOptions {
    pub splitter: Option<String>,
    pub min_content_size: Option<i64>,
    pub max_content_size: Option<i64>,
}

// ============================================================================
// Snapshot Types
// ============================================================================

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SourcesResponse {
    pub local_username: String,
    pub local_host: String,
    pub multi_user: bool,
    pub sources: Vec<SnapshotSource>,
}

// SourceStatus matches serverapi.SourceStatus
// Official API field: `json:"schedule"` maps to SchedulingPolicy
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SnapshotSource {
    pub source: SourceInfo,
    pub status: String,
    #[serde(rename = "schedule")]
    pub scheduling_policy: SchedulingPolicy,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub last_snapshot: Option<Snapshot>, // Full snapshot.Manifest, not simplified
    #[serde(skip_serializing_if = "Option::is_none")]
    pub next_snapshot_time: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub upload: Option<UploadCounters>, // Matches upload.Counters
    #[serde(skip_serializing_if = "Option::is_none")]
    pub current_task: Option<String>,
}

// UploadCounters matches upload.Counters from official Kopia
// See: snapshot/upload/upload_progress.go:169-201
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UploadCounters {
    pub cached_bytes: i64,
    pub hashed_bytes: i64,
    pub uploaded_bytes: i64,
    pub estimated_bytes: i64,
    pub cached_files: i32,
    pub hashed_files: i32,
    pub excluded_files: i32,
    pub excluded_dirs: i32,
    pub errors: i32,
    pub ignored_errors: i32,
    pub estimated_files: i64,
    pub directory: String,
    pub last_error_path: String,
    pub last_error: String,
}

// SnapshotStats matches snapshot.Stats from official Kopia
// See: snapshot/stats.go:10-37
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SnapshotStats {
    pub total_size: i64,          // JSON: "totalSize"
    pub excluded_total_size: i64, // JSON: "excludedTotalSize"
    pub file_count: i32,          // JSON: "fileCount"
    pub cached_files: i32,        // JSON: "cachedFiles"
    pub non_cached_files: i32,    // JSON: "nonCachedFiles"
    pub dir_count: i32,           // JSON: "dirCount"
    pub excluded_file_count: i32, // JSON: "excludedFileCount"
    pub excluded_dir_count: i32,  // JSON: "excludedDirCount"
    pub ignored_error_count: i32, // JSON: "ignoredErrorCount"
    pub error_count: i32,         // JSON: "errorCount"
}

// StorageStats matches snapshot.StorageStats
// See: snapshot/manifest.go:186-192
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct StorageStats {
    pub new_data: StorageUsageDetails,
    pub running_total: StorageUsageDetails,
}

// StorageUsageDetails matches snapshot.StorageUsageDetails
// See: snapshot/manifest.go:194-219
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct StorageUsageDetails {
    pub object_bytes: i64,
    pub original_content_bytes: i64,
    pub packed_content_bytes: i64,
    #[serde(rename = "fileObjects")]
    pub file_object_count: i32,
    #[serde(rename = "dirObjects")]
    pub dir_object_count: i32,
    pub contents: i32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SnapshotsResponse {
    pub snapshots: Vec<Snapshot>,
    pub unfiltered_count: i64,
    pub unique_count: i64,
}

// Snapshot represents both serverapi.Snapshot and snapshot.Manifest
// The API returns different fields depending on endpoint:
// - /api/v1/snapshots returns serverapi.Snapshot (rootID string, summary)
// - SourceStatus.lastSnapshot returns snapshot.Manifest (rootEntry object, stats, source)
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Snapshot {
    pub id: String,
    // serverapi.Snapshot has this field
    #[serde(rename = "rootID")] // API uses capital "ID", not camelCase
    pub root_id: Option<String>,
    pub start_time: String,
    pub end_time: Option<String>,
    pub description: Option<String>,
    pub pins: Option<Vec<String>>,
    pub retention: Option<Vec<String>>,
    // incompleteReason field (JSON tag "incomplete") - empty if complete, otherwise reason like "canceled"
    pub incomplete: Option<String>,
    // serverapi.Snapshot uses "summary" (fs.DirectorySummary)
    pub summary: Option<SnapshotSummary>,
    // snapshot.Manifest uses "rootEntry" (DirEntry object)
    pub root_entry: Option<RootEntry>,
    // snapshot.Manifest uses "stats" instead of "summary"
    pub stats: Option<SnapshotStats>,
    // snapshot.Manifest includes source
    pub source: Option<SourceInfo>,
    // snapshot.Manifest includes tags
    pub tags: Option<std::collections::HashMap<String, String>>,
    // snapshot.Manifest includes storage stats
    pub storage_stats: Option<StorageStats>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SnapshotSummary {
    pub size: Option<i64>,
    pub files: Option<i64>,
    pub dirs: Option<i64>,
    pub symlinks: Option<i64>,
    pub errors: Option<i64>,
    pub error_count: Option<i64>,
    pub ignored_error_count: Option<i64>,
    pub num_failed: Option<i64>,
    pub total_file_size: Option<i64>,
    pub excluded_file_count: Option<i64>,
    pub excluded_total_file_size: Option<i64>,
    pub excluded_dir_count: Option<i64>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SnapshotEditRequest {
    pub snapshots: Vec<String>, // API expects "snapshots", not "manifest_ids"
    pub description: Option<String>,
    pub add_pins: Option<Vec<String>>,
    pub remove_pins: Option<Vec<String>>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SnapshotDeleteRequest {
    pub source: SourceInfo,
    #[serde(rename = "snapshotManifestIds")]
    pub snapshot_manifest_ids: Vec<String>,
    pub delete_source_and_policy: Option<bool>,
}

/// SourceActionResponse is a per-source response
/// See: internal/serverapi/serverapi.go
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SourceActionResponse {
    pub success: bool,
}

/// MultipleSourceActionResponse contains per-source responses for all sources targeted by API command
/// See: internal/serverapi/serverapi.go
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct MultipleSourceActionResponse {
    pub sources: std::collections::HashMap<String, SourceActionResponse>,
}

/// ThrottleLimits for repository operations
/// See: repo/blob/throttling/throttler.go (Limits)
#[derive(Debug, Clone, Default, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ThrottleLimits {
    /// Read operations per second limit
    #[serde(skip_serializing_if = "Option::is_none")]
    pub reads_per_second: Option<f64>,
    /// Write operations per second limit
    #[serde(skip_serializing_if = "Option::is_none")]
    pub writes_per_second: Option<f64>,
    /// List operations per second limit
    #[serde(skip_serializing_if = "Option::is_none")]
    pub lists_per_second: Option<f64>,
    /// Maximum upload speed in bytes per second
    #[serde(skip_serializing_if = "Option::is_none")]
    pub max_upload_speed_bytes_per_second: Option<f64>,
    /// Maximum download speed in bytes per second
    #[serde(skip_serializing_if = "Option::is_none")]
    pub max_download_speed_bytes_per_second: Option<f64>,
    /// Maximum concurrent read operations
    #[serde(skip_serializing_if = "Option::is_none")]
    pub concurrent_reads: Option<i32>,
    /// Maximum concurrent write operations
    #[serde(skip_serializing_if = "Option::is_none")]
    pub concurrent_writes: Option<i32>,
}

// ============================================================================
// Directory & File Browsing Types
// ============================================================================

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DirectoryObject {
    pub stream: Option<String>,
    pub entries: Vec<DirectoryEntry>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DirectoryEntry {
    pub name: String,
    #[serde(rename = "type")]
    pub entry_type: String,
    pub mode: String,      // Octal string like "0755" or "0644"
    pub size: Option<i64>, // Optional because some entries (e.g., directories) may not have size
    pub mtime: String,
    pub obj: String,
    pub summ: Option<DirectorySummary>,
    pub link_target: Option<String>,
    /// User ID (owner) of the entry
    #[serde(skip_serializing_if = "Option::is_none")]
    pub uid: Option<u32>,
    /// Group ID (owner group) of the entry
    #[serde(skip_serializing_if = "Option::is_none")]
    pub gid: Option<u32>,
}

/// DirectorySummary matches fs.DirectorySummary from official Kopia
/// See: fs/entry.go
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DirectorySummary {
    pub size: i64,                        // TotalFileSize
    pub files: i64,                       // TotalFileCount
    pub dirs: i64,                        // TotalDirCount
    pub symlinks: Option<i64>,            // TotalSymlinkCount
    pub max_time: Option<String>,         // MaxModTime (RFC3339Nano format)
    pub incomplete: Option<String>,       // IncompleteReason - empty if complete
    pub num_failed: Option<i32>,          // FatalErrorCount
    pub num_ignored_errors: Option<i32>,  // IgnoredErrorCount
    pub errors: Option<Vec<FailedEntry>>, // FailedEntries
}

/// Failed entry information (matches fs.EntryWithError)
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct FailedEntry {
    pub path: String,
    pub error: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RootEntry {
    pub obj: Option<String>,
    pub summ: Option<DirectorySummary>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RestoreRequest {
    pub root: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub fs_output: Option<FilesystemOutput>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub zip_file: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub uncompressed_zip: Option<bool>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub tar_file: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub options: Option<RestoreOptions>,
}

#[derive(Debug, Clone, Default, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct FilesystemOutput {
    #[serde(default)]
    pub target_path: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub overwrite_files: Option<bool>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub overwrite_directories: Option<bool>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub overwrite_symlinks: Option<bool>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub skip_owners: Option<bool>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub skip_permissions: Option<bool>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub skip_times: Option<bool>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub ignore_permission_errors: Option<bool>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub write_files_atomically: Option<bool>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub write_sparse_files: Option<bool>,
}

#[derive(Debug, Clone, Default, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RestoreOptions {
    #[serde(skip_serializing_if = "Option::is_none")]
    pub incremental: Option<bool>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub ignore_errors: Option<bool>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub restore_dir_entry_at_depth: Option<i64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub min_size_for_placeholder: Option<i64>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct MountResponse {
    pub path: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct MountsResponse {
    pub items: Vec<MountInfo>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct MountInfo {
    pub root: String,
    pub path: String,
}

// ============================================================================
// Policy Types
// ============================================================================

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PoliciesResponse {
    pub policies: Vec<PolicyWithTarget>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PolicyWithTarget {
    pub id: Option<String>,
    pub target: PolicyTarget,
    pub policy: PolicyDefinition,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PolicyTarget {
    pub user_name: Option<String>,
    pub host: Option<String>,
    pub path: Option<String>,
}

#[derive(Debug, Clone, Default, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PolicyDefinition {
    #[serde(skip_serializing_if = "Option::is_none")]
    pub no_parent: Option<bool>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub retention: Option<RetentionPolicy>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub scheduling: Option<SchedulingPolicy>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub files: Option<FilesPolicy>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub compression: Option<CompressionPolicy>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub metadata_compression: Option<CompressionPolicy>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub splitter: Option<SplitterPolicy>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub actions: Option<ActionsPolicy>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub os_snapshots: Option<OsSnapshotsPolicy>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub error_handling: Option<ErrorHandlingPolicy>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub upload: Option<UploadPolicy>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub logging: Option<LoggingPolicy>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RetentionPolicy {
    #[serde(skip_serializing_if = "Option::is_none")]
    pub keep_latest: Option<i64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub keep_hourly: Option<i64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub keep_daily: Option<i64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub keep_weekly: Option<i64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub keep_monthly: Option<i64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub keep_annual: Option<i64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub ignore_identical_snapshots: Option<bool>,
}

/// SchedulingPolicy matches policy.SchedulingPolicy from official Kopia
/// See: snapshot/policy/scheduling_policy.go
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SchedulingPolicy {
    #[serde(skip_serializing_if = "Option::is_none")]
    pub interval_seconds: Option<i64>,
    /// Times of day to run snapshots (array of {hour, min} objects)
    #[serde(skip_serializing_if = "Option::is_none")]
    pub time_of_day: Option<Vec<TimeOfDay>>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub no_parent_time_of_day: Option<bool>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub manual: Option<bool>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub cron: Option<Vec<String>>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub run_missed: Option<bool>,
}

/// TimeOfDay matches policy.TimeOfDay from official Kopia
/// See: snapshot/policy/scheduling_policy.go:19-46
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TimeOfDay {
    pub hour: i32,
    #[serde(rename = "min")]
    pub minute: i32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct FilesPolicy {
    pub ignore: Option<Vec<String>>,
    #[serde(rename = "dotIgnoreFiles")]
    pub ignore_dot_files: Option<Vec<String>>,
    pub one_file_system: Option<bool>,
    pub no_parent_ignore: Option<bool>,
    pub no_parent_dot_files: Option<bool>,
    pub ignore_cache_dirs: Option<bool>,
    pub max_file_size: Option<i64>,
}

/// CompressionPolicy matches policy.CompressionPolicy from official Kopia
/// See: snapshot/policy/compression_policy.go:12-21
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CompressionPolicy {
    pub compressor_name: Option<String>,
    pub min_size: Option<i64>,
    pub max_size: Option<i64>,
    pub only_compress: Option<Vec<String>>,
    /// Prevents inheriting onlyCompress list from parent policies
    pub no_parent_only_compress: Option<bool>,
    pub never_compress: Option<Vec<String>>,
    /// Prevents inheriting neverCompress list from parent policies
    pub no_parent_never_compress: Option<bool>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ActionsPolicy {
    pub before_snapshot_root: Option<ActionDefinition>,
    pub after_snapshot_root: Option<ActionDefinition>,
    pub before_folder: Option<ActionDefinition>,
    pub after_folder: Option<ActionDefinition>,
}

/// ActionCommand matches policy.ActionCommand from official Kopia
/// Supports both script-based and command-based execution
/// See: snapshot/policy/actions_policy.go:22-33
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ActionDefinition {
    /// Command executable path (alternative to script)
    #[serde(skip_serializing_if = "Option::is_none")]
    pub path: Option<String>,
    /// Command arguments (used with path)
    #[serde(skip_serializing_if = "Option::is_none")]
    pub args: Option<Vec<String>>,
    /// Inline script content (alternative to path/args)
    #[serde(skip_serializing_if = "Option::is_none")]
    pub script: Option<String>,
    /// Timeout in seconds
    #[serde(skip_serializing_if = "Option::is_none")]
    pub timeout: Option<i64>,
    /// Execution mode: "essential", "optional", or "async"
    #[serde(skip_serializing_if = "Option::is_none")]
    pub mode: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ErrorHandlingPolicy {
    pub ignore_file_errors: Option<bool>,
    pub ignore_directory_errors: Option<bool>,
    pub ignore_unknown_types: Option<bool>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UploadPolicy {
    pub max_parallel_snapshots: Option<i64>,
    pub max_parallel_file_reads: Option<i64>,
    pub parallel_upload_above_size: Option<i64>,
}

/// LoggingPolicy matches policy.LoggingPolicy from official Kopia
/// See: snapshot/policy/logging_policy.go:48-63
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct LoggingPolicy {
    pub directories: Option<LoggingDirectoriesPolicy>,
    pub entries: Option<LoggingEntriesPolicy>,
}

/// LoggingDirectoriesPolicy matches policy.DirLoggingPolicy
/// See: snapshot/policy/logging_policy.go:53-56
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct LoggingDirectoriesPolicy {
    /// LogDetail level: 0=None, 5=Normal, 10=Max
    pub snapshotted: Option<i64>,
    /// LogDetail level: 0=None, 5=Normal, 10=Max
    pub ignored: Option<i64>,
}

/// LoggingEntriesPolicy matches policy.EntryLoggingPolicy
/// See: snapshot/policy/logging_policy.go:58-63
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct LoggingEntriesPolicy {
    /// LogDetail level: 0=None, 5=Normal, 10=Max
    pub snapshotted: Option<i64>,
    /// LogDetail level: 0=None, 5=Normal, 10=Max
    pub ignored: Option<i64>,
    /// LogDetail level: 0=None, 5=Normal, 10=Max
    pub cache_hit: Option<i64>,
    /// LogDetail level: 0=None, 5=Normal, 10=Max
    pub cache_miss: Option<i64>,
}

/// SplitterPolicy matches policy.SplitterPolicy from official Kopia
/// See: snapshot/policy/splitter_policy.go:8-11
#[derive(Debug, Clone, Serialize, Deserialize, Default)]
#[serde(rename_all = "camelCase")]
pub struct SplitterPolicy {
    /// Content splitting algorithm name
    #[serde(skip_serializing_if = "Option::is_none")]
    pub algorithm: Option<String>,
}

/// OsSnapshotsPolicy matches policy.OSSnapshotPolicy from official Kopia
/// See: snapshot/policy/os_snapshot_policy.go
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct OsSnapshotsPolicy {
    pub volume_shadow_copy: Option<VolumeShadowCopyPolicy>,
}

/// VolumeShadowCopyPolicy for Windows VSS snapshots
/// The 'enable' field uses OSSnapshotMode values:
///   0 = Never (don't use OS snapshots)
///   1 = Always (require OS snapshots, fail if unavailable)
///   2 = WhenAvailable (use if available, continue without if not)
/// See: snapshot/policy/os_snapshot_policy.go:37-55
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct VolumeShadowCopyPolicy {
    /// OSSnapshotMode: 0=Never, 1=Always, 2=WhenAvailable
    pub enable: Option<i64>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ResolvedPolicyResponse {
    pub effective: PolicyDefinition,
    // 'definition' contains SourceInfo objects showing WHERE each field was defined,
    // not the actual policy values. We don't use it in the UI, so we use serde_json::Value
    #[serde(skip_serializing_if = "Option::is_none")]
    pub definition: Option<serde_json::Value>,
    pub defined: Option<PolicyDefinition>,
    pub upcoming_snapshot_times: Vec<String>,
    pub scheduling_error: Option<String>,
}

// ============================================================================
// Task Types (matches uitask.Info)
// See: internal/uitask/uitask.go:52-66
// ============================================================================

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TasksResponse {
    pub tasks: Vec<Task>,
}

// Task matches uitask.Info
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Task {
    pub id: String,
    pub start_time: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub end_time: Option<String>,
    pub kind: String,
    pub description: String,
    pub status: String,
    #[serde(default, deserialize_with = "deserialize_null_default")]
    pub progress_info: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub error_message: Option<String>,
    // Counters can be null when the map is empty/nil in Go
    #[serde(default, deserialize_with = "deserialize_null_default")]
    pub counters: HashMap<String, CounterValue>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TaskDetail {
    #[serde(flatten)]
    pub task: Task,
    pub counters: Option<HashMap<String, CounterValue>>,
    pub logs: Option<Vec<String>>,
}

/// CounterValue describes the counter value reported by task with optional units for presentation.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CounterValue {
    pub value: i64,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub units: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub level: Option<String>, // "", "notice", "warning" or "error"
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TasksSummary {
    pub running: i64,
    pub success: i64,
    pub failed: i64,
    pub canceled: i64,
}

// ============================================================================
// Utility Types
// ============================================================================

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct EstimateRequest {
    pub root: String,
    pub max_examples_per_bucket: Option<i64>,
    /// Optional policy override for estimation
    #[serde(skip_serializing_if = "Option::is_none")]
    pub policy_override: Option<PolicyDefinition>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct EstimateResponse {
    pub id: String, // Task ID to poll for results
}

// ============================================================================
// Notification Types
// ============================================================================

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct NotificationProfile {
    pub profile: String,
    pub method: NotificationMethod,
    pub min_severity: i32, // -100 (Verbose), -10 (Success), 0 (Report), 10 (Warning), 20 (Error)
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct NotificationMethod {
    #[serde(rename = "type")]
    pub method_type: String, // "email", "pushover", "webhook"
    pub config: serde_json::Value, // Method-specific configuration
}
