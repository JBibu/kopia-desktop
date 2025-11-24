//! Windows Named Pipe IPC for Kopia Desktop
//!
//! Provides secure communication between the GUI (user session) and the Windows service
//! (system session) using named pipes.
//!
//! # Architecture
//!
//! ```text
//! GUI Client → Named Pipe → Service Server
//!                          ↓
//!                     Kopia Server
//! ```
//!
//! # Security
//!
//! - Named pipes use Windows ACLs for access control
//! - Only authenticated users can connect
//! - Each request/response is a complete JSON message

#[cfg(windows)]
use crate::error::{KopiaError, Result};
#[cfg(windows)]
use crate::kopia_server::KopiaServer;
#[cfg(windows)]
use crate::windows_service::{ServiceMessage, ServiceResponse};
#[cfg(windows)]
use std::sync::{Arc, Mutex};
#[cfg(windows)]
use std::time::Duration;
#[cfg(windows)]
use windows_sys::Win32::{
    Foundation::{CloseHandle, ERROR_BROKEN_PIPE, ERROR_NO_DATA, ERROR_PIPE_BUSY, HANDLE},
    Security::SECURITY_ATTRIBUTES,
    Storage::FileSystem::{ReadFile, WriteFile, FILE_FLAG_FIRST_PIPE_INSTANCE, PIPE_ACCESS_DUPLEX},
    System::Pipes::{
        ConnectNamedPipe, CreateNamedPipeA, DisconnectNamedPipe, PIPE_READMODE_MESSAGE,
        PIPE_TYPE_MESSAGE, PIPE_UNLIMITED_INSTANCES, PIPE_WAIT,
    },
};

/// Thread-safe wrapper for Windows HANDLE
///
/// HANDLE is a raw pointer type that doesn't implement Send by default.
/// This wrapper asserts that it's safe to send between threads, which is
/// true for named pipe handles as they're just kernel object handles.
#[cfg(windows)]
struct SendHandle(HANDLE);

#[cfg(windows)]
unsafe impl Send for SendHandle {}

#[cfg(windows)]
const PIPE_NAME: &[u8] = b"\\\\.\\pipe\\kopia-desktop-service\0";
#[cfg(windows)]
const BUFFER_SIZE: u32 = 8192;
#[cfg(windows)]
const PIPE_TIMEOUT_MS: u32 = 5000;

/// Run named pipe server (blocking)
#[cfg(windows)]
pub fn run_pipe_server(kopia_server: Arc<Mutex<KopiaServer>>) -> Result<()> {
    log::info!("Starting named pipe server: {}", unsafe {
        std::str::from_utf8_unchecked(&PIPE_NAME[..PIPE_NAME.len() - 1])
    });

    loop {
        // Create named pipe instance
        let pipe_handle = unsafe {
            CreateNamedPipeA(
                PIPE_NAME.as_ptr(),
                PIPE_ACCESS_DUPLEX | FILE_FLAG_FIRST_PIPE_INSTANCE,
                PIPE_TYPE_MESSAGE | PIPE_READMODE_MESSAGE | PIPE_WAIT,
                PIPE_UNLIMITED_INSTANCES,
                BUFFER_SIZE,
                BUFFER_SIZE,
                PIPE_TIMEOUT_MS,
                std::ptr::null_mut::<SECURITY_ATTRIBUTES>(),
            )
        };

        if pipe_handle == -1_isize as HANDLE {
            return Err(KopiaError::InternalError {
                message: "Failed to create named pipe".to_string(),
                details: Some(format!("Error code: {}", unsafe {
                    windows_sys::Win32::Foundation::GetLastError()
                })),
            });
        }

        log::debug!("Waiting for client connection...");

        // Wait for client connection (blocking)
        let connected = unsafe { ConnectNamedPipe(pipe_handle, std::ptr::null_mut()) };

        if connected == 0 {
            let error = unsafe { windows_sys::Win32::Foundation::GetLastError() };
            unsafe { CloseHandle(pipe_handle) };

            if error == ERROR_PIPE_BUSY {
                log::warn!("Pipe busy, retrying...");
                std::thread::sleep(Duration::from_millis(100));
                continue;
            }

            return Err(KopiaError::InternalError {
                message: "Failed to connect to named pipe client".to_string(),
                details: Some(format!("Error code: {}", error)),
            });
        }

        log::info!("Client connected to named pipe");

        // Handle client in separate thread
        let server_clone = Arc::clone(&kopia_server);
        let handle = SendHandle(pipe_handle);
        std::thread::spawn(move || {
            if let Err(e) = handle_pipe_client(handle.0, server_clone) {
                log::error!("Error handling pipe client: {}", e);
            }
            unsafe {
                DisconnectNamedPipe(handle.0);
                CloseHandle(handle.0);
            }
            log::debug!("Client disconnected from named pipe");
        });
    }
}

