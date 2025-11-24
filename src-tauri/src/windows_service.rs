//! Windows Service Implementation for Kopia Desktop
//!
//! This module provides Windows service functionality for running Kopia server
//! as a system service that starts automatically and runs independently of the GUI.
//!
//! # Architecture
//!
//! ```text
//! GUI Application (User Session)
//!     ↓ Named Pipe IPC
//! Windows Service (System Session, LocalSystem)
//!     ↓ Process Spawn
//! Kopia Server (Embedded Binary)
//! ```
//!
//! # Communication
//!
//! - **Named Pipe**: `\\.\pipe\kopia-desktop-service`
//! - **Protocol**: JSON messages over named pipe
//! - **Security**: Authenticated via Windows security (pipe ACLs)
//!
//! # Service Lifecycle
//!
//! 1. Service starts → Spawns Kopia server
//! 2. Service running → Accepts IPC commands from GUI
//! 3. Service stops → Gracefully terminates Kopia server

#[cfg(windows)]
use crate::error::{KopiaError, Result};
#[cfg(windows)]
use crate::kopia_server::KopiaServer;
#[cfg(windows)]
use serde::{Deserialize, Serialize};
#[cfg(windows)]
use std::ffi::OsString;
#[cfg(windows)]
use std::sync::{Arc, Mutex};
#[cfg(windows)]
use std::time::Duration;
#[cfg(windows)]
use windows_service::service::{
    ServiceControl, ServiceControlAccept, ServiceExitCode, ServiceState, ServiceStatus, ServiceType,
};
#[cfg(windows)]
use windows_service::service_control_handler::{self, ServiceControlHandlerResult};

#[cfg(windows)]
const SERVICE_NAME: &str = "KopiaDesktopService";
#[cfg(windows)]
const SERVICE_DISPLAY_NAME: &str = "Kopia Desktop Service";
#[cfg(windows)]
const SERVICE_DESCRIPTION: &str = "Manages Kopia backup server for Kopia Desktop application";
#[cfg(windows)]
const PIPE_NAME: &str = r"\\.\pipe\kopia-desktop-service";

/// IPC message types for service communication
#[cfg(windows)]
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "type")]
pub enum ServiceMessage {
    /// Get server status
    GetStatus,
    /// Get server info (URL, credentials)
    GetServerInfo,
    /// Stop the service gracefully
    StopService,
}

/// IPC response types
#[cfg(windows)]
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "type")]
pub enum ServiceResponse {
    /// Server status response
    Status {
        running: bool,
        server_url: Option<String>,
        port: Option<u16>,
        uptime: Option<u64>,
    },
    /// Server info response (credentials for HTTP client)
    ServerInfo {
        server_url: String,
        port: u16,
        http_password: String,
    },
    /// Success response
    Success { message: String },
    /// Error response
    Error { message: String },
}

/// Windows service entry point
#[cfg(windows)]
pub fn run_service() -> Result<()> {
    windows_service::service_dispatcher::start(SERVICE_NAME, ffi_service_main).map_err(|e| {
        KopiaError::InternalError {
            message: format!("Failed to start service dispatcher: {}", e),
            details: None,
        }
    })
}

/// Service main function (called by Windows Service Control Manager)
#[cfg(windows)]
fn ffi_service_main(_arguments: Vec<OsString>) {
    if let Err(e) = service_main() {
        log::error!("Service main error: {}", e);
    }
}

