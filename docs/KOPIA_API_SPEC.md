# Kopia Desktop - API Specifications & Implementation Guide

> **Version:** 1.0
> **Target Kopia Version:** 0.21.x
> **Last Updated:** 2025-01-28

This document defines all REST API endpoints, WebSocket events, Tauri commands, data models, and validation rules required for a complete Kopia Desktop implementation.

---

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [REST API Endpoints](#rest-api-endpoints)
3. [WebSocket Events](#websocket-events)
4. [Tauri Command Interface](#tauri-command-interface)
5. [Data Models](#data-models)
6. [Validation Rules](#validation-rules)
7. [Error Handling](#error-handling)
8. [Testing Strategy](#testing-strategy)

---

## Architecture Overview

### Communication Flow

```
┌─────────────────────┐
│   React Frontend    │
│   (TypeScript)      │
└──────────┬──────────┘
           │ Tauri Commands (invoke)
           ▼
┌─────────────────────┐
│   Tauri Backend     │
│   (Rust)            │
└──────────┬──────────┘
           │ HTTP/REST + WebSocket
           ▼
┌─────────────────────┐
│   Kopia Server      │
│   (localhost:port)  │
└─────────────────────┘
```

### Key Principles

1. **Frontend Never Calls HTTP Directly** - All HTTP requests go through Tauri commands
2. **Tauri Backend Manages Kopia Lifecycle** - Start, stop, health checks
3. **WebSocket for Real-Time Updates** - Task progress, snapshot status
4. **Type-Safe Communication** - TypeScript types match Rust structs via serde
5. **Graceful Error Handling** - All errors return structured `Result<T, String>`

---

## REST API Endpoints

### Base URL

```
http://localhost:{dynamic-port}
```

Port is randomly assigned by Kopia server on startup for security.

### Authentication

```
X-Kopia-Csrf-Token: {token-from-server}
Authorization: Basic {base64(username:password)}
```

---

## 1. Repository Management

### 1.1 Get Repository Status

```http
GET /api/v1/repo/status
```

**Response:**

```typescript
{
  connected: boolean;
  configFile?: string;          // Path to .kopia config file
  storage?: string;             // "filesystem", "s3", etc.
  hash?: string;                // "BLAKE2B-256-128"
  encryption?: string;          // "AES256-GCM-HMAC-SHA256"
  splitter?: string;            // "DYNAMIC-4M-BUZHASH"
  formatVersion?: string;       // "3"
  username?: string;            // Current user
  hostname?: string;            // Current host
  readonly?: boolean;
  apiServerURL?: string;        // For remote connections
  initTaskID?: string;          // Present during repo initialization
  description?: string;
  ecc?: string;                 // "REED-SOLOMON-CRC32-16-8"
  eccOverheadPercent?: number;
  supportsContentCompression?: boolean;
}
```

**Use Cases:**

- Check if connected on app startup
- Display connection status in UI
- Poll during repository initialization
- Show repository info (storage type, encryption)

**Frontend Hook:**

```typescript
const { data: status, isLoading } = useRepositoryStatus();
```

---

### 1.2 Connect to Existing Repository

```http
POST /api/v1/repo/connect
```

**Request:**

```typescript
{
  storage: {
    type: "filesystem" | "s3" | "gcs" | "azureBlob" | "b2" | "sftp" | "webdav";

    // Filesystem
    path?: string;

    // S3
    bucket?: string;
    endpoint?: string;
    accessKeyID?: string;
    secretAccessKey?: string;
    sessionToken?: string;
    region?: string;

    // GCS
    bucket?: string;
    credentialsFile?: string;

    // Azure
    container?: string;
    storageAccount?: string;
    storageKey?: string;

    // B2
    bucket?: string;
    keyID?: string;
    key?: string;

    // SFTP
    path?: string;
    host?: string;
    port?: number;
    username?: string;
    password?: string;
    keyfile?: string;
    knownHostsFile?: string;

    // WebDAV
    url?: string;
    username?: string;
    password?: string;
  };

  password: string;              // Repository password
  token?: string;                // Optional access token
  caching?: {
    maxCacheSizeBytes?: number;
    maxMetadataCacheSizeBytes?: number;
    maxListCacheDuration?: number;
  };
}
```

**Response:**

```typescript
{
  connected: boolean;
  dr: string; // Description (usually empty on connect)
}
```

**Validation (Zod):**

```typescript
RepositoryConnectionSchema.parse(request);
```

**Errors:**

- `400` - Invalid storage configuration
- `401` - Invalid password
- `404` - Repository not found
- `500` - Connection failed

**Tauri Command:**

```rust
#[tauri::command]
async fn connect_repository(config: RepositoryConnectRequest) -> Result<RepositoryStatus, String>
```

**Use Case:**

- User clicks "Connect to Repository"
- Select storage type, enter credentials
- Validate inputs, submit to backend
- Poll `/repo/status` until `connected: true`

---

### 1.3 Create New Repository

```http
POST /api/v1/repo/create
```

**Request:**

```typescript
{
  storage: { /* Same as /repo/connect */ };
  password: string;              // New repository password (MUST be strong)
  description?: string;

  options?: {
    blockFormat?: {
      hash?: string;             // "BLAKE2B-256-128" (recommended)
      encryption?: string;       // "AES256-GCM-HMAC-SHA256"
      splitter?: string;         // "DYNAMIC-4M-BUZHASH"
      version?: string;          // "2"
    };

    objectFormat?: {
      splitter?: string;
      minContentSize?: number;
      maxContentSize?: number;
    };

    retentionMode?: "governance" | "compliance";
    retentionPeriod?: string;    // e.g., "30d", "1y"

    ecc?: string;                // "REED-SOLOMON-CRC32-16-8"
    eccOverheadPercent?: number;
  };
}
```

**Response:**

```typescript
{
  initTaskID: string; // Task ID for initialization progress
}
```

**Validation:**

- Password: min 8 chars, uppercase, lowercase, number
- Storage path must be empty directory (filesystem)
- S3 bucket must exist

**Errors:**

- `400` - Weak password or invalid config
- `409` - Repository already exists
- `500` - Creation failed

**Use Case:**

- First-time setup wizard
- "Create New Repository" button
- Show progress via `/tasks/{initTaskID}`
- Auto-connect after initialization complete

---

### 1.4 Disconnect Repository

```http
POST /api/v1/repo/disconnect
```

**Request:** (empty body)

**Response:**

```typescript
{
  disconnected: boolean;
}
```

**Use Case:**

- "Disconnect" button
- Before connecting to different repository
- On app shutdown (optional)

---

### 1.5 Update Repository Description

```http
POST /api/v1/repo/description
```

**Request:**

```typescript
{
  description: string;
}
```

**Use Case:**

- Edit description in repository info panel

---

### 1.6 Check Repository Exists

```http
POST /api/v1/repo/exists
```

**Request:**

```typescript
{
  storage: {
    /* Same as connect */
  }
}
```

**Response:**

```typescript
{
  exists: boolean;
}
```

**Use Case:**

- Validate before showing "Create" vs "Connect" buttons

---

### 1.7 Get Available Algorithms

```http
GET /api/v1/repo/algorithms
```

**Response:**

```typescript
{
  defaultHashAlgorithm: string;
  defaultEncryptionAlgorithm: string;
  defaultSplitterAlgorithm: string;

  hashAlgorithms: string[];      // ["BLAKE2B-256-128", "SHA256", ...]
  encryptionAlgorithms: string[]; // ["AES256-GCM-HMAC-SHA256", ...]
  splitterAlgorithms: string[];  // ["DYNAMIC-4M-BUZHASH", "FIXED-4M", ...]
  eccAlgorithms: string[];       // ["REED-SOLOMON-CRC32-16-8", ...]
}
```

**Use Case:**

- Populate dropdowns in "Create Repository" advanced options

---

## 2. Snapshot Sources

### 2.1 List All Sources

```http
GET /api/v1/sources
```

**Response:**

```typescript
{
  localUsername: string;
  localHost: string;
  multiUser: boolean;

  sources: Array<{
    source: {
      userName: string;
      host: string;
      path: string;
    };

    status: 'IDLE' | 'PENDING' | 'UPLOADING' | 'PAUSED' | 'FAILED';

    // Present during upload
    upload?: {
      hashedFiles: number;
      hashedBytes: number;
      cachedFiles: number;
      cachedBytes: number;
      estimatedBytes?: number;
      directory?: string;
      uploadStartTime?: string;
    };

    lastSnapshot?: {
      startTime: string;
      endTime?: string;
      stats: {
        totalSize: number;
        totalFileCount: number;
        totalDirCount: number;
        errors?: number;
      };
      rootEntry?: string; // Object ID
    };

    nextSnapshotTime?: string; // RFC3339 timestamp
    currentTask?: string; // Task ID if running
  }>;
}
```

**Polling:** Every 3-5 seconds when snapshots are running

**Use Case:**

- Main "Snapshots" page
- Show all sources with status
- "Snapshot Now" buttons
- Progress indicators

---

### 2.2 Create Snapshot

```http
POST /api/v1/sources
```

**Request:**

```typescript
{
  path: string;                  // Path to snapshot
  createSnapshot: boolean;       // Set to true

  // Optional overrides
  userName?: string;
  host?: string;
}
```

**Response:**

```typescript
{
  source: {
    userName: string;
    host: string;
    path: string;
  }
}
```

**Use Case:**

- "Snapshot Now" button
- Manual snapshot creation
- Scheduled snapshot execution

---

### 2.3 Cancel Snapshot

```http
POST /api/v1/sources/cancel
Query: ?userName={user}&host={host}&path={path}
```

**Response:**

```typescript
{
  canceled: boolean;
}
```

**Use Case:**

- "Cancel" button during upload

---

### 2.4 Upload Snapshot (Start)

```http
POST /api/v1/sources/upload
Query: ?userName={user}&host={host}&path={path}
```

**Request:**

```typescript
{
  path: string;
}
```

**Response:** Task ID

**Use Case:**

- Backend-initiated snapshots

---

## 3. Snapshot History

### 3.1 List Snapshots for Source

```http
GET /api/v1/snapshots
Query: ?userName={user}&host={host}&path={path}&all={0|1}
```

**Query Params:**

- `userName`, `host`, `path` - Source identifier
- `all` - `1` to include all snapshots (not just latest per policy)

**Response:**

```typescript
{
  snapshots: Array<{
    id: string; // Manifest ID
    rootID: string; // Root object ID (k...)

    startTime: string; // RFC3339
    endTime?: string;

    description?: string;
    pins?: string[]; // ["pin-1", "do-not-delete"]
    retention?: string[]; // ["latest-1", "daily-2024-01-28"]

    incomplete?: boolean; // Checkpoint/failed snapshot

    summary?: {
      size: number;
      files: number;
      dirs: number;
      symlinks: number;
      errors?: number;
      errorCount?: number;
      ignoredErrorCount?: number;

      // Change stats (vs previous snapshot)
      numFailed?: number;
      totalFileSize?: number;
      excludedFileCount?: number;
      excludedTotalFileSize?: number;
      excludedDirCount?: number;
    };

    rootEntry?: string; // Root object ID (same as rootID)
  }>;

  unfilteredCount: number; // Total snapshots before filtering
  uniqueCount: number; // Unique snapshots (deduplication)
}
```

**Use Case:**

- Snapshot history table for a source
- Show timeline, size, status
- "Restore" and "Browse" buttons

---

### 3.2 Edit Snapshot

```http
POST /api/v1/snapshots/edit
```

**Request:**

```typescript
{
  manifestIDs: string[];         // Snapshot IDs to edit

  description?: string;          // Update description

  addPins?: string[];            // Add pin labels
  removePins?: string[];         // Remove pin labels
}
```

**Use Case:**

- Add/remove pins
- Edit description
- "Pin" checkbox in UI

---

### 3.3 Delete Snapshots

```http
POST /api/v1/snapshots/delete
```

**Request:**

```typescript
{
  manifestIDs: string[];         // Snapshot IDs to delete
}
```

**Response:**

```typescript
{
  deleted: number;
}
```

**Warning:** Show "This action cannot be undone" dialog

**Use Case:**

- Delete button with confirmation

---

## 4. Snapshot Browsing & Restore

### 4.1 Browse Snapshot Directory

```http
GET /api/v1/objects/{objectID}
```

**Response:**

```typescript
{
  stream: 'kopia:directory';

  entries: Array<{
    name: string;
    type: 'f' | 'd' | 's' | 'c'; // file, dir, symlink, char device
    mode: number; // Unix permissions (e.g., 493 = 0755)
    size: number; // Bytes
    mtime: string; // RFC3339
    obj: string; // Object ID (for dirs/files)

    // For directories
    summ?: {
      size: number;
      files: number;
      dirs: number;
      errors?: number;
      maxTime?: string;
    };

    // For symlinks
    linkTarget?: string;
  }>;
}
```

**Use Case:**

- File browser UI (tree or list)
- Navigate directories
- Select files/folders for restore

---

### 4.2 Download Single File

```http
GET /api/v1/objects/{objectID}?fname={filename}
```

**Response:** Raw file bytes (Content-Disposition: attachment)

**Use Case:**

- "Download" button for single file
- Preview files (text, images)

---

### 4.3 Restore Files/Folders

```http
POST /api/v1/restore
```

**Request:**

```typescript
{
  root: string;                  // Object ID to restore (root or subfolder)

  // Restore to filesystem
  fsOutput?: {
    targetPath: string;          // Destination path
    overwriteFiles?: boolean;
    overwriteDirectories?: boolean;
    overwriteSymlinks?: boolean;
    skipOwners?: boolean;
    skipPermissions?: boolean;
    skipTimes?: boolean;
    writeFilesAtomically?: boolean;
  };

  // OR restore to ZIP
  zipFile?: string;
  uncompressedZip?: boolean;

  // OR restore to TAR
  tarFile?: string;

  // Options
  options?: {
    incremental?: boolean;       // Skip existing files
    ignoreErrors?: boolean;
    restoreDirEntryAtDepth?: number;
  };
}
```

**Response:**

```typescript
{
  id: string; // Task ID
}
```

**Use Case:**

- "Restore" wizard
- Select destination
- Show progress via `/tasks/{id}`

---

### 4.4 Mount Snapshot (FUSE/WebDAV)

```http
POST /api/v1/mounts
```

**Request:**

```typescript
{
  root: string; // Object ID
}
```

**Response:**

```typescript
{
  path: string; // Mount point path
}
```

**Use Case:**

- "Mount Snapshot" button
- Browse via file manager
- Must unmount before disconnect

---

### 4.5 List Mounts

```http
GET /api/v1/mounts
```

**Response:**

```typescript
{
  mounts: Array<{
    root: string;
    path: string;
  }>;
}
```

---

### 4.6 Unmount Snapshot

```http
DELETE /api/v1/mounts/{objectID}
```

**Use Case:**

- "Unmount" button
- Auto-unmount on disconnect

---

## 5. Policies

### 5.1 List All Policies

```http
GET /api/v1/policies
```

**Response:**

```typescript
{
  policies: Array<{
    target: {
      userName?: string; // Empty = wildcard (*)
      host?: string;
      path?: string;
    };

    policy: PolicyDefinition; // See Policy Model below
  }>;
}
```

**Use Case:**

- Policies table
- Show hierarchy levels (Global, Host, User, Path)

---

### 5.2 Get Policy for Source

```http
GET /api/v1/policy
Query: ?userName={user}&host={host}&path={path}
```

**Response:**

```typescript
{
  target: {
    (userName, host, path);
  }
  policy: PolicyDefinition;
}
```

**Use Case:**

- Edit policy for specific source

---

### 5.3 Resolve Effective Policy

```http
POST /api/v1/policy/resolve
Query: ?userName={user}&host={host}&path={path}
```

**Request:**

```typescript
{
  updates: Partial<PolicyDefinition>;  // Proposed changes
  numUpcomingSnapshotTimes?: number;   // For preview (default 5)
}
```

**Response:**

```typescript
{
  effectivePolicy: PolicyDefinition;   // After inheritance
  upcomingSnapshotTimes: string[];     // Next scheduled times
}
```

**Use Case:**

- Policy editor preview
- Show inherited vs overridden values
- "Next 5 snapshots" preview

---

### 5.4 Set/Update Policy

```http
PUT /api/v1/policy
Query: ?userName={user}&host={host}&path={path}
```

**Request:**

```typescript
{
  policy: PolicyDefinition;
}
```

**Use Case:**

- Save policy changes
- Create new policy level

---

### 5.5 Delete Policy

```http
DELETE /api/v1/policy
Query: ?userName={user}&host={host}&path={path}
```

**Use Case:**

- Delete custom policy (inherit from parent)

---

## 6. Tasks

### 6.1 List All Tasks

```http
GET /api/v1/tasks
```

**Response:**

```typescript
{
  tasks: Array<{
    id: string;
    kind: string; // "Snapshot", "Restore", "Maintenance", etc.
    description: string;
    status: 'RUNNING' | 'SUCCESS' | 'FAILED' | 'CANCELED';
    startTime: string;
    endTime?: string;

    // For running tasks
    progress?: {
      current: number;
      total: number;
      percentage: number;
    };
  }>;
}
```

**Polling:** Every 3 seconds

**Use Case:**

- Tasks page
- Active tasks indicator in nav
- Cancel buttons

---

### 6.2 Get Task Details

```http
GET /api/v1/tasks/{taskID}
```

**Response:**

```typescript
{
  id: string;
  kind: string;
  description: string;
  status: string;
  startTime: string;
  endTime?: string;

  counters?: {
    [key: string]: number;       // e.g., "hashed_files": 1234
  };
}
```

**Use Case:**

- Task detail page
- Show counters (files, bytes, errors)

---

### 6.3 Get Task Logs

```http
GET /api/v1/tasks/{taskID}/logs
```

**Response:**

```typescript
{
  logs: string[];                // Array of log lines
}
```

**Use Case:**

- "View Logs" button
- Debugging failed tasks

---

### 6.4 Cancel Task

```http
POST /api/v1/tasks/{taskID}/cancel
```

**Use Case:**

- "Cancel" button for running tasks

---

### 6.5 Get Task Summary

```http
GET /api/v1/tasks-summary
```

**Response:**

```typescript
{
  running: number;
  success: number;
  failed: number;
  canceled: number;
}
```

**Polling:** Every 5 seconds (global app state)

**Use Case:**

- Nav badge showing active tasks
- App status indicator

---

## 7. Maintenance

### 7.1 Get Maintenance Info

```http
GET /api/v1/repo/maintenance/info
```

**Response:**

```typescript
{
  lastRun?: string;              // RFC3339
  nextRun?: string;
  schedule: {
    quick?: {
      interval: string;          // "1h", "24h"
    };
    full?: {
      interval: string;
    };
  };
  stats?: {
    blobCount: number;
    totalBlobSize: number;
  };
}
```

---

### 7.2 Run Maintenance

```http
POST /api/v1/repo/maintenance/run
```

**Request:**

```typescript
{
  full?: boolean;                // Full vs quick maintenance
  safety?: "none" | "full";
}
```

**Response:**

```typescript
{
  id: string; // Task ID
}
```

**Warning:** Show "May take hours for large repos"

---

## 8. Estimates

### 8.1 Estimate Snapshot Size

```http
POST /api/v1/estimate
```

**Request:**

```typescript
{
  root: string;                  // Path to estimate
  maxExamplesPerBucket?: number; // Sample size
}
```

**Response:**

```typescript
{
  taskID: string;
}
```

**Poll task for results:**

```typescript
{
  estimatedBytes: number;
  estimatedFiles: number;
}
```

**Use Case:**

- "Estimate" button before snapshot

---

## 9. Utilities

### 9.1 Get Current User

```http
GET /api/v1/current-user
```

**Response:**

```typescript
{
  username: string;
  hostname: string;
}
```

**Use Case:**

- Default source path

---

### 9.2 Resolve Path to Source

```http
POST /api/v1/paths/resolve
```

**Request:**

```typescript
{
  path: string;
}
```

**Response:**

```typescript
{
  source: {
    userName: string;
    host: string;
    path: string;
  }
}
```

**Use Case:**

- Convert local path to source identifier

---

### 9.3 Get CLI Equivalent

```http
GET /api/v1/cli
Query: ?method={GET|POST}&url={path}
Body: (for POST)
```

**Response:**

```typescript
{
  command: string; // e.g., "kopia snapshot create /path"
}
```

**Use Case:**

- "Show CLI command" feature

---

### 9.4 UI Preferences

#### Get Preferences

```http
GET /api/v1/ui-preferences
```

#### Save Preferences

```http
PUT /api/v1/ui-preferences
```

**Schema:**

```typescript
{
  theme?: "light" | "dark" | "system";
  pageSize?: 10 | 20 | 30 | 40 | 50 | 100;
  defaultSnapshotViewAll?: boolean;
  bytesStringBase2?: boolean;
}
```

---

## 10. Notifications

### 10.1 List Notification Profiles

```http
GET /api/v1/notificationProfiles
```

**Response:**

```typescript
{
  profiles: Array<{
    profileName: string;
    method: 'email' | 'slack' | 'webhook';
    config: {
      // Email
      smtpServer?: string;
      smtpPort?: number;
      smtpUsername?: string;
      toAddress?: string;

      // Slack
      webhookURL?: string;

      // Webhook
      url?: string;
      method?: 'GET' | 'POST';
      headers?: Record<string, string>;
    };
  }>;
}
```

---

### 10.2 Create Notification Profile

```http
POST /api/v1/notificationProfiles
```

---

### 10.3 Delete Notification Profile

```http
DELETE /api/v1/notificationProfiles/{name}
```

---

### 10.4 Test Notification

```http
POST /api/v1/testNotificationProfile
```

**Request:**

```typescript
{
  profileName: string;
}
```

---

## WebSocket Events

### Connection

```
ws://localhost:{port}/api/v1/ws
```

### Event Types

#### 1. Task Progress

```typescript
{
  type: 'task-progress';
  taskID: string;
  status: 'RUNNING' | 'SUCCESS' | 'FAILED' | 'CANCELED';
  progress: {
    current: number;
    total: number;
    percentage: number;
  }
  counters: {
    hashed_files: number;
    hashed_bytes: number;
    cached_files: number;
    cached_bytes: number;
  }
}
```

#### 2. Snapshot Progress

```typescript
{
  type: "snapshot-progress";
  source: {
    userName: string;
    host: string;
    path: string;
  };
  status: "UPLOADING" | "IDLE" | "FAILED";
  upload: {
    hashedFiles: number;
    hashedBytes: number;
    estimatedBytes?: number;
    directory: string;
  };
}
```

#### 3. Error Notification

```typescript
{
  type: "error";
  message: string;
  details?: string;
}
```

#### 4. General Notification

```typescript
{
  type: 'notification';
  level: 'info' | 'warning' | 'error';
  message: string;
}
```

---

## Tauri Command Interface

All REST API calls are wrapped in Tauri commands for security and type safety.

### Command Naming Convention

```
{entity}_{action}
```

Examples: `repository_connect`, `snapshot_list`, `policy_update`

---

### Repository Commands

#### `repository_status`

```rust
#[tauri::command]
async fn repository_status() -> Result<RepositoryStatus, String>
```

#### `repository_connect`

```rust
#[tauri::command]
async fn repository_connect(config: RepositoryConnectRequest) -> Result<RepositoryStatus, String>
```

#### `repository_create`

```rust
#[tauri::command]
async fn repository_create(config: RepositoryCreateRequest) -> Result<String, String> // Returns initTaskID
```

#### `repository_disconnect`

```rust
#[tauri::command]
async fn repository_disconnect() -> Result<(), String>
```

#### `repository_update_description`

```rust
#[tauri::command]
async fn repository_update_description(description: String) -> Result<(), String>
```

#### `repository_exists`

```rust
#[tauri::command]
async fn repository_exists(storage: StorageConfig) -> Result<bool, String>
```

#### `repository_get_algorithms`

```rust
#[tauri::command]
async fn repository_get_algorithms() -> Result<AlgorithmsResponse, String>
```

---

### Snapshot Commands

#### `sources_list`

```rust
#[tauri::command]
async fn sources_list() -> Result<SourcesResponse, String>
```

#### `snapshot_create`

```rust
#[tauri::command]
async fn snapshot_create(path: String, user_name: Option<String>, host: Option<String>) -> Result<SourceInfo, String>
```

#### `snapshot_cancel`

```rust
#[tauri::command]
async fn snapshot_cancel(user_name: String, host: String, path: String) -> Result<(), String>
```

#### `snapshots_list`

```rust
#[tauri::command]
async fn snapshots_list(user_name: String, host: String, path: String, all: bool) -> Result<SnapshotsResponse, String>
```

#### `snapshot_edit`

```rust
#[tauri::command]
async fn snapshot_edit(manifest_ids: Vec<String>, description: Option<String>, add_pins: Option<Vec<String>>, remove_pins: Option<Vec<String>>) -> Result<(), String>
```

#### `snapshot_delete`

```rust
#[tauri::command]
async fn snapshot_delete(manifest_ids: Vec<String>) -> Result<u32, String>
```

---

### Object/Restore Commands

#### `object_browse`

```rust
#[tauri::command]
async fn object_browse(object_id: String) -> Result<DirectoryObject, String>
```

#### `object_download`

```rust
#[tauri::command]
async fn object_download(object_id: String, filename: String, target_path: String) -> Result<(), String>
```

#### `restore_start`

```rust
#[tauri::command]
async fn restore_start(request: RestoreRequest) -> Result<String, String> // Returns taskID
```

#### `mount_snapshot`

```rust
#[tauri::command]
async fn mount_snapshot(root: String) -> Result<String, String> // Returns mount path
```

#### `mounts_list`

```rust
#[tauri::command]
async fn mounts_list() -> Result<MountsResponse, String>
```

#### `mount_unmount`

```rust
#[tauri::command]
async fn mount_unmount(object_id: String) -> Result<(), String>
```

---

### Policy Commands

#### `policies_list`

```rust
#[tauri::command]
async fn policies_list() -> Result<PoliciesResponse, String>
```

#### `policy_get`

```rust
#[tauri::command]
async fn policy_get(user_name: Option<String>, host: Option<String>, path: Option<String>) -> Result<PolicyResponse, String>
```

#### `policy_resolve`

```rust
#[tauri::command]
async fn policy_resolve(user_name: Option<String>, host: Option<String>, path: Option<String>, updates: Option<PolicyDefinition>) -> Result<ResolvedPolicyResponse, String>
```

#### `policy_set`

```rust
#[tauri::command]
async fn policy_set(user_name: Option<String>, host: Option<String>, path: Option<String>, policy: PolicyDefinition) -> Result<(), String>
```

#### `policy_delete`

```rust
#[tauri::command]
async fn policy_delete(user_name: Option<String>, host: Option<String>, path: Option<String>) -> Result<(), String>
```

---

### Task Commands

#### `tasks_list`

```rust
#[tauri::command]
async fn tasks_list() -> Result<TasksResponse, String>
```

#### `task_get`

```rust
#[tauri::command]
async fn task_get(task_id: String) -> Result<TaskDetail, String>
```

#### `task_logs`

```rust
#[tauri::command]
async fn task_logs(task_id: String) -> Result<Vec<String>, String>
```

#### `task_cancel`

```rust
#[tauri::command]
async fn task_cancel(task_id: String) -> Result<(), String>
```

#### `tasks_summary`

```rust
#[tauri::command]
async fn tasks_summary() -> Result<TasksSummary, String>
```

---

### Maintenance Commands

#### `maintenance_info`

```rust
#[tauri::command]
async fn maintenance_info() -> Result<MaintenanceInfo, String>
```

#### `maintenance_run`

```rust
#[tauri::command]
async fn maintenance_run(full: bool, safety: Option<String>) -> Result<String, String> // Returns taskID
```

---

### Utility Commands

#### `current_user_get`

```rust
#[tauri::command]
async fn current_user_get() -> Result<CurrentUserResponse, String>
```

#### `path_resolve`

```rust
#[tauri::command]
async fn path_resolve(path: String) -> Result<SourceInfo, String>
```

#### `estimate_snapshot`

```rust
#[tauri::command]
async fn estimate_snapshot(root: String, max_examples: Option<u32>) -> Result<String, String> // Returns taskID
```

---

### Kopia Server Lifecycle Commands

#### `kopia_server_start`

```rust
#[tauri::command]
async fn kopia_server_start() -> Result<KopiaServerInfo, String>
```

**Response:**

```typescript
{
  serverUrl: string; // "http://localhost:51515"
  port: number;
  password: string; // Random password
  pid: number;
}
```

#### `kopia_server_stop`

```rust
#[tauri::command]
async fn kopia_server_stop() -> Result<(), String>
```

#### `kopia_server_status`

```rust
#[tauri::command]
async fn kopia_server_status() -> Result<KopiaServerStatus, String>
```

**Response:**

```typescript
{
  running: boolean;
  serverUrl?: string;
  port?: number;
  uptime?: number;               // Seconds
}
```

---

## Data Models

### Core Types

#### Source Identifier

```typescript
interface SourceInfo {
  userName: string; // e.g., "javi"
  host: string; // e.g., "laptop"
  path: string; // e.g., "/home/javi/Documents"
}
```

**String Format:** `userName@host:path`
Example: `javi@laptop:/home/javi/Documents`

---

#### Repository Status

```typescript
interface RepositoryStatus {
  connected: boolean;
  readonly?: boolean;
  description?: string;
  configFile?: string;
  storage?: string;
  encryption?: string;
  hash?: string;
  splitter?: string;
  formatVersion?: string;
  username?: string;
  hostname?: string;
  apiServerURL?: string;
  initTaskID?: string;
  ecc?: string;
  eccOverheadPercent?: number;
  supportsContentCompression?: boolean;
}
```

---

#### Storage Configuration

```typescript
interface StorageConfig {
  type: 'filesystem' | 's3' | 'gcs' | 'azureBlob' | 'b2' | 'sftp' | 'webdav' | 'rclone';

  // Filesystem
  path?: string;

  // S3
  bucket?: string;
  endpoint?: string;
  accessKeyID?: string;
  secretAccessKey?: string;
  sessionToken?: string;
  region?: string;

  // GCS
  bucket?: string;
  credentialsFile?: string;

  // Azure
  container?: string;
  storageAccount?: string;
  storageKey?: string;

  // B2
  bucket?: string;
  keyID?: string;
  key?: string;

  // SFTP
  host?: string;
  port?: number;
  username?: string;
  password?: string;
  keyfile?: string;
  knownHostsFile?: string;

  // WebDAV
  url?: string;
  username?: string;
  password?: string;
}
```

---

#### Policy Definition

```typescript
interface PolicyDefinition {
  retention?: {
    keepLatest?: number; // Keep N most recent
    keepHourly?: number; // Keep one per hour for N hours
    keepDaily?: number; // Keep one per day for N days
    keepWeekly?: number; // Keep one per week for N weeks
    keepMonthly?: number; // Keep one per month for N months
    keepAnnual?: number; // Keep one per year for N years
  };

  scheduling?: {
    interval?: string; // e.g., "24h", "4h", "30m"
    timeOfDay?: Array<{
      hour: number; // 0-23
      min: number; // 0-59
    }>;
    manual?: boolean; // Disable automatic snapshots
  };

  files?: {
    ignore?: string[]; // Glob patterns to exclude
    ignoreDotFiles?: string[]; // Specific .dotfiles to exclude
    scanOneFilesystem?: boolean; // Don't cross filesystem boundaries
    noParentIgnore?: boolean; // Ignore parent .kopiaignore files
  };

  compression?: {
    compressorName?: string; // "gzip", "zstd", "s2", "none"
    minSize?: number; // Min file size to compress (bytes)
    maxSize?: number; // Max file size to compress (bytes)
    onlyCompress?: string[]; // Only compress these extensions
    neverCompress?: string[]; // Never compress these extensions
  };

  actions?: {
    beforeSnapshotRoot?: ActionDefinition;
    afterSnapshotRoot?: ActionDefinition;
    beforeFolder?: ActionDefinition;
    afterFolder?: ActionDefinition;
  };

  errorHandling?: {
    ignoreFileErrors?: boolean;
    ignoreDirectoryErrors?: boolean;
  };

  upload?: {
    maxParallelSnapshots?: number;
    maxParallelFileReads?: number;
  };

  logging?: {
    directories?: {
      snapshotted?: string; // "none", "minimal", "normal", "verbose"
      ignored?: string;
    };
    entries?: {
      snapshotted?: string;
      ignored?: string;
      cacheHit?: string;
      cacheMiss?: string;
    };
  };
}

interface ActionDefinition {
  script: string; // Shell command
  timeout: number; // Seconds
  mode: 'essential' | 'optional' | 'async';
}
```

---

#### Snapshot

```typescript
interface Snapshot {
  id: string; // Manifest ID
  rootID: string; // Root object ID
  startTime: string; // RFC3339
  endTime?: string;
  description?: string;
  pins?: string[];
  retention?: string[];
  incomplete?: boolean;
  summary?: SnapshotSummary;
  rootEntry?: string;
}

interface SnapshotSummary {
  size: number;
  files: number;
  dirs: number;
  symlinks?: number;
  errors?: number;
  errorCount?: number;
  ignoredErrorCount?: number;
  numFailed?: number;
  totalFileSize?: number;
  excludedFileCount?: number;
  excludedTotalFileSize?: number;
  excludedDirCount?: number;
}
```

---

#### Directory Entry

```typescript
interface DirectoryEntry {
  name: string;
  type: 'f' | 'd' | 's' | 'c' | 'b' | 'p'; // file, dir, symlink, char, block, pipe
  mode: number; // Unix permissions (octal)
  size: number;
  mtime: string; // RFC3339
  obj: string; // Object ID
  summ?: {
    size: number;
    files: number;
    dirs: number;
    errors?: number;
    maxTime?: string;
  };
  linkTarget?: string; // For symlinks
}

interface DirectoryObject {
  stream: 'kopia:directory';
  entries: DirectoryEntry[];
}
```

---

#### Task

```typescript
interface Task {
  id: string;
  kind: string;
  description: string;
  status: 'RUNNING' | 'SUCCESS' | 'FAILED' | 'CANCELED';
  startTime: string;
  endTime?: string;
  progress?: {
    current: number;
    total: number;
    percentage: number;
  };
}

interface TaskDetail extends Task {
  counters?: Record<string, number>;
  logs?: string[];
}

interface TasksSummary {
  running: number;
  success: number;
  failed: number;
  canceled: number;
}
```

---

## Validation Rules

### Password Validation

```typescript
RepositoryPasswordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .regex(/[A-Z]/, 'Must contain uppercase letter')
  .regex(/[a-z]/, 'Must contain lowercase letter')
  .regex(/[0-9]/, 'Must contain number');
```

### Path Validation

```typescript
FilePathSchema = z
  .string()
  .min(1, 'Path cannot be empty')
  .refine((path) => !path.includes('..'), 'Path cannot contain ..');
```

### Interval Validation

```typescript
IntervalSchema = z.string().regex(/^\d+[hdm]$/, 'Format: <number><h|d|m> (e.g., 24h, 30m)');
```

### Retention Validation

```typescript
RetentionSchema = z.object({
  keepLatest: z.number().int().positive().optional(),
  keepHourly: z.number().int().nonnegative().optional(),
  keepDaily: z.number().int().nonnegative().optional(),
  keepWeekly: z.number().int().nonnegative().optional(),
  keepMonthly: z.number().int().nonnegative().optional(),
  keepAnnual: z.number().int().nonnegative().optional(),
});
```

---

## Error Handling

### Error Response Format

```typescript
interface ErrorResponse {
  error: string; // Error message
  code?: string; // Error code (e.g., "INVALID_PASSWORD")
  details?: string; // Additional details
}
```

### Common Error Codes

| Code                   | HTTP | Description                    |
| ---------------------- | ---- | ------------------------------ |
| `INVALID_PASSWORD`     | 401  | Incorrect repository password  |
| `REPOSITORY_NOT_FOUND` | 404  | Repository does not exist      |
| `REPOSITORY_EXISTS`    | 409  | Repository already exists      |
| `NOT_CONNECTED`        | 400  | Not connected to repository    |
| `INVALID_CONFIG`       | 400  | Invalid storage configuration  |
| `TASK_NOT_FOUND`       | 404  | Task ID not found              |
| `OBJECT_NOT_FOUND`     | 404  | Object ID not found            |
| `SERVER_NOT_RUNNING`   | 503  | Kopia server not started       |
| `CONNECTION_FAILED`    | 500  | Cannot connect to Kopia server |

### Frontend Error Handling Pattern

```typescript
try {
  const result = await invoke('repository_connect', { config });
} catch (error) {
  if (error.includes('INVALID_PASSWORD')) {
    toast.error(t('errors.invalidPassword'));
  } else if (error.includes('REPOSITORY_NOT_FOUND')) {
    toast.error(t('errors.repositoryNotFound'));
  } else {
    toast.error(t('errors.generic', { message: error }));
  }
}
```

---

## Testing Strategy

### Unit Tests

#### Validation Schemas

```typescript
describe('RepositoryPasswordSchema', () => {
  it('accepts strong password', () => {
    expect(RepositoryPasswordSchema.parse('SecurePass123')).toBe('SecurePass123');
  });

  it('rejects weak password', () => {
    expect(() => RepositoryPasswordSchema.parse('weak')).toThrow();
  });
});
```

#### API Client Functions

```typescript
describe('connectRepository', () => {
  it('calls correct Tauri command', async () => {
    const mockInvoke = vi.fn().mockResolvedValue({ connected: true });
    global.invoke = mockInvoke;

    await connectRepository({ type: 'filesystem', path: '/repo', password: 'pass' });

    expect(mockInvoke).toHaveBeenCalledWith('repository_connect', {
      config: { type: 'filesystem', path: '/repo', password: 'pass' },
    });
  });
});
```

---

### Integration Tests

#### Repository Connection Flow

```typescript
describe('Repository Connection', () => {
  it('connects to filesystem repository', async () => {
    render(<App />);

    await userEvent.click(screen.getByText('Connect Repository'));
    await userEvent.selectOptions(screen.getByLabelText('Storage Type'), 'filesystem');
    await userEvent.type(screen.getByLabelText('Path'), '/backup/repo');
    await userEvent.type(screen.getByLabelText('Password'), 'SecurePass123');
    await userEvent.click(screen.getByText('Connect'));

    await waitFor(() => {
      expect(screen.getByText('Connected')).toBeInTheDocument();
    });
  });
});
```

---

### E2E Tests (Playwright)

#### Critical User Journey

```typescript
test('create snapshot and restore', async ({ page }) => {
  // Connect to repository
  await page.goto('/');
  await page.click('text=Connect Repository');
  await page.fill('[name="path"]', '/backup/repo');
  await page.fill('[name="password"]', 'SecurePass123');
  await page.click('button:has-text("Connect")');
  await page.waitForSelector('text=Connected');

  // Create snapshot
  await page.click('text=Snapshots');
  await page.click('text=Snapshot Now');
  await page.fill('[name="path"]', '/home/user/documents');
  await page.click('button:has-text("Create")');
  await page.waitForSelector('text=Snapshot complete', { timeout: 60000 });

  // Browse snapshot
  await page.click('text=Browse');
  await expect(page.locator('.file-list')).toBeVisible();

  // Restore file
  await page.click('.file-item:has-text("document.txt")');
  await page.click('text=Restore');
  await page.fill('[name="targetPath"]', '/tmp/restore');
  await page.click('button:has-text("Restore")');
  await page.waitForSelector('text=Restore complete', { timeout: 60000 });
});
```

---

## Implementation Priority

### Phase 1: Foundation (Week 1)

1. ✅ Project setup (already done)
2. Kopia server lifecycle (Rust backend)
3. Basic REST API client (TypeScript)
4. Repository status + connection UI
5. Unit tests for validation schemas

### Phase 2: Core Features (Week 2-3)

1. Snapshot sources list + creation
2. Snapshot history + browsing
3. Policy list + editing
4. Task monitoring
5. Integration tests for core workflows

### Phase 3: Advanced Features (Week 4)

1. Restore operations
2. Mount snapshots
3. Maintenance operations
4. Notifications
5. E2E tests for critical paths

### Phase 4: Polish (Week 5+)

1. WebSocket real-time updates
2. System tray integration
3. Performance optimization
4. Error logging/monitoring
5. Accessibility improvements

---

## API Coverage Checklist

### Repository Management

- [ ] `/api/v1/repo/status` - Get status
- [ ] `/api/v1/repo/connect` - Connect to repository
- [ ] `/api/v1/repo/create` - Create new repository
- [ ] `/api/v1/repo/disconnect` - Disconnect
- [ ] `/api/v1/repo/description` - Update description
- [ ] `/api/v1/repo/exists` - Check existence
- [ ] `/api/v1/repo/algorithms` - Get algorithms

### Snapshots

- [ ] `/api/v1/sources` - List all sources
- [ ] `/api/v1/sources` (POST) - Create snapshot
- [ ] `/api/v1/sources/cancel` - Cancel snapshot
- [ ] `/api/v1/snapshots` - List snapshots
- [ ] `/api/v1/snapshots/edit` - Edit snapshot
- [ ] `/api/v1/snapshots/delete` - Delete snapshots

### Objects & Restore

- [ ] `/api/v1/objects/{id}` - Browse directory
- [ ] `/api/v1/objects/{id}?fname=` - Download file
- [ ] `/api/v1/restore` - Restore files
- [ ] `/api/v1/mounts` - Mount snapshot
- [ ] `/api/v1/mounts` (GET) - List mounts
- [ ] `/api/v1/mounts/{id}` (DELETE) - Unmount

### Policies

- [ ] `/api/v1/policies` - List all policies
- [ ] `/api/v1/policy` (GET) - Get policy
- [ ] `/api/v1/policy/resolve` - Resolve effective policy
- [ ] `/api/v1/policy` (PUT) - Set policy
- [ ] `/api/v1/policy` (DELETE) - Delete policy

### Tasks

- [ ] `/api/v1/tasks` - List tasks
- [ ] `/api/v1/tasks/{id}` - Get task details
- [ ] `/api/v1/tasks/{id}/logs` - Get logs
- [ ] `/api/v1/tasks/{id}/cancel` - Cancel task
- [ ] `/api/v1/tasks-summary` - Get summary

### Maintenance

- [ ] `/api/v1/repo/maintenance/info` - Get info
- [ ] `/api/v1/repo/maintenance/run` - Run maintenance

### Utilities

- [ ] `/api/v1/current-user` - Get current user
- [ ] `/api/v1/paths/resolve` - Resolve path
- [ ] `/api/v1/estimate` - Estimate snapshot
- [ ] `/api/v1/cli` - Get CLI command
- [ ] `/api/v1/ui-preferences` (GET/PUT) - Preferences

### WebSocket

- [ ] `ws://localhost:{port}/api/v1/ws` - WebSocket connection
- [ ] Task progress events
- [ ] Snapshot progress events
- [ ] Error notifications

### Tauri Commands

- [ ] Kopia server lifecycle (start, stop, status)
- [ ] All REST endpoints wrapped as commands
- [ ] Type-safe request/response structs

---

## Notes

- All timestamps are RFC3339 format (`2024-01-28T12:00:00Z`)
- All byte sizes are in bytes (convert to KB/MB/GB for display)
- Object IDs start with `k` (e.g., `k123abc...`)
- Source identifiers use format `userName@host:path`
- Empty strings in policy targets = wildcards (`*`)
- All arrays may be empty (no `null`)
- Optional fields may be `null` or omitted

---

**End of Specification**