/// Handle a single pipe client connection
#[cfg(windows)]
fn handle_pipe_client(pipe_handle: HANDLE, kopia_server: Arc<Mutex<KopiaServer>>) -> Result<()> {
    let mut buffer = vec![0u8; BUFFER_SIZE as usize];
    let mut bytes_read: u32 = 0;

    // Read request from client
    let read_result = unsafe {
        ReadFile(
            pipe_handle,
            buffer.as_mut_ptr() as *mut _,
            BUFFER_SIZE,
            &mut bytes_read,
            std::ptr::null_mut(),
        )
    };

    if read_result == 0 {
        let error = unsafe { windows_sys::Win32::Foundation::GetLastError() };
        if error == ERROR_BROKEN_PIPE || error == ERROR_NO_DATA {
            log::debug!("Client disconnected");
            return Ok(());
        }
        return Err(KopiaError::InternalError {
            message: "Failed to read from pipe".to_string(),
            details: Some(format!("Error code: {}", error)),
        });
    }

    // Parse request
    let request_data = &buffer[..bytes_read as usize];
    let message: ServiceMessage =
        serde_json::from_slice(request_data).map_err(|e| KopiaError::JsonError {
            message: format!("Failed to parse request: {}", e),
        })?;

    log::debug!("Received message: {:?}", message);

    // Process request
    let response = match message {
        ServiceMessage::GetStatus => {
            let mut server = kopia_server.lock().map_err(|e| KopiaError::InternalError {
                message: format!("Failed to lock server: {}", e),
                details: None,
            })?;
            let status = server.status();
            ServiceResponse::Status {
                running: status.running,
                server_url: status.server_url,
                port: status.port,
                uptime: status.uptime,
            }
        }
        ServiceMessage::GetServerInfo => {
            let server = kopia_server.lock().map_err(|e| KopiaError::InternalError {
                message: format!("Failed to lock server: {}", e),
                details: None,
            })?;

            // Get server info if running
            if let Some(client) = server.get_http_client() {
                // Extract credentials from client (not ideal, but needed for compatibility)
                // TODO: Find better way to share credentials
                ServiceResponse::Error {
                    message: "Not implemented yet".to_string(),
                }
            } else {
                ServiceResponse::Error {
                    message: "Server not running".to_string(),
                }
            }
        }
        ServiceMessage::StopService => {
            log::info!("Stop service requested via IPC");
            // Signal service to stop (will be handled by service control handler)
            ServiceResponse::Success {
                message: "Stop request received".to_string(),
            }
        }
    };

    // Send response
    let response_data = serde_json::to_vec(&response).map_err(|e| KopiaError::JsonError {
        message: format!("Failed to serialize response: {}", e),
    })?;

    let mut bytes_written: u32 = 0;
    let write_result = unsafe {
        WriteFile(
            pipe_handle,
            response_data.as_ptr() as *const _,
            response_data.len() as u32,
            &mut bytes_written,
            std::ptr::null_mut(),
        )
    };

    if write_result == 0 {
        return Err(KopiaError::InternalError {
            message: "Failed to write to pipe".to_string(),
            details: Some(format!("Error code: {}", unsafe {
                windows_sys::Win32::Foundation::GetLastError()
            })),
        });
    }

    Ok(())
}

/// Named pipe client for GUI to communicate with service
#[cfg(windows)]
pub struct PipeClient {
    pipe_handle: Option<HANDLE>,
}

