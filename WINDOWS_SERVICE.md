# Windows Service Implementation

This document describes the Windows service implementation for Kopia Desktop.

## Overview

Kopia Desktop can run as a Windows system service, allowing the Kopia backup server to start automatically with your computer and run in the background without requiring a user to be logged in.

## Architecture

```
┌─────────────────────────────────────────────────┐
│          GUI Application (User Session)          │
│  - React Frontend                                │
│  - Service Management UI (Preferences page)      │
│  - Status monitoring (real-time polling)         │
└────────────┬────────────────────────────────────┘
             │ Named Pipe IPC
             │ (\\.\pipe\kopia-desktop-service)
             │ - JSON message protocol
             │ - Windows ACL security
             ↓
┌─────────────────────────────────────────────────┐
│    Windows Service (LocalSystem Account)        │
│  - Service name: KopiaDesktopService            │
│  - Auto-starts on boot                          │
│  - Manages Kopia server process                 │
│  - Handles IPC requests from GUI                │
└────────────┬────────────────────────────────────┘
             │ Process Spawn
             │ - Fixed port (51515)
             │ - Session password
             ↓
┌─────────────────────────────────────────────────┐
│            Kopia Server (Embedded)               │
│  - HTTPS API (localhost:51515)                  │
│  - TLS with self-signed certificate             │
│  - Config: %ProgramData%\Kopia Desktop\config   │
└─────────────────────────────────────────────────┘
```

## Components

### Backend (Rust)

#### 1. `windows_service.rs`

Service lifecycle management:

- `install_service()` - Register service with Windows SCM
- `uninstall_service()` - Remove service from system
- `start_service()` - Start the service
- `stop_service()` - Stop the service
- `query_service_status()` - Get current service state
- `run_service()` - Main service entry point (called with `--service` flag)

Configuration:

- Service name: `KopiaDesktopService`
- Display name: `Kopia Desktop Service`
- Start type: Automatic
- Account: LocalSystem
- Config directory: `%ProgramData%\Kopia Desktop\config`

#### 2. `windows_ipc.rs`

Named pipe IPC implementation:

- **Server**: `run_pipe_server()` - Accept connections from GUI
- **Client**: `PipeClient` - Connect to service from GUI
- **Protocol**: JSON messages (`ServiceMessage` / `ServiceResponse`)

Message types:

- `GetStatus` - Query server status
- `GetServerInfo` - Get connection details
- `StopService` - Request service shutdown

#### 3. `commands/windows_service.rs`

Tauri commands for GUI integration:

- `service_install()` - Install the service
- `service_uninstall()` - Uninstall the service
- `service_start()` - Start the service
- `service_stop()` - Stop the service
- `service_status()` - Query service status

### Frontend (React/TypeScript)

#### `WindowsServiceManager.tsx`

Complete service management UI:

- Real-time status monitoring (3-second polling)
- Install/Uninstall dialogs with UAC warnings
- Start/Stop controls
- Status badges (Running, Stopped, NotInstalled, etc.)
- Automatic detection of Windows platform
- Error handling with elevation hints

Features:

- Shows service status badge with color coding
- Disabled controls when service is in transition
- UAC elevation warnings in dialogs
- Integrated into Preferences page (System section)

#### Translation Keys

Full i18n support in English and Spanish:

- Service UI labels and descriptions
- Status messages
- Error messages with troubleshooting hints
- Installation/uninstallation warnings

## Installation & Usage

### From GUI (Recommended)

1. **Open Preferences**:
   - Navigate to Preferences → System → Windows Service

2. **Install Service**:
   - Click "Install Service" button
   - Confirm installation in dialog
   - **Important**: You must run the application as administrator (Right-click → Run as administrator)
   - Service will be registered and set to auto-start

3. **Start Service**:
   - Click "Start Service" button
   - Service starts and spawns Kopia server
   - Status updates automatically

4. **Monitor Status**:
   - Status badge shows current state
   - Real-time updates every 3 seconds

### Manual Installation (PowerShell as Administrator)

```powershell
# Run the application as administrator
# The service commands require elevation

# Install and configure service
# (Use GUI Preferences for easier management)

# Query service status
sc query KopiaDesktopService

# Start service manually
sc start KopiaDesktopService

# Stop service manually
sc stop KopiaDesktopService

# Uninstall service
# (Use GUI Preferences for proper cleanup)
```

### Verify Installation

```powershell
# Check if service exists
sc query KopiaDesktopService

# View service configuration
sc qc KopiaDesktopService

# Check Windows Event Viewer for service logs
eventvwr.msc
# Navigate to: Windows Logs → Application
# Filter by source: KopiaDesktopService
```

## Security Considerations

### Administrator Privileges