/// Service main logic
#[cfg(windows)]
fn service_main() -> Result<()> {
    // Create Kopia server instance
    let kopia_server = Arc::new(Mutex::new(KopiaServer::new()));
    let kopia_server_clone = Arc::clone(&kopia_server);

    // Define service control handler
    let event_handler = move |control_event| -> ServiceControlHandlerResult {
        match control_event {
            ServiceControl::Stop | ServiceControl::Shutdown => {
                log::info!("Service stop requested");
                // Stop Kopia server
                if let Ok(mut server) = kopia_server_clone.lock() {
                    let _ = server.stop();
                }
                ServiceControlHandlerResult::NoError
            }
            ServiceControl::Interrogate => ServiceControlHandlerResult::NoError,
            _ => ServiceControlHandlerResult::NotImplemented,
        }
    };

    // Register service control handler
    let status_handle =
        service_control_handler::register(SERVICE_NAME, event_handler).map_err(|e| {
            KopiaError::InternalError {
                message: format!("Failed to register service control handler: {}", e),
                details: None,
            }
        })?;

    // Tell Windows we're starting
    status_handle
        .set_service_status(ServiceStatus {
            service_type: ServiceType::OWN_PROCESS,
            current_state: ServiceState::StartPending,
            controls_accepted: ServiceControlAccept::empty(),
            exit_code: ServiceExitCode::Win32(0),
            checkpoint: 0,
            wait_hint: Duration::from_secs(3),
            process_id: None,
        })
        .map_err(|e| KopiaError::InternalError {
            message: format!("Failed to set service status to StartPending: {}", e),
            details: None,
        })?;

    // Start Kopia server
    log::info!("Starting Kopia server from service");
    {
        let mut server = kopia_server.lock().map_err(|e| KopiaError::InternalError {
            message: format!("Failed to lock Kopia server: {}", e),
            details: None,
        })?;

        let config_dir = get_service_config_dir()?;
        let _info = server.start(&config_dir)?;
        log::info!("Kopia server started successfully");
    }

    // Tell Windows we're running
    status_handle
        .set_service_status(ServiceStatus {
            service_type: ServiceType::OWN_PROCESS,
            current_state: ServiceState::Running,
            controls_accepted: ServiceControlAccept::STOP | ServiceControlAccept::SHUTDOWN,
            exit_code: ServiceExitCode::Win32(0),
            checkpoint: 0,
            wait_hint: Duration::default(),
            process_id: None,
        })
        .map_err(|e| KopiaError::InternalError {
            message: format!("Failed to set service status to Running: {}", e),
            details: None,
        })?;

    log::info!("Service is now running, starting IPC server");

    // Start IPC server (blocking)
    if let Err(e) = run_ipc_server(Arc::clone(&kopia_server)) {
        log::error!("IPC server error: {}", e);
    }

    // Tell Windows we're stopping
    status_handle
        .set_service_status(ServiceStatus {
            service_type: ServiceType::OWN_PROCESS,
            current_state: ServiceState::StopPending,
            controls_accepted: ServiceControlAccept::empty(),
            exit_code: ServiceExitCode::Win32(0),
            checkpoint: 0,
            wait_hint: Duration::from_secs(5),
            process_id: None,
        })
        .map_err(|e| KopiaError::InternalError {
            message: format!("Failed to set service status to StopPending: {}", e),
            details: None,
        })?;

    // Stop Kopia server
    log::info!("Stopping Kopia server");
    {
        let mut server = kopia_server.lock().map_err(|e| KopiaError::InternalError {
            message: format!("Failed to lock Kopia server: {}", e),
            details: None,
        })?;
        server.stop()?;
    }

    // Tell Windows we've stopped
    status_handle
        .set_service_status(ServiceStatus {
            service_type: ServiceType::OWN_PROCESS,
            current_state: ServiceState::Stopped,
            controls_accepted: ServiceControlAccept::empty(),
            exit_code: ServiceExitCode::Win32(0),
            checkpoint: 0,
            wait_hint: Duration::default(),
            process_id: None,
        })
        .map_err(|e| KopiaError::InternalError {
            message: format!("Failed to set service status to Stopped: {}", e),
            details: None,
        })?;

    log::info!("Service stopped successfully");
    Ok(())
}

/// Run IPC server (named pipe server)
#[cfg(windows)]
fn run_ipc_server(kopia_server: Arc<Mutex<KopiaServer>>) -> Result<()> {
    crate::windows_ipc::run_pipe_server(kopia_server)
}