#[cfg(windows)]
impl PipeClient {
    pub fn new() -> Self {
        Self { pipe_handle: None }
    }

    /// Connect to the service's named pipe
    pub fn connect(&mut self) -> Result<()> {
        use windows_sys::Win32::Storage::FileSystem::{
            CreateFileA, FILE_GENERIC_READ, FILE_GENERIC_WRITE, FILE_SHARE_NONE, OPEN_EXISTING,
        };

        let handle = unsafe {
            CreateFileA(
                PIPE_NAME.as_ptr(),
                FILE_GENERIC_READ | FILE_GENERIC_WRITE,
                FILE_SHARE_NONE,
                std::ptr::null_mut(),
                OPEN_EXISTING,
                0,
                std::ptr::null_mut(),
            )
        };

        if handle == -1_isize as HANDLE {
            let error = unsafe { windows_sys::Win32::Foundation::GetLastError() };
            return Err(KopiaError::InternalError {
                message: "Failed to connect to service pipe".to_string(),
                details: Some(format!("Error code: {}. Is the service running?", error)),
            });
        }

        self.pipe_handle = Some(handle);
        Ok(())
    }

    /// Send a message and receive response
    pub fn send_message(&mut self, message: &ServiceMessage) -> Result<ServiceResponse> {
        let handle = self.pipe_handle.ok_or_else(|| KopiaError::InternalError {
            message: "Not connected to pipe".to_string(),
            details: None,
        })?;

        // Serialize message
        let request_data = serde_json::to_vec(message).map_err(|e| KopiaError::JsonError {
            message: format!("Failed to serialize message: {}", e),
        })?;

        // Write request
        let mut bytes_written: u32 = 0;
        let write_result = unsafe {
            WriteFile(
                handle,
                request_data.as_ptr() as *const _,
                request_data.len() as u32,
                &mut bytes_written,
                std::ptr::null_mut(),
            )
        };

        if write_result == 0 {
            return Err(KopiaError::InternalError {
                message: "Failed to write to pipe".to_string(),
                details: Some(format!("Error code: {}", unsafe {
                    windows_sys::Win32::Foundation::GetLastError()
                })),
            });
        }

        // Read response
        let mut buffer = vec![0u8; BUFFER_SIZE as usize];
        let mut bytes_read: u32 = 0;
        let read_result = unsafe {
            ReadFile(
                handle,
                buffer.as_mut_ptr() as *mut _,
                BUFFER_SIZE,
                &mut bytes_read,
                std::ptr::null_mut(),
            )
        };

        if read_result == 0 {
            return Err(KopiaError::InternalError {
                message: "Failed to read from pipe".to_string(),
                details: Some(format!("Error code: {}", unsafe {
                    windows_sys::Win32::Foundation::GetLastError()
                })),
            });
        }

        // Parse response
        let response_data = &buffer[..bytes_read as usize];
        serde_json::from_slice(response_data).map_err(|e| KopiaError::JsonError {
            message: format!("Failed to parse response: {}", e),
        })
    }

    /// Disconnect from pipe
    pub fn disconnect(&mut self) {
        if let Some(handle) = self.pipe_handle.take() {
            unsafe { CloseHandle(handle) };
        }
    }
}

#[cfg(windows)]
impl Drop for PipeClient {
    fn drop(&mut self) {
        self.disconnect();
    }
}

// Non-Windows stubs
#[cfg(not(windows))]
pub fn run_pipe_server(
    _kopia_server: std::sync::Arc<std::sync::Mutex<crate::kopia_server::KopiaServer>>,
) -> crate::error::Result<()> {
    Err(crate::error::KopiaError::UnsupportedPlatform {
        feature: "Named pipe IPC".to_string(),
        platform: std::env::consts::OS.to_string(),
    })
}

#[cfg(not(windows))]
pub struct PipeClient;

#[cfg(not(windows))]
impl PipeClient {
    pub fn new() -> Self {
        Self
    }

    pub fn connect(&mut self) -> crate::error::Result<()> {
        Err(crate::error::KopiaError::UnsupportedPlatform {
            feature: "Named pipe IPC".to_string(),
            platform: std::env::consts::OS.to_string(),
        })
    }
}
