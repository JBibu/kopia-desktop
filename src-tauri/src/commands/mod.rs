//! Tauri command modules
//!
//! Organizes all Tauri commands into logical groupings:
//! - `kopia`: Kopia API operations (40+ commands)
//! - `system`: System utilities (4 commands)
//! - `websocket`: WebSocket management (2 commands)
//! - `windows_service`: Windows service management (5 commands, Windows only)

pub mod kopia;
pub mod system;
pub mod websocket;

#[cfg(windows)]
pub mod windows_service;

// Re-export all commands for easy registration
pub use kopia::*;
pub use system::*;
pub use websocket::*;

#[cfg(windows)]
pub use windows_service::*;