/// Get configuration directory for service (runs as SYSTEM)
#[cfg(windows)]
fn get_service_config_dir() -> Result<String> {
    // Service runs as LocalSystem, use ProgramData instead of user profile
    let program_data = std::env::var("ProgramData").map_err(|_| KopiaError::EnvironmentError {
        message: "ProgramData environment variable not found".to_string(),
    })?;

    let config_path = std::path::PathBuf::from(program_data)
        .join("Kopia Desktop")
        .join("config");

    // Ensure directory exists
    std::fs::create_dir_all(&config_path).map_err(|e| KopiaError::IoError {
        message: format!("Failed to create config directory: {}", e),
        path: Some(config_path.display().to_string()),
    })?;

    config_path
        .to_str()
        .map(String::from)
        .ok_or_else(|| KopiaError::InternalError {
            message: "Config path contains invalid UTF-8".to_string(),
            details: None,
        })
}

/// Install the Windows service
#[cfg(windows)]
pub fn install_service() -> Result<()> {
    use std::ffi::OsStr;
    use windows_service::service::{
        ServiceAccess, ServiceErrorControl, ServiceInfo, ServiceStartType,
    };
    use windows_service::service_manager::{ServiceManager, ServiceManagerAccess};

    let manager = ServiceManager::local_computer(
        None::<&str>,
        ServiceManagerAccess::CREATE_SERVICE | ServiceManagerAccess::CONNECT,
    )
    .map_err(|e| KopiaError::InternalError {
        message: format!("Failed to open service manager: {}", e),
        details: None,
    })?;

    let service_binary_path = std::env::current_exe().map_err(|e| KopiaError::InternalError {
        message: format!("Failed to get current executable path: {}", e),
        details: None,
    })?;

    let service_info = ServiceInfo {
        name: OsString::from(SERVICE_NAME),
        display_name: OsString::from(SERVICE_DISPLAY_NAME),
        service_type: ServiceType::OWN_PROCESS,
        start_type: ServiceStartType::AutoStart,
        error_control: ServiceErrorControl::Normal,
        executable_path: service_binary_path,
        launch_arguments: vec![OsString::from("--service")],
        dependencies: vec![],
        account_name: None, // Run as LocalSystem
        account_password: None,
    };

    let _service = manager
        .create_service(&service_info, ServiceAccess::CHANGE_CONFIG)
        .map_err(|e| KopiaError::InternalError {
            message: format!("Failed to create service: {}", e),
            details: Some(format!(
                "Make sure you're running as administrator and the service is not already installed"
            )),
        })?;

    log::info!("Service installed successfully");
    Ok(())
}

/// Uninstall the Windows service
#[cfg(windows)]
pub fn uninstall_service() -> Result<()> {
    use windows_service::service::ServiceAccess;
    use windows_service::service_manager::{ServiceManager, ServiceManagerAccess};

    let manager = ServiceManager::local_computer(None::<&str>, ServiceManagerAccess::CONNECT)
        .map_err(|e| KopiaError::InternalError {
            message: format!("Failed to open service manager: {}", e),
            details: None,
        })?;

    let service = manager
        .open_service(SERVICE_NAME, ServiceAccess::DELETE | ServiceAccess::STOP)
        .map_err(|e| KopiaError::InternalError {
            message: format!("Failed to open service: {}", e),
            details: Some("Make sure you're running as administrator".to_string()),
        })?;

    // Try to stop the service first (ignore errors if already stopped)
    let _ = service.stop();

    service.delete().map_err(|e| KopiaError::InternalError {
        message: format!("Failed to delete service: {}", e),
        details: None,
    })?;

    log::info!("Service uninstalled successfully");
    Ok(())
}

