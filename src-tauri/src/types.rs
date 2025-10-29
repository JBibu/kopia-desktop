use serde::{Deserialize, Serialize};
use std::collections::HashMap;

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

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AlgorithmsResponse {
    pub default_hash_algorithm: String,
    pub default_encryption_algorithm: String,
    pub default_splitter_algorithm: String,
    pub hash_algorithms: Vec<String>,
    pub encryption_algorithms: Vec<String>,
    pub splitter_algorithms: Vec<String>,
    pub ecc_algorithms: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RepositoryCreateRequest {
    pub storage: super::commands::kopia::StorageConfig,
    pub password: String,
    pub options: Option<RepositoryCreateOptions>,
    pub client_options: Option<ClientOptions>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ClientOptions {
    pub description: Option<String>,
    pub username: Option<String>,
    pub hostname: Option<String>,
    pub readonly: Option<bool>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RepositoryCreateOptions {
    pub block_format: Option<BlockFormatOptions>,
    pub object_format: Option<ObjectFormatOptions>,
    pub retention_mode: Option<String>,
    pub retention_period: Option<String>,
    pub ecc: Option<String>,
    pub ecc_overhead_percent: Option<f64>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct BlockFormatOptions {
    pub hash: Option<String>,
    pub encryption: Option<String>,
    pub splitter: Option<String>,
    pub version: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
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

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SnapshotSource {
    pub source: SourceInfo,
    pub status: String,
    pub upload: Option<UploadInfo>,
    pub last_snapshot: Option<LastSnapshotInfo>,
    pub next_snapshot_time: Option<String>,
    pub current_task: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UploadInfo {
    pub hashed_files: i64,
    pub hashed_bytes: i64,
    pub cached_files: i64,
    pub cached_bytes: i64,
    pub estimated_bytes: Option<i64>,
    pub directory: Option<String>,
    pub upload_start_time: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct LastSnapshotInfo {
    pub start_time: String,
    pub end_time: Option<String>,
    pub stats: SnapshotStats,
    pub root_entry: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SnapshotStats {
    pub total_size: i64,
    pub total_file_count: i64,
    pub total_dir_count: i64,
    pub errors: Option<i64>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SnapshotsResponse {
    pub snapshots: Vec<Snapshot>,
    pub unfiltered_count: i64,
    pub unique_count: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Snapshot {
    pub id: String,
    pub root_id: String,
    pub start_time: String,
    pub end_time: Option<String>,
    pub description: Option<String>,
    pub pins: Option<Vec<String>>,
    pub retention: Option<Vec<String>>,
    pub incomplete: Option<bool>,
    pub summary: Option<SnapshotSummary>,
    pub root_entry: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SnapshotSummary {
    pub size: i64,
    pub files: i64,
    pub dirs: i64,
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
    pub snapshots: Vec<String>,  // API expects "snapshots", not "manifest_ids"
    pub description: Option<String>,
    pub add_pins: Option<Vec<String>>,
    pub remove_pins: Option<Vec<String>>,
}

// ============================================================================
// Directory & File Browsing Types
// ============================================================================

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DirectoryObject {
    pub stream: String,
    pub entries: Vec<DirectoryEntry>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DirectoryEntry {
    pub name: String,
    #[serde(rename = "type")]
    pub entry_type: String,
    pub mode: i64,
    pub size: i64,
    pub mtime: String,
    pub obj: String,
    pub summ: Option<DirectorySummary>,
    pub link_target: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DirectorySummary {
    pub size: i64,
    pub files: i64,
    pub dirs: i64,
    pub errors: Option<i64>,
    pub max_time: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RestoreRequest {
    pub root: String,
    pub fs_output: Option<FilesystemOutput>,
    pub zip_file: Option<String>,
    pub uncompressed_zip: Option<bool>,
    pub tar_file: Option<String>,
    pub options: Option<RestoreOptions>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct FilesystemOutput {
    pub target_path: String,
    pub overwrite_files: Option<bool>,
    pub overwrite_directories: Option<bool>,
    pub overwrite_symlinks: Option<bool>,
    pub skip_owners: Option<bool>,
    pub skip_permissions: Option<bool>,
    pub skip_times: Option<bool>,
    pub write_files_atomically: Option<bool>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RestoreOptions {
    pub incremental: Option<bool>,
    pub ignore_errors: Option<bool>,
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
    pub mounts: Vec<MountInfo>,
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
    pub retention: Option<RetentionPolicy>,
    pub scheduling: Option<SchedulingPolicy>,
    pub files: Option<FilesPolicy>,
    pub compression: Option<CompressionPolicy>,
    pub actions: Option<ActionsPolicy>,
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
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SchedulingPolicy {
    pub interval: Option<String>,
    pub time_of_day: Option<Vec<TimeOfDay>>,
    pub manual: Option<bool>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TimeOfDay {
    pub hour: i64,
    pub min: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct FilesPolicy {
    pub ignore: Option<Vec<String>>,
    pub ignore_dot_files: Option<Vec<String>>,
    pub scan_one_filesystem: Option<bool>,
    pub no_parent_ignore: Option<bool>,
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
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UploadPolicy {
    pub max_parallel_snapshots: Option<i64>,
    pub max_parallel_file_reads: Option<i64>,
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
    pub snapshotted: Option<String>,
    pub ignored: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct LoggingEntriesPolicy {
    pub snapshotted: Option<String>,
    pub ignored: Option<String>,
    pub cache_hit: Option<String>,
    pub cache_miss: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ResolvedPolicyResponse {
    pub effective: PolicyDefinition,
    pub definition: Option<PolicyDefinition>,
    pub defined: Option<PolicyDefinition>,
    pub upcoming_snapshot_times: Vec<String>,
    pub scheduling_error: Option<String>,
}

// ============================================================================
// Task Types
// ============================================================================

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TasksResponse {
    pub tasks: Vec<Task>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Task {
    pub id: String,
    pub kind: String,
    pub description: String,
    pub status: String,
    pub start_time: String,
    pub end_time: Option<String>,
    pub progress: Option<TaskProgress>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TaskProgress {
    pub current: i64,
    pub total: i64,
    pub percentage: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TaskDetail {
    #[serde(flatten)]
    pub task: Task,
    pub counters: Option<HashMap<String, i64>>,
    pub logs: Option<Vec<String>>,
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

// Note: These request types are defined for completeness but currently unused.
// The commands accept simple parameters instead of request objects.
#[allow(dead_code)]
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct MaintenanceRunRequest {
    pub full: Option<bool>,
    pub safety: Option<String>,
}

// ============================================================================
// Utility Types
// ============================================================================

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CurrentUserResponse {
    pub username: String,
    pub hostname: String,
}

#[allow(dead_code)]
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PathResolveRequest {
    pub path: String,
}

#[allow(dead_code)]
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct EstimateRequest {
    pub root: String,
    pub max_examples_per_bucket: Option<i64>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
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
pub struct NotificationProfilesResponse {
    pub profiles: Vec<NotificationProfile>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct NotificationProfile {
    pub profile_name: String,
    pub method: String,
    pub config: NotificationConfig,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct NotificationConfig {
    pub smtp_server: Option<String>,
    pub smtp_port: Option<i64>,
    pub smtp_username: Option<String>,
    pub to_address: Option<String>,
    pub webhook_url: Option<String>,
    pub url: Option<String>,
    pub method: Option<String>,
    pub headers: Option<HashMap<String, String>>,
}