- Service installation/uninstallation requires administrator rights
- The GUI application must be run as administrator for these operations
- Start/stop operations may work without elevation (depends on service ACL)

### Named Pipe Security

- Pipe name: `\\.\pipe\kopia-desktop-service`
- Default Windows ACLs apply (authenticated users)
- JSON message protocol (no credentials over pipe)
- Localhost-only communication

### Service Account

- Runs as LocalSystem (high privileges)
- Kopia server inherits LocalSystem privileges
- Repository access based on LocalSystem permissions
- Consider this when configuring storage locations

## Configuration

### Service Mode

When running as a service:

- Config directory: `%ProgramData%\Kopia Desktop\config\kopia-desktop.config`
- Kopia binary: Bundled with application
- Port: 51515 (default, configurable)
- TLS: Self-signed certificate (auto-generated)

### GUI Mode (Comparison)

When running normally (not as service):

- Config directory: `%APPDATA%\kopia\kopia-desktop.config`
- Server spawned by GUI process
- Random port assignment
- Server stops when GUI closes

## Troubleshooting

### Service Won't Install

**Error**: "Access denied" or "requires elevation"

**Solution**:

1. Close Kopia Desktop
2. Right-click application → "Run as administrator"
3. Open Preferences → System → Windows Service
4. Try installation again

### Service Won't Start

**Check**:

```powershell
# View service status and errors
sc query KopiaDesktopService

# Check Windows Event Viewer
eventvwr.msc
```

**Common causes**:

- Kopia binary missing or corrupted
- Port 51515 already in use
- Configuration directory inaccessible
- Repository connection issues

### Service Stuck in "Starting" or "Stopping"

```powershell
# Force stop (use with caution)
sc stop KopiaDesktopService

# If that fails, restart Windows Services
services.msc
# Right-click "Services" → Restart
```

### GUI Can't Connect to Service

**Check**:

1. Service is actually running: `sc query KopiaDesktopService`
2. Named pipe exists: GUI will show "NotInstalled" if pipe unavailable
3. Check Windows Firewall (unlikely, as localhost-only)

## Development Notes

### Testing on Linux

Service code is Windows-only and uses conditional compilation:

```rust
#[cfg(windows)]
mod windows_service;
```

On non-Windows platforms:

- Service commands return `UnsupportedPlatform` error
- UI component automatically hides
- Build succeeds with stub implementations

### Adding Service Features

To add new IPC commands:

1. Add message variant to `ServiceMessage` enum in `windows_service.rs`
2. Add response variant to `ServiceResponse` enum
3. Handle message in `handle_pipe_client()` in `windows_ipc.rs`
4. Add Tauri command in `commands/windows_service.rs`
5. Update UI in `WindowsServiceManager.tsx`

### Debugging

```rust
// Service logs go to Windows Event Log
log::info!("Service message");
log::error!("Service error: {}", err);
```

View logs in Event Viewer:

- Source: Application
- Look for "kopia-desktop" entries

## Limitations

1. **Single Service Instance**: Only one instance can run at a time
2. **Administrator Required**: Install/uninstall require elevation
3. **Windows Only**: Not available on macOS/Linux
4. **Fixed Port**: Service uses port 51515 (GUI uses random port)
5. **LocalSystem Account**: Service has high privileges (security consideration)

## Future Enhancements

Potential improvements:

1. **Automatic Elevation**: Use COM elevation or RunAs for automatic UAC prompts
2. **Service Installer**: Separate MSI installer that handles service installation
3. **Multiple Profiles**: Support multiple Kopia configurations in service mode
4. **Remote Management**: Optional remote access with authentication
5. **Logging**: Enhanced logging to dedicated log files
6. **Monitoring**: Health checks and automatic restart on failure

## Files Reference

### Backend

- `src-tauri/src/windows_service.rs` - Service lifecycle (400+ lines)
- `src-tauri/src/windows_ipc.rs` - Named pipe IPC (350+ lines)
- `src-tauri/src/commands/windows_service.rs` - Tauri commands (120+ lines)
- `src-tauri/src/main.rs` - Dual-mode entry point

### Frontend

- `src/components/kopia/WindowsServiceManager.tsx` - UI component (350+ lines)
- `src/pages/Preferences.tsx` - Integration point
- `src/lib/i18n/locales/en.json` - English translations
- `src/lib/i18n/locales/es.json` - Spanish translations

### Documentation

- `CLAUDE.md` - Updated with service architecture
- `WINDOWS_SERVICE.md` - This document

## Support

For issues or questions:

1. Check this documentation first
2. Review Windows Event Viewer logs
3. Test with `sc query` commands
4. Open issue at https://github.com/anthropics/claude-code/issues
