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
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RepositoryCreateRequest {
    pub storage: StorageConfig,
    pub password: String,
    pub options: Option<RepositoryCreateOptions>,
    pub client_options: Option<ClientOptions>,
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
    pub write_files_atomically: Option<bool>,
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

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PolicyDefinition {
    #[serde(skip_serializing_if = "Option::is_none")]
    pub no_parent: Option<bool>,
    pub retention: Option<RetentionPolicy>,
    pub scheduling: Option<SchedulingPolicy>,
    pub files: Option<FilesPolicy>,
    pub compression: Option<CompressionPolicy>,
    pub metadata_compression: Option<CompressionPolicy>,
    pub splitter: Option<SplitterPolicy>,
    pub actions: Option<ActionsPolicy>,
    pub os_snapshots: Option<OsSnapshotsPolicy>,
    pub error_handling: Option<ErrorHandlingPolicy>,
    pub upload: Option<UploadPolicy>,
    pub logging: Option<LoggingPolicy>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RetentionPolicy {
    pub keep_latest: Option<i64>,
    pub keep_hourly: Option<i64>,
    pub keep_daily: Option<i64>,
    pub keep_weekly: Option<i64>,
    pub keep_monthly: Option<i64>,
    pub keep_annual: Option<i64>,
    pub ignore_identical_snapshots: Option<bool>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SchedulingPolicy {
    pub interval_seconds: Option<i64>,
    pub time_of_day: Option<Vec<String>>,
    pub no_parent_time_of_day: Option<bool>,
    pub manual: Option<bool>,
    pub cron: Option<Vec<String>>,
    pub run_missed: Option<bool>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct FilesPolicy {
    pub ignore: Option<Vec<String>>,
    #[serde(rename = "dotIgnore")]
    pub ignore_dot_files: Option<Vec<String>>,
    pub one_file_system: Option<bool>,
    pub no_parent_ignore: Option<bool>,
    pub no_parent_dot_files: Option<bool>,
    pub ignore_cache_dirs: Option<bool>,
    pub max_file_size: Option<i64>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CompressionPolicy {
    pub compressor_name: Option<String>,
    pub min_size: Option<i64>,
    pub max_size: Option<i64>,
    pub only_compress: Option<Vec<String>>,
    pub never_compress: Option<Vec<String>>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ActionsPolicy {
    pub before_snapshot_root: Option<ActionDefinition>,
    pub after_snapshot_root: Option<ActionDefinition>,
    pub before_folder: Option<ActionDefinition>,
    pub after_folder: Option<ActionDefinition>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ActionDefinition {
    pub script: String,
    pub timeout: i64,
    pub mode: String,
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

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct LoggingPolicy {
    pub directories: Option<LoggingDirectoriesPolicy>,
    pub entries: Option<LoggingEntriesPolicy>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct LoggingDirectoriesPolicy {
    pub snapshotted: Option<LogLevel>,
    pub ignored: Option<LogLevel>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct LoggingEntriesPolicy {
    pub snapshotted: Option<LogLevel>,
    pub ignored: Option<LogLevel>,
    pub cache_hit: Option<LogLevel>,
    pub cache_miss: Option<LogLevel>,
}

// LogLevel can be either a simple number or an object with minSize/maxSize
#[derive(Debug, Clone, Deserialize)]
#[serde(untagged)]
pub enum LogLevel {
    Simple(i64),
    Detailed {
        min_size: Option<i64>,
        max_size: Option<i64>,
    },
}

impl serde::Serialize for LogLevel {
    fn serialize<S>(&self, serializer: S) -> Result<S::Ok, S::Error>
    where
        S: serde::Serializer,
    {
        match self {
            LogLevel::Simple(n) => serializer.serialize_i64(*n),
            LogLevel::Detailed { min_size, max_size } => {
                use serde::ser::SerializeStruct;
                let mut state = serializer.serialize_struct("LogLevel", 2)?;
                state.serialize_field("minSize", min_size)?;
                state.serialize_field("maxSize", max_size)?;
                state.end()
            }
        }
    }
}

/// Splitter policy configuration for content splitting algorithms
///
/// Note: Kopia's splitter policy is typically configured at the repository level
/// and not overridden per-snapshot source. The policy definition in Kopia API
/// returns an empty object in most cases, as splitter algorithms are not
/// user-configurable at the policy level (they're repository-wide settings).
///
/// This struct exists to match the API response structure and may be extended
/// in future Kopia versions if per-source splitter configuration is added.
#[derive(Debug, Clone, Serialize, Deserialize, Default)]
#[serde(rename_all = "camelCase")]
pub struct SplitterPolicy {
    // Currently empty - Kopia does not expose per-policy splitter configuration
    // The splitter algorithm is configured at repository creation time
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct OsSnapshotsPolicy {
    pub volume_shadow_copy: Option<VolumeShadowCopyPolicy>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct VolumeShadowCopyPolicy {
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
// Maintenance Types
// ============================================================================

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct MaintenanceInfo {
    pub last_run: Option<String>,
    pub next_run: Option<String>,
    pub schedule: MaintenanceSchedule,
    pub stats: Option<MaintenanceStats>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct MaintenanceSchedule {
    pub quick: Option<MaintenanceInterval>,
    pub full: Option<MaintenanceInterval>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct MaintenanceInterval {
    pub interval: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct MaintenanceStats {
    pub blob_count: i64,
    pub total_blob_size: i64,
}

// ============================================================================
// Utility Types
// ============================================================================

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct EstimateRequest {
    pub root: String,
    pub max_examples_per_bucket: Option<i64>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct EstimateResponse {
    pub id: String, // Task ID to poll for results
}

#[derive(Debug, Clone, Default, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UIPreferences {
    pub theme: Option<String>,
    pub page_size: Option<i64>,
    pub default_snapshot_view_all: Option<bool>,
    pub bytes_string_base2: Option<bool>,
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
