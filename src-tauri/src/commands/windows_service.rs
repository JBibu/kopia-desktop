//! Windows Service Management Commands
//!
//! Tauri commands for installing, uninstalling, starting, and stopping the Windows service.

use crate::error::Result;

/// Install the Windows service
///
/// Requires administrator privileges. The service will be configured to start automatically.
#[tauri::command]
pub async fn service_install() -> Result<()> {
    #[cfg(windows)]
    {
        crate::windows_service::install_service()
    }

    #[cfg(not(windows))]
    {
        Err(crate::error::KopiaError::UnsupportedPlatform {
            feature: "Windows service".to_string(),
            platform: std::env::consts::OS.to_string(),
        })
    }
}

/// Uninstall the Windows service
///
/// Requires administrator privileges. Stops the service if running, then removes it.
#[tauri::command]
pub async fn service_uninstall() -> Result<()> {
    #[cfg(windows)]
    {
        crate::windows_service::uninstall_service()
    }

    #[cfg(not(windows))]
    {
        Err(crate::error::KopiaError::UnsupportedPlatform {
            feature: "Windows service".to_string(),
            platform: std::env::consts::OS.to_string(),
        })
    }
}

/// Start the Windows service
///
/// The service must be installed first. Service will start Kopia server automatically.
#[tauri::command]
pub async fn service_start() -> Result<()> {
    #[cfg(windows)]
    {
        crate::windows_service::start_service()
    }

    #[cfg(not(windows))]
    {
        Err(crate::error::KopiaError::UnsupportedPlatform {
            feature: "Windows service".to_string(),
            platform: std::env::consts::OS.to_string(),
        })
    }
}

/// Stop the Windows service
///
/// Gracefully stops the Kopia server and then the service.
#[tauri::command]
pub async fn service_stop() -> Result<()> {
    #[cfg(windows)]
    {
        crate::windows_service::stop_service()
    }

    #[cfg(not(windows))]
    {
        Err(crate::error::KopiaError::UnsupportedPlatform {
            feature: "Windows service".to_string(),
            platform: std::env::consts::OS.to_string(),
        })
    }
}

/// Query Windows service status
///
/// Returns the current state of the service (Running, Stopped, etc.).
#[tauri::command]
pub async fn service_status() -> Result<String> {
    #[cfg(windows)]
    {
        use windows_service::service::ServiceState;

        let state = crate::windows_service::query_service_status()?;

        let state_str = match state {
            ServiceState::Stopped => "Stopped",
            ServiceState::StartPending => "Starting",
            ServiceState::StopPending => "Stopping",
            ServiceState::Running => "Running",
            ServiceState::ContinuePending => "Continuing",
            ServiceState::PausePending => "Pausing",
            ServiceState::Paused => "Paused",
        };

        Ok(state_str.to_string())
    }

    #[cfg(not(windows))]
    {
        Err(crate::error::KopiaError::UnsupportedPlatform {
            feature: "Windows service".to_string(),
            platform: std::env::consts::OS.to_string(),
        })
    }
}