/// Start the Windows service
#[cfg(windows)]
pub fn start_service() -> Result<()> {
    use windows_service::service::ServiceAccess;
    use windows_service::service_manager::{ServiceManager, ServiceManagerAccess};

    let manager = ServiceManager::local_computer(None::<&str>, ServiceManagerAccess::CONNECT)
        .map_err(|e| KopiaError::InternalError {
            message: format!("Failed to open service manager: {}", e),
            details: None,
        })?;

    let service = manager
        .open_service(SERVICE_NAME, ServiceAccess::START)
        .map_err(|e| KopiaError::InternalError {
            message: format!("Failed to open service: {}", e),
            details: None,
        })?;

    service
        .start(&[] as &[&OsStr])
        .map_err(|e| KopiaError::InternalError {
            message: format!("Failed to start service: {}", e),
            details: None,
        })?;

    log::info!("Service started successfully");
    Ok(())
}

/// Stop the Windows service
#[cfg(windows)]
pub fn stop_service() -> Result<()> {
    use windows_service::service::ServiceAccess;
    use windows_service::service_manager::{ServiceManager, ServiceManagerAccess};

    let manager = ServiceManager::local_computer(None::<&str>, ServiceManagerAccess::CONNECT)
        .map_err(|e| KopiaError::InternalError {
            message: format!("Failed to open service manager: {}", e),
            details: None,
        })?;

    let service = manager
        .open_service(SERVICE_NAME, ServiceAccess::STOP)
        .map_err(|e| KopiaError::InternalError {
            message: format!("Failed to open service: {}", e),
            details: None,
        })?;

    service.stop().map_err(|e| KopiaError::InternalError {
        message: format!("Failed to stop service: {}", e),
        details: None,
    })?;

    log::info!("Service stopped successfully");
    Ok(())
}

/// Query service status
#[cfg(windows)]
pub fn query_service_status() -> Result<ServiceState> {
    use windows_service::service::ServiceAccess;
    use windows_service::service_manager::{ServiceManager, ServiceManagerAccess};

    let manager = ServiceManager::local_computer(None::<&str>, ServiceManagerAccess::CONNECT)
        .map_err(|e| KopiaError::InternalError {
            message: format!("Failed to open service manager: {}", e),
            details: None,
        })?;

    let service = manager
        .open_service(SERVICE_NAME, ServiceAccess::QUERY_STATUS)
        .map_err(|e| KopiaError::InternalError {
            message: format!("Failed to open service: {}", e),
            details: Some("Service may not be installed".to_string()),
        })?;

    let status = service
        .query_status()
        .map_err(|e| KopiaError::InternalError {
            message: format!("Failed to query service status: {}", e),
            details: None,
        })?;

    Ok(status.current_state)
}

// Non-Windows stub implementations
#[cfg(not(windows))]
pub fn run_service() -> crate::error::Result<()> {
    Err(crate::error::KopiaError::UnsupportedPlatform {
        feature: "Windows service".to_string(),
        platform: std::env::consts::OS.to_string(),
    })
}

#[cfg(not(windows))]
pub fn install_service() -> crate::error::Result<()> {
    Err(crate::error::KopiaError::UnsupportedPlatform {
        feature: "Windows service".to_string(),
        platform: std::env::consts::OS.to_string(),
    })
}

#[cfg(not(windows))]
pub fn uninstall_service() -> crate::error::Result<()> {
    Err(crate::error::KopiaError::UnsupportedPlatform {
        feature: "Windows service".to_string(),
        platform: std::env::consts::OS.to_string(),
    })
}

#[cfg(not(windows))]
pub fn start_service() -> crate::error::Result<()> {
    Err(crate::error::KopiaError::UnsupportedPlatform {
        feature: "Windows service".to_string(),
        platform: std::env::consts::OS.to_string(),
    })
}

#[cfg(not(windows))]
pub fn stop_service() -> crate::error::Result<()> {
    Err(crate::error::KopiaError::UnsupportedPlatform {
        feature: "Windows service".to_string(),
        platform: std::env::consts::OS.to_string(),
    })
}
