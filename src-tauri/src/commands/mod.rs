//! Tauri command modules
//!
//! Organizes all Tauri commands into logical groupings:
//! - `kopia`: Kopia API operations (40+ commands)
//! - `system`: System utilities (4 commands)
//! - `windows_service`: Windows service management (5 commands, Windows only)

pub mod kopia;
pub mod system;

#[cfg(windows)]
pub mod windows_service;

// Re-export all commands for easy registration
pub use kopia::*;
pub use system::*;

#[cfg(windows)]
pub use windows_service::*;
